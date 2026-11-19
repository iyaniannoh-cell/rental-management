"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

const COUNTRY_CODES = [
  { code: "+254", name: "Kenya 🇰🇪" },
  { code: "+256", name: "Uganda 🇺🇬" },
  { code: "+255", name: "Tanzania 🇹🇿" },
  { code: "+250", name: "Rwanda 🇷🇼" },
  { code: "+251", name: "Ethiopia 🇪🇹" },
  { code: "+1", name: "USA / Canada 🇺🇸" },
  { code: "+44", name: "UK 🇬🇧" },
];

export default function SignUpPage() {
  const router = useRouter();

  const [role, setRole] = useState<"landlord" | "tenant">("tenant");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [countryCode, setCountryCode] = useState("+254");
  const [phoneRaw, setPhoneRaw] = useState("");
  const [idNumber, setIdNumber] = useState("");

  // Pre-allocated Room Code & Auto-fill status
  const [hasAllocatedRoom, setHasAllocatedRoom] = useState(false);
  const [allocationCode, setAllocationCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeMatchedUnit, setCodeMatchedUnit] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  // Auto-fetch landlord's pre-assigned details when 6-char code is entered
  const handleCodeLookup = async (codeToTest: string) => {
    const clean = codeToTest.trim().toUpperCase();
    setAllocationCode(clean);

    if (clean.length >= 6) {
      setVerifyingCode(true);
      setErrorMsg("");
      try {
        const { data: unitData, error } = await supabase
          .from("units")
          .select("*")
          .ilike("claim_code", clean)
          .maybeSingle();

        if (error || !unitData) {
          setCodeMatchedUnit(null);
          setErrorMsg(`No room found with code "${clean}". Please verify with your landlord.`);
        } else {
          setCodeMatchedUnit(unitData);
          // AUTO-FILL DETAILS FROM LANDLORD DATABASE!
          if (unitData.assigned_tenant_name) setFullName(unitData.assigned_tenant_name);
          if (unitData.assigned_tenant_id_number) setIdNumber(unitData.assigned_tenant_id_number);
          if (unitData.assigned_tenant_phone) {
            // Strip leading +254 or zero if present
            const cleanPhone = unitData.assigned_tenant_phone.replace(/^\+254|^254|^0/, "");
            setPhoneRaw(cleanPhone);
          }
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setVerifyingCode(false);
      }
    } else {
      setCodeMatchedUnit(null);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numbersOnly = e.target.value.replace(/\D/g, "");
    if (numbersOnly.length <= 15) setPhoneRaw(numbersOnly);
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numbersOnly = e.target.value.replace(/\D/g, "");
    if (numbersOnly.length <= 15) setIdNumber(numbersOnly);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setRedirecting(false);

    const fullPhoneNumber = `${countryCode}${phoneRaw}`;

    if (phoneRaw.length < 7 || phoneRaw.length > 15) {
      setErrorMsg("Phone number must contain between 7 and 15 digits (numbers only).");
      setLoading(false);
      return;
    }

    try {
      // 1. Call server signup API
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phone: fullPhoneNumber,
          role,
        }),
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

      // 2. Sign in user
      const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (loginError) throw loginError;

      // 3. Save National ID to profile
      if (idNumber && authData.user) {
        await supabase
          .from("profiles")
          .update({ id_number: idNumber })
          .eq("id", authData.user.id);
      }

      // 4. Auto-link pre-allocated room if matched!
      if (codeMatchedUnit && authData.user) {
        await supabase
          .from("units")
          .update({
            tenant_id: authData.user.id,
            booking_status: "occupied",
            is_vacant: false,
            lease_completed: true,
          })
          .eq("id", codeMatchedUnit.id);

        if (codeMatchedUnit.landlord_id) {
          await supabase.from("notifications").insert([
            {
              user_id: codeMatchedUnit.landlord_id,
              title: "Pre-allocated Tenant Registered! 🔑",
              message: `${fullName} has completed registration and claimed ${codeMatchedUnit.door_number} at ${codeMatchedUnit.apartment_name} using code: ${codeMatchedUnit.claim_code}.`,
            },
          ]);
        }

        alert(`Welcome ${fullName}! Your allocated room (${codeMatchedUnit.door_number} at ${codeMatchedUnit.apartment_name}) has been linked to your account!`);
      } else {
        alert(`Account created successfully as a ${role.toUpperCase()}!`);
      }

      router.push(role === "landlord" ? "/dashboard/landlord" : "/dashboard/tenant");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-cover bg-center font-sans"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=85')`,
      }}
    >
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm z-0"></div>

      <div className="w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-5 relative z-10 backdrop-blur-md">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <Link href="/">
              <Logo size="sm" />
            </Link>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Create Your Account</h1>
          <p className="text-slate-400 text-xs mt-1">Join eBoma to manage or find your keja</p>
        </div>

        {/* Role Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
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

        {errorMsg && (
          <div className="bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs p-4 rounded-2xl space-y-2">
            <div className="flex items-start space-x-2">
              <span className="text-base">⚠️</span>
              <p className="font-semibold leading-relaxed">{errorMsg}</p>
            </div>
            {redirecting && (
              <p className="text-blue-400 font-bold animate-pulse text-[11px]">
                Redirecting to Log In in 2 seconds...
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-3.5">
          {/* ALLOCATION CODE SECTION (TENANTS ONLY) */}
          {role === "tenant" && (
            <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl space-y-3">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAllocatedRoom}
                  onChange={(e) => {
                    setHasAllocatedRoom(e.target.checked);
                    if (!e.target.checked) setCodeMatchedUnit(null);
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-bold text-white">
                  Has a room already been allocated to you by your landlord?
                </span>
              </label>

              {hasAllocatedRoom && (
                <div className="pt-1 animate-in fade-in space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-semibold text-blue-400">
                      Enter Landlord Allocation Code *
                    </label>
                    {verifyingCode && <span className="text-[10px] text-amber-400 animate-pulse">Checking database...</span>}
                  </div>
                  <input
                    type="text"
                    required={hasAllocatedRoom}
                    value={allocationCode}
                    onChange={(e) => handleCodeLookup(e.target.value)}
                    placeholder="e.g. EB-7492"
                    className="w-full bg-slate-900 border border-blue-500/50 rounded-xl px-3 py-2 text-sm text-white uppercase font-mono font-bold tracking-wider placeholder-slate-600 focus:outline-none focus:border-blue-400"
                  />

                  {/* AUTO-FILL CONFIRMATION BADGE */}
                  {codeMatchedUnit && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 space-y-1">
                      <div className="font-bold">✅ Verified: {codeMatchedUnit.apartment_name} ({codeMatchedUnit.door_number})</div>
                      <p className="text-[11px] text-slate-300">
                        Details auto-filled from landlord records! You only need to create your <strong>Email & Password</strong> below.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Name {codeMatchedUnit && <span className="text-emerald-400 text-[10px] font-bold">✓ Auto-filled</span>}
            </label>
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
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Phone Number {codeMatchedUnit && <span className="text-emerald-400 text-[10px] font-bold">✓ Auto-filled</span>}
              </label>
              <span className="text-[10px] text-slate-500 font-mono">{phoneRaw.length}/15</span>
            </div>
            <div className="flex rounded-xl overflow-hidden border border-slate-700 bg-slate-950/80 focus-within:border-emerald-500">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-slate-900 text-slate-200 text-xs font-bold px-2.5 py-2.5 border-r border-slate-700 focus:outline-none cursor-pointer"
              >
                {COUNTRY_CODES.map((item) => (
                  <option key={item.code} value={item.code}>{item.name} ({item.code})</option>
                ))}
              </select>

              <input
                type="tel"
                required
                value={phoneRaw}
                onChange={handlePhoneChange}
                placeholder="700000000"
                maxLength={15}
                className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300">
                National ID Number {codeMatchedUnit && <span className="text-emerald-400 text-[10px] font-bold">✓ Auto-filled</span>}
              </label>
              <span className="text-[10px] text-slate-500 font-mono">{idNumber.length}/15</span>
            </div>
            <input
              type="text"
              value={idNumber}
              onChange={handleIdChange}
              placeholder="e.g. 34567890"
              maxLength={15}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password *</label>
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
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition mt-3 ${
              role === "landlord"
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
            } disabled:opacity-50 shadow-lg cursor-pointer`}
          >
            {loading ? "Creating Account..." : `Sign Up as ${role === "landlord" ? "Landlord" : "Tenant"}`}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-400 font-bold hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </main>
  );
}