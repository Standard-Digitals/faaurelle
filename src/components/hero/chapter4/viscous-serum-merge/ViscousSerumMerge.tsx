"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  externalMoleculeAssetPaths,
  internalMoleculeAssetPaths,
  viscousSerumAssetPath,
} from "./viscousSerumMergeAssets";
import styles from "./ViscousSerumMerge.module.css";

type VisualStyle = CSSProperties & Record<`--${string}`, string | number>;

const externalMolecules = [
  { asset: 0, className: styles.moleculeOne, start: 0.56 },
  { asset: 1, className: styles.moleculeTwo, start: 0.61 },
  { asset: 2, className: styles.moleculeThree, start: 0.66 },
  { asset: 3, className: styles.moleculeFour, start: 0.71 },
  { asset: 1, className: styles.moleculeFive, start: 0.74 },
  { asset: 3, className: styles.moleculeSix, start: 0.77 },
  { asset: 0, className: styles.moleculeSeven, start: 0.79 },
  { asset: 2, className: styles.moleculeEight, start: 0.81 },
  { asset: 1, className: styles.moleculeNine, start: 0.83 },
  { asset: 3, className: styles.moleculeTen, start: 0.85 },
] as const;

const internalMolecules = [0, 1, 2, 3, 0, 2, 3, 1, 0, 2] as const;
const sequenceStartProgress = 0.22;
export const viscousSerumSequenceEndProgress = 0.9;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(Math.max(value, minimum), maximum);
}

function smoothStep(value: number) {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
}

export function ViscousSerumMerge({ progress }: { progress: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const normalizedProgress = clamp(
    (progress - sequenceStartProgress) /
      (viscousSerumSequenceEndProgress - sequenceStartProgress),
  );
  const isComplete = normalizedProgress >= 0.985;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting && entry.intersectionRatio > 0.05),
      { threshold: [0, 0.05] },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const stageStyle: VisualStyle = {
    "--progress": normalizedProgress.toFixed(4),
    "--serum-mask": `url("${viscousSerumAssetPath}")`,
  };
  const ambientActive = isComplete && isVisible;

  return (
    <div
      ref={rootRef}
      className={styles.visual}
      data-ambient-active={ambientActive ? "true" : "false"}
      style={stageStyle}
      aria-hidden="true"
    >
      <div className={styles.externalLayer}>
        {externalMolecules.map((molecule, index) => {
          const absorb = smoothStep(
            (normalizedProgress - molecule.start) / Math.max(0.94 - molecule.start, 0.001),
          );
          const moleculeStyle: VisualStyle = { "--absorb": absorb.toFixed(4) };

          return (
            <Image
              key={`${molecule.asset}-${index}`}
              src={externalMoleculeAssetPaths[molecule.asset]}
              alt=""
              width={1312}
              height={1300}
              sizes="(max-width: 767px) 30vw, 17vw"
              className={`${styles.externalMolecule} ${molecule.className}`}
              style={moleculeStyle}
              draggable={false}
            />
          );
        })}
      </div>

      <div className={styles.serumUnit}>
        <Image
          src={viscousSerumAssetPath}
          alt=""
          width={1350}
          height={1165}
          sizes="(max-width: 767px) 92vw, (max-width: 1100px) 57vw, 46vw"
          className={styles.serumAsset}
          draggable={false}
        />

        <div className={styles.internalLayer}>
          {internalMolecules.map((assetIndex, index) => {
            const revealStart = 0.59 + index * 0.025;
            const reveal = smoothStep(
              (normalizedProgress - revealStart) / Math.max(0.94 - revealStart, 0.001),
            );
            const moleculeStyle: VisualStyle = { "--reveal": reveal.toFixed(4) };

            return (
              <Image
                key={`${assetIndex}-${index}`}
                src={internalMoleculeAssetPaths[assetIndex]}
                alt=""
                width={1536}
                height={1199}
                sizes="(max-width: 767px) 27vw, 14vw"
                className={`${styles.internalMolecule} ${styles[`internalMolecule${index + 1}`]}`}
                style={moleculeStyle}
                draggable={false}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.fusionGlow} />
    </div>
  );
}
