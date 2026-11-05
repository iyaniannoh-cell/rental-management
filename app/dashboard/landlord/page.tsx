"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Unit {
  id: string;
  apartment_name: string;
  location: string;
  door_number: string;
  unit_type: string;
  monthly_rent: number;
  description: string;
  is_vacant: boolean;
  booking_status: string; // 'vacant' | 'pending' | 'occupied'
  pending_tenant_id?: string;
  tenant_id?: string;
  tenant_name?: string;
  tenant_phone?: string;
  last_paid_date?: string;
  payment_status: "Paid" | "Unpaid" | "Due in 7 Days" | "Vacant" | "Pending Approval";
}

interface TenantProfile {
  id: string;
  full_name: string;
  phone: string;
}

export default function LandlordDashboard() {
  const router = useRouter();

  const [currentLandlord, setCurrentLandlord] = useState<any>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenantsList, setTenantsList] = useState<TenantProfile[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'portfolio' vs 'requests'
  const [activeTab, setActiveTab] = useState<"portfolio" | "requests">("portfolio");

  // Form states
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [apartmentName, setApartmentName] = useState("");
  const [location, setLocation] = useState("");
  const [doorNumber, setDoorNumber] = useState("");
  const [unitType, setUnitType] = useState("Bedsitter");
  const [rent, setRent] = useState("");
  const [description, setDescription] = useState("");
  const [isVacant, setIsVacant] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState("");

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }
    setCurrentLandlord(user);

    // 1. Fetch units for this landlord
    const { data: unitsData } = await supabase
      .from("units")
      .select("*")
      .eq("landlord_id", user.id)
      .order("created_at", { ascending: false });

    // 2. Fetch all tenant profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, phone");

    setTenantsList(profilesData?.filter((p: any) => p.role === "tenant") || []);

    // 3. Fetch notifications for this landlord
    const { data: notifData } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setNotifications(notifData || []);

    // 4. Fetch payments
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("unit_id, payment_date, status");

    const combined: Unit[] = (unitsData || []).map((u: any) => {
      const tenant = (profilesData || []).find((p: any) => p.id === u.tenant_id);
      const pendingTenant = (profilesData || []).find((p: any) => p.id === u.pending_tenant_id);
      const lastPayment = (paymentsData || []).find((p: any) => p.unit_id === u.id);

      let status: any = "Unpaid";
      if (u.booking_status === "pending") {
        status = "Pending Approval";
      } else if (u.is_vacant) {
        status = "Vacant";
      } else if (lastPayment?.status === "paid") {
        status = "Paid";
      }

      return {
        id: u.id,
        apartment_name: u.apartment_name || "My Apartment",
        location: u.location || "N/A",
        door_number: u.door_number,
        unit_type: u.unit_type || "Bedsitter",
        monthly_rent: Number(u.monthly_rent),
        description: u.description || "",
        is_vacant: u.is_vacant ?? true,
        booking_status: u.booking_status || (u.is_vacant ? "vacant" : "occupied"),
        pending_tenant_id: u.pending_tenant_id,
        tenant_id: u.tenant_id,
        tenant_name: u.booking_status === "pending" && pendingTenant
          ? `Request by ${pendingTenant.full_name}`
          : tenant ? tenant.full_name : "Vacant",
        tenant_phone: u.booking_status === "pending" && pendingTenant
          ? pendingTenant.phone
          : tenant ? tenant.phone : "-",
        last_paid_date: lastPayment ? lastPayment.payment_date : "Never",
        payment_status: status,
      };
    });

    setUnits(combined);
    setLoading(false);
  };

  // Add Unit
  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doorNumber || !rent || !currentLandlord) return;

    try {
      const { error } = await supabase.from("units").insert([
        {
          landlord_id: currentLandlord.id,
          apartment_name: apartmentName,
          location: location,
          door_number: doorNumber,
          unit_type: unitType,
          monthly_rent: Number(rent),
          description: description,
          is_vacant: isVacant,
          booking_status: isVacant ? "vacant" : "occupied",
          tenant_id: !isVacant && selectedTenantId ? selectedTenantId : null,
        },
      ]);

      if (error) throw error;
      alert(`Unit ${doorNumber} uploaded!`);
      setApartmentName("");
      setLocation("");
      setDoorNumber("");
      setRent("");
      setDescription("");
      setIsVacant(true);
      setIsAddingUnit(false);
      checkUserAndFetch();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // APPROVE BOOKING REQUEST
  const handleApprove = async (unit: Unit) => {
    if (!unit.pending_tenant_id) return;

    try {
      // 1. Assign tenant and mark occupied
      await supabase
        .from("units")
        .update({
          booking_status: "occupied",
          is_vacant: false,
          tenant_id: unit.pending_tenant_id,
          pending_tenant_id: null,
        })
        .eq("id", unit.id);

      // 2. Send in-app notification to the tenant
      await supabase.from("notifications").insert([
        {
          user_id: unit.pending_tenant_id,
          title: "Booking Approved! 🎉",
          message: `Congratulations! Your booking request for ${unit.door_number} at ${unit.apartment_name} has been approved. You are now officially assigned to this unit!`,
        },
      ]);

      alert(`Booking for ${unit.door_number} APPROVED! Tenant has been notified.`);
      checkUserAndFetch();
    } catch (err: any) {
      alert("Error approving booking: " + err.message);
    }
  };

  // REJECT BOOKING REQUEST
  const handleReject = async (unit: Unit) => {
    if (!unit.pending_tenant_id) return;

    try {
      // 1. Reset unit back to vacant
      await supabase
        .from("units")
        .update({
          booking_status: "vacant",
          is_vacant: true,
          pending_tenant_id: null,
        })
        .eq("id", unit.id);

      // 2. Notify tenant
      await supabase.from("notifications").insert([
        {
          user_id: unit.pending_tenant_id,
          title: "Booking Update",
          message: `Your booking request for ${unit.door_number} at ${unit.apartment_name} was declined. Please explore other available units.`,
        },
      ]);

      alert(`Booking request for ${unit.door_number} declined. Unit is back to vacant.`);
      checkUserAndFetch();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Filter pending requests
  const pendingRequests = units.filter((u) => u.booking_status === "pending");

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950">
            🏢
          </div>
          <div>
            <h1 className="text-lg font-bold">Landlord Portal</h1>
            <p className="text-xs text-slate-400">{currentLandlord?.email}</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === "portfolio" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            My Units ({units.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold relative transition ${
              activeTab === "requests" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            🔔 Booking Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAddingUnit(!isAddingUnit)}
            className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-2 rounded-lg transition"
          >
            + Upload Room
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/");
            }}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* TAB 1: PENDING BOOKING REQUESTS */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Client Booking Inquiries</h2>
                <p className="text-xs text-slate-400">
                  Tenants who clicked "Book Room" on your vacant properties
                </p>
              </div>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/40 border border-slate-700/60 rounded-2xl">
                <span className="text-3xl block mb-2">📬</span>
                <p className="text-slate-400 text-sm">No pending booking requests right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-slate-800/70 border border-amber-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                            ⏳ Booking Request
                          </span>
                          <h3 className="text-base font-bold text-white mt-1">
                            {req.apartment_name} - {req.door_number}
                          </h3>
                          <span className="text-xs text-slate-400">📍 {req.location} • {req.unit_type}</span>
                        </div>
                        <span className="text-base font-extrabold text-emerald-400">
                          KES {req.monthly_rent.toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-slate-900/60 rounded-xl p-3 mt-4 border border-slate-700/50">
                        <span className="text-xs text-slate-400 block">Applicant Details:</span>
                        <div className="text-sm font-semibold text-white mt-1">{req.tenant_name}</div>
                        <div className="text-xs text-slate-300">📞 Phone: {req.tenant_phone}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-4 mt-4 border-t border-slate-700/50">
                      <button
                        onClick={() => handleReject(req)}
                        className="flex-1 py-2 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition"
                      >
                        ✕ Reject
                      </button>
                      <button
                        onClick={() => handleApprove(req)}
                        className="flex-1 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition"
                      >
                        ✓ Approve Tenant
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PORTFOLIO & UNITS */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            {/* Add Unit Form */}
            {isAddingUnit && (
              <form
                onSubmit={handleAddUnit}
                className="bg-slate-800 border border-emerald-500/50 rounded-2xl p-6 shadow-2xl space-y-4"
              >
                <h3 className="font-bold text-emerald-400 text-base">Upload New House / Room</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Apartment / Building</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sunrise Heights"
                      value={apartmentName}
                      onChange={(e) => setApartmentName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Location</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kilimani"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Door Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Door B-104"
                      value={doorNumber}
                      onChange={(e) => setDoorNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Room Type</label>
                    <select
                      value={unitType}
                      onChange={(e) => setUnitType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="Single Room">Single Room</option>
                      <option value="Bedsitter">Bedsitter</option>
                      <option value="1 Bedroom">1 Bedroom</option>
                      <option value="2 Bedroom">2 Bedroom</option>
                      <option value="3 Bedroom">3 Bedroom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Rent / Mo (KES)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 25000"
                      value={rent}
                      onChange={(e) => setRent(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">State</label>
                    <select
                      value={isVacant ? "vacant" : "occupied"}
                      onChange={(e) => setIsVacant(e.target.value === "vacant")}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="vacant">🟢 Vacant (Available to rent)</option>
                      <option value="occupied">🔴 Occupied</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Borehole water, balcony, prepaid tokens."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
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
                    Save Property
                  </button>
                </div>
              </form>
            )}

            {/* Units Table */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6">
              <h3 className="font-bold text-base mb-4">Your Uploaded Properties</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/60 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Apartment & Door</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Room Type</th>
                      <th className="px-4 py-3">Rent / Mo</th>
                      <th className="px-4 py-3">State</th>
                      <th className="px-4 py-3">Tenant</th>
                      <th className="px-4 py-3 rounded-r-lg">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {units.map((unit) => (
                      <tr key={unit.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-white">{unit.apartment_name}</div>
                          <div className="text-xs text-emerald-400 font-semibold">{unit.door_number}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-300">{unit.location}</td>
                        <td className="px-4 py-3.5 text-xs text-blue-400">{unit.unit_type}</td>
                        <td className="px-4 py-3.5 font-semibold text-white">
                          KES {unit.monthly_rent.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                              unit.booking_status === "pending"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : unit.is_vacant
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-slate-700/60 text-slate-300"
                            }`}
                          >
                            {unit.booking_status === "pending"
                              ? "⏳ Pending Request"
                              : unit.is_vacant
                              ? "🟢 Vacant"
                              : "🔴 Occupied"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-300">
                          {unit.tenant_name}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-slate-400">{unit.payment_status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}