"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LandlordDashboard() {
  const router = useRouter();

  // Unit and payment data
  const [units, setUnits] = useState([
    {
      id: "1",
      doorNumber: "Unit B-104",
      tenantName: "Ian Onyango",
      phone: "+254 700 720215",
      rent: 25000,
      dueDate: "2026-11-12",
      status: "Due in 7 Days",
      lastPaidDate: "2026-10-05",
    },
    {
      id: "2",
      doorNumber: "Unit A-101",
      tenantName: "Sarah Wanjiku",
      phone: "+254 711 234567",
      rent: 30000,
      dueDate: "2026-11-05",
      status: "Paid",
      lastPaidDate: "2026-11-03",
    },
    {
      id: "3",
      doorNumber: "Unit A-102",
      tenantName: "Kevin Kiprop",
      phone: "+254 722 987654",
      rent: 28000,
      dueDate: "2026-10-30",
      status: "Overdue",
      lastPaidDate: "2026-09-28",
    },
    {
      id: "4",
      doorNumber: "Unit C-201",
      tenantName: "Grace Muthoni",
      phone: "+254 733 112233",
      rent: 22000,
      dueDate: "2026-11-12",
      status: "Due in 7 Days",
      lastPaidDate: "2026-10-10",
    },
  ]);

  // Form state to add new units
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newDoorNumber, setNewDoorNumber] = useState("");
  const [newRent, setNewRent] = useState("");
  const [newTenant, setNewTenant] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoorNumber || !newRent) return;

    const newEntry = {
      id: Date.now().toString(),
      doorNumber: newDoorNumber,
      tenantName: newTenant || "Vacant",
      phone: newPhone || "-",
      rent: Number(newRent),
      dueDate: "2026-12-05",
      status: newTenant ? "Due in 7 Days" : "Vacant",
      lastPaidDate: "-",
    };

    setUnits([...units, newEntry]);
    setNewDoorNumber("");
    setNewRent("");
    setNewTenant("");
    setNewPhone("");
    setIsAddingUnit(false);
    alert(`Door ${newDoorNumber} added successfully!`);
  };

  const markAsPaid = (id: string) => {
    setUnits(
      units.map((u) =>
        u.id === id
          ? {
              ...u,
              status: "Paid",
              lastPaidDate: new Date().toISOString().split("T")[0],
            }
          : u
      )
    );
  };

  // Calculations for dashboard summary cards
  const totalExpected = units.reduce((acc, u) => acc + (u.tenantName !== "Vacant" ? u.rent : 0), 0);
  const totalCollected = units
    .filter((u) => u.status === "Paid")
    .reduce((acc, u) => acc + u.rent, 0);
  const totalPending = totalExpected - totalCollected;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950">
            🏢
          </div>
          <div>
            <h1 className="text-lg font-bold">Landlord Portal</h1>
            <p className="text-xs text-slate-400">Property & Payment Tracker</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAddingUnit(!isAddingUnit)}
            className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-2 rounded-lg transition"
          >
            + Add Door / Unit
          </button>
          <button
            onClick={handleSignOut}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Add Unit Modal / Form */}
        {isAddingUnit && (
          <form
            onSubmit={handleAddUnit}
            className="bg-slate-800 border border-emerald-500/50 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-emerald-400 text-base">Add New Door Number / Unit</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Door Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit D-302"
                  value={newDoorNumber}
                  onChange={(e) => setNewDoorNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Monthly Rent (KES)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 25000"
                  value={newRent}
                  onChange={(e) => setNewRent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tenant Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newTenant}
                  onChange={(e) => setNewTenant(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+254 7..."
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingUnit(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition"
              >
                Save Unit
              </button>
            </div>
          </form>
        )}

        {/* 3 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Monthly Expected</span>
            <div className="text-2xl font-extrabold text-white mt-2">
              KES {totalExpected.toLocaleString()}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">{units.length} total units registered</span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
            <span className="text-xs text-slate-400 uppercase font-semibold">Collected So Far</span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              KES {totalCollected.toLocaleString()}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">Verified received rent</span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
            <span className="text-xs text-slate-400 uppercase font-semibold">Pending / Unpaid</span>
            <div className="text-2xl font-extrabold text-amber-400 mt-2">
              KES {totalPending.toLocaleString()}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">Overdue or due in 7 days</span>
          </div>
        </div>

        {/* Door Numbers & Payment Tracking Table */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base">Units & Tenant Payment Tracking</h3>
              <p className="text-xs text-slate-400">Track door numbers, payment dates, and overdue alerts</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Door Number</th>
                  <th className="px-4 py-3">Tenant Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Rent (KES)</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Last Paid</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-lg text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3.5 font-bold text-emerald-400">{unit.doorNumber}</td>
                    <td className="px-4 py-3.5 font-medium text-white">{unit.tenantName}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">{unit.phone}</td>
                    <td className="px-4 py-3.5 font-medium">KES {unit.rent.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-300">{unit.dueDate}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">{unit.lastPaidDate}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          unit.status === "Paid"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : unit.status === "Due in 7 Days"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : unit.status === "Overdue"
                            ? "bg-red-500/10 text-red-400 border border-red-500/30"
                            : "bg-slate-700/50 text-slate-400"
                        }`}
                      >
                        {unit.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {unit.status !== "Paid" && unit.tenantName !== "Vacant" && (
                        <button
                          onClick={() => markAsPaid(unit.id)}
                          className="text-xs bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold px-3 py-1.5 rounded-lg border border-emerald-500/40 transition"
                        >
                          Mark Paid
                        </button>
                      )}
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