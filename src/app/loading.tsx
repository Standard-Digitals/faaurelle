import { brand } from "@/config/brand";

export default function Loading() {
  return (
    <main className="viewport-min grid place-items-center bg-background px-layout-x text-foreground">
      <p className="type-meta uppercase tracking-[0.18em] text-muted">
        Loading {brand.displayName}
      </p>
    </main>
  );
}
