"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main
      className="min-h-screen text-white flex flex-col justify-between relative overflow-hidden"
      style={{
        background: `
          linear-gradient(
            180deg,
            #050505 0%,
            #0a0a0a 25%,
            #ffffff 27%,
            #B20000 29%,
            #850000 50%,
            #B20000 71%,
            #ffffff 73%,
            #005500 75%,
            #002b00 100%
          )
        `,
      }}
    >
      {/* Soft dark glass overlay so text is crisp and readable */}
      <div className="absolute inset-0 bg-slate-950/65 pointer-events-none z-0"></div>

      {/* Top Header */}
      <header className="border-b border-white/20 bg-black/60 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="relative z-30">
            <Logo size="md" />
          </Link>
          <div className="flex items-center space-x-3 sm:space-x-4 relative z-30">
            <Link
              href="/login"
              className="text-sm font-semibold text-white hover:text-emerald-400 transition px-4 py-2 rounded-xl hover:bg-white/10"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/30"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-16 text-center flex flex-col items-center relative z-20 text-white">

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight max-w-4xl drop-shadow-md">
          Say Goodbye to House Hunting Stress & <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300">
            Messy Landlord Record Books
          </span>
        </h1>

        <p className="text-slate-200 text-base sm:text-lg max-w-2xl mt-6 leading-relaxed font-medium drop-shadow">
          <strong>eBoma</strong> connects landlords directly with tenants across Kenya. Browse bedsitters and apartments with photos without broker fees, track M-Pesa payments, and manage moves seamlessly.
        </p>

        {/* 3 Core Value Props */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mt-10 text-left">
          <div className="bg-black/60 border border-white/20 p-5 rounded-2xl backdrop-blur-md shadow-2xl">
            <div className="text-xl mb-1.5 font-bold text-white">🚫 0 Broker Fees</div>
            <p className="text-xs text-slate-300 leading-relaxed">No walking in the sun or paying viewing fees. View photos and book directly with the landlord.</p>
          </div>
          <div className="bg-black/60 border border-white/20 p-5 rounded-2xl backdrop-blur-md shadow-2xl">
            <div className="text-xl mb-1.5 font-bold text-white">⏰ 7-Day Due Alerts</div>
            <p className="text-xs text-slate-300 leading-relaxed">Tenants receive in-app reminders 7 days before rent is due. Zero awkward calls.</p>
          </div>
          <div className="bg-black/60 border border-white/20 p-5 rounded-2xl backdrop-blur-md shadow-2xl">
            <div className="text-xl mb-1.5 font-bold text-white">📊 Private Portfolio</div>
            <p className="text-xs text-slate-300 leading-relaxed">Landlords track each door number, National IDs, and M-Pesa codes in one click.</p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mt-12">
          
          {/* Tenant Card */}
          <div className="bg-black/75 border border-white/20 hover:border-blue-400 rounded-3xl p-8 text-left transition group backdrop-blur-md shadow-2xl flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
                🔑
              </div>
              <span className="text-xs text-blue-400 uppercase tracking-wider font-bold">For Tenants</span>
              <h3 className="text-xl font-bold mt-1 text-white">Find or Manage Your Keja</h3>
              <p className="text-slate-300 text-xs mt-2 mb-6 leading-relaxed">
                Explore vacant rooms by area, view real building photos, book directly, and manage move-out requests.
              </p>
            </div>
            
            <Link
              href="/signup?role=tenant"
              className="block w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition text-sm shadow-lg shadow-blue-600/40 cursor-pointer relative z-30"
            >
              Enter as Tenant →
            </Link>
          </div>

          {/* Landlord Card */}
          <div className="bg-black/75 border border-white/20 hover:border-emerald-400 rounded-3xl p-8 text-left transition group backdrop-blur-md shadow-2xl flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
                🏢
              </div>
              <span className="text-xs text-emerald-400 uppercase tracking-wider font-bold">For Landlords</span>
              <h3 className="text-xl font-bold mt-1 text-white">Manage Properties & Rent</h3>
              <p className="text-slate-300 text-xs mt-2 mb-6 leading-relaxed">
                Upload doors in bulk, add apartment gallery photos, review National IDs, and verify M-Pesa payments.
              </p>
            </div>

            <Link
              href="/signup?role=landlord"
              className="block w-full text-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl transition text-sm shadow-lg shadow-emerald-500/40 cursor-pointer relative z-30"
            >
              Enter as Landlord →
            </Link>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/20 py-6 px-6 text-center text-xs text-slate-400 relative z-20 bg-black/70 backdrop-blur">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p>© 2026 eBoma Technologies Kenya. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}