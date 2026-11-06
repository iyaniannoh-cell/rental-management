import Link from "next/link";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
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
      <div className="max-w-6xl mx-auto px-6 py-16 text-center flex flex-col items-center">
        {/* Pill Badge */}
        <div className="inline-flex items-center space-x-2 bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
          <span>🇰🇪 Kenya's Smart Rental Management & House Discovery</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight max-w-4xl">
          Say Goodbye to House Hunting Stress & <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Messy Landlord Record Books
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mt-6 leading-relaxed">
          <strong>eBoma</strong> connects landlords directly with tenants. Browse and book vacant bedsitters and apartments without broker fees, track payments, and get automated 7-day rent reminders.
        </p>

        {/* 3 Core Value Props for Kenya */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mt-10 text-left">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <div className="text-xl mb-1">🚫 0 Broker Fees</div>
            <p className="text-xs text-slate-400">No walking in the sun or paying hefty viewing fees. Connect directly with the landlord.</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <div className="text-xl mb-1">⏰ 7-Day Due Alerts</div>
            <p className="text-xs text-slate-400">Tenants receive in-app notifications 7 days before rent is due. Zero awkward confrontation.</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <div className="text-xl mb-1">📊 Private Portfolio</div>
            <p className="text-xs text-slate-400">Landlords track each door number, monthly collections, and verify payments in one click.</p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mt-12">
          {/* Tenant Portal Card */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-8 text-left transition relative overflow-hidden group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
              🔑
            </div>
            <span className="text-xs text-blue-400 uppercase tracking-wider font-bold">For Tenants</span>
            <h3 className="text-xl font-bold mt-1 text-white">Find or Manage Your Keja</h3>
            <p className="text-slate-400 text-xs mt-2 mb-6 leading-relaxed">
              Explore vacant rooms by location and type, book directly with the landlord, and track your payment receipts.
            </p>
            <Link
              href="/signup?role=tenant"
              className="inline-block w-full text-center bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl transition text-sm shadow-lg shadow-blue-500/20"
            >
              Enter as Tenant →
            </Link>
          </div>

          {/* Landlord Portal Card */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-8 text-left transition relative overflow-hidden group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
              🏢
            </div>
            <span className="text-xs text-emerald-400 uppercase tracking-wider font-bold">For Landlords</span>
            <h3 className="text-xl font-bold mt-1 text-white">Manage Properties & Rent</h3>
            <p className="text-slate-400 text-xs mt-2 mb-6 leading-relaxed">
              Upload vacant apartments, approve tenant booking inquiries, trace payment history, and replace messy notebooks.
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
      <footer className="border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p>© 2026 eBoma Technologies Kenya. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}