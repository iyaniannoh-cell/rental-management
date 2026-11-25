"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main className="min-h-screen text-white flex flex-col justify-between relative overflow-x-hidden bg-[#070b12] font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* 🇰🇪 RESPONSIVE STYLISH KENYAN FLAG AMBIENT THEME (Fits Mobile & Desktop perfectly) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Top Black Ambient Depth */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-7xl h-72 bg-gradient-to-b from-black via-black/80 to-transparent"></div>

        {/* Dynamic Center Kenyan Red Glow Orb */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] sm:w-[650px] h-[350px] sm:h-[450px] bg-[#B20000]/25 rounded-full blur-[100px] sm:blur-[140px]"></div>

        {/* Subtle White Glow Fringes */}
        <div className="absolute top-[35%] left-1/2 -translate-x-1/2 w-[280px] sm:w-[500px] h-1 bg-white/30 blur-sm rounded-full"></div>

        {/* Bottom Kenyan Forest Green Ambient Orb */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[350px] sm:w-[750px] h-[300px] sm:h-[400px] bg-[#006600]/30 rounded-full blur-[100px] sm:blur-[140px]"></div>

        {/* Fine Noise / Grid Texture for modern tech feel */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
      </div>

      {/* Top Header - Mobile & Desktop Responsive */}
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-md px-4 sm:px-8 py-3.5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="relative z-30 shrink-0">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center space-x-2 sm:space-x-4 relative z-30">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition px-3 sm:px-4 py-2 rounded-xl hover:bg-white/5"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center flex flex-col items-center relative z-20 text-white">

        {/* Clean Pill Badge */}
        <div className="inline-flex items-center space-x-2 bg-slate-900/90 border border-white/10 text-[11px] sm:text-xs font-semibold px-3.5 sm:px-4 py-1.5 rounded-full mb-6 sm:mb-8 shadow-xl backdrop-blur">
          <span className="flex h-2.5 w-4 rounded-sm overflow-hidden flex-col shadow-sm">
            <span className="h-1/3 bg-black"></span>
            <span className="h-1/3 bg-[#B20000]"></span>
            <span className="h-1/3 bg-[#006600]"></span>
          </span>
          <span className="text-emerald-400 font-bold">Kenya's Rental & Property Platform</span>
        </div>

        {/* Dynamic Heading with Responsive Scaling */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] max-w-4xl">
          Say Goodbye to House Hunting Stress & <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300">
            Messy Landlord Record Books
          </span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mt-4 sm:mt-6 leading-relaxed font-normal">
          <strong>eBoma</strong> connects landlords directly with tenants across Kenya. Browse vacant rooms with photos without broker fees, track M-Pesa payments, and manage move-outs seamlessly.
        </p>

        {/* 3 Core Value Props - Stacked on Mobile, 3-Cols on Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-3xl mt-8 sm:mt-10 text-left">
          <div className="bg-slate-900/80 border border-white/10 p-4 sm:p-5 rounded-2xl backdrop-blur shadow-md">
            <div className="text-base sm:text-lg mb-1 font-bold text-white flex items-center gap-1.5">
              <span>🚫</span> 0 Broker Fees
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              No walking in the sun or paying viewing fees. View photos and book directly with the landlord.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-white/10 p-4 sm:p-5 rounded-2xl backdrop-blur shadow-md">
            <div className="text-base sm:text-lg mb-1 font-bold text-white flex items-center gap-1.5">
              <span>⏰</span> 7-Day Due Alerts
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tenants receive in-app reminders 7 days before rent is due. Zero awkward calls or confrontation.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-white/10 p-4 sm:p-5 rounded-2xl backdrop-blur shadow-md">
            <div className="text-base sm:text-lg mb-1 font-bold text-white flex items-center gap-1.5">
              <span>📊</span> Private Portfolio
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Landlords track each door number, National IDs, and M-Pesa codes in one clean screen.
            </p>
          </div>
        </div>

        {/* Action Cards (Stacked on Mobile, Side-by-Side on Desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-3xl mt-8 sm:mt-12">
          
          {/* Tenant Card */}
          <div className="bg-slate-900/85 border border-white/10 hover:border-blue-500/50 rounded-3xl p-6 sm:p-8 text-left transition backdrop-blur shadow-xl flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center text-xl sm:text-2xl mb-3 sm:mb-4">
                🔑
              </div>
              <span className="text-[11px] text-blue-400 uppercase tracking-wider font-bold">For Tenants</span>
              <h3 className="text-lg sm:text-xl font-bold mt-1 text-white">Find or Manage Your Keja</h3>
              <p className="text-slate-300 text-xs mt-1.5 mb-5 sm:mb-6 leading-relaxed">
                Explore vacant rooms by area, view real building photos, book directly, and manage move-out requests.
              </p>
            </div>
            
            <Link
              href="/signup?role=tenant"
              className="block w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 sm:py-3.5 rounded-xl transition text-xs sm:text-sm shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              Enter as Tenant →
            </Link>
          </div>

          {/* Landlord Card */}
          <div className="bg-slate-900/85 border border-white/10 hover:border-emerald-500/50 rounded-3xl p-6 sm:p-8 text-left transition backdrop-blur shadow-xl flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xl sm:text-2xl mb-3 sm:mb-4">
                🏢
              </div>
              <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-bold">For Landlords</span>
              <h3 className="text-lg sm:text-xl font-bold mt-1 text-white">Manage Properties & Rent</h3>
              <p className="text-slate-300 text-xs mt-1.5 mb-5 sm:mb-6 leading-relaxed">
                Upload doors in bulk, add apartment gallery photos, review National IDs, and verify M-Pesa payments.
              </p>
            </div>

            <Link
              href="/signup?role=landlord"
              className="block w-full text-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 sm:py-3.5 rounded-xl transition text-xs sm:text-sm shadow-lg shadow-emerald-500/30 cursor-pointer"
            >
              Enter as Landlord →
            </Link>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-5 sm:py-6 px-4 sm:px-6 text-center text-xs text-slate-400 relative z-20 bg-slate-950/80">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <Logo size="sm" />
          <p>© 2026 eBoma Technologies Kenya. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}