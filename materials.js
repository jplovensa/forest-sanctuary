import {
  RepeatWrapping, SRGBColorSpace, TextureLoader, Vector3,
} from 'three';

const assetPath = new URL('./assets/pbr/', import.meta.url);
const families = {
  teak: { average: [0.434, 0.223, 0.096], scale: 1.28, detail: 0.52, relief: 0.27, roughness: 0.49 },
  linen: { average: [0.286, 0.407, 0.616], scale: 3.70, detail: 0.27, relief: 0.29, roughness: 0.84 },
  plaster: { average: [0.494, 0.440, 0.370], scale: 1.16, detail: 0.37, relief: 0.15, roughness: 0.87 },
  stone: { average: [0.195, 0.163, 0.110], scale: 0.73, detail: 0.46, relief: 0.30, roughness: 0.67 },
  earth: { average: [0.149, 0.105, 0.061], scale: 0.46, detail: 0.72, relief: 0.42, roughness: 0.94 },
};

export async function loadSurfaceMaps(anisotropy) {
  const loader = new TextureLoader();
  const load = async (file, color) => {
    const texture = await loader.loadAsync(new URL(file, assetPath).href);
    if (color) texture.colorSpace = SRGBColorSpace;
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.anisotropy = Math.min(anisotropy, 8);
    return texture;
  };
  const profiles = await Promise.all(Object.entries(families).map(async ([key, family]) => {
    const [albedo, surface] = await Promise.all([load(`${key}-color.webp`, true), load(`${key}-surface.webp`, false)]);
    return [key, { ...family, albedo, surface }];
  }));
  return Object.fromEntries(profiles);
}

export function styleMaterial(material, maps) {
  const name = material.name.toLowerCase();
  let key;
  if (/forest floor|grass dark|stone fines/.test(name)) {
    key = 'earth';
    material.color.set(/grass/.test(name) ? 0x475538 : /stone fines/.test(name) ? 0x75674d : 0x514332);
  } else if (/teak|wood|charcoal|rotan|color c07/.test(name) && !/river/.test(name)) {
    key = 'teak';
    if (name.includes('color c07')) material.color.set(0x61432d);
  } else if (/linen|fabric|textile/.test(name)) {
    key = 'linen';
  } else if (/plaster/.test(name)) {
    key = 'plaster';
  } else if (/stone|granite|ceramic|concrete|tiles grey|warm neutral/.test(name)) {
    key = 'stone';
  } else if (/translucent glass/.test(name)) {
    material.color.set(0x96ae9e);
    material.roughness = 0.17;
    material.metalness = 0;
    if (material.transparent) {
      material.opacity = Math.min(0.27, Math.max(0.14, material.opacity));
      material.depthWrite = false;
    }
    if ('ior' in material) material.ior = 1.46;
  } else if (/nickel|aluminum|bronze|graphite|corrugated/.test(name)) {
    material.metalness = 0.65;
    material.roughness = 0.31;
  }
  if (key) applySurface(material, maps[key], key);
}

// World-mapped detail also covers SketchUp faces exported without texture UVs.
// RG stores the normal's XY, B roughness, and A ambient occlusion.
function applySurface(material, profile, key) {
  material.roughness = profile.roughness;
  material.customProgramCacheKey = () => `sanctuary-pbr-${key}`;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      fsAlbedo: { value: profile.albedo },
      fsSurface: { value: profile.surface },
      fsAverage: { value: new Vector3(...profile.average) },
      fsScale: { value: profile.scale },
      fsDetail: { value: profile.detail },
      fsRelief: { value: profile.relief },
    });
    shader.vertexShader = 'varying vec3 fsWorld;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vec4 fsPosition = vec4(transformed, 1.0);
       #ifdef USE_INSTANCING
         fsPosition = instanceMatrix * fsPosition;
       #endif
       fsWorld = (modelMatrix * fsPosition).xyz;`
    );
    shader.fragmentShader = `
      varying vec3 fsWorld;
      uniform sampler2D fsAlbedo;
      uniform sampler2D fsSurface;
      uniform vec3 fsAverage;
      uniform float fsScale, fsDetail, fsRelief;
      mat3 fsFrame(vec3 n, vec3 p, vec2 uv) {
        vec3 dx = dFdx(p), dy = dFdy(p);
        vec2 ux = dFdx(uv), uy = dFdy(uv);
        vec3 t = cross(dy, n) * ux.x + cross(n, dx) * uy.x;
        vec3 b = cross(dy, n) * ux.y + cross(n, dx) * uy.y;
        float inv = inversesqrt(max(max(dot(t,t), dot(b,b)), 0.000001));
        return mat3(t * inv, b * inv, n);
      }
    ` + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 fsAxis = abs(normalize(cross(dFdx(fsWorld), dFdy(fsWorld))));
        vec2 fsUv = (fsAxis.y > max(fsAxis.x, fsAxis.z) ? fsWorld.xz :
          fsAxis.x > fsAxis.z ? fsWorld.zy : fsWorld.xy) * fsScale;
        vec4 fsDetailSample = texture2D(fsSurface, fsUv);
        vec3 fsGrain = texture2D(fsAlbedo, fsUv).rgb / max(fsAverage, vec3(0.028));
        diffuseColor.rgb *= mix(vec3(1.0), clamp(fsGrain, 0.48, 1.68), fsDetail);
        diffuseColor.rgb *= mix(1.0, fsDetailSample.a, 0.17);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(mix(roughnessFactor, fsDetailSample.b, 0.58), 0.12, 0.98);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec2 fsSlope = (fsDetailSample.rg * 2.0 - 1.0) * fsRelief;
        normal = normalize(fsFrame(normal, -vViewPosition, fsUv) * vec3(fsSlope, 1.0));`);
  };
}
