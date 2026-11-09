import { InstancedMesh, Matrix4 } from 'three';

// gltfpack puts shared instances at the scene root. Recover the visibility
// groups for the plan and walk modes while keeping the static door tracks.
export function prepareVisibility(model) {
  const canopies = [];
  const slidingLeaves = [];
  const roof = model.getObjectByName('SharedRoof');
  let ceiling;
  let screen;

  for (const mesh of [...model.children]) {
    if (!mesh.isInstancedMesh) continue;
    const material = mesh.material.name;
    if (material.startsWith('Terminalia Catappa')) {
      canopies.push(mesh);
    } else if (mesh.count === 25 && /Sky Reflection|Color C07/.test(material)) {
      slidingLeaves.push(mesh);
    } else if (mesh.count === 92 && material.includes('Wood Veneer 01')) {
      screen = mesh;
      ceiling = splitCeiling(mesh);
      model.add(ceiling);
    }
  }

  return { roof, canopies, slidingLeaves, ceiling, screen };
}

function splitCeiling(mesh) {
  const matrix = new Matrix4();
  mesh.geometry.computeBoundingBox();
  const center = mesh.geometry.boundingBox.min.clone().lerp(mesh.geometry.boundingBox.max, .5);
  const centerForInstance = center.clone();
  const overhead = [];
  let wallCount = 0;
  for (let index = 0; index < mesh.count; index++) {
    mesh.getMatrixAt(index, matrix);
    centerForInstance.copy(center).applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld);
    if (centerForInstance.y > 2.85) overhead.push(matrix.clone());
    else mesh.setMatrixAt(wallCount++, matrix);
  }
  mesh.count = wallCount;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();

  const ceiling = new InstancedMesh(mesh.geometry, mesh.material, overhead.length);
  ceiling.name = 'Living ceiling slats';
  ceiling.position.copy(mesh.position);
  ceiling.quaternion.copy(mesh.quaternion);
  ceiling.scale.copy(mesh.scale);
  overhead.forEach((transform, index) => ceiling.setMatrixAt(index, transform));
  return ceiling;
}
