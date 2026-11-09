import {
  BoxGeometry, Group, MathUtils, Matrix4, Mesh, MeshStandardMaterial, Vector3,
} from 'three';

const entrances = [
  { id: 'bath', name: 'Bathing pavilion', x: 6.65, z: -5.82 },
  { id: 'living', name: 'Central pavilion', x: 13.35, z: -8.22 },
  { id: 'west', name: 'West garden suite', x: 6.63, z: -10.18 },
  { id: 'east', name: 'East garden suite', x: 20.48, z: -10.18 },
  { id: 'kitchen', name: 'Kitchen pavilion', x: 20.48, z: -5.85 },
];
const innerDoors = [
  { id: 'wc', name: 'WC privacy door', node: 'WC_privacy_enclosure', pivot: [4.852, 0.451, -5.895],
    area: [4.833, -6.998, -5.892], stop: -1.56, handle: [0.027, 1.03, -0.91] },
  { id: 'shower', name: 'Shower door', node: 'Shower', pivot: [4.84, 0.452, -7.584],
    area: [4.813, -7.587, -7.125], stop: 1.48, handle: [0.028, 1.02, 0.36] },
];

export function prepareDoors(model, batches, panel) {
  const doors = entrances.map(door => ({ ...door, open: false, amount: 0, leaves: [] }));
  const blockers = [...batches];
  const doorByMesh = new Map();
  const transform = new Matrix4();
  const output = new Matrix4();
  const center = new Vector3();
  for (const mesh of batches) {
    mesh.geometry.computeBoundingBox();
    const inverse = mesh.matrixWorld.clone().invert();
    const instanceDoors = [];
    doorByMesh.set(mesh, instanceDoors);
    const localX = new Vector3(1, 0, 0).applyMatrix4(inverse).sub(new Vector3().applyMatrix4(inverse));
    for (let index = 0; index < mesh.count; index++) {
      mesh.getMatrixAt(index, transform);
      center.copy(mesh.geometry.boundingBox.getCenter(center)).applyMatrix4(transform).applyMatrix4(mesh.matrixWorld);
      const door = doors.find(item => Math.abs(center.x - item.x) < 2.65 && Math.abs(center.z - item.z) < 0.16);
      if (!door) continue;
      instanceDoors[index] = door;
      door.leaves.push({ mesh, index, start: transform.clone(), x: center.x, localX });
    }
  }
  for (const door of doors) {
    const left = Math.min(...door.leaves.map(leaf => leaf.x));
    for (const leaf of door.leaves) leaf.travel = left - leaf.x;
  }

  const hardware = new MeshStandardMaterial({ color: 0x8a7561, metalness: 0.76, roughness: 0.35 });
  for (const spec of innerDoors) {
    const source = model.getObjectByName(spec.node);
    if (!source) continue;
    const pivot = new Group();
    pivot.name = spec.name;
    pivot.position.set(...spec.pivot);
    model.add(pivot);
    pivot.updateMatrixWorld(true);
    const pieces = extractLeaf(source, pivot, spec.area);
    if (!pieces.length) {
      pivot.removeFromParent();
      continue;
    }
    const handle = new Mesh(new BoxGeometry(0.046, 0.135, 0.024), hardware);
    handle.position.set(...spec.handle);
    pivot.add(handle);
    const door = { ...spec, pivot, x: spec.pivot[0], z: spec.pivot[2], open: false, amount: 0 };
    for (const piece of pieces) doorByMesh.set(piece, [door]);
    blockers.push(...pieces);
    doors.push(door);
  }

  function toggle(door) {
    if (!door) return;
    door.open = !door.open;
    door.button.setAttribute('aria-pressed', String(door.open));
    door.button.querySelector('small').textContent = door.open ? 'Open' : 'Closed';
  }
  doors.forEach(door => {
    if (!panel) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<span>${door.name}</span><small>Closed</small>`;
    button.setAttribute('aria-label', `${door.name} door`.replace('door door', 'door'));
    button.setAttribute('aria-pressed', 'false');
    button.onclick = () => toggle(door);
    door.button = button;
    panel.append(button);
  });
  return {
    blockers,
    fromHit(hit) { return hit ? doorByMesh.get(hit.object)?.[hit.instanceId ?? 0] : undefined; },
    nearest(position) {
      let best;
      let closest = 1.55;
      for (const door of doors) {
        const distance = Math.hypot(door.pivot ? position.x - door.x : Math.max(0, Math.abs(position.x - door.x) - 2.38), position.z - door.z);
        if (distance < closest) {
          closest = distance;
          best = door;
        }
      }
      return best;
    },
    toggle,
    update(dt, reducedMotion) {
      let moved = false;
      for (const door of doors) {
        const target = Number(door.open);
        if (door.amount === target) continue;
        const next = reducedMotion ? target : MathUtils.damp(door.amount, target, 6, dt);
        door.amount = Math.abs(next - target) < 0.003 ? target : next;
        if (door.pivot) {
          door.pivot.rotation.y = door.stop * door.amount;
        } else {
          for (const leaf of door.leaves) {
            const distance = leaf.travel * door.amount;
            const elements = output.copy(leaf.start).elements;
            elements[12] += leaf.localX.x * distance;
            elements[13] += leaf.localX.y * distance;
            elements[14] += leaf.localX.z * distance;
            leaf.mesh.setMatrixAt(leaf.index, output);
            leaf.mesh.instanceMatrix.needsUpdate = true;
          }
        }
        moved = true;
      }
      return moved;
    },
  };
}

// The privacy and shower leaves were exported as faces within their partitions.
function extractLeaf(source, pivot, [minX, minZ, maxZ]) {
  const meshes = [];
  const point = new Vector3();
  source.traverse(mesh => {
    if (!mesh.isMesh || !mesh.geometry.index) return;
    const { position } = mesh.geometry.attributes;
    const { index } = mesh.geometry;
    const fixed = [];
    const moving = [];
    for (let i = 0; i < index.count; i += 3) {
      const face = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      const onLeaf = face.every(vertex => {
        point.fromBufferAttribute(position, vertex).applyMatrix4(mesh.matrixWorld);
        return point.x >= minX && point.z >= minZ && point.z <= maxZ && point.y <= 2.406;
      });
      (onLeaf ? moving : fixed).push(...face);
    }
    if (!moving.length) return;
    const leaf = mesh.clone();
    leaf.geometry = mesh.geometry.clone().setIndex(moving);
    mesh.geometry = mesh.geometry.clone().setIndex(fixed);
    leaf.matrix.copy(mesh.matrixWorld).decompose(leaf.position, leaf.quaternion, leaf.scale);
    pivot.attach(leaf);
    meshes.push(leaf);
  });
  return meshes;
}
