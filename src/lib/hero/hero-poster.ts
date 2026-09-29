import { chapterOneFitConfig } from "@/lib/hero/chapter-one-layout";
import { heroResponsivePresets, type HeroResponsivePresetName } from "@/lib/hero/hero-presets";
import { responsiveBreakpoints } from "@/lib/responsive";

// Pre-rendered stills of the hero canvas's opening frame, shown while the 3D
// scene loads. Each was captured at `viewport` and cropped to the bottle;
// `crop` is that crop in the captured canvas's CSS pixels.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const posterCaptures: Record<
  HeroResponsivePresetName,
  { src: string; viewport: [number, number]; crop: [number, number, number, number] }
> = {
  desktopLandscape: {
    src: `${basePath}/images/hero/poster/desktop.webp`,
    viewport: [1440, 900],
    crop: [515.5, 247, 596.5, 653],
  },
  tablet: {
    src: `${basePath}/images/hero/poster/tablet.webp`,
    viewport: [768, 1024],
    crop: [185, 517.5, 477.5, 506.5],
  },
  mobilePortrait: {
    src: `${basePath}/images/hero/poster/mobile-portrait.webp`,
    viewport: [390, 844],
    crop: [41, 446, 349, 398],
  },
  mobileLandscape: {
    src: `${basePath}/images/hero/poster/mobile-landscape.webp`,
    viewport: [844, 390],
    crop: [347, 239.5, 145, 150.5],
  },
};

// Same preset order and conditions as resolveHeroResponsivePreset, as media
// queries so the browser downloads only the matching poster.
export const heroPosterSources = [
  {
    media: `(max-width: ${responsiveBreakpoints.mobile - 1}px) and (orientation: portrait)`,
    src: posterCaptures.mobilePortrait.src,
  },
  {
    media: `(max-width: ${responsiveBreakpoints.mobileLandscape - 1}px) and (orientation: landscape)`,
    src: posterCaptures.mobileLandscape.src,
  },
  {
    media: `(max-width: ${responsiveBreakpoints.tablet}px)`,
    src: posterCaptures.tablet.src,
  },
] as const;

export const heroPosterFallbackSrc = posterCaptures.desktopLandscape.src;

export type HeroPosterData = {
  breakpoints: typeof responsiveBreakpoints;
  presets: Record<
    HeroResponsivePresetName,
    {
      camera: { position: number[]; target: number[]; fov: number };
      position: number[];
      scale: number;
      fit: null | {
        referencePortrait: readonly number[];
        referenceLandscape: readonly number[];
        minimumScaleFactor: number;
        textZoneRatio: number;
        minimumGap: number;
        bottomClearance: number;
        maximumVerticalCorrection: number;
      };
      viewport: [number, number];
      crop: [number, number, number, number];
    }
  >;
};

function posterPreset(name: HeroResponsivePresetName): HeroPosterData["presets"][HeroResponsivePresetName] {
  const preset = heroResponsivePresets[name];
  return {
    camera: preset.openingCamera,
    position: preset.openingPosition,
    scale: preset.openingScale,
    fit: name === "desktopLandscape" ? null : chapterOneFitConfig[name],
    viewport: posterCaptures[name].viewport,
    crop: posterCaptures[name].crop,
  };
}

export const heroPosterData: HeroPosterData = {
  breakpoints: responsiveBreakpoints,
  presets: {
    desktopLandscape: posterPreset("desktopLandscape"),
    tablet: posterPreset("tablet"),
    mobilePortrait: posterPreset("mobilePortrait"),
    mobileLandscape: posterPreset("mobileLandscape"),
  },
};

/**
 * Positions the poster so its bottle sits where the 3D bottle's opening frame
 * will render: it mirrors resolveHeroResponsivePreset and
 * resolveChapterOneLayout, projects the bottle's origin through the opening
 * camera, and scales the capture by the ratio against its capture viewport.
 *
 * It also runs as an inline script before hydration, via toString(), so it
 * must stay self-contained: no imports, closures or helpers.
 */
export function placeHeroPoster(data: HeroPosterData, element: HTMLElement) {
  function resolve(width: number, height: number) {
    const b = data.breakpoints;
    const name =
      width < b.mobile && height >= width
        ? "mobilePortrait"
        : width < b.mobileLandscape && width > height
          ? "mobileLandscape"
          : width <= b.tablet
            ? "tablet"
            : "desktopLandscape";
    const preset = data.presets[name];
    const fit = preset.fit;
    if (!fit) {
      return {
        name: name,
        cameraPosition: preset.camera.position,
        cameraTarget: preset.camera.target,
        position: preset.position,
        scale: preset.scale,
      };
    }

    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const reference = h >= w ? fit.referencePortrait : fit.referenceLandscape;
    const availableBottleHeight = Math.max(
      1,
      h - h * fit.textZoneRatio - fit.minimumGap - fit.bottomClearance,
    );
    const referenceBottleHeight =
      reference[1] - reference[1] * fit.textZoneRatio - fit.minimumGap - fit.bottomClearance;
    const scaleFactor = Math.min(
      1,
      Math.max(
        fit.minimumScaleFactor,
        Math.min(w / reference[0], availableBottleHeight / referenceBottleHeight, 1),
      ),
    );
    const shortViewportPressure = Math.min(1, Math.max(0, 1 - h / reference[1]));
    const horizontalFit = Math.min(
      1.08,
      Math.max(0.82, w / h / (reference[0] / reference[1])),
    );
    const verticalCorrection = Math.min(
      fit.maximumVerticalCorrection,
      shortViewportPressure * fit.maximumVerticalCorrection,
    );
    const offsetX = preset.position[0] * (horizontalFit - 1) * 0.35;
    const offsetY = -verticalCorrection * 0.2;

    return {
      name: name,
      cameraPosition: [
        preset.camera.position[0] + offsetX,
        preset.camera.position[1] + offsetY,
        preset.camera.position[2],
      ],
      cameraTarget: [
        preset.camera.target[0] + offsetX,
        preset.camera.target[1] + offsetY,
        preset.camera.target[2],
      ],
      position: [
        preset.position[0] * horizontalFit,
        preset.position[1] - verticalCorrection,
        preset.position[2],
      ],
      scale: preset.scale * scaleFactor,
    };
  }

  // Screen position of the bottle origin and screen pixels per world unit of
  // bottle, for a canvas of canvasWidth x canvasHeight.
  function project(
    pose: ReturnType<typeof resolve>,
    fov: number,
    canvasWidth: number,
    canvasHeight: number,
  ) {
    const c = pose.cameraPosition;
    const t = pose.cameraTarget;
    let fx = t[0] - c[0];
    let fy = t[1] - c[1];
    let fz = t[2] - c[2];
    const fl = Math.sqrt(fx * fx + fy * fy + fz * fz);
    fx /= fl;
    fy /= fl;
    fz /= fl;
    // right = forward x up(0, 1, 0); up' = right x forward
    let rx = -fz;
    let rz = fx;
    const rl = Math.sqrt(rx * rx + rz * rz);
    rx /= rl;
    rz /= rl;
    const ux = -rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy;
    const vx = pose.position[0] - c[0];
    const vy = pose.position[1] - c[1];
    const vz = pose.position[2] - c[2];
    const depth = vx * fx + vy * fy + vz * fz;
    const focal = canvasHeight / 2 / Math.tan((fov * Math.PI) / 360);

    return {
      x: canvasWidth / 2 + ((vx * rx + vz * rz) / depth) * focal,
      y: canvasHeight / 2 - ((vx * ux + vy * uy + vz * uz) / depth) * focal,
      s: (pose.scale * focal) / depth,
    };
  }

  const pose = resolve(window.innerWidth, window.innerHeight);
  const preset = data.presets[pose.name as HeroResponsivePresetName];
  const fov = preset.camera.fov;
  const current = project(pose, fov, element.clientWidth, element.clientHeight);
  const captureViewport = preset.viewport;
  const captured = project(
    resolve(captureViewport[0], captureViewport[1]),
    fov,
    captureViewport[0],
    captureViewport[1],
  );
  const ratio = current.s / captured.s;
  const crop = preset.crop;

  element.style.setProperty("--hero-poster-x", `${current.x - (captured.x - crop[0]) * ratio}px`);
  element.style.setProperty("--hero-poster-y", `${current.y - (captured.y - crop[1]) * ratio}px`);
  element.style.setProperty("--hero-poster-width", `${crop[2] * ratio}px`);
  element.setAttribute("data-hero-poster-placed", "true");
}
