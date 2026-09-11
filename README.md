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

## Checkout test data

Use this fictional profile when testing delivery serviceability for Zirakpur:

```text
Name: Aarav Mehta
Email: aarav.mehta@example.com
Mobile: 9876543210
Address line 1: Flat 204, Silver Oak Residency
Address line 2: VIP Road
City: Zirakpur
State: Punjab
Pincode: 140603
Country: India
```

For Razorpay **Test Mode only**, use:

```text
Card number: 4111 1111 1111 1111
Expiry: Any future date, such as 12/30
CVV: 123
Name: Test User
OTP: 1234, if prompted
```

Never enter a real card while testing. Confirm that Razorpay Checkout displays
the **Test Mode** indicator before continuing.

## Active hero assets

Runtime assets live under `public/`:

- `public/models/hero/fa-aurelle-new-bottle-runtime-v7.glb`
- `public/environments/hero/fa-aurelle-serum-studio-v1.hdr`
- `public/images/products/best-seller-hair-elixir.png`

Editable Blender sources live under `assets/3d/hero/blend/`; the browser never
loads `.blend` files. Asset-generation commands are documented in
`docs/hero-generation/README.md`.
