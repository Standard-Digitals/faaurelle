export type AssetKind = "image" | "sequence" | "video" | "audio";

export type PublicAsset = {
  kind: AssetKind;
  src: string;
  alt?: string;
};
