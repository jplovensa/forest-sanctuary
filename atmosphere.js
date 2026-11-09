import {
  Box3, Color, LinearSRGBColorSpace, PlaneGeometry, Vector3,
} from 'three';
import { Reflector } from './vendor/Reflector.js';

const poolShader = {
  name: 'Forest reflecting pool',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    time: { value: 0 },
    lightDir: { value: new Vector3(0, 1, 0) },
    lightColor: { value: new Color(0xffead0) },
    sunStrength: { value: 1 },
  },
  vertexShader: `
    uniform mat4 textureMatrix;
    varying vec4 reflectionCoord;
    varying vec3 surfacePoint;
    void main() {
      vec4 local = vec4(position, 1.0);
      reflectionCoord = textureMatrix * local;
      surfacePoint = (modelMatrix * local).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * local;
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform vec3 lightDir;
    uniform vec3 lightColor;
    uniform float sunStrength;
    varying vec4 reflectionCoord;
    varying vec3 surfacePoint;

    vec2 rippleSlope(vec2 p) {
      return vec2(0.74, 0.67) * cos(dot(p, vec2(2.7, 2.4)) + time * 0.91) * 0.012
        + vec2(-0.92, 0.39) * cos(dot(p, vec2(-5.5, 2.4)) + time * 1.23) * 0.009
        + vec2(0.28, -0.96) * cos(dot(p, vec2(2.9, -9.8)) + time * 1.47) * 0.004;
    }

    void main() {
      vec2 slope = rippleSlope(surfacePoint.xz);
      vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
      vec3 viewDir = normalize(cameraPosition - surfacePoint);
      float fresnel = 0.020 + 0.980 * pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 5.0);
      vec2 projected = reflectionCoord.xy / reflectionCoord.w;
      vec2 reflectUv = clamp(projected + slope * 0.16, 0.001, 0.999);
      vec3 reflected = texture2D(tDiffuse, reflectUv).rgb;
      vec3 depthColor = color * (0.58 + 0.21 * sin(surfacePoint.x * 1.13 + slope.y * 9.0));
      float glint = pow(max(dot(n, normalize(lightDir + viewDir)), 0.0), 175.0);
      vec3 water = mix(depthColor, reflected, clamp(0.13 + 0.87 * fresnel, 0.0, 1.0));
      gl_FragColor = vec4(water + glint * lightColor * sunStrength * 0.12, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
};

export function addReflectingPool(scene, surface, compact) {
  const box = new Box3().setFromObject(surface, true);
  const size = box.getSize(new Vector3());
  const pool = new Reflector(new PlaneGeometry(size.x, size.z), {
    shader: poolShader,
    textureWidth: compact ? 384 : 768,
    textureHeight: compact ? 256 : 512,
    multisample: 0,
    clipBias: 0.002,
    color: 0x31504a,
  });
  pool.name = 'Reflecting pool';
  pool.rotation.x = -Math.PI / 2;
  box.getCenter(pool.position);
  pool.position.y = box.max.y + 0.003;
  pool.getRenderTarget().texture.colorSpace = LinearSRGBColorSpace;
  scene.add(pool);
  return {
    setPlan(plan) {
      pool.visible = !plan;
      surface.visible = plan;
    },
    update(time, sun) {
      const u = pool.material.uniforms;
      u.time.value = time;
      u.lightDir.value.subVectors(sun.position, sun.target.position).normalize();
      u.lightColor.value.copy(sun.color);
      u.sunStrength.value = sun.intensity;
    },
  };
}

export function addForestBreeze(material, clock, strength) {
  material.customProgramCacheKey = () => `forest-breeze-${strength}`;
  material.onBeforeCompile = shader => {
    shader.uniforms.forestTime = clock;
    shader.vertexShader = 'uniform float forestTime;\n' + shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
       vec4 forestPoint = vec4(transformed, 1.0);
       #ifdef USE_INSTANCING
         forestPoint = instanceMatrix * forestPoint;
       #endif
       vec3 world = (modelMatrix * forestPoint).xyz;
       float amplitude = smoothstep(0.35, 7.0, world.y) * ${strength.toFixed(4)};
       float wave = sin(forestTime * 1.06 + world.x * 0.31 + world.z * 0.21);
       float flutter = sin(forestTime * 2.15 + world.y * 0.77 + world.z * 0.36);
       vec3 sway = vec3(wave * 0.74 + flutter * 0.26, flutter * 0.11, wave * 0.48) * amplitude;
       mvPosition.xyz += (viewMatrix * vec4(sway, 0.0)).xyz;
       gl_Position = projectionMatrix * mvPosition;`
    );
  };
}
