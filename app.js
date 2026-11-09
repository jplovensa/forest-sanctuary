import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.mjs';

// Coordinates are in metres, converted from Blender's Z-up scene.
const vector = ([x, y, z]) => new THREE.Vector3(x, z, -y);
const stops = [
  { name: 'Forest Sanctuary', nav: 'Pool arrival', type: 'Arrival', desc: 'Five pavilions open onto a courtyard beneath a single canopy.', eye: [23.6,-6.6,6.9], at: [13.35,9.2,2.6], walk: [14,4.8,1.72] },
  { name: 'The courtyard', nav: 'Tree courtyard', type: 'Courtyard', desc: 'An open-air lounge beside the reflection pool and the tree that rises through the roof.', eye: [15.6,5.5,2.45], at: [13.48,8.9,1.55], walk: [15.9,5.35,1.72] },
  { name: 'Living & dining', nav: 'Living & dining', type: 'Pavilion 01', desc: 'Cane-backed dining chairs and a low lounge face the courtyard.', eye: [15.8,8.63,1.75], at: [13.58,10.53,1.12] },
  { name: 'The kitchen', nav: 'Kitchen pavilion', type: 'Pavilion 02', desc: 'A concrete bar for two, a teak coffee recess and a separate cooking run.', eye: [23,6.18,2.08], at: [19.95,7.36,1.45] },
  { name: 'West garden suite', nav: 'West garden suite', type: 'Pavilion 03', desc: 'A centred king bed looks through full-height glazing, with 969 mm clear at its foot.', eye: [9.05,10.44,1.99], at: [6.64,12.1,1.31] },
  { name: 'East garden suite', nav: 'East garden suite', type: 'Pavilion 04', desc: 'A fluted teak headboard, stone bedside ledges and an uninterrupted garden view.', eye: [18.07,10.46,1.99], at: [20.48,12.1,1.31] },
  { name: 'The bathing pavilion', nav: 'Bathing pavilion', type: 'Pavilion 05', desc: 'A stone soaking tub sits beside the glass shower and screened WC.', eye: [9.19,6.18,2.03], at: [6.25,7.39,1.35] },
];
const lighting = {
  day: { sky: 0xa6b1a1, fill: 0xe2e9e3, soil: 0x9e9374, sun: 0xffead0, power: 2.0, hemi: 2.05, inside: 1.8, exposure: 1.05, sunPosition: [-5,18,8] },
  gold: { sky: 0xa49780, fill: 0xe3c6a0, soil: 0x77624a, sun: 0xffc381, power: 2.7, hemi: 1.26, inside: 3.8, exposure: 1.08, sunPosition: [-9,9,9] },
  dusk: { sky: 0x495667, fill: 0xa9b8e2, soil: 0x56535b, sun: 0x9eafd9, power: 0.38, hemi: 0.90, inside: 7.5, exposure: 1.12, sunPosition: [-5,16,7] },
};

const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const phone = matchMedia('(max-width: 680px)');
const pressed = new Set();
let mode = 'orbit';
let activeStop = 0;
let roof;
let soffit;
let canopies;
let animation;
let tourTimer;
let drag;
let yaw = 0;
let pitch = 0;
const obstacles = [];
const doorGroups = [];
const ray = new THREE.Raycaster();
const look = new THREE.Vector3();
const movement = new THREE.Vector3();
const nextStep = new THREE.Vector2();

async function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', 'Forest Sanctuary 3D scene');
  canvas.tabIndex = 0;
  $('viewport').append(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio, phone.matches ? 1.35 : 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(lighting.day.sky, 33, 81);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.045, 140);
  const plan = new THREE.OrthographicCamera(-20, 20, 15, -15, .1, 105);
  plan.up.set(0,0,-1);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * .495;
  controls.minDistance = .85;
  controls.maxDistance = 55;
  const planControls = new OrbitControls(plan, canvas);
  planControls.enableRotate = false;
  planControls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  planControls.touches.ONE = THREE.TOUCH.PAN;
  planControls.minZoom = .65;
  planControls.maxZoom = 4;
  planControls.enabled = false;
  let cameraInUse = camera;

  const hemi = new THREE.HemisphereLight();
  const sun = new THREE.DirectionalLight();
  sun.target.position.set(13.5,0,-8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(phone.matches ? 1024 : 2048, phone.matches ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 15, bottom: -15, near: .1, far: 70 });
  sun.shadow.normalBias = .04;
  sun.shadow.bias = -.00015;
  scene.add(hemi, sun, sun.target);
  const practicals = [[6.62,11.3,2.65],[20.47,11.3,2.65],[6.6,7,2.65],[13.36,10,2.65],[20.5,7.35,2.65]].map(position => {
    const light = new THREE.PointLight(0xffb671, 2.3, 7);
    light.position.copy(vector(position));
    scene.add(light);
    return light;
  });

  function setLight(key) {
    const light = lighting[key];
    scene.background = new THREE.Color(light.sky);
    scene.fog.color.copy(scene.background);
    hemi.color.set(light.fill);
    hemi.groundColor.set(light.soil);
    hemi.intensity = light.hemi;
    sun.color.set(light.sun);
    sun.intensity = light.power;
    sun.position.set(...light.sunPosition);
    renderer.toneMappingExposure = light.exposure;
    practicals.forEach(item => { item.intensity = light.inside; });
    $('lighting').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', button.dataset.light === key));
  }
  setLight('day');

  function size() {
    const {clientWidth: width, clientHeight: height} = $('viewport');
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.aspect = aspect;
    camera.fov = mode === 'walk' ? 65 : phone.matches ? 59 : activeStop > 1 ? 56 : 48;
    camera.updateProjectionMatrix();
    const vertical = Math.max(20, 29 / aspect);
    Object.assign(plan, { left: -vertical * aspect / 2, right: vertical * aspect / 2, top: vertical / 2, bottom: -vertical / 2 });
    plan.updateProjectionMatrix();
  }

  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('./assets/sanctuary.glb', event => {
    if (event.lengthComputable) $('progress').value = Math.min(98, event.loaded / event.total * 100);
  });
  const model = gltf.scene;
  model.updateMatrixWorld(true);
  scene.add(model);
  roof = model.getObjectByName('SharedRoof');
  canopies = model.getObjectByName('ForestCanopies');
  soffit = model.getObjectByName('Living_pavilion_soffit') || model.getObjectByName('Living pavilion soffit');
  model.traverse(object => {
    if (!object.isMesh) return;
    const material = object.material;
    const foliage = /Terminalia Catappa (Leaf|Nuts)/i.test(material.name);
    if (foliage) {
      material.transparent = false;
      material.alphaTest = .40;
      material.depthWrite = true;
    }
    if (/forest floor/i.test(material.name)) {
      material.color.lerp(new THREE.Color(0x48513b), .35);
    }
    const largeCanopy = object.isInstancedMesh && object.count > 15;
    object.castShadow = !material.transparent && !largeCanopy;
    object.receiveShadow = !material.transparent && !foliage;
  });
  const label = object => object.name.replaceAll('_', ' ');
  const glassNames = ['West suite glazing','East suite glazing','Living room glazing','Bath glazing','Kitchen glazing'];
  model.traverse(object => {
    const name = label(object);
    if (glassNames.includes(name)) doorGroups.push(object);
    if (/pavilion shell|garden suite shell|WC privacy enclosure|Living pavilion screens/i.test(name)) {
      object.traverse(child => { if (child.isMesh && !child.isInstancedMesh) obstacles.push(child); });
    }
  });
  const walkDeck = new THREE.Box2(new THREE.Vector2(1.65,-16.2), new THREE.Vector2(25.15,-.65));
  // The reflection pool is inset in the deck. Keep the walk camera on its edge.
  const pool = new THREE.Box2(new THREE.Vector2(6.91,-4.48), new THREE.Vector2(22.70,-1.91));
  const approach = new THREE.Box2(new THREE.Vector2(24.8,-18.5), new THREE.Vector2(29.5,-9.2));
  function floorAt(position) {
    const {x,z} = position;
    const inside = (x0,x1,z0,z1) => x > x0 && x < x1 && z > z0 && z < z1;
    if (inside(3.44,9.84,-14.18,-10.08) || inside(17.28,23.68,-14.18,-10.08) ||
        inside(3.46,9.86,-8.94,-5.74) || inside(17.28,23.68,-8.94,-5.74) ||
        inside(10.16,16.56,-13.28,-7.68)) return .45;
    return .20;
  }
  function walkOpen(position, delta, component) {
    nextStep.set(position.x + delta.x, position.z + delta.z);
    if ((!walkDeck.containsPoint(nextStep) && !approach.containsPoint(nextStep)) || pool.containsPoint(nextStep)) return false;
    look.copy(delta).normalize();
    ray.set(position, look);
    ray.far = Math.abs(component) + .19;
    return ray.intersectObjects(obstacles, false).length === 0;
  }

  function refreshGeometry() {
    if (roof) roof.visible = mode !== 'plan' && !$('cutaway').checked;
    if (soffit) soffit.visible = mode !== 'plan' && !$('cutaway').checked;
    if (canopies) canopies.visible = mode !== 'plan';
    doorGroups.forEach(door => { door.visible = mode !== 'walk'; });
  }
  function turn(dx, dy) {
    yaw -= dx * .003;
    pitch = THREE.MathUtils.clamp(pitch - dy * .003, -1.32, 1.32);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }
  function aimWalk(position, target) {
    camera.position.copy(position);
    camera.lookAt(target);
    camera.rotation.reorder('YXZ');
    yaw = camera.rotation.y;
    pitch = camera.rotation.x;
  }
  function stopTour() {
    clearInterval(tourTimer);
    tourTimer = undefined;
    $('tour').setAttribute('aria-pressed', 'false');
    $('tour').innerHTML = '▷ <span>Guided tour</span>';
  }
  function goTo(index, instant = false) {
    activeStop = index;
    const stop = stops[index];
    const eye = vector(stop.eye);
    const target = vector(stop.at);
    $('view-index').textContent = `${String(index + 1).padStart(2,'0')} / ${stop.type.toUpperCase()}`;
    $('view-title').textContent = stop.name;
    $('view-description').textContent = stop.desc;
    $('stops').querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-current', i === index));
    size();
    if (mode === 'walk') {
      canvas.focus({ preventScroll: true });
      const point = vector(stop.walk ?? stop.eye);
      point.y = floorAt(point) + 1.52;
      aimWalk(point, target);
    } else if (mode === 'plan') {
      plan.position.set(target.x, 34, target.z);
      planControls.target.set(target.x, 0, target.z);
      planControls.update();
    } else if (instant || reducedMotion.matches) {
      camera.position.copy(eye);
      controls.target.copy(target);
      controls.update();
    } else {
      animation = { since: performance.now(), from: camera.position.clone(), eye, target, fromTarget: controls.target.clone() };
    }
  }

  function setMode(next) {
    if (next === mode) return;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    pressed.clear();
    animation = undefined;
    mode = next;
    controls.enabled = mode === 'orbit';
    planControls.enabled = mode === 'plan';
    cameraInUse = mode === 'plan' ? plan : camera;
    $('modes').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', button.dataset.mode === mode));
    $('walk-controls').hidden = mode !== 'walk' || !matchMedia('(pointer: coarse)').matches;
    $('crosshair').hidden = mode !== 'walk';
    $('cutaway').disabled = mode === 'plan';
    $('hint').textContent = { orbit: 'Drag to orbit · Scroll to zoom', plan: 'Roof removed · Drag to pan · Scroll to zoom', walk: 'WASD or arrows to move · Drag to look · Esc to release' }[mode];
    refreshGeometry();
    if (mode === 'plan') {
      plan.zoom = 1;
      plan.position.set(13.4,34,-8.6);
      planControls.target.set(13.4,0,-8.6);
      planControls.update();
      size();
    } else {
      goTo(activeStop, true);
    }
  }

  stops.forEach((stop, index) => {
    const button = document.createElement('button');
    button.className = 'stop';
    button.type = 'button';
    button.innerHTML = `<span>${String(index+1).padStart(2,'0')}</span><b>${stop.nav}</b><span>↗</span>`;
    button.addEventListener('click', () => {
      stopTour();
      goTo(index);
      if (phone.matches) setPanel(false);
    });
    $('stops').append(button);
  });
  function setPanel(visible) {
    $('panel').hidden = !visible;
    $('panel-toggle').setAttribute('aria-expanded', visible);
  }
  setPanel(!phone.matches);
  $('panel-toggle').onclick = () => setPanel($('panel').hidden);
  $('cutaway').onchange = refreshGeometry;
  $('lighting').onclick = event => {
    const key = event.target.closest('button')?.dataset.light;
    if (key) setLight(key);
  };
  $('modes').onclick = event => {
    const next = event.target.closest('button')?.dataset.mode;
    if (next) { stopTour(); setMode(next); }
  };
  $('tour').onclick = () => {
    if (tourTimer) { stopTour(); return; }
    setMode('orbit');
    let index = 0;
    goTo(index, true);
    $('tour').setAttribute('aria-pressed', 'true');
    $('tour').innerHTML = 'Ⅱ <span>Stop tour</span>';
    tourTimer = setInterval(() => {
      index += 1;
      if (index < stops.length) goTo(index);
      else stopTour();
    }, 5700);
  };
  $('fullscreen').onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { $('hint').textContent = 'Fullscreen is unavailable in this browser.'; }
  };
  $('help').onclick = () => $('help-dialog').showModal();
  controls.addEventListener('start', () => { animation = undefined; stopTour(); });
  addEventListener('resize', size);
  addEventListener('blur', () => pressed.clear());
  const moveKeys = { ArrowUp:'KeyW', ArrowLeft:'KeyA', ArrowDown:'KeyS', ArrowRight:'KeyD' };
  addEventListener('keydown', event => {
    if (mode !== 'walk' || event.target.closest?.('input, button, dialog')) return;
    const key = moveKeys[event.code] || event.code;
    if (['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].includes(key)) {
      event.preventDefault();
      pressed.add(key);
    }
  });
  addEventListener('keyup', event => pressed.delete(moveKeys[event.code] || event.code));
  $('walk-controls').querySelectorAll('[data-move]').forEach(button => {
    const key = button.dataset.move;
    button.onpointerdown = event => {
      button.setPointerCapture(event.pointerId);
      pressed.add(key);
    };
    button.onpointerup = button.onpointercancel = button.onlostpointercapture = () => pressed.delete(key);
  });
  canvas.addEventListener('pointerdown', event => {
    if (mode !== 'walk') return;
    canvas.focus({preventScroll:true});
    canvas.setPointerCapture(event.pointerId);
    drag = { x:event.clientX, y:event.clientY, moved:false };
  });
  canvas.addEventListener('pointermove', event => {
    if (mode !== 'walk') return;
    if (document.pointerLockElement === canvas) turn(event.movementX,event.movementY);
    else if (drag) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.moved ||= Math.abs(dx) + Math.abs(dy) > 1;
      turn(dx,dy);
      drag.x = event.clientX;
      drag.y = event.clientY;
    }
  });
  canvas.addEventListener('pointerup', event => {
    if (mode === 'walk' && drag && !drag.moved && event.pointerType === 'mouse' && document.pointerLockElement !== canvas) {
      try { canvas.requestPointerLock?.()?.catch(() => {}); } catch { /* Drag remains available. */ }
    }
    drag = undefined;
  });
  canvas.addEventListener('pointercancel', () => { drag = undefined; });
  document.addEventListener('pointerlockchange', () => pressed.clear());

  goTo(0, true);
  refreshGeometry();
  $('progress').value = 100;
  let last = performance.now();
  renderer.render(scene, camera);
  $('loading').hidden = true;
  renderer.setAnimationLoop(now => {
    const dt = Math.min(.04, Math.max(0, (now - last) / 1000));
    last = now;
    if (mode === 'orbit') {
      if (animation) {
        const progress = Math.min(1, (now - animation.since) / 980);
        const ease = progress * progress * (3 - 2 * progress);
        camera.position.lerpVectors(animation.from, animation.eye, ease);
        controls.target.lerpVectors(animation.fromTarget, animation.target, ease);
        if (progress === 1) animation = undefined;
      }
      controls.update();
    }
    if (mode === 'walk') {
      const side = Number(pressed.has('KeyD')) - Number(pressed.has('KeyA'));
      const forward = Number(pressed.has('KeyW')) - Number(pressed.has('KeyS'));
      if (side || forward) {
        const speed = (pressed.has('ShiftLeft') || pressed.has('ShiftRight') ? 3.0 : 1.72) * dt / Math.hypot(side,forward);
        const dx = (side * Math.cos(yaw) - forward * Math.sin(yaw)) * speed;
        const dz = (-side * Math.sin(yaw) - forward * Math.cos(yaw)) * speed;
        if (dx && walkOpen(camera.position, movement.set(dx,0,0), dx)) camera.position.x += dx;
        if (dz && walkOpen(camera.position, movement.set(0,0,dz), dz)) camera.position.z += dz;
      }
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, floorAt(camera.position) + 1.52, Math.min(1,dt*13));
    }
    renderer.render(scene, cameraInUse);
  });
}

$('retry').onclick = () => location.reload();
start().catch(error => {
  console.error(error);
  $('load-text').textContent = 'The 3D scene could not load. Try again in a browser with WebGL enabled.';
  $('progress').hidden = true;
  $('retry').hidden = false;
});
