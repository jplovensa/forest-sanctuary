import { Group, MeshStandardMaterial } from 'three';
import { furnitureParts, outline } from './furniture-geometry.js';

function finishes() {
  const finish = (name, color, options) => new MeshStandardMaterial({ name, color, ...options });
  return {
    teak: finish('Oiled teak', 0x71503a),
    lightTeak: finish('Honey teak', 0x9d7551),
    recess: finish('Dark teak', 0x34261d),
    ivory: finish('Ivory linen', 0xf0e8d9),
    oat: finish('Oat linen', 0xc2ae92),
    taupe: finish('Taupe linen welt', 0x9c876f),
    olive: finish('Moss linen', 0x646a4d),
    flax: finish('Flax linen', 0xd4bd9b),
    cane: finish('Natural rotan', 0xb8905e),
    darkCane: finish('Dark rotan', 0x8b6843),
    stone: finish('Honed travertine stone', 0xb39b7f),
    darkStone: finish('Cast concrete stone', 0x918578),
    ceramic: finish('Ivory ceramic', 0xe3d9c6),
    metal: finish('Patinated dark bronze', 0x503c2e),
    mirror: finish('Smoked mirror', 0x9d9b93, { metalness: .92, roughness: .14 }),
    diffuser: finish('Warm diffused lighting', 0xf4d8ad, { emissive: 0xffb975 }),
  };
}

function cushion(parts, material, at, size, angles = [0, 0, 0]) {
  parts.box(material, at, size, Math.min(size[1] * .46, size[2] * .44, .13), angles,
    (x, y, z) => [0, (.009 * Math.cos(x * 2.1) * Math.cos(z * 2.3) +
      .006 * Math.sin(z * 4.7 + x * 3) * Math.abs(x) ** 3) * y, 0]);
}

function pillow(parts, material, at, size, angle = 0) {
  parts.box(material, at, size, size[1] * .48, [.13, angle, angle * .28], (x, y, z) => [
    -.029 * x * Math.abs(z) ** 4,
    y * (.018 * Math.cos(x * 1.6) * Math.cos(z * 1.6) - .026 * Math.abs(x * z) ** 3) +
      .004 * Math.sin(x * 5 + z * 3),
    -.025 * z * Math.abs(x) ** 4,
  ]);
}

function bedJoinery(parts, m) {
  parts.box(m.recess, [0, .06, -.02], [1.58, .12, 1.65], .046);
  parts.box(m.teak, [0, .132, -.02], [1.76, .078, 1.83], .037);
  parts.box(m.oat, [0, .237, -.02], [1.84, .234, 1.91], .113);

  parts.box(m.recess, [0, .765, -1.034], [2.83, 1.53, .105], .037);
  for (let index = -28; index <= 28; index++) {
    parts.box(index % 4 === 0 ? m.lightTeak : m.teak, [index * .048, .755, -.981],
      [.035, 1.42, .035], .011);
  }
  for (const x of [-1.164, 1.164]) {
    parts.box(m.teak, [x, .391, -.851], [.43, .17, .29], .019);
    parts.box(m.stone, [x, .494, -.849], [.47, .046, .332], .019);
    parts.box(m.metal, [x, .419, -.698], [.104, .012, .018], .006);
    parts.rod(m.metal, [x, 1.526, -.91], [x, 1.258, -.81], .007);
    parts.turned(m.ceramic, [x, 1.13, -.81], [
      [.096, 0], [.101, .013], [.084, .103], [.059, .144], [.043, .155], [.032, .149],
    ], 32);
    parts.turned(m.diffuser, [x, 1.131, -.81], [[0, 0], [.088, 0], [.091, .011], [0, .014]], 32);
  }
}

function sofa(parts, m, width, outdoor) {
  const depth = outdoor ? .68 : .94;
  const half = width / 2;
  const seat = outdoor ? m.oat : m.ivory;
  const frame = outdoor ? m.lightTeak : m.teak;
  for (const x of [-half + .10, half - .10]) {
    for (const z of [-depth / 2 + .075, depth / 2 - .075]) {
      parts.rod(frame, [x * 1.025, 0, z * 1.08], [x, .296, z], .032, .046);
    }
  }
  parts.box(frame, [0, .235, 0], [width - .06, .095, depth], .035);
  parts.box(m.recess, [0, .289, 0], [width - .096, .038, depth - .035], .015);
  parts.box(frame, [0, .486, -depth / 2 + .049], [width - .12, .356, .095], .035, [-.13, 0, 0]);
  for (const x of [-half + .065, half - .065]) {
    parts.rod(frame, [x, .247, depth * .36], [x, .518, depth * .36], .027, .036);
    parts.box(frame, [x, .554, -.008], [.112, .07, depth - .029], .031, [.024, 0, 0]);
  }
  const count = width < 1 ? 1 : outdoor ? 2 : 3;
  const cushionWidth = (width - .254) / count;
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * cushionWidth;
    cushion(parts, seat, [x, .361, depth * .063], [cushionWidth - .013, .137, depth * .865]);
    parts.tube(m.taupe, outline(cushionWidth - .022, depth * .845, .067, .36)
      .map(([px, y, z]) => [px + x, y, z + depth * .063]), .003, true);
    cushion(parts, seat, [x, .608, -depth * .315], [cushionWidth - .019, .353, .17], [-.22, 0, 0]);
  }
  if (width > 1) {
    pillow(parts, m.olive, [-half + .34, .562, -depth * .082], [.365, .305, .165], -.14);
    pillow(parts, outdoor ? m.flax : m.oat, [half - .30, .545, -depth * .025], [.35, .289, .164], .21);
  }
}

function diningChair(parts, m) {
  for (const x of [-1, 1]) {
    parts.rod(m.teak, [x * .212, 0, .208], [x * .184, .435, .156], .017, .028);
    parts.tube(m.teak, [[x * .225, .02, -.206], [x * .191, .434, -.151],
      [x * .211, .668, -.196], [x * .21, .839, -.229]], .024);
    parts.rod(m.recess, [x * .205, .195, -.174], [x * .204, .195, .174], .014);
  }
  parts.box(m.teak, [0, .414, .009], [.425, .05, .414], .028);
  cushion(parts, m.oat, [0, .464, .012], [.412, .076, .398]);
  parts.tube(m.teak, [[-.209, .808, -.227], [-.15, .854, -.236], [0, .865, -.239],
    [.15, .854, -.236], [.209, .808, -.227]], .026);
  parts.tube(m.teak, [[-.201, .635, -.19], [0, .626, -.205], [.201, .635, -.19]], .023);
  for (let i = -12; i <= 12; i++) {
    const x = i * .0152;
    parts.tube(i % 3 ? m.cane : m.darkCane, [[x, .637, -.198], [x, .733, -.218],
      [x, .85 - Math.abs(x) * .129, -.232]], .0044);
  }
  for (let i = 0; i < 13; i++) {
    const y = .645 + i * .015;
    const span = Math.min(.196, (.861 - y) / .142);
    const weave = Array.from({ length: 19 }, (_, j) => {
      const x = (j / 9 - 1) * span;
      return [x, y, -.202 - (y - .645) * .157 + .0032 * Math.cos(j * Math.PI + i * Math.PI)];
    });
    parts.tube(i % 4 ? m.cane : m.darkCane, weave, .0042);
  }
}

function diningTable(parts, m) {
  parts.box(m.teak, [0, .724, 0], [1.96, .061, .89], .063);
  parts.box(m.recess, [0, .667, 0], [1.71, .085, .65], .026);
  for (const x of [-.68, .68]) {
    for (const z of [-.264, .264]) {
      parts.rod(m.teak, [x * 1.12, 0, z * 1.19], [x, .681, z], .029, .055, 12);
    }
  }
  parts.turned(m.stone, [0, .754, 0], [[.10, 0], [.13, .022], [.167, .075],
    [.164, .084], [.153, .082], [.119, .044], [0, .016]]);
}

function coffeeTable(parts, m, outdoor) {
  if (outdoor) {
    for (const x of [-.57, .57]) {
      parts.box(m.teak, [x, .129, 0], [.081, .242, .56], .025);
      parts.box(m.recess, [x, .015, 0], [.06, .03, .514], .008);
    }
    parts.box(m.recess, [0, .23, 0], [1.40, .056, .625], .026);
    for (let i = -4; i <= 4; i++) {
      parts.box(i % 3 === 0 ? m.lightTeak : m.teak, [0, .275, i * .087],
        [1.56, .046, .081], .016);
    }
    return;
  }
  parts.turned(m.darkStone, [0, 0, 0], [[0, 0], [.237, 0], [.254, .021], [.254, .06], [0, .06]]);
  parts.turned(m.stone, [0, .047, 0], [
    [0, 0], [.262, 0], [.272, .024], [.321, .264], [.339, .292], [.314, .307], [0, .307],
  ]);
  for (let index = 0; index < 30; index++) {
    const angle = index / 30 * Math.PI * 2;
    const point = (r, y) => [r * Math.cos(angle), y, r * Math.sin(angle)];
    parts.rod(m.stone, point(.268, .085), point(.321, .325), .011, .014, 7);
  }
  parts.turned(m.stone, [0, .335, 0], [
    [0, 0], [.43, 0], [.466, .017], [.472, .043], [.456, .061], [.428, .066], [0, .066],
  ], 64);
  parts.box(m.olive, [.116, .408, -.06], [.206, .019, .146], .005, [0, -.22, 0]);
  parts.box(m.flax, [.116, .418, -.06], [.195, .012, .137], .002, [0, -.22, 0]);
  parts.box(m.olive, [.116, .425, -.06], [.206, .006, .146], .002, [0, -.22, 0]);
}

function barStool(parts, m) {
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      parts.rod(m.teak, [x * .144, 0, z * .154], [x * .111, .585, z * .113], .016, .023);
    }
    parts.rod(m.recess, [x * .13, .20, -.139], [x * .13, .20, .139], .012);
  }
  parts.rod(m.metal, [-.137, .226, .142], [.137, .226, .142], .014);
  parts.rod(m.teak, [-.127, .224, -.139], [.127, .224, -.139], .013);
  parts.box(m.teak, [0, .591, 0], [.345, .052, .355], .038);
  cushion(parts, m.oat, [0, .63, .013], [.324, .067, .322]);
  for (const x of [-.125, .125]) parts.rod(m.teak, [x, .543, -.115], [x, .778, -.178], .016, .020);
  parts.tube(m.teak, [[-.151, .758, -.17], [-.07, .787, -.189], [.07, .787, -.189],
    [.151, .758, -.17]], .026);
}

function robe(parts, m) {
  parts.box(m.recess, [0, .04, -.044], [1.45, .08, .54], .014);
  parts.box(m.teak, [0, 1.09, -.03], [1.549, 2.03, .60], .019);
  parts.box(m.lightTeak, [0, 2.139, 0], [1.55, .058, .653], .014);
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * .383;
    parts.box(m.recess, [x, 1.10, .265], [.382, 2.073, .023], .009);
    parts.box(m.teak, [x, 1.10, .292], [.37, 2.058, .054], .018);
    parts.box(m.lightTeak, [x, 1.10, .323], [.273, 1.899, .012], .006);
    for (let slat = -6; slat <= 6; slat++) {
      parts.box(slat % 4 === 0 ? m.teak : m.lightTeak,
        [x + slat * .020, 1.10, .33], [.012, 1.881, .012], .005);
    }
    parts.box(m.metal, [x + (i % 2 ? -.133 : .133), 1.016, .33], [.013, .149, .031], .006);
  }
}

function dressing(parts, m) {
  parts.box(m.recess, [0, 1.414, -.229], [.86, 1.312, .052], .022);
  for (let i = -8; i <= 8; i++) {
    parts.box(m.teak, [i * .049, 1.416, -.20], [.032, 1.28, .026], .008);
  }
  parts.box(m.metal, [0, 1.414, -.167], [.64, .85, .038], .019);
  parts.box(m.mirror, [0, 1.414, -.145], [.605, .811, .019], .009);
  parts.box(m.teak, [0, .675, -.02], [.823, .157, .413], .022);
  parts.box(m.stone, [0, .753, .002], [.869, .047, .457], .017);
  for (const x of [-.209, .209]) {
    parts.box(m.lightTeak, [x, .672, .202], [.404, .113, .032], .009);
    parts.box(m.metal, [x, .674, .223], [.106, .012, .021], .005);
  }
  parts.box(m.diffuser, [0, .598, .175], [.734, .008, .013], .003);
}

function bench(parts, m, compact) {
  const width = compact ? .342 : .825;
  const depth = compact ? .32 : .541;
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      parts.rod(m.teak, [x * width * .43, 0, z * depth * .43],
        [x * width * .36, .33, z * depth * .35], .018, .027);
    }
  }
  parts.box(m.teak, [0, .31, 0], [width - .028, .084, depth - .025], .027);
  cushion(parts, m.oat, [0, .38, 0], [width, .111, depth]);
  parts.tube(m.taupe, outline(width - .014, depth - .012, .048, .373), .003, true);
}

const dressingStool = (parts, m) => bench(parts, m, true);

function areaRug(parts, m) {
  parts.box(m.flax, [0, .014, 0], [2.51, .019, 3.20], .008);
  for (const x of [-1.192, 1.192]) parts.box(m.taupe, [x, .0235, 0], [.042, .004, 3.18], .002);
  for (const z of [-1.54, 1.54]) {
    parts.box(m.taupe, [0, .0235, z], [2.485, .004, .039], .002);
    for (let i = -39; i <= 39; i++) {
      parts.rod(m.flax, [i * .031, .013, z * 1.032],
        [i * .031 + Math.sin(i) * .004, .010, z * 1.063], .002, .0014, 5);
    }
  }
}

function cabinetFront(parts, m, x, y, width, height, z, vertical = false) {
  parts.box(m.teak, [x, y, z], [width - .009, height - .01, .039], .012);
  parts.box(m.lightTeak, [x, y, z + .021], [width - .072, height - .079, .009], .004);
  const handleY = vertical ? y : y + height * .24;
  const handleX = vertical ? x + width * .29 : x;
  parts.box(m.metal, [handleX, handleY, z + .036],
    vertical ? [.014, .14, .025] : [.133, .014, .025], .006);
}

function kitchenCabinetry(parts, m) {
  parts.box(m.recess, [-2.47, .047, -.11], [.52, .094, .50], .014);
  parts.box(m.teak, [-2.47, 1.103, -.108], [.607, 2.02, .53], .014);
  cabinetFront(parts, m, -2.47, .602, .604, 1.051, .177, true);
  cabinetFront(parts, m, -2.47, 1.64, .604, .981, .177, true);
  parts.box(m.recess, [-.62, .049, -.087], [2.86, .098, .465], .015);
  parts.box(m.teak, [-.62, .463, -.107], [2.93, .738, .516], .013);
  for (let i = 0; i < 6; i++) {
    const x = -1.84 + i * .486;
    if (i < 2 || i === 5) cabinetFront(parts, m, x, .464, .483, .73, .171, true);
    else for (let row = 0; row < 3; row++) cabinetFront(parts, m, x, .222 + row * .24, .483, .239, .171);
  }
  parts.box(m.teak, [-.626, 1.49, -.285], [2.91, .054, .261], .014);
  parts.box(m.recess, [-.626, 1.459, -.291], [2.67, .016, .21], .007);
}

function coffeeCabinetry(parts, m) {
  parts.box(m.recess, [0, .047, -.075], [.846, .094, .445], .015);
  parts.box(m.teak, [0, .464, -.10], [.941, .74, .523], .014);
  for (const x of [-.312, 0, .312]) cabinetFront(parts, m, x, .464, .311, .728, .177, true);
  parts.box(m.recess, [0, 1.301, -.299], [.944, .748, .035], .011);
  for (let i = -9; i <= 9; i++) {
    parts.box(i % 3 === 0 ? m.teak : m.lightTeak,
      [i * .049, 1.275, -.274], [.026, .702, .023], .007);
  }
  parts.box(m.teak, [0, 1.649, -.15], [.956, .061, .309], .014);
}

function kitchenBar(parts, m) {
  parts.box(m.recess, [-.04, .036, 0], [.285, .072, .84], .026);
  parts.box(m.darkStone, [-.045, .469, 0], [.32, .825, .951], .045);
  parts.box(m.recess, [.035, .883, 0], [.429, .023, .979], .010);
  parts.box(m.stone, [.005, .915, 0], [.554, .079, 1.086], .043);
}

function bathVanity(parts, m) {
  parts.box(m.recess, [0, .533, -.03], [2.245, .69, .522], .032);
  parts.box(m.teak, [0, .545, -.025], [2.224, .677, .513], .032);
  for (const x of [-.824, -.275, .275, .824]) {
    for (const y of [.389, .698]) cabinetFront(parts, m, x, y, .541, .302, .248);
  }
  parts.box(m.stone, [0, .894, .017], [2.281, .072, .592], .031);
  parts.box(m.metal, [0, 1.754, -.254], [2.181, .593, .035], .019);
  parts.box(m.mirror, [0, 1.754, -.231], [2.141, .551, .019], .009);
  for (const x of [-.547, .547]) {
    parts.turned(m.ceramic, [x, .926, .055], [
      [0, 0], [.115, 0], [.137, .02], [.185, .081], [.189, .099], [.184, .108],
      [.171, .104], [.155, .061], [.112, .027], [.03, .018], [0, .018],
    ]);
    parts.turned(m.metal, [x, .943, .055], [[0, 0], [.024, 0], [.026, .005], [0, .005]], 20);
    parts.tube(m.metal, [[x, .93, -.155], [x, 1.133, -.155], [x, 1.164, -.097],
      [x, 1.164, -.024], [x, 1.141, .008]], .012);
    parts.rod(m.metal, [x + .066, .928, -.155], [x + .066, .968, -.155], .017);
  }
  for (let i = 0; i < 3; i++) {
    cushion(parts, i === 2 ? m.flax : m.ivory, [i * .011, .948 + i * .038, .078],
      [.238 - i * .011, .043, .171], [0, i * .035, 0]);
  }
}

export function rebuildFurniture(model, bedding) {
  const m = finishes();
  const prototypes = new Map();
  const item = (name, at, build, yaw = 0) => {
    const group = new Group();
    group.name = name;
    group.position.set(...at);
    group.rotation.y = yaw;
    if (!prototypes.has(build)) {
      const parts = furnitureParts();
      const prototype = new Group();
      build(parts, m);
      parts.attach(prototype);
      prototypes.set(build, prototype.children);
    }
    group.add(...prototypes.get(build).map(mesh => mesh.clone()));
    model.add(group);
    return group;
  };
  const remove = names => names.forEach(name => model.getObjectByName(name)?.removeFromParent());
  const retain = (name, materials) => {
    const group = model.getObjectByName(name);
    if (!group) return;
    const obsolete = [];
    group.traverse(object => {
      if (object.isMesh && !materials.test(object.material.name)) obsolete.push(object);
    });
    obsolete.forEach(object => object.removeFromParent());
  };

  // The optimized GLB puts repeated parts of the original pieces at the scene root.
  remove([
    'Outdoor_Lounge_set', 'mesh_10', 'mesh_11', 'f_balmain_teak_coffee_table_48', 'mesh_19', 'mesh_20',
    'Bernhardt_Austen_Fabric_Sofa', 'Travertine-Scovato-Coffee-Table-T30671-00', 'Group#110',
    'mesh_42', 'mesh_43', 'mesh_44', 'mesh_45', 'mesh_46', 'mesh_47', 'mesh_48', 'mesh_49', 'mesh_52',
    'Kitchen_-_Concrete_bar_and_stools', 'Untitled', 'mesh_26', 'mesh_27',
  ]);
  retain('Kenwood_Dining_Table_&_Chairs', /Polished Nickel|warm neutral/);
  retain('Kitchen_-_Kitchen_work_wall', /concrete|Graphite|bronze|diffused lighting|stoneware/);
  retain('Kitchen_-_Coffee_recess', /concrete|Graphite|bronze|diffused lighting|stoneware/);

  item('Courtyard teak sofa', [11.85, .207, -7.02], (parts, m) => sofa(parts, m, 1.89, true), -.035);
  item('Courtyard teak lounge chair', [13.38, .207, -7.01], (parts, m) => sofa(parts, m, .79, true), .095);
  item('Courtyard slatted teak coffee table', [12.56, .206, -5.80], (parts, m) => coffeeTable(parts, m, true));
  item('Living linen sofa', [14.87, .221, -11.22], (parts, m) => sofa(parts, m, 2.47, false));
  item('Living travertine coffee table', [14.80, .226, -9.96], (parts, m) => coffeeTable(parts, m, false));
  item('Living woven rug', [14.857, .205, -10.045], areaRug);
  item('Living solid teak dining table', [12.36, .207, -10.025], diningTable, Math.PI / 2);
  const diningSeats = [
    [12.36, -11.275, 0], [12.36, -8.77, Math.PI],
    [11.65, -10.35, Math.PI / 2], [11.65, -9.70, Math.PI / 2],
    [13.07, -10.35, -Math.PI / 2], [13.07, -9.70, -Math.PI / 2],
  ];
  diningSeats.forEach(([x, z, yaw], index) => item(`Living cane dining chair ${index + 1}`, [x, .207, z], diningChair, yaw));

  const suites = [
    { side: 'West', bedX: 6.627, robeX: 4.22, dressingX: 9.117, stoolX: 8.627, direction: 1 },
    { side: 'East', bedX: 20.472, robeX: 22.88, dressingX: 17.983, stoolX: 18.473, direction: -1 },
  ];
  for (const { side, bedX, robeX, dressingX, stoolX, direction } of suites) {
    const bedroom = `Bedroom_${side}_-_`;
    remove([`${bedroom}Bed_and_headboard`]);
    retain(`${bedroom}Wardrobe_and_dressing`, /Natural ivory linen/);
    const bed = item(`${bedroom}King bed and bedside furniture`, [bedX, .452, -12.28], bedJoinery);
    bed.add(bedding.clone());
    item(`${side} suite fluted wardrobe`, [robeX, .452, -12.50], robe, direction * Math.PI / 2);
    item(`${bedroom}Dressing console and mirror`, [dressingX, .452, -12.872], dressing, -direction * Math.PI / 2);
    item(`${side} suite dressing stool`, [stoolX, .452, -12.85], dressingStool);
    item(`${side} suite luggage bench`, [bedX, .452, -10.90], bench);
  }

  item('Kitchen teak work wall cabinetry', [20.52, .452, -7.687], kitchenCabinetry);
  item('Kitchen teak coffee cabinet', [22.715, .452, -7.696], coffeeCabinetry);
  item('Kitchen stone bar', [21.90, .452, -6.72], kitchenBar);
  for (const [index, z] of [-6.34, -6.83].entries()) {
    item(`Kitchen teak bar stool ${index + 1}`, [22.48, .452, z], barStool, -Math.PI / 2);
  }
  item('Bathing pavilion twin vanity', [8.291, .452, -7.82], bathVanity);
}
