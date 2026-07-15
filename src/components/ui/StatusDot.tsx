interface StatusDotProps {
  tone?: "online" | "warning" | "danger" | "idle";
  pulse?: boolean;
}

const tones = {
  online: "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.45)]",
  warning: "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,.35)]",
  danger: "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,.4)]",
  idle: "bg-white/25",
};

export default function StatusDot({
  tone = "online",
  pulse = false,
}: StatusDotProps) {
  return (
    <span className="relative flex h-2 w-2 flex-none">
      {pulse && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-30 ${tones[tone]}`}
        />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${tones[tone]}`} />
    </span>
  );
}
