import Link from "next/link";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden selection:bg-emerald-500 selection:text-slate-950">
      
      {/* AUTHENTIC KENYAN FLAG BACKGROUND BANNER & GLOW */}
      <div className="absolute top-0 left-0 right-0 z-0 pointer-events-none flex flex-col items-center">
        {/* Kenyan Flag Strip */}
        <div className="w-full flex flex-col shadow-2xl opacity-40">
          <div className="h-3 w-full bg-black"></div>
          <div className="h-0.5 w-full bg-white"></div>
          <div className="h-3 w-full bg-[#B20000]"></div>
          <div className="h-0.5 w-full bg-white"></div>
          <div className="h-3 w-full bg-[#006600]"></div>
        </div>
        {/* Ambient Glows */}
        <div className="absolute top-4 w-[600px] h-[250px] bg-gradient-to-r from-emerald-600/20 via-[#B20000]/25 to-emerald-600/20 blur-3xl rounded-full"></div>
      </div>

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition px-3 py-2 rounded-lg"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl transition shadow-lg shadow-emerald-500/20"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-16 text-center flex flex-col items-center relative z-10">
        {/* Kenyan Flag Badge */}
        <div className="inline-flex items-center space-x-2.5 bg-slate-900 border border-slate-700 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-8 shadow-xl">
          <span className="flex h-2.5 w-4 rounded-sm overflow-hidden flex-col shadow-sm">
            <span className="h-1/3 bg-black"></span>
            <span className="h-1/3 bg-[#B20000]"></span>
            <span className="h-1/3 bg-[#006600]"></span>
          </span>
          <span className="text-emerald-400 font-bold">Kenya's Smart Rental Management & House Discovery</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight max-w-4xl">
          Say Goodbye to House Hunting Stress & <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Messy Landlord Record Books
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mt-6 leading-relaxed">
          <strong>eBoma</strong> connects landlords directly with tenants. Browse bedsitters and apartments with photos without broker fees, track M-Pesa payments, and manage moves seamlessly.
        </p>

        {/* 3 Core Value Props */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mt-10 text-left">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur">
            <div className="text-xl mb-1">🚫 0 Broker Fees</div>
            <p className="text-xs text-slate-400">No walking in the sun or paying viewing fees. View photos and book directly with the landlord.</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur">
            <div className="text-xl mb-1">⏰ 7-Day Due Alerts</div>
            <p className="text-xs text-slate-400">Tenants receive in-app reminders 7 days before rent is due. Zero awkward calls.</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur">
            <div className="text-xl mb-1">📊 Private Portfolio</div>
            <p className="text-xs text-slate-400">Landlords track each door number, National IDs, and M-Pesa codes in one click.</p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mt-12">
          {/* Tenant Card */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-8 text-left transition group backdrop-blur">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
              🔑
            </div>
            <span className="text-xs text-blue-400 uppercase tracking-wider font-bold">For Tenants</span>
            <h3 className="text-xl font-bold mt-1 text-white">Find or Manage Your Keja</h3>
            <p className="text-slate-400 text-xs mt-2 mb-6 leading-relaxed">
              Explore vacant rooms by area, view real building photos, book directly, and manage move-out requests.
            </p>
            <Link
              href="/signup?role=tenant"
              className="inline-block w-full text-center bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl transition text-sm shadow-lg shadow-blue-500/20"
            >
              Enter as Tenant →
            </Link>
          </div>

          {/* Landlord Card */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-8 text-left transition group backdrop-blur">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
              🏢
            </div>
            <span className="text-xs text-emerald-400 uppercase tracking-wider font-bold">For Landlords</span>
            <h3 className="text-xl font-bold mt-1 text-white">Manage Properties & Rent</h3>
            <p className="text-slate-400 text-xs mt-2 mb-6 leading-relaxed">
              Upload doors in bulk, add apartment gallery photos, review National IDs, and verify M-Pesa payments.
            </p>
            <Link
              href="/signup?role=landlord"
              className="inline-block w-full text-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition text-sm shadow-lg shadow-emerald-500/20"
            >
              Enter as Landlord →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p>© 2026 eBoma Technologies Kenya. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}