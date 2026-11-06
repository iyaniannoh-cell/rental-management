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

  const isExistingAccount =
    errorMsg.toLowerCase().includes("already exists") ||
    errorMsg.toLowerCase().includes("please log in");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Call our custom server API route
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, phone, role }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Signup failed.");
      }

      // 2. Auto sign in
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
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
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Link href="/">
              <Logo size="sm" />
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create Your Account</h1>
          <p className="text-slate-400 text-xs mt-1">Join eBoma to manage or find your keja</p>
        </div>

        {/* Role Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setRole("landlord")}
            className={`py-2 rounded-xl text-xs font-bold transition ${
              role === "landlord" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            🏢 Landlord
          </button>
          <button
            type="button"
            onClick={() => setRole("tenant")}
            className={`py-2 rounded-xl text-xs font-bold transition ${
              role === "tenant" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            🔑 Tenant
          </button>
        </div>

        {/* HUMAN-FRIENDLY ERROR BANNER */}
        {errorMsg && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs p-4 rounded-2xl space-y-2">
            <div className="flex items-start space-x-2">
              <span className="text-base">⚠️</span>
              <p className="font-medium leading-relaxed">{errorMsg}</p>
            </div>
            {isExistingAccount && (
              <Link
                href="/login"
                className="inline-block mt-2 font-bold text-emerald-400 hover:underline bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30"
              >
                Go to Log In Screen →
              </Link>
            )}
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="derrick@gmail.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-bold text-xs transition mt-4 ${
              role === "landlord"
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                : "bg-blue-500 hover:bg-blue-400 text-white"
            } disabled:opacity-50`}
          >
            {loading ? "Creating Account..." : `Sign Up as ${role === "landlord" ? "Landlord" : "Tenant"}`}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-400 hover:underline font-semibold">
            Log In
          </Link>
        </p>
      </div>
    </main>
  );
}