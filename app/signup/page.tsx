"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignUpPage() {
  const router = useRouter();

  const [role, setRole] = useState<"landlord" | "tenant">("tenant");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Save profile in our profiles table
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: authData.user.id,
            full_name: fullName,
            role: role,
            phone: phone,
          },
        ]);

        if (profileError) throw profileError;

        alert(`Account created successfully as a ${role.toUpperCase()}!`);
        router.push(role === "landlord" ? "/dashboard/landlord" : "/dashboard/tenant");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-800/80 border border-slate-700/60 rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-emerald-400 text-sm font-medium mb-3 hover:underline">
            ← Back to Home
          </Link>
          <h1 className="text-2xl font-bold">Create Your Account</h1>
          <p className="text-slate-400 text-sm mt-1">Select your account type to get started</p>
        </div>

        {/* Role Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-1.5 rounded-xl mb-6 border border-slate-700/50">
          <button
            type="button"
            onClick={() => setRole("landlord")}
            className={`py-2 rounded-lg text-sm font-semibold transition ${
              role === "landlord" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            🏢 Landlord
          </button>
          <button
            type="button"
            onClick={() => setRole("tenant")}
            className={`py-2 rounded-lg text-sm font-semibold transition ${
              role === "tenant" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            🔑 Tenant
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg mb-4">
            {errorMsg}
          </div>
        )}

        {/* Sign Up Form */}
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 700 000000"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-sm transition mt-6 ${
              role === "landlord"
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                : "bg-blue-500 hover:bg-blue-400 text-white"
            } disabled:opacity-50`}
          >
            {loading ? "Creating Account..." : `Sign Up as ${role === "landlord" ? "Landlord" : "Tenant"}`}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-400 hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </main>
  );
}