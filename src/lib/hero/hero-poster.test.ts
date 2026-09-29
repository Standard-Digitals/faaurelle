import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { resolveChapterOneLayout } from "./chapter-one-layout";
import { heroPosterData, placeHeroPoster, type HeroPosterData } from "./hero-poster";
import { heroResponsivePresets, type HeroResponsivePresetName } from "./hero-presets";

// Runs the function from its source text, as the inline pre-hydration script
// does, so any dependency on module scope fails here.
const isolatedPlaceHeroPoster = new Function(
  "data",
  "element",
  "window",
  `return (${placeHeroPoster.toString()})(data, element);`,
) as (data: HeroPosterData, element: unknown, window: unknown) => void;

function place(width: number, height: number) {
  const vars: Record<string, number> = {};
  isolatedPlaceHeroPoster(
    heroPosterData,
    {
      clientWidth: width,
      clientHeight: height,
      style: { setProperty: (name: string, value: string) => (vars[name] = parseFloat(value)) },
      setAttribute: () => undefined,
    },
    { innerWidth: width, innerHeight: height },
  );
  return vars;
}

// Where the 3D scene draws the bottle origin, and its pixels per world unit.
function renderedOpening(name: HeroResponsivePresetName, width: number, height: number) {
  const preset = heroResponsivePresets[name];
  const layout = name === "desktopLandscape" ? null : resolveChapterOneLayout(width, height, name, preset);
  const cameraPreset = layout?.openingCamera ?? preset.openingCamera;
  const position = new THREE.Vector3(...(layout?.openingPosition ?? preset.openingPosition));
  const scale = layout?.openingScale ?? preset.openingScale;
  const camera = new THREE.PerspectiveCamera(cameraPreset.fov, width / height);
  camera.position.set(...cameraPreset.position);
  camera.lookAt(...cameraPreset.target);
  camera.updateMatrixWorld();
  const toScreen = (point: THREE.Vector3) => {
    const ndc = point.clone().project(camera);
    return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height };
  };
  const origin = toScreen(position);
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const edge = toScreen(position.clone().addScaledVector(right, scale));
  return { ...origin, s: Math.hypot(edge.x - origin.x, edge.y - origin.y) };
}

describe("placeHeroPoster", () => {
  it.each([
    ["desktopLandscape", 1440, 900],
    ["desktopLandscape", 1920, 1080],
    ["tablet", 768, 1024],
    ["tablet", 1024, 768],
    ["mobilePortrait", 390, 844],
    ["mobilePortrait", 360, 780],
    ["mobilePortrait", 412, 915],
    ["mobileLandscape", 844, 390],
  ] as const)("matches the 3D opening frame for %s at %ix%i", (name, width, height) => {
    const { viewport, crop } = heroPosterData.presets[name];
    const captured = renderedOpening(name, viewport[0], viewport[1]);
    const current = renderedOpening(name, width, height);
    const ratio = current.s / captured.s;
    const vars = place(width, height);

    expect(vars["--hero-poster-x"]).toBeCloseTo(current.x - (captured.x - crop[0]) * ratio, 1);
    expect(vars["--hero-poster-y"]).toBeCloseTo(current.y - (captured.y - crop[1]) * ratio, 1);
    expect(vars["--hero-poster-width"]).toBeCloseTo(crop[2] * ratio, 1);
  });

  it("reproduces the capture crop at the capture viewport", () => {
    const { viewport, crop } = heroPosterData.presets.mobilePortrait;
    const vars = place(viewport[0], viewport[1]);
    expect(vars["--hero-poster-x"]).toBeCloseTo(crop[0], 3);
    expect(vars["--hero-poster-y"]).toBeCloseTo(crop[1], 3);
    expect(vars["--hero-poster-width"]).toBeCloseTo(crop[2], 3);
  });
});
