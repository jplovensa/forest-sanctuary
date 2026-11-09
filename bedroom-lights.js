import {
  BoxGeometry, Group, Mesh, MeshStandardMaterial, PointLight,
} from 'three';

export function prepareBedroomLights(scene, model, updateShadow) {
  const suites = [
    { id: 'west', name: 'West suite', bed: 6.627, switchX: 9.417, normal: -1 },
    { id: 'east', name: 'East suite', bed: 20.472, switchX: 17.709, normal: 1 },
  ];
  const lights = suites.map(suite => {
    const fixtureMaterials = [];
    model.traverse(object => {
      if (!object.isMesh || !/Warm diffused lighting/.test(object.material.name)) return;
      // The shared diffuser material is also used at the kitchen.
      let owner = object.parent;
      while (owner && !owner.name.startsWith('Bedroom_')) owner = owner.parent;
      if (!owner?.name.toLowerCase().startsWith(`bedroom_${suite.id}`)) return;
      object.material = object.material.clone();
      object.material.emissive.set(0xffb975);
      fixtureMaterials.push(object.material);
    });
    const plate = new Group();
    plate.name = `${suite.name} lighting switch`;
    plate.position.set(suite.switchX, 1.57, -10.72);
    const body = new Mesh(new BoxGeometry(.025, .112, .078),
      new MeshStandardMaterial({ color: 0x393028, metalness: .55, roughness: .46 }));
    const indicator = new Mesh(new BoxGeometry(.015, .044, .032),
      new MeshStandardMaterial({ color: 0x8b7360, roughness: .45, emissive: 0xffa25e }));
    indicator.position.x = .017 * suite.normal;
    plate.add(body, indicator);
    scene.add(plate);
    const emitters = [-1.0, 1.0].map(offset => {
      const light = new PointLight(0xffb77b, 0, 4.8, 2);
      light.position.set(suite.bed + offset, 1.79, -12.88);
      scene.add(light);
      return light;
    });
    return { ...suite, plate, indicator, emitters, fixtureMaterials, enabled: true };
  });

  let power = 0;
  function update() {
    for (const room of lights) {
      const intensity = room.enabled ? power : 0;
      room.emitters.forEach(light => { light.intensity = intensity; });
      room.fixtureMaterials.forEach(material => { material.emissiveIntensity = room.enabled ? 0.45 + intensity * .12 : 0; });
      room.indicator.material.emissiveIntensity = room.enabled ? 0.8 : 0;
      document.querySelectorAll(`[data-bedroom="${room.id}"]`).forEach(button => {
        button.setAttribute('aria-checked', String(room.enabled));
        button.querySelector('small').textContent = room.enabled ? 'On' : 'Off';
      });
    }
  }
  return {
    lights,
    setPower(value) { power = value; update(); },
    toggle(id) {
      const room = lights.find(item => item.id === id);
      if (!room) return;
      room.enabled = !room.enabled;
      update();
      updateShadow();
    },
    nearby(position) {
      return lights.find(room => Math.hypot(position.x - room.plate.position.x, position.z - room.plate.position.z) < 1.4);
    },
  };
}
