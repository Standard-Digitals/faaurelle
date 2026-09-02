# FA AURELLE cinematic website

Next.js, React Three Fiber, Three.js, GSAP, and Lenis power the product hero.

## Setup

```bash
pnpm install
pnpm dev
```

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Active hero assets

Runtime assets live under `public/`:

- `public/models/hero/fa-aurelle-new-bottle-runtime-v7.glb`
- `public/environments/hero/fa-aurelle-serum-studio-v1.hdr`
- `public/images/products/best-seller-hair-elixir.png`

Editable Blender sources live under `assets/3d/hero/blend/`; the browser never
loads `.blend` files. Asset-generation commands are documented in
`docs/hero-generation/README.md`.
