import Link from "next/link";

export default function NotFound() {
  return (
    <main className="viewport-min grid place-items-center bg-background px-layout-x text-center text-foreground">
      <div>
        <p className="type-meta uppercase tracking-[0.18em] text-gold">404</p>
        <h1 className="type-editorial-heading mt-4">Page not found</h1>
        <Link
          href="/"
          className="type-cta mt-8 inline-flex text-muted transition hover:text-foreground"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
