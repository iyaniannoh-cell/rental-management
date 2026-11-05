import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-900">
            R
          </div>
          <span className="text-xl font-bold tracking-tight">RentManager</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-300 hover:text-white transition"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium bg-emerald-500 text-slate-950 px-4 py-2 rounded-lg hover:bg-emerald-400 transition"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 py-20 text-center flex flex-col items-center">
        <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full mb-6">
          Simple & Transparent Rental Tracking
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
          Rental Management <br />
          <span className="text-emerald-400">Built for Landlords & Tenants</span>
        </h1>
        <p className="text-slate-400 max-w-2xl text-lg mb-12">
          Track payments, door numbers, and rent due dates seamlessly. Automatic in-app reminders 7 days before payment is due.
        </p>

        {/* Two Portals Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Landlord Card */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-8 text-left hover:border-emerald-500/50 transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl mb-4">
              🏢
            </div>
            <h3 className="text-xl font-bold mb-2">I am a Landlord</h3>
            <p className="text-slate-400 text-sm mb-6">
              Manage your door numbers, view who has paid or owes rent, and keep a clean payment history.
            </p>
            <Link
              href="/signup?role=landlord"
              className="inline-block w-full text-center bg-emerald-500 text-slate-950 font-semibold py-2.5 rounded-lg hover:bg-emerald-400 transition"
            >
              Enter Landlord Portal
            </Link>
          </div>

          {/* Tenant Card */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-8 text-left hover:border-blue-500/50 transition">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-2xl mb-4">
              🔑
            </div>
            <h3 className="text-xl font-bold mb-2">I am a Tenant</h3>
            <p className="text-slate-400 text-sm mb-6">
              View your unit details, check rent due dates, get 7-day payment alerts, and view your receipts.
            </p>
            <Link
              href="/signup?role=tenant"
              className="inline-block w-full text-center bg-blue-500 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-400 transition"
            >
              Enter Tenant Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <footer className="border-t border-slate-800 text-center py-6 text-slate-500 text-xs">
        © {new Date().getFullYear()} RentManager. All rights reserved.
      </footer>
    </main>
  );
}