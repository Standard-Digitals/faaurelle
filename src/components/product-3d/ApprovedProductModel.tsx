"use client";

import { useGLTF } from "@react-three/drei";
import {
  forwardRef,
  useEffect,
  useMemo,
  type Ref,
} from "react";
import * as THREE from "three";
import { heroModelPath } from "@/lib/hero/hero-presets";

// Product-space contract exposed to the timeline:
// - four scene units tall
// - base centered at (0, 0, 0)
// - longitudinal/roll axis is local +Y
// - rotation.y === 0 presents the front label toward local +Z
export const canonicalProductHeight = 4;

const newBottleNodeNames = {
  bottleBody: "Bottle_glass",
  label: "bottle_label",
  pump: "Cap_pump.001",
  metal: "Metal",
  innerTube: "Inner tube",
  pipe: "Pipe",
  secondaryShell: "Bottle_glass.001",
} as const;

export type NewBottleParts = {
  bottleBody: THREE.Object3D;
  label: THREE.Object3D;
  pump: THREE.Object3D;
  metal: THREE.Object3D;
  innerTube: THREE.Object3D;
  pipe: THREE.Object3D;
  secondaryShell: THREE.Object3D;
};

function resolveSemanticParts(
  nodes: Map<string, THREE.Object3D>,
): NewBottleParts {
  const missing = Object.entries(newBottleNodeNames).filter(([, nodeName]) => !nodes.has(nodeName));
  if (missing.length > 0) {
    throw new Error(
      `New bottle is missing required semantic parts: ${missing
        .map(([role, nodeName]) => `${role} (${nodeName})`)
        .join(", ")}`,
    );
  }

  return Object.fromEntries(
    Object.entries(newBottleNodeNames).map(([role, nodeName]) => [role, nodes.get(nodeName)]),
  ) as NewBottleParts;
}

function setMeshShadows(node: THREE.Object3D, castShadow: boolean, receiveShadow: boolean) {
  node.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = castShadow;
      object.receiveShadow = receiveShadow;
    }
  });
}

function setGroupRef(ref: Ref<THREE.Group>, node: THREE.Group | null) {
  if (typeof ref === "function") {
    ref(node);
  } else if (ref) {
    ref.current = node;
  }
}

export const CanonicalProductModel = forwardRef<
  THREE.Group,
  {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    visible?: boolean;
    shadows?: boolean;
    onPrepared?: (parts: NewBottleParts | null) => void;
  }
>(function CanonicalProductModel(
  {
    position,
    rotation,
    scale = 1,
    visible = true,
    shadows = true,
    onPrepared,
  },
  forwardedRef,
) {
  const gltf = useGLTF(heroModelPath);
  const prepared = useMemo(() => {
    const model = gltf.scene.clone(true);
    const authoredNodes = new Map<string, THREE.Object3D>();
    const ownedMaterials = new Set<THREE.Material>();

    model.traverse((object) => {
      // GLTFLoader sanitizes Object3D.name for animation paths (for example,
      // `Inner tube` becomes `Inner_tube`). It preserves the authored glTF
      // node name in userData.name, which is the stable adapter input.
      const authoredName = object.userData.name;
      if (typeof authoredName === "string" && authoredName.length > 0) {
        if (authoredNodes.has(authoredName)) {
          throw new Error(`New bottle has duplicate authored node name: ${authoredName}`);
        }
        authoredNodes.set(authoredName, object);
      }

      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      object.castShadow = false;
      object.receiveShadow = false;
      // The current chapter fade mutates material colors. Keep those mutations
      // isolated from Drei's cached GLTF until that transition is redesigned.
      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) => {
          const clone = material.clone();
          ownedMaterials.add(clone);
          return clone;
        });
      } else {
        const clone = object.material.clone();
        ownedMaterials.add(clone);
        object.material = clone;
      }
    });

    const parts = resolveSemanticParts(authoredNodes);
    setMeshShadows(parts.bottleBody, false, false);
    setMeshShadows(parts.secondaryShell, false, false);
    setMeshShadows(parts.innerTube, false, false);
    setMeshShadows(parts.pipe, false, false);
    setMeshShadows(parts.label, shadows, shadows);
    setMeshShadows(parts.pump, shadows, shadows);
    setMeshShadows(parts.metal, shadows, shadows);

    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty()) {
      throw new Error("New bottle has no measurable assembled bounds");
    }
    const bottleBodyBounds = new THREE.Box3().setFromObject(parts.bottleBody);
    if (bottleBodyBounds.isEmpty()) {
      throw new Error("New bottle body has no measurable bounds");
    }
    const size = bounds.getSize(new THREE.Vector3());
    const bottleCenter = bottleBodyBounds.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= Number.EPSILON) {
      throw new Error(`New bottle has an invalid assembled height: ${size.y}`);
    }

    const labelCenter = new THREE.Box3()
      .setFromObject(parts.label)
      .getCenter(new THREE.Vector3());
    if (labelCenter.z <= bottleCenter.z) {
      throw new Error(
        "New bottle front-direction contract failed: label must face assembled +Z",
      );
    }

    const normalizationScale = canonicalProductHeight / size.y;
    const normalizationPosition: [number, number, number] = [
      -bottleCenter.x * normalizationScale,
      -bounds.min.y * normalizationScale,
      -bottleCenter.z * normalizationScale,
    ];

    return {
      model,
      parts,
      normalizationScale,
      normalizationPosition,
      ownedMaterials,
    };
  }, [gltf.scene, shadows]);

  useEffect(() => {
    onPrepared?.(prepared.parts);
    return () => {
      onPrepared?.(null);
      prepared.ownedMaterials.forEach((material) => material.dispose());
    };
  }, [onPrepared, prepared]);

  return (
    <group
      name="productRoot"
      ref={(node) => setGroupRef(forwardedRef, node)}
      position={position}
      rotation={rotation}
      scale={scale}
      visible={visible}
    >
      <group
        name="assetNormalization"
        position={prepared.normalizationPosition}
        scale={prepared.normalizationScale}
      >
        <primitive object={prepared.model} />
      </group>
    </group>
  );
});

useGLTF.preload(heroModelPath);
