export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      {/* brilho sutil de fundo, no tom da marca */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--brand-muted),transparent_70%)] opacity-40"
      />
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}
