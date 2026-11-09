import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.mjs';

function readModel(name) {
  const file = readFileSync(new URL(`../assets/${name}.glb`, import.meta.url));
  assert.equal(file.toString('ascii', 0, 4), 'glTF');
  assert.equal(file.readUInt32LE(4), 2);
  assert.equal(file.readUInt32LE(8), file.length);
  const jsonEnd = 20 + file.readUInt32LE(12);
  assert.equal(file.toString('ascii', 16, 20), 'JSON');
  assert.equal(file.toString('ascii', jsonEnd + 4, jsonEnd + 8), 'BIN\0');
  return { model: JSON.parse(file.subarray(20, jsonEnd)), bytes: file.subarray(jsonEnd + 8) };
}

const { model, bytes } = readModel('sanctuary');
assert.ok(model.extensionsUsed.includes('EXT_meshopt_compression'));
assert.ok(model.extensionsUsed.includes('EXT_mesh_gpu_instancing'));
assert.ok(model.meshes.length >= 60);
assert.ok(model.images.length >= 20);
const names = new Set(model.nodes.map(node => node.name));
for (const required of [
  'SharedRoof', 'ForestCanopies', 'ForestTerrain', 'Living pavilion platform',
  'West garden suite shell', 'East garden suite shell', 'Kitchen pavilion shell', 'Bath pavilion shell',
  'Bedroom West - Guest', 'Bedroom East - Guest', 'Kitchen Pavilion - Guest',
  'Bath Pavilion - Guest', 'Living Pavilion - Guest',
]) assert.ok(names.has(required), `Missing node: ${required}`);
const canopyBatches = model.nodes.flatMap(node => {
  const instances = node.extensions?.EXT_mesh_gpu_instancing;
  if (!instances) return [];
  const material = model.materials[model.meshes[node.mesh].primitives[0].material];
  return material.name.startsWith('Terminalia Catappa') ? [model.accessors[instances.attributes.TRANSLATION].count] : [];
});
assert.equal(canopyBatches.length, 4);
assert.ok(canopyBatches.every(count => count === 51));
await MeshoptDecoder.ready;
function checkCompressedBlocks(model, bytes) {
  let decoded = 0;
  for (const view of model.bufferViews) {
    const compressed = view.extensions?.EXT_meshopt_compression;
    if (!compressed) continue;
    const { count, byteStride, byteLength, byteOffset = 0, mode, filter } = compressed;
    assert.ok(byteOffset + byteLength <= bytes.length);
    const output = new Uint8Array(count * byteStride);
    MeshoptDecoder.decodeGltfBuffer(output, count, byteStride, bytes.subarray(byteOffset, byteOffset + byteLength), mode, filter);
    decoded++;
  }
  assert.ok(decoded > 0);
  return decoded;
}
const decoded = checkCompressedBlocks(model, bytes);
const bedding = readModel('suite-bed-linen');
assert.ok(bedding.model.extensionsRequired.includes('EXT_meshopt_compression'));
const linens = bedding.model.materials.map(material => material.name);
for (const part of ['Draped duvet linen', 'Sleeping pillows linen', 'Fitted sheet linen']) {
  assert.ok(linens.includes(part), `Missing bedding material: ${part}`);
}
const beddingBlocks = checkCompressedBlocks(bedding.model, bedding.bytes);
console.log(`Verified ${model.meshes.length} meshes, ${model.images.length} textures, ${canopyBatches[0]} trees in linked canopy batches and ${decoded} compressed data blocks. Decoded ${beddingBlocks} bedding blocks.`);
