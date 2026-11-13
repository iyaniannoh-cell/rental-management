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
  payment_status: "Paid" | "Due in 7 Days" | "Overdue" | "Vacant" | "Pending Approval";
  created_at?: string;
}

export default function LandlordDashboard() {
  const router = useRouter();

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [currentLandlord, setCurrentLandlord] = useState<any>(null);
  const [landlordProfile, setLandlordProfile] = useState<any>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active top tab
  const [activeTab, setActiveTab] = useState<"portfolio" | "requests" | "vacate" | "notifications">("portfolio");

  // NEW: Filter states for cleaner UX
  const [selectedApartmentFilter, setSelectedApartmentFilter] = useState<string>("All");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // NEW: Slide-Over Tenant Dossier Drawer
  const [selectedTenantDossier, setSelectedTenantDossier] = useState<Unit | null>(null);

  // Profile Modal
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

  // Upload Form states
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
    const savedTheme = localStorage.getItem("eboma_theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
    checkUserAndFetch();
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("eboma_theme", nextTheme);
  };

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
      .select("*")
      .order("created_at", { ascending: false });
    setPaymentsList(paymentsData || []);

    const combined: Unit[] = (unitsData || []).map((u: any) => {
      const tenant = (profilesData || []).find((p: any) => p.id === u.tenant_id);
      const pendingTenant = (profilesData || []).find((p: any) => p.id === u.pending_tenant_id);
      const unitPayments = (paymentsData || []).filter((p: any) => p.unit_id === u.id);
      const lastPayment = unitPayments[0];

      let status: "Paid" | "Due in 7 Days" | "Overdue" | "Vacant" | "Pending Approval" = "Due in 7 Days";
      if (u.booking_status === "pending" || u.booking_status === "approved_pending_id") {
        status = "Pending Approval";
      } else if (u.is_vacant) {
        status = "Vacant";
      } else if (lastPayment?.status === "paid") {
        status = "Paid";
      } else {
        status = "Overdue";
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
          : tenant ? tenant.full_name : "Vacant",
        tenant_phone: u.booking_status === "pending" && pendingTenant
          ? pendingTenant.phone
          : tenant ? tenant.phone : "-",
        tenant_id_number: tenant?.id_number || pendingTenant?.id_number || "Not Provided",
        mpesa_code: u.mpesa_code || "-",
        last_paid_date: lastPayment ? lastPayment.payment_date : "Never",
        payment_status: status,
        created_at: u.created_at,
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

  const handleOpenPhotoManager = (aptName: string) => {
    const aptUnits = units.filter((u) => u.apartment_name === aptName);
    const existingPhotos = aptUnits[0]?.media_urls || [];
    setManagingPhotosApartment(aptName);
    setApartmentPhotosList(existingPhotos);
  };

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
      alert("Error: " + err.message);
    } finally {
      setSavingApartmentPhotos(false);
    }
  };

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

  const handleNotificationClick = (notif: any) => {
    const title = notif.title.toLowerCase();
    const msg = notif.message.toLowerCase();
    if (title.includes("booking") || msg.includes("booking") || msg.includes("inquiry")) {
      setActiveTab("requests");
    } else if (title.includes("move-out") || title.includes("vacat") || msg.includes("vacat") || title.includes("keys")) {
      setActiveTab("vacate");
    }
  };

  // Quick Action: Send 7-Day Due Reminder to a specific tenant
  const handleSendReminderToTenant = async (unit: Unit) => {
    if (!unit.tenant_id) return;
    try {
      await supabase.from("notifications").insert([
        {
          user_id: unit.tenant_id,
          title: "Rent Due Reminder ⏰",
          message: `Friendly reminder from your landlord: Rent of KES ${unit.monthly_rent.toLocaleString()} for ${unit.door_number} at ${unit.apartment_name} is due. Please ensure prompt payment via M-Pesa.`,
        },
      ]);
      alert(`7-Day Rent Reminder sent to ${unit.tenant_name} (${unit.door_number})!`);
    } catch (err: any) {
      alert("Error sending reminder: " + err.message);
    }
  };

  // Quick Action: Toggle Paid / Unpaid
  const handleTogglePayment = async (unit: Unit) => {
    if (!unit.tenant_id) return;
    try {
      if (unit.payment_status === "Paid") {
        await supabase.from("payments").delete().eq("unit_id", unit.id);
        alert(`Status for ${unit.door_number} changed to UNPAID.`);
      } else {
        await supabase.from("payments").insert([
          {
            unit_id: unit.id,
            tenant_id: unit.tenant_id,
            amount: unit.monthly_rent,
            payment_date: new Date().toISOString().split("T")[0],
            status: "paid",
          },
        ]);
        alert(`Payment verified! ${unit.door_number} marked as PAID.`);
      }
      await checkUserAndFetch();
      if (selectedTenantDossier && selectedTenantDossier.id === unit.id) {
        setSelectedTenantDossier(null);
      }
    } catch (err: any) {
      alert("Error updating payment: " + err.message);
    }
  };

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
          title: "Surrender Keys & Inspection Request 🔑",
          message: `Regarding departure from ${selectedVacateUnit.door_number}: ${keySurrenderNote.trim()}. Please confirm key handover in portal.`,
        },
      ]);

      alert("Key instructions sent to tenant!");
      setSelectedVacateUnit(null);
      await checkUserAndFetch();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingKeyRequest(false);
    }
  };

  const handleConfirmFinalRelease = async (unit: Unit) => {
    if (!unit.tenant_id) return;
    if (!confirm(`Release ${unit.tenant_name}? ${unit.door_number} will become VACANT immediately.`)) return;

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
          title: "Departure Confirmed! 🎉",
          message: `Departure from ${unit.door_number} confirmed! You are released and free to book another keja on eBoma.`,
        },
      ]);

      alert(`Success! ${unit.door_number} is now VACANT.`);
      await checkUserAndFetch();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!currentLandlord) return;
    if (!confirm("Clear all notifications?")) return;
    try {
      await supabase.from("notifications").delete().eq("user_id", currentLandlord.id);
      setNotifications([]);
      alert("All notifications cleared!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

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

      alert(`Success! ${unitsToInsert.length} units uploaded.`);
      setIsAddingUnit(false);
      setUploadedPhotos([]);
      await checkUserAndFetch();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

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
          message: `Your booking for ${unit.door_number} at ${unit.apartment_name} was approved! Finalize check-in with your National ID Number & M-Pesa Code.`,
        },
      ]);

      alert(`Booking for ${unit.door_number} approved! Tenant notified.`);
      await checkUserAndFetch();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

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
            message: `Your request for ${unit.door_number} was declined. Room is now back to Vacant.`,
          },
        ]);
      }

      alert(`Booking request for ${unit.door_number} declined.`);
      await checkUserAndFetch();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Distinct apartment names
  const distinctApartments = Array.from(new Set(units.map((u) => u.apartment_name)));

  // Filtered units based on: Apartment Dropdown, Payment Pill, and Search Query
  const filteredUnits = units.filter((u) => {
    const matchesApt = selectedApartmentFilter === "All" || u.apartment_name === selectedApartmentFilter;
    const matchesPayment =
      paymentStatusFilter === "All"
        ? true
        : paymentStatusFilter === "Paid"
        ? u.payment_status === "Paid"
        : paymentStatusFilter === "Due in 7 Days"
        ? u.payment_status === "Due in 7 Days"
        : paymentStatusFilter === "Overdue"
        ? u.payment_status === "Overdue"
        : paymentStatusFilter === "Vacant"
        ? u.is_vacant
        : true;

    const matchesSearch =
      !searchQuery.trim() ||
      u.door_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.tenant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.apartment_name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesApt && matchesPayment && matchesSearch;
  });

  // Pill counts
  const totalCount = units.length;
  const paidCount = units.filter((u) => u.payment_status === "Paid").length;
  const dueSoonCount = units.filter((u) => u.payment_status === "Due in 7 Days").length;
  const overdueCount = units.filter((u) => u.payment_status === "Overdue").length;
  const vacantCount = units.filter((u) => u.is_vacant).length;

  const pendingRequests = units.filter((u) => u.booking_status === "pending");
  const approvedAwaitingCheckIn = units.filter((u) => u.booking_status === "approved_pending_id");
  const vacateRequests = units.filter((u) => Boolean(u.vacate_status));

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
    }`}>
      {/* Top Header */}
      <header className={`border-b px-6 py-4 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200 ${
        isDark ? "bg-slate-900/90 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm"
      }`}>
        <div className="flex items-center space-x-3">
          <Logo size="sm" />
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold hidden sm:inline-block border ${
            isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-300"
          }`}>
            Landlord Portal
          </span>
        </div>

        {/* Tab Controls */}
        <div className={`flex items-center space-x-2 p-1.5 rounded-2xl border ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
        }`}>
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === "portfolio" ? "bg-emerald-500 text-slate-950 shadow-sm" : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            My Properties & Rent
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold relative transition ${
              activeTab === "requests" ? "bg-emerald-500 text-slate-950 shadow-sm" : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold relative transition ${
              activeTab === "vacate" ? "bg-emerald-500 text-slate-950 shadow-sm" : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold relative transition ${
              activeTab === "notifications" ? "bg-emerald-500 text-slate-950 shadow-sm" : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Alerts
            {notifications.length > 0 && (
              <span className="ml-1.5 bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>
        </div>

        {/* Right Section: Add Door, Theme Toggle ☀️/🌙, Profile Avatar, and Logout */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab("portfolio");
              setIsAddingUnit(true);
            }}
            className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl transition shadow-sm cursor-pointer hidden md:block"
          >
            + Upload Doors
          </button>

          {/* Theme Switcher ☀️/🌙 */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center text-sm shadow-sm ${
              isDark
                ? "bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700"
                : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
            }`}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          {/* Profile Avatar */}
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
            className="text-xs bg-red-50 hover:bg-red-500 text-red-600 hover:text-white font-bold px-3 py-2 rounded-xl border border-red-200 transition shadow-sm cursor-pointer"
          >
            Log Out ➔
          </button>
        </div>
      </header>

      {/* NEW: TENANT DOSSIER SLIDE-OVER DRAWER (FULL STORY & ACTIONS) */}
      {selectedTenantDossier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className={`w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300 ${
            isDark ? "bg-slate-900 text-white border-l border-slate-800" : "bg-white text-slate-900 border-l border-slate-200"
          }`}>
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <div>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Tenant Profile & Lease Story</span>
                  <h3 className="text-lg font-black mt-0.5">{selectedTenantDossier.tenant_name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTenantDossier(null)}
                  className="w-8 h-8 rounded-full bg-slate-800/20 hover:bg-slate-800/40 flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Unit & Rent Summary */}
              <div className={`p-4 rounded-2xl border mb-5 space-y-2 ${
                isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Assigned Keja:</span>
                  <span className="text-sm font-bold text-emerald-500">{selectedTenantDossier.door_number} ({selectedTenantDossier.apartment_name})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Monthly Rent:</span>
                  <span className="text-sm font-extrabold">KES {selectedTenantDossier.monthly_rent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Payment Status:</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    selectedTenantDossier.payment_status === "Paid"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  }`}>
                    {selectedTenantDossier.payment_status}
                  </span>
                </div>
              </div>

              {/* Verified Identity */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-bold uppercase text-slate-400">Official Tenant Verification</h4>
                <div className={`p-4 rounded-2xl border space-y-2.5 text-xs ${
                  isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone Number:</span>
                    <span className="font-bold">📞 {selectedTenantDossier.tenant_phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">National ID Number:</span>
                    <span className="font-mono font-bold text-emerald-500">{selectedTenantDossier.tenant_id_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last M-Pesa Code:</span>
                    <span className="font-mono font-bold">{selectedTenantDossier.mpesa_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Payment Date:</span>
                    <span className="font-medium">{selectedTenantDossier.last_paid_date}</span>
                  </div>
                </div>
              </div>

              {/* Payment History Log for this tenant */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-bold uppercase text-slate-400">Payment Track Record</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {paymentsList.filter((p) => p.unit_id === selectedTenantDossier.id).length === 0 ? (
                    <div className="text-xs text-slate-500 italic p-3 bg-slate-950/30 rounded-xl">No prior payment records found.</div>
                  ) : (
                    paymentsList.filter((p) => p.unit_id === selectedTenantDossier.id).map((pay) => (
                      <div key={pay.id} className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}>
                        <div>
                          <div className="font-bold text-emerald-500">KES {Number(pay.amount).toLocaleString()}</div>
                          <span className="text-[10px] text-slate-400">{pay.payment_date}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400">
                          {pay.status.toUpperCase()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions at Bottom of Dossier */}
            <div className="space-y-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => handleTogglePayment(selectedTenantDossier)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
                  selectedTenantDossier.payment_status === "Paid"
                    ? "bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                }`}
              >
                {selectedTenantDossier.payment_status === "Paid" ? "Mark as Unpaid" : "✓ Verify & Mark as Paid"}
              </button>

              <button
                type="button"
                onClick={() => handleSendReminderToTenant(selectedTenantDossier)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  isDark ? "bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-amber-800 border-slate-300"
                }`}
              >
                ⏰ Send 7-Day Rent Due Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {/* TAB 4: MY PROPERTIES & RENT (THE NEW CLEAN DASHBOARD!) */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">

            {/* TOP COMMAND BAR: APARTMENT SELECTOR + SEARCH + PHOTO MANAGER BUTTONS */}
            <div className={`p-5 rounded-3xl border shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}>
              {/* Left: Building Dropdown Switcher */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="w-full sm:w-64">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Select Building / Estate
                  </label>
                  <select
                    value={selectedApartmentFilter}
                    onChange={(e) => setSelectedApartmentFilter(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  >
                    <option value="All">🏢 All Buildings ({units.length} Doors)</option>
                    {distinctApartments.map((apt) => (
                      <option key={apt} value={apt}>
                        🏢 {apt} ({units.filter((u) => u.apartment_name === apt).length} Doors)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Bar */}
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Quick Search (Door, Tenant, Estate)
                  </label>
                  <input
                    type="text"
                    placeholder="Search by door or tenant name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              {/* Right: Manage Photos Shortcuts */}
              {distinctApartments.length > 0 && (
                <div className="flex items-center gap-2 pt-1 md:pt-4 overflow-x-auto">
                  <span className="text-[10px] text-slate-400 font-bold uppercase hidden lg:inline">Photos:</span>
                  {distinctApartments.map((apt) => (
                    <button
                      key={apt}
                      type="button"
                      onClick={() => handleOpenPhotoManager(apt)}
                      className={`text-xs font-bold px-3 py-2 rounded-xl border transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                      }`}
                    >
                      📷 {apt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 1-CLICK PAYMENT FILTER PILLS (FASTEST MORNING GLANCE!) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setPaymentStatusFilter("All")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer border ${
                  paymentStatusFilter === "All"
                    ? "bg-slate-900 text-white border-slate-900 shadow-md"
                    : isDark ? "bg-slate-900 text-slate-400 border-slate-800" : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                All Doors ({totalCount})
              </button>

              <button
                type="button"
                onClick={() => setPaymentStatusFilter("Paid")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer border ${
                  paymentStatusFilter === "Paid"
                    ? "bg-emerald-500 text-slate-950 border-emerald-500 shadow-md"
                    : isDark ? "bg-slate-900 text-emerald-400 border-slate-800" : "bg-white text-emerald-700 border-slate-200"
                }`}
              >
                ✅ Verified Paid ({paidCount})
              </button>

              <button
                type="button"
                onClick={() => setPaymentStatusFilter("Due in 7 Days")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer border ${
                  paymentStatusFilter === "Due in 7 Days"
                    ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md"
                    : isDark ? "bg-slate-900 text-amber-400 border-slate-800" : "bg-white text-amber-800 border-slate-200"
                }`}
              >
                🟡 Due in 7 Days ({dueSoonCount})
              </button>

              <button
                type="button"
                onClick={() => setPaymentStatusFilter("Overdue")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer border ${
                  paymentStatusFilter === "Overdue"
                    ? "bg-red-500 text-white border-red-500 shadow-md"
                    : isDark ? "bg-slate-900 text-red-400 border-slate-800" : "bg-white text-red-700 border-slate-200"
                }`}
              >
                🔴 Defaulters / Overdue ({overdueCount})
              </button>

              <button
                type="button"
                onClick={() => setPaymentStatusFilter("Vacant")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer border ${
                  paymentStatusFilter === "Vacant"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : isDark ? "bg-slate-900 text-blue-400 border-slate-800" : "bg-white text-blue-700 border-slate-200"
                }`}
              >
                🟢 Vacant Units ({vacantCount})
              </button>
            </div>

            {/* MASTER RENT & TENANTS LIST (CLEAN, SCANNABLE, CLICKABLE FOR FULL STORY) */}
            <div className={`border rounded-3xl p-6 shadow-sm ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-base">Doors & Occupants List</h3>
                  <p className="text-xs text-slate-400">Click any row to open the complete Tenant Dossier Sheet & Actions</p>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  Showing {filteredUnits.length} of {units.length} units
                </span>
              </div>

              {filteredUnits.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No units match the selected building or filter pill.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className={`text-xs uppercase border-b ${
                      isDark ? "bg-slate-950 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}>
                      <tr>
                        <th className="px-4 py-3 rounded-l-xl">Door & Estate</th>
                        <th className="px-4 py-3">Room Type</th>
                        <th className="px-4 py-3">Rent / Mo</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Occupant</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3 rounded-r-xl text-right">Story & Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-slate-800" : "divide-slate-100"}`}>
                      {filteredUnits.map((unit) => (
                        <tr
                          key={unit.id}
                          onClick={() => setSelectedTenantDossier(unit)}
                          className={`transition cursor-pointer ${
                            isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-bold">{unit.door_number}</div>
                            <div className="text-xs text-slate-400">{unit.apartment_name}</div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-blue-500 font-bold">{unit.unit_type}</td>
                          <td className="px-4 py-3.5 font-bold">KES {unit.monthly_rent.toLocaleString()}</td>
                          <td className="px-4 py-3.5">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                              unit.is_vacant
                                ? isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : unit.payment_status === "Paid"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : unit.payment_status === "Due in 7 Days"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : "bg-red-500/10 text-red-400 border border-red-500/30"
                            }`}>
                              {unit.is_vacant ? "🟢 Vacant" : unit.payment_status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs font-bold">{unit.tenant_name}</td>
                          <td className="px-4 py-3.5 text-xs text-slate-400">{unit.tenant_phone}</td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="text-xs font-bold text-emerald-500 hover:underline">
                              👤 View Dossier ➔
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* UPLOAD FORM (MODAL/DRAWER ACCESSIBLE FROM ANYWHERE) */}
        {isAddingUnit && (
          <form onSubmit={handleSaveUnits} className={`border rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in ${
            isDark ? "bg-slate-900 border-emerald-500/50" : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-bold text-emerald-600 text-base">Add Apartments & Doors</h3>
                <p className="text-xs text-slate-400">Upload single doors or batch units in one click</p>
              </div>
              <div className="flex items-center space-x-2 p-1 rounded-xl border">
                <button type="button" onClick={() => setUploadMode("bulk")} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${uploadMode === "bulk" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400"}`}>⚡ Bulk</button>
                <button type="button" onClick={() => setUploadMode("single")} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${uploadMode === "single" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400"}`}>Single</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">Apartment / Building Name</label>
                <input type="text" required placeholder="e.g. Green Heights" value={apartmentName} onChange={(e) => setApartmentName(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-transparent" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Location / Area</label>
                <input type="text" required placeholder="e.g. Roysambu, Nairobi" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-transparent" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Room Type</label>
                <select value={unitType} onChange={(e) => setUnitType(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-transparent">
                  <option value="Single Room">Single Room</option>
                  <option value="Bedsitter">Bedsitter</option>
                  <option value="1 Bedroom">1 Bedroom</option>
                  <option value="2 Bedroom">2 Bedroom</option>
                  <option value="3 Bedroom">3 Bedroom</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Rent / Mo (KES)</label>
                <input type="number" required placeholder="15000" value={rent} onChange={(e) => setRent(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-transparent" />
              </div>

              {uploadMode === "single" ? (
                <div>
                  <label className="block text-xs font-bold mb-1">Door Number</label>
                  <input type="text" required placeholder="Door A-1" value={doorNumber} onChange={(e) => setDoorNumber(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-transparent" />
                </div>
              ) : (
                <div className="col-span-2 grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">Prefix</label>
                    <input type="text" value={doorPrefix} onChange={(e) => setDoorPrefix(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">From</label>
                    <input type="number" value={doorStart} onChange={(e) => setDoorStart(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">To</label>
                    <input type="number" value={doorEnd} onChange={(e) => setDoorEnd(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-transparent" />
                  </div>
                </div>
              )}
            </div>

            {/* DIRECT PHOTO UPLOADER */}
            <div className="p-4 rounded-2xl border border-dashed space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold block">Upload Building Photos</label>
                  <span className="text-[11px] text-slate-400">Pick photos from device. Applies to all doors in this building.</span>
                </div>
                <label className="cursor-pointer font-bold text-xs px-4 py-2 rounded-xl transition border shadow-sm bg-slate-800 text-white">
                  Choose Images
                  <input type="file" accept="image/*" multiple onChange={(e) => handlePhotoFilesSelected(e, false)} className="hidden" />
                </label>
              </div>

              {uploadedPhotos.length > 0 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pt-2">
                  {uploadedPhotos.map((img, idx) => (
                    <div key={idx} className="w-20 h-20 rounded-xl overflow-hidden border shrink-0 relative group">
                      <img src={img} alt="preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setUploadedPhotos(uploadedPhotos.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Amenities</label>
              <textarea rows={2} placeholder="Borehole water, CCTV, token meter." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm bg-transparent" />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button type="button" onClick={() => setIsAddingUnit(false)} className="px-4 py-2 text-xs font-bold text-slate-400">Cancel</button>
              <button type="submit" className="px-5 py-2.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-md">Save Units</button>
            </div>
          </form>
        )}

        {/* TAB 1: MOVE-OUTS */}
        {activeTab === "vacate" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold">Tenant Move-Out Inquiries</h2>
              <p className="text-xs text-slate-400">Review key surrender and confirm final release.</p>
            </div>

            {vacateRequests.length === 0 ? (
              <div className={`text-center py-16 border rounded-3xl shadow-sm ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500"
              }`}>
                <span className="text-4xl block mb-2">🚪</span>
                <p className="text-sm font-medium">No tenants currently requesting to move out.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vacateRequests.map((req) => (
                  <div key={req.id} className={`border rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between ${
                    isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                  }`}>
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-amber-500 font-bold">Move-Out Request</span>
                          <h3 className="text-lg font-bold mt-0.5">{req.apartment_name} - {req.door_number}</h3>
                          <span className="text-xs text-slate-400">Rent: KES {req.monthly_rent.toLocaleString()} / Mo</span>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                          Rent Cleared
                        </span>
                      </div>

                      <div className={`p-3.5 rounded-2xl border mt-4 space-y-1.5 text-xs ${
                        isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}>
                        <div><span className="text-slate-400">Tenant: </span><span className="font-bold">{req.tenant_name}</span></div>
                        <div><span className="text-slate-400">Phone: </span><span>📞 {req.tenant_phone}</span></div>
                        <div><span className="text-slate-400">National ID: </span><span className="font-mono text-emerald-600 font-bold">{req.tenant_id_number}</span></div>
                        <div className="pt-1 border-t">
                          <span className="text-amber-500 font-semibold">Vacate Reason: </span>
                          <span className="italic">"{req.vacate_reason}"</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                      {req.vacate_status !== "keys_handed_over" && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVacateUnit(req);
                            setKeySurrenderNote(req.vacate_conditions || "Please surrender all door keys to caretaker and leave room clean.");
                          }}
                          className="flex-1 py-2.5 text-xs font-bold rounded-xl transition border bg-slate-800 text-blue-400 border-blue-500/30"
                        >
                          Request Key Surrender
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleConfirmFinalRelease(req)}
                        className="flex-1 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition shadow-md"
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
              <h2 className="text-base font-bold">Client Booking Inquiries</h2>
              <p className="text-xs text-slate-400">Review, approve, or decline room booking requests</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                New Requests Awaiting Your Decision ({pendingRequests.length}):
              </h3>

              {pendingRequests.length === 0 ? (
                <div className={`text-center py-8 border rounded-2xl ${
                  isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500"
                }`}>
                  <p className="text-xs">No pending requests right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className={`border rounded-3xl p-5 space-y-4 shadow-sm ${
                      isDark ? "bg-slate-900 border-amber-500/50" : "bg-white border-slate-200"
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-amber-500 font-bold">New Booking Inquiry</span>
                          <h3 className="text-base font-bold mt-1">{req.apartment_name} - {req.door_number}</h3>
                          <span className="text-xs text-slate-400">📍 {req.location} • KES {req.monthly_rent.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className={`p-3.5 rounded-2xl border space-y-1 text-xs ${
                        isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}>
                        <div>Applicant: <span className="font-bold">{req.tenant_name}</span></div>
                        <div>Phone: <span>📞 {req.tenant_phone}</span></div>
                      </div>

                      <div className="flex space-x-2 pt-2 border-t">
                        <button
                          type="button"
                          onClick={() => handleReject(req)}
                          className="flex-1 py-2.5 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/40 rounded-xl transition"
                        >
                          ✕ Decline Request
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(req)}
                          className="flex-1 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition shadow-md"
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
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                  Approved By You - Waiting for Tenant Check-in ({approvedAwaitingCheckIn.length}):
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {approvedAwaitingCheckIn.map((req) => (
                    <div key={req.id} className={`border rounded-3xl p-5 space-y-3 shadow-sm ${
                      isDark ? "bg-slate-900 border-blue-500/40" : "bg-white border-slate-200"
                    }`}>
                      <div>
                        <span className="text-xs uppercase tracking-wider text-blue-500 font-bold">Approved - Awaiting Check-In</span>
                        <h4 className="text-base font-bold mt-0.5">{req.apartment_name} - {req.door_number}</h4>
                        <p className="text-xs text-slate-400">Tenant: <strong>{req.tenant_name}</strong> ({req.tenant_phone})</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-[11px] text-amber-500 animate-pulse font-medium">
                          ⏳ Tenant is entering National ID & M-Pesa...
                        </span>
                        <button
                          type="button"
                          onClick={() => handleReject(req)}
                          className="text-xs px-3 py-1.5 rounded-lg border transition text-red-500"
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

        {/* TAB 3: ALERTS */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Landlord In-App Alerts</h2>
                <p className="text-xs text-slate-400">Click any alert to jump directly into the Inquiries tab!</p>
              </div>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllNotifications}
                  className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-3 py-1.5 rounded-xl font-semibold transition"
                >
                  Clear All Alerts ✕
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className={`text-center py-16 border rounded-3xl shadow-sm ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500"
              }`}>
                <span className="text-4xl block mb-2">🔕</span>
                <p className="text-sm font-medium">No notifications right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="border rounded-2xl p-5 space-y-1 transition cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                        <span>{n.title}</span>
                        <span className="text-xs opacity-60">➔ View</span>
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pt-1">{n.message}</p>
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