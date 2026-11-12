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
  media_urls?: string[];
  is_vacant: boolean;
  booking_status: string;
  lease_completed: boolean;
  vacate_status?: string;
  vacate_reason?: string;
  vacate_conditions?: string;
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

  // Active Tab
  const [activeTab, setActiveTab] = useState<"portfolio" | "requests" | "vacate" | "notifications">("portfolio");

  // Profile Modal State
  const [showProfile, setShowProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Key Surrender Request Modal
  const [selectedVacateUnit, setSelectedVacateUnit] = useState<Unit | null>(null);
  const [keySurrenderNote, setKeySurrenderNote] = useState("Please surrender all keys to caretaker and leave room clean.");
  const [submittingKeyRequest, setSubmittingKeyRequest] = useState(false);

  // Apartment Photo Manager Modal
  const [managingPhotosApartment, setManagingPhotosApartment] = useState<string | null>(null);
  const [apartmentPhotosList, setApartmentPhotosList] = useState<string[]>([]);
  const [savingApartmentPhotos, setSavingApartmentPhotos] = useState(false);

  // Upload Form states (Opens from ANY tab)
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [uploadMode, setUploadMode] = useState<"single" | "bulk">("bulk");
  const [apartmentName, setApartmentName] = useState("");
  const [location, setLocation] = useState("");
  const [unitType, setUnitType] = useState("Bedsitter");
  const [rent, setRent] = useState("");
  const [description, setDescription] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

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

    // Profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setLandlordProfile(prof);
    if (prof) {
      setEditName(prof.full_name || "");
      setEditPhone(prof.phone || "");
      setEditAvatarUrl(prof.avatar_url || "");
    }

    // Units
    const { data: unitsData } = await supabase
      .from("units")
      .select("*")
      .eq("landlord_id", user.id)
      .order("created_at", { ascending: false });

    // Profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, phone, id_number");

    // Notifications
    const { data: notifData } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setNotifications(notifData || []);

    // Payments
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
      } else if (u.booking_status === "approved_pending_id") {
        status = "Approved (Awaiting Check-in)";
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
        media_urls: u.media_urls || [],
        is_vacant: u.is_vacant ?? true,
        booking_status: u.booking_status || "vacant",
        lease_completed: u.lease_completed || false,
        vacate_status: u.vacate_status,
        vacate_reason: u.vacate_reason,
        vacate_conditions: u.vacate_conditions,
        pending_tenant_id: u.pending_tenant_id,
        tenant_id: u.tenant_id,
        tenant_name: u.booking_status === "pending" && pendingTenant
          ? pendingTenant.full_name
          : tenant ? tenant.full_name : (pendingTenant ? pendingTenant.full_name : "Vacant"),
        tenant_phone: u.booking_status === "pending" && pendingTenant
          ? pendingTenant.phone
          : tenant ? tenant.phone : (pendingTenant ? pendingTenant.phone : "-"),
        tenant_id_number: tenant?.id_number || pendingTenant?.id_number || "Pending Check-In",
        mpesa_code: u.mpesa_code || "-",
        last_paid_date: lastPayment ? lastPayment.payment_date : "Never",
        payment_status: status,
      };
    });

    setUnits(combined);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Convert uploaded image files to base64 Data URLs
  const handlePhotoFilesSelected = (e: React.ChangeEvent<HTMLInputElement>, isModal = false) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          const res = reader.result;
          if (isModal) {
            setApartmentPhotosList((prev) => [...prev, res]);
          } else {
            setUploadedPhotos((prev) => [...prev, res]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Open Photo Manager
  const handleOpenPhotoManager = (aptName: string) => {
    const aptUnits = units.filter((u) => u.apartment_name === aptName);
    const existingPhotos = aptUnits[0]?.media_urls || [];
    setManagingPhotosApartment(aptName);
    setApartmentPhotosList(existingPhotos);
  };

  // Save photos to all doors in apartment
  const handleSaveApartmentPhotos = async () => {
    if (!managingPhotosApartment || !currentLandlord) return;

    setSavingApartmentPhotos(true);
    try {
      const { error } = await supabase
        .from("units")
        .update({ media_urls: apartmentPhotosList })
        .eq("landlord_id", currentLandlord.id)
        .eq("apartment_name", managingPhotosApartment);

      if (error) throw error;

      alert(`Photos saved to ${managingPhotosApartment} successfully!`);
      setManagingPhotosApartment(null);
      await checkUserAndFetch();
    } catch (err: any) {
      alert("Error saving photos: " + err.message);
    } finally {
      setSavingApartmentPhotos(false);
    }
  };

  // Save profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLandlord) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName.trim(),
          phone: editPhone.trim(),
          avatar_url: editAvatarUrl.trim(),
        })
        .eq("id", currentLandlord.id);

      if (error) throw error;

      alert("Profile updated successfully!");
      setIsEditingProfile(false);
      await checkUserAndFetch();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // CLICKABLE NOTIFICATIONS: switches tab without auto-accepting
  const handleNotificationClick = (notif: any) => {
    const title = notif.title.toLowerCase();
    const msg = notif.message.toLowerCase();

    if (title.includes("booking") || msg.includes("booking") || msg.includes("inquiry")) {
      setActiveTab("requests");
    } else if (title.includes("move-out") || title.includes("vacat") || msg.includes("vacat") || title.includes("keys")) {
      setActiveTab("vacate");
    }
  };

  // Key Surrender Request
  const handleSendKeySurrenderRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacateUnit || !selectedVacateUnit.tenant_id) return;

    setSubmittingKeyRequest(true);
    try {
      await supabase
        .from("units")
        .update({
          vacate_status: "key_surrender_requested",
          vacate_conditions: keySurrenderNote.trim(),
        })
        .eq("id", selectedVacateUnit.id);

      await supabase.from("notifications").insert([
        {
          user_id: selectedVacateUnit.tenant_id,
          title: "Surrender Keys & Inspection Request",
          message: `Regarding your departure from ${selectedVacateUnit.door_number}: ${keySurrenderNote.trim()}. Please hand over the keys and confirm in your portal.`,
        },
      ]);

      alert("Key surrender instructions sent to tenant!");
      setSelectedVacateUnit(null);
      await checkUserAndFetch();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingKeyRequest(false);
    }
  };

  // Final Release & Mark Vacant
  const handleConfirmFinalRelease = async (unit: Unit) => {
    if (!unit.tenant_id) return;
    if (!confirm(`Confirm final release for ${unit.tenant_name}? ${unit.door_number} will become VACANT in the marketplace immediately.`)) {
      return;
    }

    try {
      await supabase
        .from("units")
        .update({
          is_vacant: true,
          booking_status: "vacant",
          tenant_id: null,
          pending_tenant_id: null,
          lease_completed: false,
          mpesa_code: null,
          vacate_status: null,
          vacate_reason: null,
          vacate_conditions: null,
        })
        .eq("id", unit.id);

      await supabase.from("notifications").insert([
        {
          user_id: unit.tenant_id,
          title: "Departure Confirmed!",
          message: `Your departure from ${unit.door_number} at ${unit.apartment_name} has been confirmed. You are now released and free to book another keja on eBoma!`,
        },
      ]);

      alert(`Success! ${unit.door_number} is now VACANT and the tenant has been released.`);
      await checkUserAndFetch();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Clear all alerts
  const handleClearAllNotifications = async () => {
    if (!currentLandlord) return;
    if (!confirm("Are you sure you want to clear all notifications?")) return;
    try {
      await supabase.from("notifications").delete().eq("user_id", currentLandlord.id);
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
          apartment_name: apartmentName.trim(),
          location: location.trim(),
          door_number: doorNumber.trim(),
          unit_type: unitType,
          monthly_rent: Number(rent),
          description: description.trim(),
          media_urls: uploadedPhotos,
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
            apartment_name: apartmentName.trim(),
            location: location.trim(),
            door_number: `${doorPrefix}${i}`,
            unit_type: unitType,
            monthly_rent: Number(rent),
            description: description.trim(),
            media_urls: uploadedPhotos,
            is_vacant: true,
            booking_status: "vacant",
          });
        }
      }

      const { error } = await supabase.from("units").insert(unitsToInsert);
      if (error) throw error;

      alert(`Success! ${unitsToInsert.length} units with photos uploaded to ${apartmentName}.`);
      setIsAddingUnit(false);
      setUploadedPhotos([]);
      await checkUserAndFetch();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // APPROVE BOOKING INQUIRY
  const handleApprove = async (unit: Unit) => {
    const targetTenantId = unit.pending_tenant_id || unit.tenant_id;
    if (!targetTenantId) return;

    try {
      await supabase
        .from("units")
        .update({
          booking_status: "approved_pending_id",
          tenant_id: targetTenantId,
        })
        .eq("id", unit.id);

      await supabase.from("notifications").insert([
        {
          user_id: targetTenantId,
          title: "Booking Approved! Complete Check-in",
          message: `Your booking for ${unit.door_number} at ${unit.apartment_name} was approved! Finalize check-in with your National ID Number and M-Pesa Code.`,
        },
      ]);

      alert(`Booking for ${unit.door_number} approved! Tenant has been instructed to complete check-in.`);
      await checkUserAndFetch();
    } catch (err: any) {
      alert("Error approving booking: " + err.message);
    }
  };

  // DECLINE / REJECT BOOKING INQUIRY
  const handleReject = async (unit: Unit) => {
    const targetTenantId = unit.pending_tenant_id || unit.tenant_id;

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

      if (targetTenantId) {
        await supabase.from("notifications").insert([
          {
            user_id: targetTenantId,
            title: "Booking Request Declined",
            message: `Your booking request for ${unit.door_number} at ${unit.apartment_name} was declined. The room has been released.`,
          },
        ]);
      }

      alert(`Booking request for ${unit.door_number} declined. Room is now back to Vacant.`);
      await checkUserAndFetch();
    } catch (err: any) {
      alert("Error rejecting booking: " + err.message);
    }
  };

  const pendingRequests = units.filter((u) => u.booking_status === "pending");
  const approvedAwaitingCheckIn = units.filter((u) => u.booking_status === "approved_pending_id");
  const vacateRequests = units.filter((u) => Boolean(u.vacate_status));
  const distinctApartments = Array.from(new Set(units.map((u) => u.apartment_name)));

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <Logo size="sm" />
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold hidden sm:inline-block">
            Landlord Portal
          </span>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "portfolio" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            My Apartments ({units.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold relative transition ${
              activeTab === "requests" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Inquiries
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("vacate")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold relative transition ${
              activeTab === "vacate" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Move-Outs
            {vacateRequests.length > 0 && (
              <span className="ml-1.5 bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {vacateRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold relative transition ${
              activeTab === "notifications" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Alerts
            {notifications.length > 0 && (
              <span className="ml-1.5 bg-blue-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab("portfolio");
              setIsAddingUnit(true);
            }}
            className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            + Upload Doors
          </button>

          <button
            type="button"
            onClick={() => {
              setIsEditingProfile(false);
              setShowProfile(true);
            }}
            className="w-9 h-9 rounded-full bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center border-2 border-emerald-400 hover:scale-105 transition shadow-sm overflow-hidden shrink-0 cursor-pointer"
            title="View Profile Details"
          >
            {landlordProfile?.avatar_url ? (
              <img src={landlordProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{landlordProfile?.full_name ? landlordProfile.full_name[0].toUpperCase() : "L"}</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold px-3 py-2 rounded-xl border border-red-500/30 transition shadow-sm cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* APARTMENT PHOTO MANAGER MODAL */}
      {managingPhotosApartment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Photos for {managingPhotosApartment}
                </h3>
                <p className="text-xs text-slate-400">These photos apply to all doors in this building</p>
              </div>
              <button
                type="button"
                onClick={() => setManagingPhotosApartment(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-dashed border-slate-700 flex flex-col items-center justify-center space-y-2">
              <span className="text-2xl">📸</span>
              <span className="text-xs font-semibold text-slate-300">Select images from your device</span>
              <label className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition">
                Choose Photo Files
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoFilesSelected(e, true)}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-2">
                Attached Building Photos ({apartmentPhotosList.length}):
              </span>
              {apartmentPhotosList.length === 0 ? (
                <div className="text-center py-6 bg-slate-950 rounded-xl text-xs text-slate-500">
                  No photos uploaded for this apartment yet.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                  {apartmentPhotosList.map((img, idx) => (
                    <div key={idx} className="h-24 rounded-xl overflow-hidden border border-slate-700 relative group">
                      <img src={img} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setApartmentPhotosList(apartmentPhotosList.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center opacity-85 hover:opacity-100"
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setManagingPhotosApartment(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingApartmentPhotos}
                onClick={handleSaveApartmentPhotos}
                className="flex-1 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition shadow-lg shadow-emerald-500/20"
              >
                {savingApartmentPhotos ? "Saving..." : "Save Photos to Building"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TWO-STATE PROFILE MODAL */}
      {showProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {isEditingProfile ? "Edit Landlord Details" : "Landlord Profile"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowProfile(false);
                  setIsEditingProfile(false);
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {!isEditingProfile ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-2xl flex items-center justify-center overflow-hidden border-2 border-emerald-400 shadow-lg shrink-0">
                    {landlordProfile?.avatar_url ? (
                      <img src={landlordProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span>{landlordProfile?.full_name ? landlordProfile.full_name[0].toUpperCase() : "L"}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">{landlordProfile?.full_name || "Landlord"}</h4>
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                      Verified Landlord
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email Address:</span>
                    <span className="font-semibold text-white flex items-center gap-1">
                      {currentLandlord?.email} <span className="text-[10px] text-amber-400">🔒</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone Number:</span>
                    <span className="font-semibold text-white">{landlordProfile?.phone || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Doors Owned:</span>
                    <span className="font-semibold text-emerald-400">{units.length} Units</span>
                  </div>
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="flex-1 py-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Edit Profile Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex-1 py-2.5 text-xs font-bold bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-xl transition cursor-pointer"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
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

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-400">Email Address</label>
                    <span className="text-[10px] text-amber-400 font-bold">🔒 Permanent & Uneditable</span>
                  </div>
                  <input
                    type="email"
                    disabled
                    value={currentLandlord?.email || ""}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed"
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
                    className="flex-1 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition shadow-lg shadow-emerald-500/20"
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {/* UPLOAD FORM (CAN BE OPENED FROM ANY TAB!) */}
        {isAddingUnit && (
          <form onSubmit={handleSaveUnits} className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-emerald-400 text-base">Add Apartments & Doors</h3>
                <p className="text-xs text-slate-400">Upload single doors or batch units in one click</p>
              </div>
              <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button type="button" onClick={() => setUploadMode("bulk")} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${uploadMode === "bulk" ? "bg-emerald-500 text-slate-950" : "text-slate-400"}`}>⚡ Bulk</button>
                <button type="button" onClick={() => setUploadMode("single")} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${uploadMode === "single" ? "bg-emerald-500 text-slate-950" : "text-slate-400"}`}>Single</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Apartment / Building Name</label>
                <input type="text" required placeholder="e.g. Green Heights" value={apartmentName} onChange={(e) => setApartmentName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Location / Area</label>
                <input type="text" required placeholder="e.g. Roysambu, Nairobi" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Room Type</label>
                <select value={unitType} onChange={(e) => setUnitType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white">
                  <option value="Single Room">Single Room</option>
                  <option value="Bedsitter">Bedsitter</option>
                  <option value="1 Bedroom">1 Bedroom</option>
                  <option value="2 Bedroom">2 Bedroom</option>
                  <option value="3 Bedroom">3 Bedroom</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Rent / Mo (KES)</label>
                <input type="number" required placeholder="15000" value={rent} onChange={(e) => setRent(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>

              {uploadMode === "single" ? (
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Door Number</label>
                  <input type="text" required placeholder="Door A-1" value={doorNumber} onChange={(e) => setDoorNumber(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white" />
                </div>
              ) : (
                <div className="col-span-2 grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Prefix</label>
                    <input type="text" value={doorPrefix} onChange={(e) => setDoorPrefix(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">From</label>
                    <input type="number" value={doorStart} onChange={(e) => setDoorStart(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">To</label>
                    <input type="number" value={doorEnd} onChange={(e) => setDoorEnd(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* DIRECT PHOTO UPLOADER */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-dashed border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-white block">
                    Upload Apartment Building Photos (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Pick photos from your device. Applies to all doors in this building.
                  </span>
                </div>
                <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition border border-slate-700">
                  Choose Images
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handlePhotoFilesSelected(e, false)}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadedPhotos.length > 0 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pt-2">
                  {uploadedPhotos.map((img, idx) => (
                    <div key={idx} className="w-20 h-20 rounded-xl overflow-hidden border border-slate-700 shrink-0 relative group">
                      <img src={img} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setUploadedPhotos(uploadedPhotos.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-85 hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Amenities</label>
              <textarea rows={2} placeholder="Borehole water, CCTV, token meter." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setIsAddingUnit(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" className="px-5 py-2.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition">Save Units</button>
            </div>
          </form>
        )}
        
        {/* TAB 1: MOVE-OUTS */}
        {activeTab === "vacate" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Tenant Move-Out Inquiries</h2>
              <p className="text-xs text-slate-400">Review key surrender and confirm final release.</p>
            </div>

            {vacateRequests.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl">
                <span className="text-4xl block mb-2">🚪</span>
                <p className="text-slate-400 text-sm">No tenants currently requesting to move out.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vacateRequests.map((req) => (
                  <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">Move-Out Request</span>
                          <h3 className="text-lg font-bold text-white mt-0.5">{req.apartment_name} - {req.door_number}</h3>
                          <span className="text-xs text-slate-400">Rent: KES {req.monthly_rent.toLocaleString()} / Mo</span>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Rent Cleared
                        </span>
                      </div>

                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mt-4 space-y-1.5 text-xs">
                        <div><span className="text-slate-400">Tenant: </span><span className="font-bold text-white">{req.tenant_name}</span></div>
                        <div><span className="text-slate-400">Phone: </span><span className="text-slate-200">📞 {req.tenant_phone}</span></div>
                        <div><span className="text-slate-400">National ID: </span><span className="font-mono text-emerald-400">{req.tenant_id_number}</span></div>
                        <div className="pt-1 border-t border-slate-800">
                          <span className="text-amber-400 font-semibold">Vacate Reason: </span>
                          <span className="text-slate-200 italic">"{req.vacate_reason}"</span>
                        </div>
                        {req.vacate_status === "keys_handed_over" ? (
                          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold mt-2">
                            Tenant Confirmed: Keys handed over & room surrendered!
                          </div>
                        ) : req.vacate_status === "key_surrender_requested" ? (
                          <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 text-[11px] mt-2">
                            Instructions Sent: Waiting for tenant to confirm key handover.
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
                      {req.vacate_status !== "keys_handed_over" && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVacateUnit(req);
                            setKeySurrenderNote(req.vacate_conditions || "Please surrender all door keys to caretaker and leave room clean.");
                          }}
                          className="flex-1 py-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 rounded-xl transition cursor-pointer"
                        >
                          Request Key Surrender
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleConfirmFinalRelease(req)}
                        className="flex-1 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                      >
                        Final Release & Mark Room Vacant
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INQUIRIES */}
        {activeTab === "requests" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Client Booking Inquiries</h2>
              <p className="text-xs text-slate-400">Review, approve, or decline room booking requests</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                New Requests Awaiting Your Decision ({pendingRequests.length}):
              </h3>

              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 bg-slate-900 border border-slate-800 rounded-2xl">
                  <p className="text-slate-400 text-xs">No pending requests right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="bg-slate-900 border border-amber-500/50 rounded-3xl p-5 space-y-4 shadow-xl">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">New Booking Inquiry</span>
                          <h3 className="text-base font-bold text-white mt-1">{req.apartment_name} - {req.door_number}</h3>
                          <span className="text-xs text-slate-400">📍 {req.location} • KES {req.monthly_rent.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1 text-xs">
                        <div className="text-slate-400">Applicant Name: <span className="font-bold text-white">{req.tenant_name}</span></div>
                        <div className="text-slate-400">Phone: <span className="text-slate-200 font-medium">📞 {req.tenant_phone}</span></div>
                      </div>

                      <div className="flex space-x-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleReject(req)}
                          className="flex-1 py-2.5 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/40 rounded-xl transition cursor-pointer"
                        >
                          ✕ Decline Request
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(req)}
                          className="flex-1 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                        >
                          ✓ Approve (Request National ID)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {approvedAwaitingCheckIn.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Approved By You - Waiting for Tenant Check-in ({approvedAwaitingCheckIn.length}):
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {approvedAwaitingCheckIn.map((req) => (
                    <div key={req.id} className="bg-slate-900 border border-blue-500/40 rounded-3xl p-5 space-y-3">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-blue-400 font-bold">Approved - Awaiting Check-In</span>
                        <h4 className="text-base font-bold text-white mt-0.5">{req.apartment_name} - {req.door_number}</h4>
                        <p className="text-xs text-slate-400">Tenant: <strong className="text-white">{req.tenant_name}</strong> ({req.tenant_phone})</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <span className="text-[11px] text-amber-400 animate-pulse">
                          Tenant is entering National ID & M-Pesa...
                        </span>
                        <button
                          type="button"
                          onClick={() => handleReject(req)}
                          className="text-xs bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
                          title="Revoke approval and return room to Vacant"
                        >
                          Revoke Approval
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CLICKABLE NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Landlord In-App Alerts</h2>
                <p className="text-xs text-slate-400">Click any alert to jump directly into the Inquiries tab!</p>
              </div>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllNotifications}
                  className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer"
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
                    className="bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-2xl p-5 space-y-1 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1.5">
                        <span>{n.title}</span>
                        <span className="text-xs opacity-60">➔ Click to view inquiries</span>
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed pt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PORTFOLIO */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">

            {/* Quick Apartment Photos Manager Bar */}
            {distinctApartments.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Building Photos Manager
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click to add or update photos for any of your apartment buildings:
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {distinctApartments.map((apt) => (
                    <button
                      key={apt}
                      type="button"
                      onClick={() => handleOpenPhotoManager(apt)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📷 {apt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio Table */}
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
                      <th className="px-4 py-3 rounded-r-xl">Actions</th>
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
                            unit.vacate_status ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : unit.is_vacant ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                          }`}>
                            {unit.vacate_status ? "Move-Out Pending" : unit.is_vacant ? "Vacant" : "Occupied"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-white">{unit.tenant_name}</td>
                        <td className="px-4 py-3.5 text-xs font-mono text-emerald-400">{unit.tenant_id_number}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-400">{unit.tenant_phone}</td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPhotoManager(unit.apartment_name)}
                            className="text-xs text-slate-300 hover:text-emerald-400 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition"
                            title="Upload or change photos for this apartment building"
                          >
                            📷 Photos ({unit.media_urls?.length || 0})
                          </button>
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