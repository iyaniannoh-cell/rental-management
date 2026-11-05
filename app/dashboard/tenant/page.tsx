"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function TenantDashboard() {
  const router = useRouter();

  // Tenant state
  const [tenantInfo] = useState({
    name: "Ian Onyango",
    doorNumber: "Unit B-104",
    monthlyRent: 25000,
    dueDate: "2026-11-12",
  });

  const [hasPaidThisMonth, setHasPaidThisMonth] = useState(false);

  const [paymentHistory, setPaymentHistory] = useState([
    { id: 1, date: "2026-10-05", amount: 25000, status: "Verified", method: "M-Pesa / Bank" },
    { id: 2, date: "2026-09-04", amount: 25000, status: "Verified", method: "M-Pesa / Bank" },
  ]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handlePayRent = () => {
    setHasPaidThisMonth(true);
    setPaymentHistory([
      {
        id: Date.now(),
        date: new Date().toISOString().split("T")[0],
        amount: tenantInfo.monthlyRent,
        status: "Pending Landlord Approval",
        method: "M-Pesa / Bank",
      },
      ...paymentHistory,
    ]);
    alert("Payment submitted! Your landlord will review and verify it.");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white">
            🔑
          </div>
          <div>
            <h1 className="text-lg font-bold">Tenant Portal</h1>
            <p className="text-xs text-slate-400">Welcome back, {tenantInfo.name}</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition"
        >
          Sign Out
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* 7-Day Payment Reminder Notification */}
        {!hasPaidThisMonth ? (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-5 flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h2 className="text-sm font-bold text-amber-400">Rent Due in 7 Days!</h2>
                <p className="text-xs text-slate-300 mt-1">
                  Your monthly rent for <strong>{tenantInfo.doorNumber}</strong> of{" "}
                  <strong>KES {tenantInfo.monthlyRent.toLocaleString()}</strong> is due on{" "}
                  <strong>{tenantInfo.dueDate}</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={handlePayRent}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg transition shrink-0 ml-4"
            >
              Pay Rent Now
            </button>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-5 flex items-center space-x-3">
            <span className="text-2xl">✅</span>
            <div>
              <h2 className="text-sm font-bold text-emerald-400">Payment Submitted for This Month</h2>
              <p className="text-xs text-slate-300">Your landlord is currently reviewing your payment.</p>
            </div>
          </div>
        )}

        {/* 3 Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
            <span className="text-xs text-slate-400 uppercase font-semibold">Your Door Number</span>
            <div className="text-2xl font-extrabold text-blue-400 mt-2">{tenantInfo.doorNumber}</div>
            <span className="text-xs text-slate-500 mt-1 block">Active Lease</span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
            <span className="text-xs text-slate-400 uppercase font-semibold">Monthly Rent</span>
            <div className="text-2xl font-extrabold text-white mt-2">
              KES {tenantInfo.monthlyRent.toLocaleString()}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">Due on 12th of every month</span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
            <span className="text-xs text-slate-400 uppercase font-semibold">Payment Status</span>
            <div className="text-2xl font-extrabold mt-2">
              {hasPaidThisMonth ? (
                <span className="text-emerald-400">Paid</span>
              ) : (
                <span className="text-amber-400">Due Soon</span>
              )}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">Cycle: November 2026</span>
          </div>
        </div>

        {/* Payment History Table */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6">
          <h3 className="font-bold text-base mb-4">Payment History & Trace Records</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Payment Date</th>
                  <th className="px-4 py-3">Door Number</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {paymentHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-white">{item.date}</td>
                    <td className="px-4 py-3 text-blue-400 font-semibold">{tenantInfo.doorNumber}</td>
                    <td className="px-4 py-3">KES {item.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{item.method}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          item.status === "Verified"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}