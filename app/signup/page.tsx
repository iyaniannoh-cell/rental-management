"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

export default function SignUpPage() {
  const router = useRouter();

  const [role, setRole] = useState<"landlord" | "tenant">("tenant");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setRedirecting(false);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, phone, role }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.alreadyExists) {
          setErrorMsg(result.error);
          setRedirecting(true);
          setTimeout(() => {
            router.push(`/login?email=${encodeURIComponent(email)}`);
          }, 2000);
          return;
        }
        throw new Error(result.error || "Signup failed.");
      }

      // Automatically sign in the user
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (loginError) throw loginError;

      alert(`Account created successfully as a ${role.toUpperCase()}!`);
      router.push(role === "landlord" ? "/dashboard/landlord" : "/dashboard/tenant");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-cover bg-center"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=85')`,
      }}
    >
      {/* Dark Glass Shade Overlay for contrast & readability */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-0"></div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10 backdrop-blur-md">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Link href="/">
              <Logo size="sm" />
            </Link>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Create Your Account</h1>
          <p className="text-slate-400 text-xs mt-1">Join eBoma to manage or find your keja</p>
        </div>

        {/* Role Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setRole("landlord")}
            className={`py-2 rounded-xl text-xs font-bold transition ${
              role === "landlord" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            🏢 Landlord
          </button>
          <button
            type="button"
            onClick={() => setRole("tenant")}
            className={`py-2 rounded-xl text-xs font-bold transition ${
              role === "tenant" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            🔑 Tenant
          </button>
        </div>

        {/* Error / Redirect Banner */}
        {errorMsg && (
          <div className="bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs p-4 rounded-2xl space-y-2">
            <div className="flex items-start space-x-2">
              <span className="text-base">⚠️</span>
              <p className="font-semibold leading-relaxed">{errorMsg}</p>
            </div>
            {redirecting && (
              <p className="text-blue-400 font-bold animate-pulse text-[11px]">
                Redirecting you to Log In in 2 seconds...
              </p>
            )}
            <Link
              href={`/login?email=${encodeURIComponent(email)}`}
              className="inline-block mt-1 font-bold text-emerald-400 hover:underline bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/40"
            >
              Click here to Log In Now →
            </Link>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Derrick Shisanya"
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 700 000000"
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition mt-4 ${
              role === "landlord"
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
            } disabled:opacity-50 shadow-lg cursor-pointer`}
          >
            {loading ? "Creating Account..." : `Sign Up as ${role === "landlord" ? "Landlord" : "Tenant"}`}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 pt-3 border-t border-slate-800">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-400 font-bold hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </main>
  );
}