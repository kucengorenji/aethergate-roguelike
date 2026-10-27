import {
  abs,
  atan,
  dot,
  float,
  fwidth,
  instancedBufferAttribute,
  length,
  max,
  min,
  mix,
  select,
  sin,
  smoothstep,
  uniform,
  uv,
  vec4,
} from 'three/tsl';
import * as THREE from 'three/webgpu';

/**
 * Effect materials in TSL, so they compile for both renderer backends. Every
 * one reads a per-instance color (linear RGB, HDR allowed, and alpha) and
 * outputs premultiplied color: alpha 0 adds light (sparks, glows), alpha above
 * 0 covers what is behind (smoke, ash), and both share one draw call.
 */

/** A per-instance attribute the renderer rewrites every frame. */
export function instanceAttribute(count: number, size: number): THREE.InstancedBufferAttribute {
  const attribute = new THREE.InstancedBufferAttribute(new Float32Array(count * size), size);
  attribute.setUsage(THREE.DynamicDrawUsage);
  return attribute;
}

/** Marks the first `count` floats of a per-instance attribute for upload. */
export function upload(attribute: THREE.BufferAttribute, count: number): void {
  if (count <= 0) return;
  attribute.clearUpdateRanges();
  attribute.addUpdateRange(0, count);
  attribute.needsUpdate = true;
}

function premultiplied(): THREE.MeshBasicNodeMaterial {
  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
  });
  material.blending = THREE.CustomBlending;
  material.blendSrc = THREE.OneFactor;
  material.blendDst = THREE.OneMinusSrcAlphaFactor;
  material.blendSrcAlpha = THREE.OneFactor;
  material.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  return material;
}

/** Soft round sprites with a hot core; stretched along velocity they become streaks. */
export function spriteMaterial(
  colors: THREE.InstancedBufferAttribute,
): THREE.MeshBasicNodeMaterial {
  const material = premultiplied();
  const c = instancedBufferAttribute<'vec4'>(colors, 'vec4');
  const p = uv().mul(2).sub(1);
  const d = max(float(1).sub(dot(p, p)), 0);
  const mask = d.mul(d);
  material.colorNode = vec4(c.xyz.mul(mask), c.w.mul(mask));
  return material;
}

/**
 * Ribbons from tail (uv.y 0) to head (uv.y 1): `style` 0 is a trail that fades
 * toward its tail, 1 a beam that is even along its length (lightning).
 */
export function ribbonMaterial(
  colors: THREE.InstancedBufferAttribute,
  styles: THREE.InstancedBufferAttribute,
): THREE.MeshBasicNodeMaterial {
  const material = premultiplied();
  const c = instancedBufferAttribute<'vec4'>(colors, 'vec4');
  const style = instancedBufferAttribute<'float'>(styles, 'float');
  const across = uv().x.mul(2).sub(1);
  const side = max(float(1).sub(across.mul(across)), 0);
  const trail = uv().y.pow(1.6);
  const beam = float(1).sub(abs(uv().y.mul(2).sub(1)).pow(6));
  const along = mix(trail, beam, style);
  // A soft body plus a bright thin core line.
  const mask = along.mul(side.mul(0.7).add(side.pow(8)));
  material.colorNode = vec4(c.xyz.mul(mask), c.w.mul(mask));
  return material;
}

/** Uniforms the decal material shares, set from config each frame. */
export interface DecalUniforms {
  rimAlpha: { value: number };
  fillAlpha: { value: number };
  glow: { value: number };
  time: { value: number };
}

/**
 * Ground decals drawn on a 2 x 2 quad in local x and -z (uv.y = 1 is the front).
 * Per instance: `shapes` = (shape, progress, param, rim width relative to the
 * x half extent) and `colors` = (linear RGB, strength). See `DecalShape`.
 */
export function decalMaterial(
  shapes: THREE.InstancedBufferAttribute,
  colors: THREE.InstancedBufferAttribute,
): { material: THREE.MeshBasicNodeMaterial; uniforms: DecalUniforms } {
  const material = premultiplied();
  const uniforms = {
    rimAlpha: uniform(0.95),
    fillAlpha: uniform(0.24),
    glow: uniform(2.6),
    time: uniform(0),
  };
  const s = instancedBufferAttribute<'vec4'>(shapes, 'vec4');
  const c = instancedBufferAttribute<'vec4'>(colors, 'vec4');
  const shape = s.x;
  const progress = s.y;
  const param = s.z;
  const rim = s.w;
  const p = uv().mul(2).sub(1);
  const r = length(p);
  const one = float(1);
  // Angle from the front (+y in uv space, -z in the world).
  const angle = atan(p.x, p.y);

  // Distance inside the shape's edge, in units of the x half extent.
  const discEdge = one.sub(r);
  const sectorEdge = min(one.sub(r), param.sub(abs(angle)).mul(r));
  const stripEdge = min(one.sub(abs(p.x)), one.sub(abs(p.y)).mul(param));
  const bandEdge = min(one.sub(r), r.sub(param));
  const isDisc = shape.lessThan(0.5);
  const isSector = shape.lessThan(1.5);
  const isStrip = shape.lessThan(2.5);
  // Bands and waves; waves are told apart below.
  const isBand = shape.greaterThan(2.5);
  const edge = select(
    isDisc,
    discEdge,
    select(isSector, sectorEdge, select(isStrip, stripEdge, bandEdge)),
  );
  const aa = max(fwidth(edge), 0.002);
  const inside = smoothstep(aa.negate(), aa, edge);
  const rimMask = inside.mul(one.sub(smoothstep(rim.sub(aa), rim.add(aa), edge)));

  // How far into the fill a point is: from the center, or from the strip's back edge.
  const along = select(isSector, r, p.y.add(1).mul(0.5));
  const filled = inside.mul(one.sub(smoothstep(progress.sub(aa), progress.add(aa), along)));
  // The growing edge of the fill is brighter, so the countdown reads at a glance.
  const lead = smoothstep(progress.sub(0.15), progress, along).mul(filled);

  // The burning band: flickering fire, strongest at the inner edge.
  const depth = r.sub(param).div(max(one.sub(param), 0.001));
  const flicker = sin(angle.mul(9).add(uniforms.time.mul(5)).add(r.mul(25)))
    .mul(sin(angle.mul(4).sub(uniforms.time.mul(3))))
    .mul(0.35)
    .add(0.65);
  const fire = inside.mul(one.sub(depth).pow(1.5)).mul(flicker).mul(0.85);

  // Shockwaves: a soft ring at `progress` of the radius.
  const wave = smoothstep(0, rim.mul(1.5), rim.mul(1.5).sub(abs(r.sub(progress))));

  const isWave = shape.greaterThan(3.5);
  const rimA = select(isWave, wave, rimMask).mul(uniforms.rimAlpha);
  const fillA = select(
    isWave,
    float(0),
    select(isBand, fire, filled.mul(uniforms.fillAlpha).mul(lead.mul(0.8).add(1))),
  ).mul(one.sub(rimA));
  const alpha = rimA.add(fillA).mul(c.w);
  // Shockwaves glow softer than telegraph rims, so a burst never outshines a warning.
  const rimGlow = uniforms.glow.mul(select(isWave, float(0.55), float(1)));
  const light = rimA.mul(rimGlow).add(fillA.mul(select(isBand, uniforms.glow, float(1))));
  material.colorNode = vec4(c.xyz.mul(light).mul(c.w), alpha);
  return { material, uniforms };
}
