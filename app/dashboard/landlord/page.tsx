"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

interface Unit {
  id: string;
  apartment_name: string;
  location: string;
  door_number: string;
  unit_type: string;
  monthly_rent: number;
  description: string;
  is_vacant: boolean;
  booking_status: string;
  lease_completed: boolean;
  pending_tenant_id?: string;
  tenant_id?: string;
  tenant_name?: string;
  tenant_phone?: string;
  tenant_id_number?: string;
  mpesa_code?: string;
  last_paid_date?: string;
  payment_status: string;
}

export default function LandlordDashboard() {
  const router = useRouter();

  const [currentLandlord, setCurrentLandlord] = useState<any>(null);
  const [landlordProfile, setLandlordProfile] = useState<any>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'portfolio' | 'requests' | 'notifications'
  const [activeTab, setActiveTab] = useState<"portfolio" | "requests" | "notifications">("portfolio");

  // Profile Modal State
  const [showProfile, setShowProfile] = useState(false);

  // Upload Form states
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [uploadMode, setUploadMode] = useState<"single" | "bulk">("bulk");
  const [apartmentName, setApartmentName] = useState("");
  const [location, setLocation] = useState("");
  const [unitType, setUnitType] = useState("Bedsitter");
  const [rent, setRent] = useState("");
  const [description, setDescription] = useState("");
  const [doorNumber, setDoorNumber] = useState("");
  const [doorPrefix, setDoorPrefix] = useState("A-");
  const [doorStart, setDoorStart] = useState("1");
  const [doorEnd, setDoorEnd] = useState("10");

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

    // Fetch landlord profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setLandlordProfile(prof);

    // Fetch units owned ONLY by this landlord
    const { data: unitsData } = await supabase
      .from("units")
      .select("*")
      .eq("landlord_id", user.id)
      .order("created_at", { ascending: false });

    // Fetch tenant profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, phone, id_number");

    // Fetch strictly private notifications for this landlord
    const { data: notifData } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setNotifications(notifData || []);

    // Fetch payments
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("unit_id, payment_date, status");

    const combined: Unit[] = (unitsData || []).map((u: any) => {
      const tenant = (profilesData || []).find((p: any) => p.id === u.tenant_id);
      const pendingTenant = (profilesData || []).find((p: any) => p.id === u.pending_tenant_id);
      const lastPayment = (paymentsData || []).find((p: any) => p.unit_id === u.id);

      let status = "Unpaid";
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
        booking_status: u.booking_status || "vacant",
        lease_completed: u.lease_completed || false,
        pending_tenant_id: u.pending_tenant_id,
        tenant_id: u.tenant_id,
        tenant_name: u.booking_status === "pending" && pendingTenant
          ? pendingTenant.full_name
          : tenant ? tenant.full_name : "Vacant",
        tenant_phone: u.booking_status === "pending" && pendingTenant
          ? pendingTenant.phone
          : tenant ? tenant.phone : "-",
        tenant_id_number: tenant?.id_number || pendingTenant?.id_number || "Pending Check-In",
        mpesa_code: u.mpesa_code || "-",
        last_paid_date: lastPayment ? lastPayment.payment_date : "Never",
        payment_status: status,
      };
    });

    setUnits(combined);
    setLoading(false);
  };

  // CLEAR ALL NOTIFICATIONS
  const handleClearAllNotifications = async () => {
    if (!currentLandlord) return;
    if (!confirm("Are you sure you want to clear all notifications?")) return;

    try {
      await supabase
        .from("notifications")
        .delete()
        .eq("user_id", currentLandlord.id);

      setNotifications([]);
      alert("All notifications cleared!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Save Units
  const handleSaveUnits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLandlord || !apartmentName || !location || !rent) return;

    try {
      let unitsToInsert = [];
      if (uploadMode === "single") {
        if (!doorNumber) return;
        unitsToInsert.push({
          landlord_id: currentLandlord.id,
          apartment_name: apartmentName,
          location: location,
          door_number: doorNumber.trim(),
          unit_type: unitType,
          monthly_rent: Number(rent),
          description: description,
          is_vacant: true,
          booking_status: "vacant",
        });
      } else {
        const start = parseInt(doorStart);
        const end = parseInt(doorEnd);
        if (isNaN(start) || isNaN(end) || start > end) {
          alert("Please enter a valid door range (e.g. 1 to 10)");
          return;
        }
        for (let i = start; i <= end; i++) {
          unitsToInsert.push({
            landlord_id: currentLandlord.id,
            apartment_name: apartmentName,
            location: location,
            door_number: `${doorPrefix}${i}`,
            unit_type: unitType,
            monthly_rent: Number(rent),
            description: description,
            is_vacant: true,
            booking_status: "vacant",
          });
        }
      }

      const { error } = await supabase.from("units").insert(unitsToInsert);
      if (error) throw error;

      alert(`Success! ${unitsToInsert.length} units uploaded to ${apartmentName}.`);
      setIsAddingUnit(false);
      checkUserAndFetch();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Approve booking request
  const handleApprove = async (unit: Unit) => {
    if (!unit.pending_tenant_id) return;
    try {
      await supabase
        .from("units")
        .update({
          booking_status: "approved_pending_id",
          tenant_id: unit.pending_tenant_id,
        })
        .eq("id", unit.id);

      await supabase.from("notifications").insert([
        {
          user_id: unit.pending_tenant_id,
          title: "Booking Approved! 🎉 Complete Check-in",
          message: `Your booking for ${unit.door_number} at ${unit.apartment_name} was approved! Please finalize check-in with your National ID Number and M-Pesa Code.`,
        },
      ]);

      alert(`Booking approved! Tenant has been notified to finalize check-in.`);
      checkUserAndFetch();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleReject = async (unit: Unit) => {
    if (!unit.pending_tenant_id) return;
    try {
      await supabase
        .from("units")
        .update({
          booking_status: "vacant",
          is_vacant: true,
          pending_tenant_id: null,
          tenant_id: null,
        })
        .eq("id", unit.id);

      await supabase.from("notifications").insert([
        {
          user_id: unit.pending_tenant_id,
          title: "Booking Request Declined",
          message: `Your booking for ${unit.door_number} at ${unit.apartment_name} was declined.`,
        },
      ]);

      alert("Booking request declined.");
      checkUserAndFetch();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const pendingRequests = units.filter((u) => u.booking_status === "pending");

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <Logo size="sm" />
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold hidden sm:inline-block">
            Landlord Portal
          </span>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "portfolio" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            My Apartments ({units.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold relative transition ${
              activeTab === "requests" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            Inquiries
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold relative transition ${
              activeTab === "notifications" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            🔔 Alerts
            {notifications.length > 0 && (
              <span className="ml-1.5 bg-amber-400 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>
        </div>

        {/* Action & Profile Icon */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAddingUnit(!isAddingUnit)}
            className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-2 rounded-xl transition shadow-lg shadow-emerald-500/20 hidden md:block"
          >
            + Upload Doors
          </button>

          {/* Profile Circle Avatar Icon */}
          <button
            onClick={() => setShowProfile(true)}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center border-2 border-emerald-400 hover:scale-105 transition shadow-lg shadow-emerald-500/20"
            title="View Profile"
          >
            {landlordProfile?.full_name ? landlordProfile.full_name[0].toUpperCase() : "L"}
          </button>
        </div>
      </header>

      {/* PROFILE MODAL */}
      {showProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Your Landlord Profile</h3>
              <button
                onClick={() => setShowProfile(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center space-x-4 pt-1">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-2xl flex items-center justify-center shadow-lg">
                {landlordProfile?.full_name ? landlordProfile.full_name[0].toUpperCase() : "L"}
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">{landlordProfile?.full_name || "Landlord"}</h4>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Verified Landlord
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Email Address:</span>
                <span className="font-semibold text-white">{currentLandlord?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone Number:</span>
                <span className="font-semibold text-white">{landlordProfile?.phone || "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Doors Owned:</span>
                <span className="font-semibold text-emerald-400">{units.length} Units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account Type:</span>
                <span className="font-semibold text-white capitalize">{landlordProfile?.role || "Landlord"}</span>
              </div>
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                onClick={() => setShowProfile(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push("/");
                }}
                className="flex-1 py-2.5 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* TAB 1: NOTIFICATIONS & ALERTS WITH CLEAR ALL */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Landlord In-App Alerts</h2>
                <p className="text-xs text-slate-400">
                  Real-time alerts when clients book rooms or cancel requests (with reasons)
                </p>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAllNotifications}
                  className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl font-semibold transition"
                >
                  Clear All Alerts ✕
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl">
                <span className="text-4xl block mb-2">🔕</span>
                <p className="text-slate-400 text-sm">No notifications right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-1 transition">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-emerald-400">{n.title}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed pt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INQUIRIES / REQUESTS */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            <h2 className="text-base font-bold">Pending Booking Inquiries</h2>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
                <p className="text-slate-400 text-sm">No new requests right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 space-y-4">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">Booking Request</span>
                      <h3 className="text-base font-bold text-white mt-1">{req.apartment_name} - {req.door_number}</h3>
                      <span className="text-xs text-slate-400">📍 {req.location} • KES {req.monthly_rent.toLocaleString()}</span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                      <div className="text-xs text-slate-400">Applicant:</div>
                      <div className="text-sm font-bold text-white">{req.tenant_name}</div>
                      <div className="text-xs text-slate-300">📞 Phone: {req.tenant_phone}</div>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={() => handleReject(req)}
                        className="flex-1 py-2 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl"
                      >
                        ✕ Reject
                      </button>
                      <button
                        onClick={() => handleApprove(req)}
                        className="flex-1 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl"
                      >
                        ✓ Approve (Request National ID)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PORTFOLIO & BULK UPLOAD */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            {/* Upload form */}
            {isAddingUnit && (
              <form
                onSubmit={handleSaveUnits}
                className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-emerald-400 text-base">Add Apartments & Doors</h3>
                    <p className="text-xs text-slate-400">Upload single or batch doors in one click</p>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setUploadMode("bulk")}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                        uploadMode === "bulk" ? "bg-emerald-500 text-slate-950" : "text-slate-400"
                      }`}
                    >
                      ⚡ Bulk Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("single")}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                        uploadMode === "single" ? "bg-emerald-500 text-slate-950" : "text-slate-400"
                      }`}
                    >
                      Single Door
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Apartment / Building</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Green Heights"
                      value={apartmentName}
                      onChange={(e) => setApartmentName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Location / Area</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Roysambu"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Room Type</label>
                    <select
                      value={unitType}
                      onChange={(e) => setUnitType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white"
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
                      placeholder="e.g. 15000"
                      value={rent}
                      onChange={(e) => setRent(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white"
                    />
                  </div>

                  {uploadMode === "single" ? (
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Door Number</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Door A-1"
                        value={doorNumber}
                        onChange={(e) => setDoorNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white"
                      />
                    </div>
                  ) : (
                    <div className="col-span-2 grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">Prefix</label>
                        <input
                          type="text"
                          value={doorPrefix}
                          onChange={(e) => setDoorPrefix(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">From #</label>
                        <input
                          type="number"
                          value={doorStart}
                          onChange={(e) => setDoorStart(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">To #</label>
                        <input
                          type="number"
                          value={doorEnd}
                          onChange={(e) => setDoorEnd(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Amenities</label>
                  <textarea
                    rows={2}
                    placeholder="Borehole water, CCTV, token meter."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddingUnit(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition"
                  >
                    Save Units
                  </button>
                </div>
              </form>
            )}

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="font-bold text-base mb-4">Your Property Portfolio & Occupants</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3 rounded-l-xl">Apartment & Door</th>
                      <th className="px-4 py-3">Room Type</th>
                      <th className="px-4 py-3">Rent / Mo</th>
                      <th className="px-4 py-3">State</th>
                      <th className="px-4 py-3">Occupant Name</th>
                      <th className="px-4 py-3">National ID Number</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3 rounded-r-xl">M-Pesa Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {units.map((unit) => (
                      <tr key={unit.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-white">{unit.apartment_name}</div>
                          <div className="text-xs text-emerald-400 font-semibold">{unit.door_number}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-blue-400">{unit.unit_type}</td>
                        <td className="px-4 py-3.5 font-semibold text-white">KES {unit.monthly_rent.toLocaleString()}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            unit.is_vacant ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                          }`}>
                            {unit.is_vacant ? "🟢 Vacant" : "🔴 Occupied"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-white">{unit.tenant_name}</td>
                        <td className="px-4 py-3.5 text-xs font-mono text-emerald-400">{unit.tenant_id_number}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-400">{unit.tenant_phone}</td>
                        <td className="px-4 py-3.5 text-xs font-mono text-slate-300">{unit.mpesa_code}</td>
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