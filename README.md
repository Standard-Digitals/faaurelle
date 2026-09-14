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

Client/HQ name: Fa aurelle / the vamana & co.
Pickup/Warehouse name: 1020 tower no 5 southcity apartments vip road zirakpur punjab 140603
Pickup pincode: 140603
Package weight (grams): 150 gms
Dimensions L × W × H: 8cms x 8cms x 13 cms
HSN code: 33059090
seller GSTIN : 04AYUPB0073E1ZS

9056347061

Full name: Amanpreet Singh
Email: amanpreet@gmail.com
Mobile number: 9056347061

Address line 1: Flat 304, Block B, Maya Garden City
Address line 2: Chandigarh–Ambala Highway
Location: Zirakpur
State: Punjab
Pincode: 160104
Country: India
