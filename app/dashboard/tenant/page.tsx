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

  // Rent Payment Status for current month
  const [hasPaidRent, setHasPaidRent] = useState(false);

  // Profile Modal
  const [showProfile, setShowProfile] = useState(false);

  // Check-in state
  const [idNumberInput, setIdNumberInput] = useState("");
  const [mpesaCodeInput, setMpesaCodeInput] = useState("");
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  // Booking Cancellation State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("Landlord took too long to respond");
  const [customReasonText, setCustomReasonText] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Vacate Modal & Arrears Gatekeeper State
  const [showVacateModal, setShowVacateModal] = useState(false);
  const [showArrearsBlockModal, setShowArrearsBlockModal] = useState(false);
  const [arrearsMpesaCode, setArrearsMpesaCode] = useState("");
  const [clearingArrears, setClearingArrears] = useState(false);

  const [vacateReason, setVacateReason] = useState("Relocating");
  const [customVacateText, setCustomVacateText] = useState("");
  const [submittingVacate, setSubmittingVacate] = useState(false);

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

    // Check payment status for active unit
    if (activeUnit) {
      const { data: payments } = await supabase
        .from("payments")
        .select("id, status")
        .eq("unit_id", activeUnit.id)
        .eq("tenant_id", user.id)
        .eq("status", "paid");
      
      setHasPaidRent(Boolean(payments && payments.length > 0));
    }

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

    // 5. Strictly private notifications
    const { data: notifData } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setNotifications(notifData || []);
  };

  // GATEKEEPER: Check arrears before allowing vacate request
  const handleInitiateVacate = () => {
    if (!hasPaidRent) {
      setShowArrearsBlockModal(true);
    } else {
      setShowVacateModal(true);
    }
  };

  // CLEAR ARREARS IN 1 CLICK VIA M-PESA
  const handleClearArrearsAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arrearsMpesaCode.trim() || !assignedUnit) return;

    setClearingArrears(true);
    try {
      // 1. Insert verified payment
      await supabase.from("payments").insert([
        {
          unit_id: assignedUnit.id,
          tenant_id: currentTenant.id,
          amount: assignedUnit.monthly_rent,
          payment_date: new Date().toISOString().split("T")[0],
          status: "paid",
        },
      ]);

      // 2. Update unit M-Pesa code
      await supabase
        .from("units")
        .update({ mpesa_code: arrearsMpesaCode.trim().toUpperCase() })
        .eq("id", assignedUnit.id);

      // 3. Notify landlord
      await supabase.from("notifications").insert([
        {
          user_id: assignedUnit.landlord_id,
          title: "Rent Arrears Cleared! 💰",
          message: `Tenant (${tenantProfile?.full_name || currentTenant.email}) cleared rent arrears for ${assignedUnit.door_number} with M-Pesa code: ${arrearsMpesaCode.trim().toUpperCase()}.`,
        },
      ]);

      alert("Rent arrears cleared successfully! You may now submit your vacate request.");
      setHasPaidRent(true);
      setShowArrearsBlockModal(false);
      setArrearsMpesaCode("");
      setShowVacateModal(true);
    } catch (err: any) {
      alert("Error clearing arrears: " + err.message);
    } finally {
      setClearingArrears(false);
    }
  };

  // SUBMIT VACATION / MOVE-OUT REQUEST
  const handleConfirmVacate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedUnit || !currentTenant) return;

    setSubmittingVacate(true);
    const finalReason =
      vacateReason === "Another reason"
        ? customVacateText.trim() || "No detailed reason given."
        : vacateReason;

    try {
      const { error: unitError } = await supabase
        .from("units")
        .update({
          vacate_status: "requested",
          vacate_reason: finalReason,
        })
        .eq("id", assignedUnit.id);

      if (unitError) throw unitError;

      const tenantName = tenantProfile?.full_name || currentTenant.email;
      await supabase.from("notifications").insert([
        {
          user_id: assignedUnit.landlord_id,
          title: "Move-Out Request (Rent Cleared) 🚪",
          message: `${tenantName} requested to vacate ${assignedUnit.door_number} at ${assignedUnit.apartment_name}. Rent is verified paid. Reason: "${finalReason}". Please review and confirm departure or request key surrender.`,
        },
      ]);

      alert("Vacate request sent to landlord! Rent is verified cleared.");
      setShowVacateModal(false);
      setCustomVacateText("");
      setVacateReason("Relocating");
      loadTenantData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingVacate(false);
    }
  };

  // CONFIRM KEYS HANDED OVER & ROOM SURRENDERED
  const handleConfirmKeyHandover = async () => {
    if (!assignedUnit || !currentTenant) return;
    if (!confirm("Confirm that you have handed over all door keys and vacated the room?")) return;

    try {
      await supabase
        .from("units")
        .update({
          vacate_status: "keys_handed_over",
        })
        .eq("id", assignedUnit.id);

      await supabase.from("notifications").insert([
        {
          user_id: assignedUnit.landlord_id,
          title: "Keys Handed Over by Tenant 🔑",
          message: `Tenant (${tenantProfile?.full_name || currentTenant.email}) has confirmed handing over keys for ${assignedUnit.door_number}. Please perform inspection and click Final Release.`,
        },
      ]);

      alert("Key handover confirmed! Landlord has been notified to complete final departure release.");
      loadTenantData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // CLEAR NOTIFICATIONS
  const handleClearAllTenantAlerts = async () => {
    if (!currentTenant) return;
    if (!confirm("Clear all your notifications?")) return;
    try {
      await supabase.from("notifications").delete().eq("user_id", currentTenant.id);
      setNotifications([]);
      alert("All alerts cleared!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // CANCEL BOOKING REQUEST
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myPendingBooking || !currentTenant) return;

    setCancelling(true);
    const finalReason =
      cancelReason === "Other reasons"
        ? customReasonText.trim() || "No detailed reason given."
        : cancelReason;

    try {
      await supabase
        .from("units")
        .update({
          booking_status: "vacant",
          is_vacant: true,
          pending_tenant_id: null,
          tenant_id: null,
        })
        .eq("id", myPendingBooking.id);

      await supabase.from("notifications").insert([
        {
          user_id: myPendingBooking.landlord_id,
          title: "Booking Request Cancelled ⚠️",
          message: `Tenant (${currentTenant.email}) cancelled their request for ${myPendingBooking.door_number} at ${myPendingBooking.apartment_name}. Reason: "${finalReason}". Room is back to Vacant.`,
        },
      ]);

      alert("Booking request cancelled. You can now book another house!");
      setShowCancelModal(false);
      setCustomReasonText("");
      loadTenantData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCancelling(false);
    }
  };

  // Check-in submission
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

      alert("Check-in finalized! Your lease is active.");
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

      alert(`Request submitted for ${house.door_number}! Awaiting landlord approval.`);
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

        <div className="flex items-center space-x-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab("lease")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "lease" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            My Rental & Lease
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
              <button onClick={() => setShowProfile(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
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
              <button onClick={() => setShowProfile(false)} className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl">Close</button>
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

      {/* ARREARS BLOCK MODAL: Pops up when tenant tries to vacate with unpaid rent! */}
      {showArrearsBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500/60 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                <span>⚠️</span> Outstanding Rent Balance
              </h3>
              <button onClick={() => setShowArrearsBlockModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-xs text-red-200 leading-relaxed">
              <strong>Move-out Request Blocked:</strong> You have an unpaid rent balance of{" "}
              <strong className="text-white text-sm">KES {Number(assignedUnit?.monthly_rent).toLocaleString()}</strong> for{" "}
              <strong>{assignedUnit?.door_number}</strong>. You cannot request to vacate until this due is cleared!
            </div>

            <form onSubmit={handleClearArrearsAndProceed} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pay via M-Pesa & Enter Transaction Code: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QK89XY72PA"
                  value={arrearsMpesaCode}
                  onChange={(e) => setArrearsMpesaCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowArrearsBlockModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clearingArrears}
                  className="flex-1 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition shadow-lg shadow-emerald-500/20"
                >
                  {clearingArrears ? "Verifying..." : "Clear Rent & Proceed to Vacate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VACATE REASON (Only opened when rent is cleared!) */}
      {showVacateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🚪</span> Request to Vacate Keja
              </h3>
              <button onClick={() => setShowVacateModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your rent is verified paid. Please indicate why you are vacating <strong>{assignedUnit?.door_number}</strong> at <strong>{assignedUnit?.apartment_name}</strong>:
            </p>

            <form onSubmit={handleConfirmVacate} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Vacating: *
                </label>
                <select
                  value={vacateReason}
                  onChange={(e) => setVacateReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="Relocating">1. Relocating</option>
                  <option value="High charges on rent / living conditions">2. High charges on rent / living conditions</option>
                  <option value="Another reason">3. Another reason</option>
                </select>
              </div>

              {vacateReason === "Another reason" && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Specify reason (Max 100 characters):
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {customVacateText.length}/100
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    required
                    maxLength={100}
                    placeholder="e.g. Moving closer to campus, changing jobs..."
                    value={customVacateText}
                    onChange={(e) => setCustomVacateText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="flex space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVacateModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVacate}
                  className="flex-1 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition shadow-lg shadow-amber-500/20"
                >
                  {submittingVacate ? "Sending..." : "Submit Vacate Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* PENDING BOOKING REQUEST BANNER */}
        {myPendingBooking && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-start space-x-3">
              <span className="text-2xl mt-0.5">⏳</span>
              <div>
                <h3 className="text-sm font-bold text-amber-400">Booking Request Under Landlord Review</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  You requested <strong>{myPendingBooking.door_number}</strong> at <strong>{myPendingBooking.apartment_name}</strong>.
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

        {/* TAB 1: ACTIVE LEASE */}
        {activeTab === "lease" && (
          <div className="space-y-6">
            {assignedUnit ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                
                {/* STAGE 1: VACATE REQUESTED */}
                {assignedUnit.vacate_status === "requested" && (
                  <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 flex items-start space-x-3">
                    <span className="text-2xl mt-0.5">⏳</span>
                    <div>
                      <h4 className="text-sm font-bold text-amber-400">Move-Out Request Under Landlord Review</h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Your request to move out of <strong>{assignedUnit.door_number}</strong> is awaiting landlord key handover instructions.
                      </p>
                      <span className="text-[11px] text-emerald-400 block mt-1">
                        ✅ Rent Status: Cleared & Verified
                      </span>
                    </div>
                  </div>
                )}

                {/* STAGE 2: KEY SURRENDER INSTRUCTIONS FROM LANDLORD (WITH ACTION BUTTON!) */}
                {assignedUnit.vacate_status === "key_surrender_requested" && (
                  <div className="bg-blue-950/40 border-2 border-blue-500/60 rounded-2xl p-5 space-y-3">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">🔑</span>
                      <div>
                        <h4 className="text-base font-bold text-blue-400">Action Required: Surrender Keys & Vacate Room</h4>
                        <p className="text-xs text-slate-200 mt-1">
                          <strong>Note from Landlord:</strong> {assignedUnit.vacate_conditions || "Please hand over all door keys and leave the room clean."}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleConfirmKeyHandover}
                        className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-blue-500/20"
                      >
                        ✓ I Have Handed Over Keys & Surrendered Room
                      </button>
                    </div>
                  </div>
                )}

                {/* STAGE 3: KEYS HANDED OVER - AWAITING FINAL RELEASE */}
                {assignedUnit.vacate_status === "keys_handed_over" && (
                  <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex items-center space-x-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-400">Keys Handover Confirmed!</h4>
                      <p className="text-xs text-slate-300">
                        The landlord has been notified to complete your final departure release. You will be free to book a new keja in a moment!
                      </p>
                    </div>
                  </div>
                )}

                {/* Lease Details Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                  <div>
                    <span className="text-xs text-emerald-400 font-bold uppercase">Active Lease</span>
                    <h2 className="text-2xl font-black text-white">{assignedUnit.apartment_name}</h2>
                    <span className="text-xs text-slate-400">📍 {assignedUnit.location}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Monthly Rent</span>
                      <span className="text-xl font-bold text-emerald-400">
                        KES {Number(assignedUnit.monthly_rent).toLocaleString()}
                      </span>
                    </div>

                    {/* VACATE BUTTON (Triggers arrears check!) */}
                    {!assignedUnit.vacate_status && (
                      <button
                        onClick={handleInitiateVacate}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-4 py-2.5 rounded-xl transition"
                      >
                        Request to Vacate 🚪
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xs text-slate-500 block">Assigned Door</span>
                    <span className="text-lg font-bold text-blue-400">{assignedUnit.door_number}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xs text-slate-500 block">Rent Status</span>
                    <span className={`text-base font-bold ${hasPaidRent ? "text-emerald-400" : "text-amber-400"}`}>
                      {hasPaidRent ? "✅ Cleared / Paid" : "⏳ Unpaid Balance"}
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

        {/* TAB 3: NOTIFICATIONS */}
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