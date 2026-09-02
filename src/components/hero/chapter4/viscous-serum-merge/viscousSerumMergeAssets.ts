const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const assetRoot = `${basePath}/images/sections/viscous-serum-merge`;

export const viscousSerumAssetPath = `${assetRoot}/serum-blob.png`;

export const externalMoleculeAssetPaths = [
  `${assetRoot}/molecule-01.png`,
  `${assetRoot}/molecule-02.png`,
  `${assetRoot}/molecule-03.png`,
  `${assetRoot}/molecule-04.png`,
] as const;

export const internalMoleculeAssetPaths = [
  `${assetRoot}/internal-molecule-01.png`,
  `${assetRoot}/internal-molecule-02.png`,
  `${assetRoot}/internal-molecule-03.png`,
  `${assetRoot}/internal-molecule-04.png`,
] as const;
