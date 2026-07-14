export default function Loading() {
  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-space-black">
      <div className="flex items-center gap-3 font-mono text-xs tracking-[.18em] text-cyber-cyan/60">
        <span className="h-2 w-2 animate-pulse rounded-full bg-cyber-cyan" />
        SYSTEM WIRD GELADEN
      </div>
    </div>
  );
}
