export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-12 h-12",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  return (
    <div className="flex items-center space-x-2.5">
      {/* Sleek Boma House + Shield Icon */}
      <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-2 flex items-center justify-center shadow-lg shadow-emerald-500/20`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full text-slate-950"
        >
          {/* Modern roof & structure */}
          <path d="M3 9.5L12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20V9.5z" />
          {/* Keyhole / Door detail */}
          <path d="M10 13a2 2 0 1 0 4 0v4h-4v-4z" fill="currentColor" />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col">
        <span className={`font-extrabold tracking-tight text-white leading-none ${textSizes[size]}`}>
          e<span className="text-emerald-400">Boma</span>
        </span>
        <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">
          Keja Yako • Rent Yako
        </span>
      </div>
    </div>
  );
}