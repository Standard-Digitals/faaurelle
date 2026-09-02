import * as THREE from "three";
import type { HeroVector3 } from "./hero-presets";

const productTiltEuler = new THREE.Euler();
const productTiltQuaternion = new THREE.Quaternion();
const productRollQuaternion = new THREE.Quaternion();
const productLongitudinalAxis = new THREE.Vector3(0, 1, 0);

export function setHeroProductRoll(
  object: THREE.Object3D,
  tiltX: number,
  rollY: number,
  tiltZ: number,
) {
  productTiltEuler.set(tiltX, 0, tiltZ);
  productTiltQuaternion.setFromEuler(productTiltEuler);
  productRollQuaternion.setFromAxisAngle(productLongitudinalAxis, rollY);
  object.quaternion
    .copy(productTiltQuaternion)
    .multiply(productRollQuaternion);
}

export function mixHeroVector(from: HeroVector3, to: HeroVector3, progress: number): HeroVector3 {
  return [
    THREE.MathUtils.lerp(from[0], to[0], progress),
    THREE.MathUtils.lerp(from[1], to[1], progress),
    THREE.MathUtils.lerp(from[2], to[2], progress),
  ];
}

export function formatHeroVector(vector: { x: number; y: number; z: number }) {
  return `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
}
