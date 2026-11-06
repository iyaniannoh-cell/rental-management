"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

export default function TenantDashboard() {
  const router = useRouter();

  const [currentTenant, setCurrentTenant] = useState<any>(null);
  const [tenantProfile, setTenantProfile] = useState<any>(null);
  const [assignedUnit, setAssignedUnit] = useState<any>(null);
  const [approvedPendingIdUnit, setApprovedPendingIdUnit] = useState<any>(null);
  const [myPendingBooking, setMyPendingBooking] = useState<any>(null);
  const [marketHouses, setMarketHouses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<"lease" | "search" | "notifications">("lease");
  const [searchLocation, setSearchLocation] = useState("");
  const [filterType, setFilterType] = useState("All");

  // Profile Modal
  const [showProfile, setShowProfile] = useState(false);

  // Check-in state
  const [idNumberInput, setIdNumberInput] = useState("");
  const [mpesaCodeInput, setMpesaCodeInput] = useState("");
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  // Cancellation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("Landlord took too long to respond");
  const [customReasonText, setCustomReasonText] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setCurrentTenant(user);

    // Profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setTenantProfile(profile);

    // 1. Fully active occupied unit
    const { data: activeUnit } = await supabase
      .from("units")
      .select("*")
      .eq("tenant_id", user.id)
      .eq("booking_status", "occupied")
      .maybeSingle();
    setAssignedUnit(activeUnit);

    // 2. Approved unit waiting for ID & Check-in
    const { data: approvedUnit } = await supabase
      .from("units")
      .select("*")
      .eq("tenant_id", user.id)
      .eq("booking_status", "approved_pending_id")
      .maybeSingle();
    setApprovedPendingIdUnit(approvedUnit);

    // 3. Units in the marketplace
    const { data: housesData } = await supabase
      .from("units")
      .select("*")
      .neq("booking_status", "occupied")
      .order("created_at", { ascending: false });
    setMarketHouses(housesData || []);

    // 4. Pending review
    const pending = (housesData || []).find(
      (h) => h.pending_tenant_id === user.id && h.booking_status === "pending"
    );
    setMyPendingBooking(pending || null);

    // 5. Strictly private notifications for this tenant
    const { data: notifData } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setNotifications(notifData || []);
  };

  // CLEAR ALL TENANT ALERTS
  const handleClearAllTenantAlerts = async () => {
    if (!currentTenant) return;
    if (!confirm("Clear all your notifications?")) return;

    try {
      await supabase
        .from("notifications")
        .delete()
        .eq("user_id", currentTenant.id);

      setNotifications([]);
      alert("All alerts cleared!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // CANCEL BOOKING REQUEST (with reason)
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myPendingBooking || !currentTenant) return;

    setCancelling(true);
    const finalReason =
      cancelReason === "Other reasons"
        ? customReasonText.trim() || "No detailed reason given."
        : cancelReason;

    try {
      // Reset unit back to Vacant
      await supabase
        .from("units")
        .update({
          booking_status: "vacant",
          is_vacant: true,
          pending_tenant_id: null,
          tenant_id: null,
        })
        .eq("id", myPendingBooking.id);

      // Notify the landlord of the cancellation and the reason!
      await supabase.from("notifications").insert([
        {
          user_id: myPendingBooking.landlord_id,
          title: "Booking Request Cancelled ⚠️",
          message: `Tenant (${currentTenant.email}) cancelled their request for ${myPendingBooking.door_number} at ${myPendingBooking.apartment_name}. Reason: "${finalReason}". The room is now back to Vacant.`,
        },
      ]);

      alert("Booking request cancelled. The room is available to others, and you can now book another house!");
      setShowCancelModal(false);
      setCustomReasonText("");
      setCancelReason("Landlord took too long to respond");

      loadTenantData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCancelling(false);
    }
  };

  // Finalize check-in
  const handleCompleteCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumberInput || !mpesaCodeInput || !approvedPendingIdUnit) return;

    setSubmittingCheckIn(true);
    try {
      await supabase
        .from("profiles")
        .update({ id_number: idNumberInput })
        .eq("id", currentTenant.id);

      await supabase
        .from("units")
        .update({
          booking_status: "occupied",
          is_vacant: false,
          mpesa_code: mpesaCodeInput.toUpperCase(),
          lease_completed: true,
        })
        .eq("id", approvedPendingIdUnit.id);

      await supabase.from("payments").insert([
        {
          unit_id: approvedPendingIdUnit.id,
          tenant_id: currentTenant.id,
          amount: approvedPendingIdUnit.monthly_rent,
          payment_date: new Date().toISOString().split("T")[0],
          status: "paid",
        },
      ]);

      alert("Check-in finalized! Your National ID and payment have been verified.");
      loadTenantData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  const handleBookRoom = async (house: any) => {
    if (!currentTenant) return;
    if (assignedUnit || approvedPendingIdUnit || myPendingBooking) {
      alert("You already have an active rental or pending application!");
      return;
    }

    try {
      await supabase
        .from("units")
        .update({
          booking_status: "pending",
          pending_tenant_id: currentTenant.id,
        })
        .eq("id", house.id);

      await supabase.from("notifications").insert([
        {
          user_id: house.landlord_id,
          title: "New Booking Request! 🔔",
          message: `A client (${currentTenant.email}) requested to book ${house.door_number} at ${house.apartment_name}.`,
        },
      ]);

      alert(`Request submitted for ${house.door_number} at ${house.apartment_name}! Awaiting landlord approval.`);
      loadTenantData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const filteredHouses = marketHouses.filter((h) => {
    const matchLoc = h.location?.toLowerCase().includes(searchLocation.toLowerCase());
    const matchType = filterType === "All" || h.unit_type === filterType;
    return matchLoc && matchType;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <Logo size="sm" />
          <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-semibold hidden sm:inline-block">
            Tenant Portal
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab("lease")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "lease" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            My Rental
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "search" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            🔍 Explore Kejas ({marketHouses.length})
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold relative transition ${
              activeTab === "notifications" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            🔔 Alerts
            {notifications.length > 0 && (
              <span className="ml-1.5 bg-blue-400 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>
        </div>

        {/* Profile Avatar Icon */}
        <button
          onClick={() => setShowProfile(true)}
          className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-400 text-white font-black text-sm flex items-center justify-center border-2 border-blue-400 hover:scale-105 transition shadow-lg shadow-blue-500/20"
          title="View Profile"
        >
          {tenantProfile?.full_name ? tenantProfile.full_name[0].toUpperCase() : "T"}
        </button>
      </header>

      {/* PROFILE MODAL */}
      {showProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Your Tenant Profile</h3>
              <button
                onClick={() => setShowProfile(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center space-x-4 pt-1">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-400 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg">
                {tenantProfile?.full_name ? tenantProfile.full_name[0].toUpperCase() : "T"}
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">{tenantProfile?.full_name || "Tenant"}</h4>
                <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Verified Tenant
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Email Address:</span>
                <span className="font-semibold text-white">{currentTenant?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone Number:</span>
                <span className="font-semibold text-white">{tenantProfile?.phone || "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kenyan National ID:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {tenantProfile?.id_number || "Not Submitted Yet"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Lease Status:</span>
                <span className="font-semibold text-blue-400">
                  {assignedUnit ? `Active at ${assignedUnit.door_number}` : "No Active Lease"}
                </span>
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
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* PENDING REQUEST BANNER WITH CANCEL BUTTON */}
        {myPendingBooking && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-start space-x-3">
              <span className="text-2xl mt-0.5">⏳</span>
              <div>
                <h3 className="text-sm font-bold text-amber-400">
                  Booking Request Under Landlord Review
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  You requested <strong>{myPendingBooking.door_number}</strong> at{" "}
                  <strong>{myPendingBooking.apartment_name}</strong>. If you changed your mind or the landlord is taking too long, you can cancel below.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCancelModal(true)}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-bold px-4 py-2.5 rounded-xl transition shrink-0"
            >
              Cancel Request ✕
            </button>
          </div>
        )}

        {/* MODAL: CANCEL REASON POPUP */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Cancel Booking Request</h3>
                <button onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Cancelling releases <strong>{myPendingBooking?.door_number}</strong> back to Vacant so others can view it, and unlocks you to book another keja immediately.
              </p>

              <form onSubmit={handleConfirmCancel} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Why are you cancelling? *</label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="Landlord took too long to respond">1. Landlord took too long to respond</option>
                    <option value="Made it by a mistake">2. Made it by a mistake</option>
                    <option value="Other reasons">3. Other reasons</option>
                  </select>
                </div>

                {cancelReason === "Other reasons" && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-300">Specify reason (Max 50 chars):</label>
                      <span className="text-[10px] text-slate-500 font-mono">{customReasonText.length}/50</span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={50}
                      placeholder="e.g. Found another place closer to work"
                      value={customReasonText}
                      onChange={(e) => setCustomReasonText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex space-x-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Never Mind
                  </button>
                  <button
                    type="submit"
                    disabled={cancelling}
                    className="flex-1 py-2.5 text-xs font-bold bg-red-500 hover:bg-red-400 text-white rounded-xl transition"
                  >
                    {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CHECK-IN FORM */}
        {approvedPendingIdUnit && (
          <div className="bg-emerald-950/40 border-2 border-emerald-500 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start space-x-3">
              <span className="text-3xl">🎉</span>
              <div>
                <h3 className="text-lg font-bold text-emerald-400">Your Booking Was Approved!</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  The landlord approved your request for <strong>{approvedPendingIdUnit.door_number}</strong> at{" "}
                  <strong>{approvedPendingIdUnit.apartment_name}</strong>. Finalize check-in below with your National ID & M-Pesa Code.
                </p>
              </div>
            </div>

            <form onSubmit={handleCompleteCheckIn} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Kenyan National ID Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 34567890"
                  value={idNumberInput}
                  onChange={(e) => setIdNumberInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">M-Pesa Rent Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QK89XY72PA"
                  value={mpesaCodeInput}
                  onChange={(e) => setMpesaCodeInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white uppercase focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submittingCheckIn}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition text-xs"
                >
                  {submittingCheckIn ? "Verifying..." : "Complete Check-In & Finalize Lease"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 1: ACTIVE LEASE */}
        {activeTab === "lease" && (
          <div className="space-y-6">
            {assignedUnit ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs text-emerald-400 font-bold uppercase">Active Lease</span>
                    <h2 className="text-2xl font-black text-white">{assignedUnit.apartment_name}</h2>
                    <span className="text-xs text-slate-400">📍 {assignedUnit.location}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Monthly Rent</span>
                    <span className="text-xl font-bold text-emerald-400">
                      KES {Number(assignedUnit.monthly_rent).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xs text-slate-500 block">Assigned Door</span>
                    <span className="text-lg font-bold text-blue-400">{assignedUnit.door_number}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xs text-slate-500 block">Verified National ID</span>
                    <span className="text-lg font-bold font-mono text-emerald-400">
                      {tenantProfile?.id_number || "Verified"}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xs text-slate-500 block">M-Pesa Reference</span>
                    <span className="text-lg font-bold font-mono text-white">
                      {assignedUnit.mpesa_code || "Confirmed"}
                    </span>
                  </div>
                </div>
              </div>
            ) : !approvedPendingIdUnit && (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl">
                <span className="text-4xl block mb-2">🔑</span>
                <h3 className="font-bold text-white text-base">No Active Lease Yet</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto mb-4">
                  Explore available apartments in the search tab to find and book your next keja!
                </p>
                <button
                  onClick={() => setActiveTab("search")}
                  className="bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  Browse Vacant Houses
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXPLORE HOUSES */}
        {activeTab === "search" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search by area (e.g. Roysambu, Kilimani...)"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
              >
                <option value="All">All Room Types</option>
                <option value="Single Room">Single Room</option>
                <option value="Bedsitter">Bedsitter</option>
                <option value="1 Bedroom">1 Bedroom</option>
                <option value="2 Bedroom">2 Bedroom</option>
                <option value="3 Bedroom">3 Bedroom</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHouses.map((house) => {
                const isPending = house.booking_status === "pending" || house.booking_status === "approved_pending_id";
                return (
                  <div key={house.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-white text-base">{house.apartment_name}</h3>
                          <span className="text-xs text-slate-400 block">📍 {house.location}</span>
                        </div>
                        <span className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-blue-500/30">
                          {house.unit_type}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center space-x-2">
                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          Door: {house.door_number}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          isPending ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {isPending ? "🔒 Reserved (Under Review)" : "🟢 Available"}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-3">{house.description || "Borehole water, prepaid token."}</p>
                    </div>

                    <div className="border-t border-slate-800 pt-4 mt-4 flex items-center justify-between">
                      <span className="text-base font-extrabold text-white">KES {Number(house.monthly_rent).toLocaleString()}</span>
                      <button
                        onClick={() => handleBookRoom(house)}
                        disabled={isPending || Boolean(assignedUnit) || Boolean(myPendingBooking) || Boolean(approvedPendingIdUnit)}
                        className="bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                      >
                        {isPending ? "Reserved" : "Book Room"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS & ALERTS WITH CLEAR ALL */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Your eBoma In-App Alerts</h2>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAllTenantAlerts}
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
                  <div key={n.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-blue-400">{n.title}</h4>
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
      </main>
    </div>
  );
}