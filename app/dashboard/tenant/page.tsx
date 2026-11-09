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

  const [hasPaidRent, setHasPaidRent] = useState(false);

  // Profile Modal State (View vs Edit)
  const [showProfile, setShowProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Property Photos Tour Modal
  const [viewingHousePhotos, setViewingHousePhotos] = useState<any | null>(null);

  // Check-in state
  const [idNumberInput, setIdNumberInput] = useState("");
  const [mpesaCodeInput, setMpesaCodeInput] = useState("");
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  // Vacate Modal State
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
    if (profile) {
      setEditName(profile.full_name || "");
      setEditPhone(profile.phone || "");
      setEditAvatarUrl(profile.avatar_url || "");
    }

    // 1. Fully active occupied unit
    const { data: activeUnit } = await supabase
      .from("units")
      .select("*")
      .eq("tenant_id", user.id)
      .eq("booking_status", "occupied")
      .maybeSingle();
    setAssignedUnit(activeUnit);

    // Rent status check
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

    // 3. Marketplace units
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

  // Sign out helper
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // 1-CLICK INSTANT CANCEL BOOKING REQUEST
  const handleDirectCancelBooking = async () => {
    if (!myPendingBooking || !currentTenant) return;
    if (!confirm(`Cancel your booking request for ${myPendingBooking.door_number} at ${myPendingBooking.apartment_name}?`)) return;

    try {
      const { error: unitErr } = await supabase
        .from("units")
        .update({
          booking_status: "vacant",
          is_vacant: true,
          pending_tenant_id: null,
          tenant_id: null,
        })
        .eq("id", myPendingBooking.id);

      if (unitErr) throw unitErr;

      await supabase.from("notifications").insert([
        {
          user_id: myPendingBooking.landlord_id,
          title: "Booking Request Cancelled ⚠️",
          message: `Tenant (${currentTenant.email}) cancelled their booking request for ${myPendingBooking.door_number} at ${myPendingBooking.apartment_name}. Room is now back to Vacant.`,
        },
      ]);

      alert("Booking request cancelled! The room is released, and you can now book another house.");
      setMyPendingBooking(null);
      loadTenantData();
    } catch (err: any) {
      alert("Error cancelling: " + err.message);
    }
  };

  // SAVE TENANT PROFILE (Email & National ID permanently locked 🔒)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName.trim(),
          phone: editPhone.trim(),
          avatar_url: editAvatarUrl.trim(),
        })
        .eq("id", currentTenant.id);

      if (error) throw error;

      alert("Profile updated successfully!");
      setIsEditingProfile(false);
      loadTenantData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Clickable notification
  const handleNotificationClick = (notif: any) => {
    const title = notif.title.toLowerCase();
    const msg = notif.message.toLowerCase();

    if (title.includes("approved") || msg.includes("check-in") || msg.includes("national id")) {
      setActiveTab("lease");
    } else if (title.includes("departure") || title.includes("keys")) {
      setActiveTab("lease");
    }
  };

  // Check-in submission (Auto-allocates the house!)
  const handleCompleteCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumberInput.trim() || !mpesaCodeInput.trim() || !approvedPendingIdUnit) return;

    setSubmittingCheckIn(true);
    try {
      await supabase
        .from("profiles")
        .update({ id_number: idNumberInput.trim() })
        .eq("id", currentTenant.id);

      await supabase
        .from("units")
        .update({
          booking_status: "occupied",
          is_vacant: false,
          mpesa_code: mpesaCodeInput.trim().toUpperCase(),
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

      await supabase.from("notifications").insert([
        {
          user_id: approvedPendingIdUnit.landlord_id,
          title: "Tenant Check-In Completed! 🏠",
          message: `${tenantProfile?.full_name || currentTenant.email} completed check-in for ${approvedPendingIdUnit.door_number}. National ID: ${idNumberInput.trim()}, M-Pesa Code: ${mpesaCodeInput.trim().toUpperCase()}. Unit is now officially Occupied!`,
        },
      ]);

      alert(`Check-in completed! ${approvedPendingIdUnit.door_number} is officially allocated to you.`);
      setApprovedPendingIdUnit(null);
      loadTenantData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  // Arrears check before vacating
  const handleInitiateVacate = () => {
    if (!hasPaidRent) {
      setShowArrearsBlockModal(true);
    } else {
      setShowVacateModal(true);
    }
  };

  const handleClearArrearsAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arrearsMpesaCode.trim() || !assignedUnit) return;

    setClearingArrears(true);
    try {
      await supabase.from("payments").insert([
        {
          unit_id: assignedUnit.id,
          tenant_id: currentTenant.id,
          amount: assignedUnit.monthly_rent,
          payment_date: new Date().toISOString().split("T")[0],
          status: "paid",
        },
      ]);

      await supabase
        .from("units")
        .update({ mpesa_code: arrearsMpesaCode.trim().toUpperCase() })
        .eq("id", assignedUnit.id);

      alert("Rent cleared! You can now submit your vacate request.");
      setHasPaidRent(true);
      setShowArrearsBlockModal(false);
      setShowVacateModal(true);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setClearingArrears(false);
    }
  };

  const handleConfirmVacate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedUnit || !currentTenant) return;

    setSubmittingVacate(true);
    const finalReason = vacateReason === "Another reason" ? customVacateText.trim() || "Relocating" : vacateReason;

    try {
      await supabase
        .from("units")
        .update({
          vacate_status: "requested",
          vacate_reason: finalReason,
        })
        .eq("id", assignedUnit.id);

      await supabase.from("notifications").insert([
        {
          user_id: assignedUnit.landlord_id,
          title: "Move-Out Request (Rent Cleared) 🚪",
          message: `${tenantProfile?.full_name || currentTenant.email} requested to vacate ${assignedUnit.door_number}. Reason: "${finalReason}".`,
        },
      ]);

      alert("Vacate request sent to landlord!");
      setShowVacateModal(false);
      loadTenantData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingVacate(false);
    }
  };

  const handleConfirmKeyHandover = async () => {
    if (!assignedUnit || !currentTenant) return;
    if (!confirm("Confirm that you have handed over all keys and vacated the room?")) return;

    try {
      await supabase.from("units").update({ vacate_status: "keys_handed_over" }).eq("id", assignedUnit.id);
      await supabase.from("notifications").insert([
        {
          user_id: assignedUnit.landlord_id,
          title: "Keys Handed Over by Tenant 🔑",
          message: `Tenant has confirmed handing over keys for ${assignedUnit.door_number}. Please perform inspection and click Final Release.`,
        },
      ]);
      alert("Key handover confirmed!");
      loadTenantData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleBookRoom = async (house: any) => {
    if (!currentTenant) return;
    if (assignedUnit || approvedPendingIdUnit || myPendingBooking) {
      alert("You already have an active rental or pending application!");
      return;
    }

    try {
      await supabase.from("units").update({
        booking_status: "pending",
        pending_tenant_id: currentTenant.id,
      }).eq("id", house.id);

      await supabase.from("notifications").insert([
        {
          user_id: house.landlord_id,
          title: "New Booking Request! 🔔",
          message: `A client (${currentTenant.email}) requested to book ${house.door_number} at ${house.apartment_name}.`,
        },
      ]);

      alert(`Request submitted for ${house.door_number}! Awaiting landlord approval.`);
      setViewingHousePhotos(null);
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
      {/* Top Header - SIGN OUT IS CLEARLY VISIBLE AT ALL TIMES */}
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

        {/* Right Section: Profile Avatar & Dedicated SIGN OUT button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setIsEditingProfile(false);
              setShowProfile(true);
            }}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-400 text-white font-black text-sm flex items-center justify-center border-2 border-blue-400 hover:scale-105 transition shadow-lg overflow-hidden shrink-0"
            title="View Profile Details"
          >
            {tenantProfile?.avatar_url ? (
              <img src={tenantProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{tenantProfile?.full_name ? tenantProfile.full_name[0].toUpperCase() : "T"}</span>
            )}
          </button>

          {/* PERMANENT VISIBLE SIGN OUT BUTTON */}
          <button
            onClick={handleSignOut}
            className="text-xs bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold px-3 py-2 rounded-xl border border-red-500/30 transition shadow-sm"
          >
            Log Out ➔
          </button>
        </div>
      </header>

      {/* TWO-STATE PROFILE MODAL: VIEW MODE ➔ ✏️ EDIT MODE */}
      {showProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {isEditingProfile ? "✏️ Edit Tenant Details" : "Tenant Profile"}
              </h3>
              <button
                onClick={() => {
                  setShowProfile(false);
                  setIsEditingProfile(false);
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* VIEW MODE */}
            {!isEditingProfile ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-400 text-white font-extrabold text-2xl flex items-center justify-center overflow-hidden border-2 border-blue-400 shadow-lg shrink-0">
                    {tenantProfile?.avatar_url ? (
                      <img src={tenantProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span>{tenantProfile?.full_name ? tenantProfile.full_name[0].toUpperCase() : "T"}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">{tenantProfile?.full_name || "Tenant"}</h4>
                    <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                      Verified Tenant
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email Address:</span>
                    <span className="font-semibold text-white flex items-center gap-1">
                      {currentTenant?.email} <span className="text-[10px] text-amber-400">🔒</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone Number:</span>
                    <span className="font-semibold text-white">{tenantProfile?.phone || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">National ID Number:</span>
                    <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                      {tenantProfile?.id_number || "Provided during Check-In"} <span className="text-[10px] text-emerald-400">🔒</span>
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
                    onClick={() => setIsEditingProfile(true)}
                    className="flex-1 py-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <span>✏️ Edit Profile Details</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex-1 py-2.5 text-xs font-bold bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-xl transition"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
              /* EDIT MODE */
              <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
                <div className="flex items-center space-x-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    {editAvatarUrl ? (
                      <img src={editAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-500 text-xl font-bold">📷</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Photo URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                {/* PERMANENTLY LOCKED EMAIL 🔒 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-400">Email Address</label>
                    <span className="text-[10px] text-amber-400 font-bold">🔒 Permanent & Uneditable</span>
                  </div>
                  <input
                    type="email"
                    disabled
                    value={currentTenant?.email || ""}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>

                {/* PERMANENTLY LOCKED NATIONAL ID 🔒 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-400">National ID Number</label>
                    <span className="text-[10px] text-emerald-400 font-bold">🔒 Permanent Official ID</span>
                  </div>
                  <input
                    type="text"
                    disabled
                    value={tenantProfile?.id_number || "Set during check-in"}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono cursor-not-allowed"
                  />
                </div>

                <div className="pt-2 flex space-x-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex-1 py-2.5 text-xs font-bold bg-blue-500 hover:bg-blue-400 text-white rounded-xl transition shadow-lg shadow-blue-500/20"
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PROPERTY PHOTOS & MEDIA TOUR MODAL */}
      {viewingHousePhotos && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-4xl w-full mx-auto flex items-center justify-between border-b border-slate-800 pb-4">
            <button
              onClick={() => setViewingHousePhotos(null)}
              className="flex items-center space-x-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl border border-slate-700 transition"
            >
              <span>← Back to Search</span>
            </button>
            <div className="text-right">
              <h3 className="text-base font-bold text-white">{viewingHousePhotos.apartment_name}</h3>
              <span className="text-xs text-slate-400">📍 {viewingHousePhotos.location} • Door {viewingHousePhotos.door_number}</span>
            </div>
          </div>

          <div className="max-w-4xl w-full mx-auto my-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {viewingHousePhotos.media_urls && viewingHousePhotos.media_urls.length > 0 ? (
                viewingHousePhotos.media_urls.map((imgUrl: string, idx: number) => (
                  <div key={idx} className="h-64 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                    <img src={imgUrl} alt={`Apartment photo ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                  </div>
                ))
              ) : (
                <>
                  <div className="h-64 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                    <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80" alt="Apartment Exterior" className="w-full h-full object-cover" />
                  </div>
                  <div className="h-64 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                    <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80" alt="Living Room" className="w-full h-full object-cover" />
                  </div>
                </>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2 text-xs">
              <span className="text-emerald-400 font-bold uppercase tracking-wider">Property Description</span>
              <p className="text-slate-300 leading-relaxed text-sm">
                {viewingHousePhotos.description || "Well-maintained building, constant water supply, prepaid KPLC token meter, and 24/7 security gate."}
              </p>
            </div>
          </div>

          <div className="max-w-4xl w-full mx-auto border-t border-slate-800 pt-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Monthly Rent</span>
              <span className="text-xl font-black text-white">KES {Number(viewingHousePhotos.monthly_rent).toLocaleString()}</span>
            </div>
            <button
              onClick={() => handleBookRoom(viewingHousePhotos)}
              disabled={Boolean(assignedUnit) || Boolean(myPendingBooking) || Boolean(approvedPendingIdUnit)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20"
            >
              Book This Room Now ➔
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* 1-CLICK INSTANT CANCEL PENDING BOOKING BANNER */}
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
              onClick={handleDirectCancelBooking}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-bold px-4 py-2.5 rounded-xl transition shrink-0"
            >
              Cancel Request (1-Click) ✕
            </button>
          </div>
        )}

        {/* CHECK-IN FORM (When Approved - Auto-allocates on submit!) */}
        {approvedPendingIdUnit && (
          <div className="bg-emerald-950/40 border-2 border-emerald-500 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start space-x-3">
              <span className="text-3xl">🎉</span>
              <div>
                <h3 className="text-lg font-bold text-emerald-400">Your Booking Was Approved!</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  The landlord approved your request for <strong>{approvedPendingIdUnit.door_number}</strong> at{" "}
                  <strong>{approvedPendingIdUnit.apartment_name}</strong>. Submit your Kenyan National ID Number and M-Pesa Code below to finalize and auto-allocate this unit to your account!
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
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition text-xs shadow-lg shadow-emerald-500/20"
                >
                  {submittingCheckIn ? "Allocating Unit..." : "Finalize & Auto-Allocate House"}
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
                {assignedUnit.vacate_status === "requested" && (
                  <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 flex items-start space-x-3">
                    <span className="text-2xl mt-0.5">⏳</span>
                    <div>
                      <h4 className="text-sm font-bold text-amber-400">Move-Out Request Under Review</h4>
                      <p className="text-xs text-slate-300 mt-0.5">Awaiting landlord key handover instructions.</p>
                    </div>
                  </div>
                )}

                {assignedUnit.vacate_status === "key_surrender_requested" && (
                  <div className="bg-blue-950/40 border-2 border-blue-500/60 rounded-2xl p-5 space-y-3">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">🔑</span>
                      <div>
                        <h4 className="text-base font-bold text-blue-400">Action: Surrender Keys & Vacate Room</h4>
                        <p className="text-xs text-slate-200 mt-1">
                          <strong>Note from Landlord:</strong> {assignedUnit.vacate_conditions || "Please hand over all door keys to caretaker."}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleConfirmKeyHandover}
                        className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-xl transition shadow-lg"
                      >
                        ✓ I Have Handed Over Keys & Surrendered Room
                      </button>
                    </div>
                  </div>
                )}

                {assignedUnit.vacate_status === "keys_handed_over" && (
                  <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex items-center space-x-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-400">Keys Handover Confirmed!</h4>
                      <p className="text-xs text-slate-300">Awaiting landlord final departure release.</p>
                    </div>
                  </div>
                )}

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
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setViewingHousePhotos(house)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 transition"
                        >
                          📷 Photos & Tour
                        </button>

                        <button
                          onClick={() => handleBookRoom(house)}
                          disabled={isPending || Boolean(assignedUnit) || Boolean(myPendingBooking) || Boolean(approvedPendingIdUnit)}
                          className="bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                        >
                          {isPending ? "Reserved" : "Book Room"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CLICKABLE NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Your eBoma In-App Alerts</h2>
                <p className="text-xs text-slate-400">Click any approval alert to open your check-in!</p>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={async () => {
                    await supabase.from("notifications").delete().eq("user_id", currentTenant.id);
                    setNotifications([]);
                  }}
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
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="bg-slate-900 border border-slate-800 hover:border-blue-500/60 rounded-2xl p-4 space-y-1 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-blue-400 group-hover:text-blue-300 flex items-center gap-1.5">
                        <span>{n.title}</span>
                        <span className="text-xs opacity-60">➔ Click to open</span>
                      </h4>
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