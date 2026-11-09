import {
  BoxGeometry, BufferGeometry, CatmullRomCurve3, CylinderGeometry, Float32BufferAttribute,
  LatheGeometry, Matrix4, Euler, Mesh, Quaternion, TubeGeometry, Vector2, Vector3,
} from 'three';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

const up = new Vector3(0, 1, 0);

// Round a box at a constant radius, even when its sides have different lengths.
export function roundedBox([width, height, depth], radius, sculpt) {
  const half = [width / 2, height / 2, depth / 2];
  const bevel = Math.min(radius, ...half);
  const segments = sculpt ? 8 : bevel >= .022 ? 5 : 3;
  const core = sculpt ? .5 : 1 - 2 / segments;
  const geometry = new BoxGeometry(2, 2, 2, segments, segments, segments);
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const corner = new Vector3();
  for (let i = 0; i < position.count; i++) {
    const unit = [position.getX(i), position.getY(i), position.getZ(i)];
    const inner = unit.map((value, axis) => Math.max(-1, Math.min(1, value / core)) * (half[axis] - bevel));
    corner.set(...unit.map(value => value - Math.max(-core, Math.min(core, value)))).normalize();
    const x = inner[0] + corner.x * bevel;
    const y = inner[1] + corner.y * bevel;
    const z = inner[2] + corner.z * bevel;
    const [dx, dy, dz] = sculpt?.(x / half[0], y / half[1], z / half[2]) ?? [0, 0, 0];
    position.setXYZ(i, x + dx, y + dy, z + dz);
    normal.setXYZ(i, corner.x, corner.y, corner.z);
  }
  // Keep bevel normals welded across the six BoxGeometry face boundaries.
  if (sculpt) {
    geometry.computeVertexNormals();
    const welded = new Map();
    const vertices = [];
    for (let i = 0; i < position.count; i++) {
      const key = [position.getX(i), position.getY(i), position.getZ(i)].map(n => Math.round(n * 1e5)).join(',');
      if (!welded.has(key)) welded.set(key, new Vector3());
      const sum = welded.get(key);
      sum.add(corner.fromBufferAttribute(normal, i));
      vertices.push(sum);
    }
    vertices.forEach((sum, index) => {
      sum.normalize();
      normal.setXYZ(index, sum.x, sum.y, sum.z);
    });
  }
  return geometry;
}

export function clothGrid(columns, rows, point) {
  const positions = [];
  const indices = [];
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      positions.push(...point(2 * col / columns - 1, row / rows));
      if (row === rows || col === columns) continue;
      const a = row * (columns + 1) + col;
      const b = a + columns + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function outline(width, depth, radius, y = 0) {
  const points = [];
  for (let quadrant = 0; quadrant < 4; quadrant++) {
    const a = quadrant * Math.PI / 2;
    const cx = [1, -1, -1, 1][quadrant] * (width / 2 - radius);
    const cz = [1, 1, -1, -1][quadrant] * (depth / 2 - radius);
    for (let step = 0; step <= 4; step++) {
      const angle = a + step * Math.PI / 8;
      points.push([cx + Math.cos(angle) * radius, y, cz + Math.sin(angle) * radius]);
    }
  }
  return points;
}

// Merge by finish per item so fine joinery, weaving and seams are inexpensive to render.
export function furnitureParts() {
  const batches = new Map();
  function add(material, geometry, at = [0, 0, 0], rotation = new Quaternion()) {
    for (const attribute of Object.keys(geometry.attributes)) {
      if (attribute !== 'position' && attribute !== 'normal') geometry.deleteAttribute(attribute);
    }
    geometry.clearGroups();
    geometry.applyMatrix4(new Matrix4().compose(new Vector3(...at), rotation, new Vector3(1, 1, 1)));
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(geometry);
  }
  function tube(material, points, radius, closed = false) {
    const path = new CatmullRomCurve3(points.map(point => new Vector3(...point)), closed, 'centripetal');
    add(material, new TubeGeometry(path, Math.max(8, points.length * 2), radius, 5, closed));
  }
  return {
    add,
    tube,
    box(material, at, size, radius = .01, angles = [0, 0, 0], sculpt) {
      add(material, roundedBox(size, radius, sculpt), at, new Quaternion().setFromEuler(new Euler(...angles)));
    },
    rod(material, from, to, base, tip = base, sides = 10) {
      const a = new Vector3(...from);
      const b = new Vector3(...to);
      const vector = b.clone().sub(a);
      add(material, new CylinderGeometry(tip, base, vector.length(), sides), a.lerp(b, .5).toArray(),
        new Quaternion().setFromUnitVectors(up, vector.normalize()));
    },
    turned(material, at, profile, sides = 40) {
      add(material, new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), sides), at);
    },
    attach(group) {
      for (const [material, geometries] of batches) {
        const mesh = new Mesh(mergeGeometries(geometries), material);
        mesh.name = material.name;
        group.add(mesh);
        geometries.forEach(geometry => geometry.dispose());
      }
    },
  };
}
