"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

export default function TenantDashboard() {
  const router = useRouter();

  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [currentTenant, setCurrentTenant] = useState<any>(null);
  const [tenantProfile, setTenantProfile] = useState<any>(null);
  const [assignedUnit, setAssignedUnit] = useState<any>(null);
  const [landlordBankInfo, setLandlordBankInfo] = useState<any>(null);
  const [approvedPendingIdUnit, setApprovedPendingIdUnit] = useState<any>(null);
  const [myPendingBooking, setMyPendingBooking] = useState<any>(null);
  const [marketHouses, setMarketHouses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<"lease" | "search" | "notifications">("lease");
  const [searchLocation, setSearchLocation] = useState("");
  const [filterType, setFilterType] = useState("All");

  const [hasPaidRent, setHasPaidRent] = useState(false);
  const [lastPaymentDate, setLastPaymentDate] = useState<string>("No previous payment");
  const [displayDueDate, setDisplayDueDate] = useState<string>("");

  // PAYMENT MODAL (M-PESA & BANK TRANSFER)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payMethodTab, setPayMethodTab] = useState<"mpesa" | "bank">("mpesa");
  const [monthsToPay, setMonthsToPay] = useState<number>(1); // Default: 1 month (options 1 to 12)

  // M-Pesa State
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [stkStep, setStkStep] = useState<"phone_input" | "pin_prompt" | "success">("phone_input");
  const [simulatedPin, setSimulatedPin] = useState("");
  const [processingStk, setProcessingStk] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<any | null>(null);

  // Bank Transfer State
  const [bankRefCode, setBankRefCode] = useState("");
  const [submittingBankPay, setSubmittingBankPay] = useState(false);

  // Profile Modal State
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

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("Landlord took too long to respond");
  const [customReasonText, setCustomReasonText] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const [showApprovedCancelModal, setShowApprovedCancelModal] = useState(false);
  const [approvedCancelReason, setApprovedCancelReason] = useState("Got another room");
  const [customApprovedCancelText, setCustomApprovedCancelText] = useState("");
  const [cancellingApproved, setCancellingApproved] = useState(false);

  const [showVacateModal, setShowVacateModal] = useState(false);
  const [vacateReason, setVacateReason] = useState("Relocating");
  const [customVacateText, setCustomVacateText] = useState("");
  const [submittingVacate, setSubmittingVacate] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("eboma_theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
    loadTenantData();
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("eboma_theme", nextTheme);
  };

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
      setMpesaPhone(profile.phone ? profile.phone.replace("+254", "0") : "0700000000");
    }

    // 1. Active Unit
    const { data: activeUnit } = await supabase
      .from("units")
      .select("*")
      .eq("tenant_id", user.id)
      .eq("booking_status", "occupied")
      .maybeSingle();
    setAssignedUnit(activeUnit);

    // Dynamic Due Date & Advance Payments Calculation
    if (activeUnit) {
      const dueDay = activeUnit.due_day || 4;

      if (activeUnit.landlord_id) {
        const { data: landlordProf } = await supabase
          .from("profiles")
          .select("full_name, phone, bank_name, bank_account_name, bank_account_number, bank_paybill")
          .eq("id", activeUnit.landlord_id)
          .single();
        setLandlordBankInfo(landlordProf);
      }

      // Payments
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("unit_id", activeUnit.id)
        .eq("tenant_id", user.id)
        .order("payment_date", { ascending: false });

      setRecentPayments(payments || []);
      const paidPayments = (payments || []).filter((p) => p.status === "paid");
      const hasPaid = paidPayments.length > 0;
      setHasPaidRent(hasPaid);

      if (hasPaid) {
        setLastPaymentDate(paidPayments[0].payment_date);

        // Check if database already has calculated next_due_date
        if (activeUnit.next_due_date) {
          const d = new Date(activeUnit.next_due_date);
          setDisplayDueDate(d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
        } else {
          // Default to 4th of next month
          const now = new Date();
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
          setDisplayDueDate(nextMonth.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
        }
      } else {
        setLastPaymentDate("None recorded");
        const now = new Date();
        const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), dueDay);
        setDisplayDueDate(thisMonthDue.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
      }
    }

    // 2. Approved unit
    const { data: approvedUnit } = await supabase
      .from("units")
      .select("*")
      .eq("tenant_id", user.id)
      .eq("booking_status", "approved_pending_id")
      .maybeSingle();
    setApprovedPendingIdUnit(approvedUnit);

    // 3. Marketplace
    const { data: housesData } = await supabase
      .from("units")
      .select("*")
      .neq("booking_status", "occupied")
      .order("created_at", { ascending: false });
    setMarketHouses(housesData || []);

    // 4. Pending
    const pending = (housesData || []).find(
      (h) => h.pending_tenant_id === user.id && h.booking_status === "pending"
    );
    setMyPendingBooking(pending || null);

    // 5. Strictly Private Notifications
    const { data: notifData } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setNotifications(notifData || []);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Open Payment Modal
  const handleOpenPayModal = () => {
    setMonthsToPay(1);
    setPayMethodTab("mpesa");
    setStkStep("phone_input");
    setSimulatedPin("");
    setBankRefCode("");
    setProcessingStk(false);
    setShowPaymentModal(true);
  };

  // CLICKABLE NOTIFICATION: If it's a rent reminder, directly open the payment portal!
  const handleNotificationClick = (notif: any) => {
    const title = notif.title.toLowerCase();
    const msg = notif.message.toLowerCase();

    if (title.includes("reminder") || title.includes("due") || msg.includes("rent")) {
      setActiveTab("lease");
      handleOpenPayModal(); // DIRECT REDIRECT TO PAYMENT PORTAL!
    } else if (title.includes("approved") || msg.includes("check-in")) {
      setActiveTab("lease");
    }
  };

  // Helper to calculate new due date based on months paid
  const calculateNewDueDate = (monthsCount: number): string => {
    const dueDay = assignedUnit?.due_day || 4;
    let baseDate = new Date();

    if (assignedUnit?.next_due_date && hasPaidRent) {
      baseDate = new Date(assignedUnit.next_due_date);
    }

    const calculated = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsCount, dueDay);
    return calculated.toISOString().split("T")[0];
  };

  // M-PESA STK SEND
  const handleSendStkPush = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpesaPhone.trim()) return;
    setProcessingStk(true);
    setTimeout(() => {
      setProcessingStk(false);
      setStkStep("pin_prompt");
    }, 1200);
  };

  // CONFIRM M-PESA (SAVES MULTI-MONTH PAYMENT & FORWARDS DUE DATE)
  const handleConfirmMpesaPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedUnit || !currentTenant) return;

    setProcessingStk(true);
    const totalAmount = assignedUnit.monthly_rent * monthsToPay;
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomDigits = Math.floor(10 + Math.random() * 90);
    const receiptCode = `SK${randomDigits}TX${randomChars}`;

    const newCalculatedDueDate = calculateNewDueDate(monthsToPay);

    try {
      // 1. Log payment with months_paid
      await supabase.from("payments").insert([
        {
          unit_id: assignedUnit.id,
          tenant_id: currentTenant.id,
          amount: totalAmount,
          payment_date: new Date().toISOString().split("T")[0],
          status: "paid",
          payment_method: "mpesa",
          reference_code: receiptCode,
          months_paid: monthsToPay,
        },
      ]);

      // 2. Update unit with new due date & advance months
      await supabase
        .from("units")
        .update({
          mpesa_code: receiptCode,
          next_due_date: newCalculatedDueDate,
        })
        .eq("id", assignedUnit.id);

      // 3. Notify specified landlord only
      if (assignedUnit.landlord_id) {
        await supabase.from("notifications").insert([
          {
            user_id: assignedUnit.landlord_id,
            title: "Rent Payment Received! 💰",
            message: `Payment of KES ${totalAmount.toLocaleString()} (${monthsToPay} ${monthsToPay === 1 ? "month" : "months"} advance) confirmed from ${tenantProfile?.full_name || currentTenant.email} for ${assignedUnit.door_number}. Next due date: ${newCalculatedDueDate}. Ref: ${receiptCode}.`,
          },
        ]);
      }

      setCompletedReceipt({
        code: receiptCode,
        method: "M-Pesa STK Push",
        amount: totalAmount,
        months: monthsToPay,
        door: assignedUnit.door_number,
        apartment: assignedUnit.apartment_name,
        newDue: newCalculatedDueDate,
        date: new Date().toLocaleString(),
        phone: mpesaPhone,
      });

      setHasPaidRent(true);
      setStkStep("success");
      await loadTenantData();
    } catch (err: any) {
      alert("Payment processing error: " + err.message);
    } finally {
      setProcessingStk(false);
    }
  };

  // SUBMIT BANK TRANSFER
  const handleSubmitBankTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedUnit || !currentTenant || !bankRefCode.trim()) return;

    setSubmittingBankPay(true);
    const totalAmount = assignedUnit.monthly_rent * monthsToPay;
    const cleanRef = bankRefCode.trim().toUpperCase();
    const newCalculatedDueDate = calculateNewDueDate(monthsToPay);

    try {
      await supabase.from("payments").insert([
        {
          unit_id: assignedUnit.id,
          tenant_id: currentTenant.id,
          amount: totalAmount,
          payment_date: new Date().toISOString().split("T")[0],
          status: "paid",
          payment_method: "bank",
          reference_code: cleanRef,
          months_paid: monthsToPay,
        },
      ]);

      await supabase
        .from("units")
        .update({
          mpesa_code: `BANK-${cleanRef}`,
          next_due_date: newCalculatedDueDate,
        })
        .eq("id", assignedUnit.id);

      if (assignedUnit.landlord_id) {
        await supabase.from("notifications").insert([
          {
            user_id: assignedUnit.landlord_id,
            title: "Bank Rent Payment Received 🏦",
            message: `Bank payment of KES ${totalAmount.toLocaleString()} (${monthsToPay} ${monthsToPay === 1 ? "month" : "months"} advance) received from ${tenantProfile?.full_name || currentTenant.email} for ${assignedUnit.door_number}. Next due date: ${newCalculatedDueDate}. Bank Ref: ${cleanRef}.`,
          },
        ]);
      }

      setCompletedReceipt({
        code: cleanRef,
        method: "Bank Transfer",
        amount: totalAmount,
        months: monthsToPay,
        door: assignedUnit.door_number,
        apartment: assignedUnit.apartment_name,
        newDue: newCalculatedDueDate,
        date: new Date().toLocaleString(),
        phone: "Bank Deposit",
      });

      setHasPaidRent(true);
      setStkStep("success");
      await loadTenantData();
    } catch (err: any) {
      alert("Error submitting bank payment: " + err.message);
    } finally {
      setSubmittingBankPay(false);
    }
  };

  const handleProfilePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") setEditAvatarUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myPendingBooking || !currentTenant) return;
    setCancelling(true);
    const finalReason = cancelReason === "Other reasons" ? customReasonText.trim() || "Changed mind" : cancelReason;

    try {
      await supabase.from("units").update({
        booking_status: "vacant",
        is_vacant: true,
        pending_tenant_id: null,
        tenant_id: null,
      }).eq("id", myPendingBooking.id);

      if (myPendingBooking.landlord_id) {
        await supabase.from("notifications").insert([
          {
            user_id: myPendingBooking.landlord_id,
            title: "Booking Request Cancelled ⚠️",
            message: `Tenant (${currentTenant.email}) cancelled booking for ${myPendingBooking.door_number}. Reason: "${finalReason}".`,
          },
        ]);
      }

      alert("Booking request cancelled!");
      setShowCancelModal(false);
      setMyPendingBooking(null);
      await loadTenantData();
    } catch (err: any) {
      alert("Error cancelling: " + err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmApprovedCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvedPendingIdUnit || !currentTenant) return;
    setCancellingApproved(true);
    const finalReason = approvedCancelReason === "Other reasons" ? customApprovedCancelText.trim() || "Decline" : approvedCancelReason;

    try {
      await supabase.from("units").update({
        booking_status: "vacant",
        is_vacant: true,
        tenant_id: null,
        pending_tenant_id: null,
      }).eq("id", approvedPendingIdUnit.id);

      if (approvedPendingIdUnit.landlord_id) {
        await supabase.from("notifications").insert([
          {
            user_id: approvedPendingIdUnit.landlord_id,
            title: "Approved Booking Declined ⚠️",
            message: `Tenant declined booking for ${approvedPendingIdUnit.door_number}. Reason: "${finalReason}".`,
          },
        ]);
      }

      alert("Approved booking declined. Room released back to Vacant.");
      setShowApprovedCancelModal(false);
      setApprovedPendingIdUnit(null);
      await loadTenantData();
    } catch (err: any) {
      alert("Error cancelling: " + err.message);
    } finally {
      setCancellingApproved(false);
    }
  };

  const handleConfirmVacate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedUnit || !currentTenant) return;
    setSubmittingVacate(true);
    const finalReason = vacateReason === "Another reason" ? customVacateText.trim() || "Relocating" : vacateReason;

    try {
      await supabase.from("units").update({
        vacate_status: "requested",
        vacate_reason: finalReason,
      }).eq("id", assignedUnit.id);

      if (assignedUnit.landlord_id) {
        await supabase.from("notifications").insert([
          {
            user_id: assignedUnit.landlord_id,
            title: "Move-Out Request Received 🚪",
            message: `${tenantProfile?.full_name || currentTenant.email} requested to vacate ${assignedUnit.door_number}. Reason: "${finalReason}".`,
          },
        ]);
      }

      alert("Vacate request sent to landlord!");
      setShowVacateModal(false);
      await loadTenantData();
    } catch (err: any) {
      alert("Error submitting vacate request: " + err.message);
    } finally {
      setSubmittingVacate(false);
    }
  };

  const handleCompleteCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumberInput.trim() || !mpesaCodeInput.trim() || !approvedPendingIdUnit) return;
    setSubmittingCheckIn(true);
    try {
      await supabase.from("profiles").update({ id_number: idNumberInput.trim() }).eq("id", currentTenant.id);
      await supabase.from("units").update({
        booking_status: "occupied",
        is_vacant: false,
        mpesa_code: mpesaCodeInput.trim().toUpperCase(),
        lease_completed: true,
      }).eq("id", approvedPendingIdUnit.id);

      await supabase.from("payments").insert([
        {
          unit_id: approvedPendingIdUnit.id,
          tenant_id: currentTenant.id,
          amount: approvedPendingIdUnit.monthly_rent,
          payment_date: new Date().toISOString().split("T")[0],
          status: "paid",
          reference_code: mpesaCodeInput.trim().toUpperCase(),
        },
      ]);

      if (approvedPendingIdUnit.landlord_id) {
        await supabase.from("notifications").insert([
          {
            user_id: approvedPendingIdUnit.landlord_id,
            title: "Tenant Check-In Completed! 🏠",
            message: `${tenantProfile?.full_name || currentTenant.email} finalized check-in for ${approvedPendingIdUnit.door_number}. ID: ${idNumberInput.trim()}, M-Pesa: ${mpesaCodeInput.trim().toUpperCase()}.`,
          },
        ]);
      }

      alert(`Check-in completed! ${approvedPendingIdUnit.door_number} allocated to you.`);
      setApprovedPendingIdUnit(null);
      await loadTenantData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;
    setSavingProfile(true);
    try {
      await supabase.from("profiles").update({
        full_name: editName.trim(),
        phone: editPhone.trim(),
        avatar_url: editAvatarUrl.trim(),
      }).eq("id", currentTenant.id);

      alert("Profile updated successfully!");
      setIsEditingProfile(false);
      await loadTenantData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleConfirmKeyHandover = async () => {
    if (!assignedUnit || !currentTenant) return;
    if (!confirm("Confirm that you have handed over all keys and vacated the room?")) return;

    try {
      await supabase.from("units").update({ vacate_status: "keys_handed_over" }).eq("id", assignedUnit.id);
      if (assignedUnit.landlord_id) {
        await supabase.from("notifications").insert([
          {
            user_id: assignedUnit.landlord_id,
            title: "Keys Handed Over by Tenant 🔑",
            message: `Tenant has confirmed handing over keys for ${assignedUnit.door_number}.`,
          },
        ]);
      }
      alert("Key handover confirmed!");
      await loadTenantData();
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

      if (house.landlord_id) {
        await supabase.from("notifications").insert([
          {
            user_id: house.landlord_id,
            title: "New Booking Request! 🔔",
            message: `A client (${currentTenant.email}) requested to book ${house.door_number} at ${house.apartment_name}.`,
          },
        ]);
      }

      alert(`Request submitted for ${house.door_number}! Awaiting landlord approval.`);
      setViewingHousePhotos(null);
      await loadTenantData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const filteredHouses = marketHouses.filter((h) => {
    const matchLoc = h.location?.toLowerCase().includes(searchLocation.toLowerCase());
    const matchType = filterType === "All" || h.unit_type === filterType;
    return matchLoc && matchType;
  });

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
    }`}>
      {/* Top Header */}
      <header className={`border-b px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200 ${
        isDark ? "bg-slate-900/90 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm"
      }`}>
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <Logo size="sm" />
          <span className={`text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold hidden sm:inline-block border ${
            isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-blue-50 text-blue-700 border-blue-200"
          }`}>
            Tenant Portal
          </span>
        </div>

        <div className={`flex items-center space-x-1 sm:space-x-2 p-1 sm:p-1.5 rounded-2xl border ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
        }`}>
          <button
            onClick={() => setActiveTab("lease")}
            className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === "lease" ? "bg-blue-600 text-white shadow-sm" : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            My Rental
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === "search" ? "bg-blue-600 text-white shadow-sm" : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🔍 Kejas ({marketHouses.length})
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold relative transition ${
              activeTab === "notifications" ? "bg-blue-600 text-white shadow-sm" : isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🔔 Alerts
            {notifications.length > 0 && (
              <span className="ml-1.5 bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center text-sm shadow-sm ${
              isDark ? "bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700" : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
            }`}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsEditingProfile(false);
              setShowProfile(true);
            }}
            className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center border-2 border-blue-400 hover:scale-105 transition shadow-sm overflow-hidden shrink-0 cursor-pointer"
            title="View Profile Details"
          >
            {tenantProfile?.avatar_url ? (
              <img src={tenantProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{tenantProfile?.full_name ? tenantProfile.full_name[0].toUpperCase() : "T"}</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs bg-red-50 hover:bg-red-500 text-red-600 hover:text-white font-bold px-2.5 sm:px-3 py-2 rounded-xl border border-red-200 transition shadow-sm cursor-pointer"
          >
            Log Out ➔
          </button>
        </div>
      </header>

      {/* DUAL PAYMENT MODAL WITH MULTI-MONTH ADVANCE DROPDOWN (1 - 12 MONTHS) */}
      {showPaymentModal && assignedUnit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black">Pay Monthly Rent</h3>
                <span className="text-xs text-emerald-600 font-bold">
                  {assignedUnit.apartment_name} • {assignedUnit.door_number}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* ADVANCE MONTHS SELECTION DROPDOWN (1 TO 12 MONTHS) */}
            {stkStep !== "success" && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <label>Select Duration to Pay:</label>
                  <span className="text-emerald-500">
                    KES {(assignedUnit.monthly_rent * monthsToPay).toLocaleString()}
                  </span>
                </div>
                <select
                  value={monthsToPay}
                  onChange={(e) => setMonthsToPay(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                    isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                >
                  <option value={1}>1 Month (Current Cycle) - KES {assignedUnit.monthly_rent.toLocaleString()}</option>
                  <option value={2}>2 Months Advance - KES {(assignedUnit.monthly_rent * 2).toLocaleString()}</option>
                  <option value={3}>3 Months (Quarterly) - KES {(assignedUnit.monthly_rent * 3).toLocaleString()}</option>
                  <option value={4}>4 Months Advance - KES {(assignedUnit.monthly_rent * 4).toLocaleString()}</option>
                  <option value={5}>5 Months Advance - KES {(assignedUnit.monthly_rent * 5).toLocaleString()}</option>
                  <option value={6}>6 Months (Half Year) - KES {(assignedUnit.monthly_rent * 6).toLocaleString()}</option>
                  <option value={7}>7 Months Advance - KES {(assignedUnit.monthly_rent * 7).toLocaleString()}</option>
                  <option value={8}>8 Months Advance - KES {(assignedUnit.monthly_rent * 8).toLocaleString()}</option>
                  <option value={9}>9 Months Advance - KES {(assignedUnit.monthly_rent * 9).toLocaleString()}</option>
                  <option value={10}>10 Months Advance - KES {(assignedUnit.monthly_rent * 10).toLocaleString()}</option>
                  <option value={11}>11 Months Advance - KES {(assignedUnit.monthly_rent * 11).toLocaleString()}</option>
                  <option value={12}>12 Months (Full Year) - KES {(assignedUnit.monthly_rent * 12).toLocaleString()}</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  Paying for {monthsToPay} {monthsToPay === 1 ? "month" : "months"} will advance your due date to:{" "}
                  <strong className="text-emerald-500">{calculateNewDueDate(monthsToPay)}</strong>
                </p>
              </div>
            )}

            {/* TAB SELECTOR: M-PESA VS BANK TRANSFER */}
            {stkStep !== "success" && (
              <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl border ${
                isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"
              }`}>
                <button
                  type="button"
                  onClick={() => setPayMethodTab("mpesa")}
                  className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    payMethodTab === "mpesa"
                      ? "bg-[#00A859] text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>📲 M-PESA STK</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethodTab("bank")}
                  className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    payMethodTab === "bank"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>🏦 Bank Transfer</span>
                </button>
              </div>
            )}

            {/* METHOD 1: M-PESA STK PUSH */}
            {payMethodTab === "mpesa" && stkStep === "phone_input" && (
              <form onSubmit={handleSendStkPush} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Safaricom M-Pesa Phone Number:
                  </label>
                  <input
                    type="tel"
                    required
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    placeholder="0712345678"
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-bold tracking-wider focus:outline-none ${
                      isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    An instant STK prompt for KES {(assignedUnit.monthly_rent * monthsToPay).toLocaleString()} will appear on your phone.
                  </p>
                </div>

                <div className="pt-2 flex space-x-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 py-3 text-xs font-bold rounded-xl border"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingStk}
                    className="flex-1 py-3 text-xs font-bold bg-[#00A859] hover:bg-[#008f4c] text-white rounded-xl transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {processingStk ? "Sending STK..." : `Pay KES ${(assignedUnit.monthly_rent * monthsToPay).toLocaleString()} 📲`}
                  </button>
                </div>
              </form>
            )}

            {/* M-PESA PIN SIMULATION */}
            {payMethodTab === "mpesa" && stkStep === "pin_prompt" && (
              <form onSubmit={handleConfirmMpesaPin} className="space-y-4 animate-in fade-in">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-1">
                  <span className="text-2xl animate-bounce inline-block">📲</span>
                  <h4 className="text-sm font-black text-emerald-600">STK Push Sent to {mpesaPhone}!</h4>
                  <p className="text-xs text-slate-300">Enter your M-Pesa PIN below to authorize:</p>
                </div>

                <div className="bg-black/90 text-white p-4 rounded-2xl border border-white/20 font-mono text-xs space-y-3">
                  <div className="text-[11px] text-slate-300">
                    Pay KES {(assignedUnit.monthly_rent * monthsToPay).toLocaleString()} ({monthsToPay} mos) to eBoma / {assignedUnit.apartment_name}?
                  </div>
                  <div>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="ENTER PIN"
                      value={simulatedPin}
                      onChange={(e) => setSimulatedPin(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-center text-sm font-black tracking-widest text-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex space-x-2 border-t">
                  <button
                    type="button"
                    onClick={() => setStkStep("phone_input")}
                    className="flex-1 py-3 text-xs font-bold rounded-xl border"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={processingStk}
                    className="flex-1 py-3 text-xs font-bold bg-[#00A859] hover:bg-[#008f4c] text-white rounded-xl transition shadow-lg cursor-pointer"
                  >
                    {processingStk ? "Authorizing..." : "Authorize & Pay"}
                  </button>
                </div>
              </form>
            )}

            {/* METHOD 2: BANK TRANSFER */}
            {payMethodTab === "bank" && stkStep !== "success" && (
              <form onSubmit={handleSubmitBankTransfer} className="space-y-4 animate-in fade-in">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
                    Landlord's Bank Account
                  </span>
                  
                  <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bank Name:</span>
                      <span className="font-bold text-white">{landlordBankInfo?.bank_name || "Equity Bank Kenya"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Account Name:</span>
                      <span className="font-bold text-white">{landlordBankInfo?.bank_account_name || landlordBankInfo?.full_name || "Highland Properties"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Account Number:</span>
                      <span className="font-mono font-bold text-emerald-500 text-sm">
                        {landlordBankInfo?.bank_account_number || "0110192837465"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    Enter Bank Transaction / Deposit Reference Code: *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankRefCode}
                    onChange={(e) => setBankRefCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FT261192837"
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold uppercase focus:outline-none ${
                      isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <div className="pt-2 flex space-x-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 py-3 text-xs font-bold rounded-xl border"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBankPay}
                    className="flex-1 py-3 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition shadow-lg cursor-pointer"
                  >
                    {submittingBankPay ? "Submitting..." : `Submit KES ${(assignedUnit.monthly_rent * monthsToPay).toLocaleString()} ➔`}
                  </button>
                </div>
              </form>
            )}

            {/* PAYMENT SUCCESS RECEIPT */}
            {stkStep === "success" && completedReceipt && (
              <div className="space-y-4 animate-in zoom-in-95">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 text-2xl flex items-center justify-center mx-auto">
                    ✓
                  </div>
                  <h4 className="text-base font-black text-emerald-600">Payment Confirmed!</h4>
                  <p className="text-xs text-slate-400">
                    Paid for {completedReceipt.months} {completedReceipt.months === 1 ? "month" : "months"} advance.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border space-y-2 text-xs font-mono ${
                  isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-slate-400">Receipt Ref:</span>
                    <span className="font-black text-emerald-500">{completedReceipt.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Paid:</span>
                    <span className="font-bold">KES {completedReceipt.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Next Rent Due Date:</span>
                    <span className="font-bold text-amber-500">{completedReceipt.newDue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Keja:</span>
                    <span>{completedReceipt.door} ({completedReceipt.apartment})</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="w-full py-3 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition shadow-md cursor-pointer"
                  >
                    ✓ Done & Return to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TWO-STATE PROFILE MODAL */}
      {showProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 transition-colors ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? "border-slate-800" : "border-slate-100"
            }`}>
              <h3 className="text-base font-bold">
                {isEditingProfile ? "✏️ Edit Profile & Photo" : "Tenant Profile"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowProfile(false);
                  setIsEditingProfile(false);
                }}
                className={`text-sm ${isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-600"}`}
              >
                ✕
              </button>
            </div>

            {!isEditingProfile ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className={`w-16 h-16 rounded-2xl font-extrabold text-2xl flex items-center justify-center overflow-hidden border shadow-sm shrink-0 ${
                    isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {tenantProfile?.avatar_url ? (
                      <img src={tenantProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span>{tenantProfile?.full_name ? tenantProfile.full_name[0].toUpperCase() : "T"}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">{tenantProfile?.full_name || "Tenant"}</h4>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      Verified Tenant
                    </span>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border space-y-3 text-xs ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                }`}>
                  <div className="flex justify-between">
                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>Email Address:</span>
                    <span className="font-bold flex items-center gap-1">
                      {currentTenant?.email} <span className="text-[10px] text-amber-500">🔒</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>Phone Number:</span>
                    <span className="font-bold">{tenantProfile?.phone || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>National ID Number:</span>
                    <span className="font-mono font-bold text-emerald-600 flex items-center gap-1">
                      {tenantProfile?.id_number || "Set during check-in"} <span className="text-[10px] text-emerald-600">🔒</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>Lease Status:</span>
                    <span className="font-bold text-blue-600">
                      {assignedUnit ? `Active at ${assignedUnit.door_number}` : "No Active Lease"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      isDark ? "bg-slate-800 hover:bg-slate-700 text-white border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300"
                    }`}
                  >
                    <span>✏️ Edit Profile Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex-1 py-2.5 text-xs font-bold bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 rounded-xl transition cursor-pointer"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
                <div className="flex items-center space-x-3">
                  <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center overflow-hidden shrink-0 ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-300"
                  }`}>
                    {editAvatarUrl ? (
                      <img src={editAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold">📷</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className={`block text-[11px] font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>Profile Picture</label>
                    <label className="cursor-pointer inline-block bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shadow-sm">
                      Choose Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-400">Email Address</label>
                    <span className="text-[10px] text-amber-500 font-bold">🔒 Permanent & Uneditable</span>
                  </div>
                  <input
                    type="email"
                    disabled
                    value={currentTenant?.email || ""}
                    className={`w-full border rounded-xl px-3 py-2 text-xs cursor-not-allowed ${
                      isDark ? "bg-slate-950/60 border-slate-800 text-slate-500" : "bg-slate-100 border-slate-200 text-slate-500"
                    }`}
                  />
                </div>

                <div className={`pt-2 flex space-x-2 border-t ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl ${
                      isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex-1 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition shadow-md"
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 1. CANCEL PENDING BOOKING MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? "border-slate-800" : "border-slate-100"
            }`}>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>⚠️</span> Cancel Booking Request
              </h3>
              <button onClick={() => setShowCancelModal(false)} className="text-slate-400 text-sm">✕</button>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Cancelling releases <strong>{myPendingBooking?.door_number}</strong> back to Vacant.
            </p>

            <form onSubmit={handleConfirmCancel} className="space-y-4 pt-1">
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>Reason for Cancelling: *</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                >
                  <option value="Landlord took too long to respond">1. Landlord took too long to respond</option>
                  <option value="Made it by a mistake">2. Made it by a mistake</option>
                  <option value="Other reasons">3. Other reasons</option>
                </select>
              </div>

              {cancelReason === "Other reasons" && (
                <div>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    placeholder="e.g. Found another place"
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
              )}

              <div className={`flex space-x-2 pt-2 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                <button type="button" onClick={() => setShowCancelModal(false)} className={`flex-1 py-2.5 text-xs font-bold rounded-xl ${
                  isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:bg-slate-100"
                }`}>Keep Request</button>
                <button type="submit" disabled={cancelling} className="flex-1 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl transition">
                  {cancelling ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. DECLINE APPROVED BOOKING MODAL */}
      {showApprovedCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? "border-slate-800" : "border-slate-100"
            }`}>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>⚠️</span> Decline Approved Booking
              </h3>
              <button onClick={() => setShowApprovedCancelModal(false)} className="text-slate-400 text-sm">✕</button>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              If you changed your mind on taking <strong>{approvedPendingIdUnit?.door_number}</strong>, declining releases it back to Vacant.
            </p>

            <form onSubmit={handleConfirmApprovedCancel} className="space-y-4 pt-1">
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>Reason for Declining: *</label>
                <select
                  value={approvedCancelReason}
                  onChange={(e) => setApprovedCancelReason(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                >
                  <option value="Got another room">1. Got another room</option>
                  <option value="Just changed mind">2. Just changed mind</option>
                  <option value="Other reasons">3. Other reasons</option>
                </select>
              </div>

              {approvedCancelReason === "Other reasons" && (
                <div>
                  <textarea
                    rows={2}
                    required
                    maxLength={100}
                    placeholder="Specify reason..."
                    value={customApprovedCancelText}
                    onChange={(e) => setCustomApprovedCancelText(e.target.value)}
                    className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
              )}

              <div className={`flex space-x-2 pt-2 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                <button
                  type="button"
                  onClick={() => setShowApprovedCancelModal(false)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl ${
                    isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={cancellingApproved}
                  className="flex-1 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl transition shadow-md"
                >
                  {cancellingApproved ? "Declining..." : "Decline & Release Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. VACATE MODAL */}
      {showVacateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 ${
            isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? "border-slate-800" : "border-slate-100"
            }`}>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>🚪</span> Request to Vacate Keja
              </h3>
              <button onClick={() => setShowVacateModal(false)} className="text-slate-400 text-sm">✕</button>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Please indicate why you are vacating <strong>{assignedUnit?.door_number}</strong>.
            </p>

            <form onSubmit={handleConfirmVacate} className="space-y-4 pt-1">
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>Reason for Vacating: *</label>
                <select
                  value={vacateReason}
                  onChange={(e) => setVacateReason(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                >
                  <option value="Relocating">1. Relocating</option>
                  <option value="High charges on rent / living conditions">2. High charges on rent / living conditions</option>
                  <option value="Another reason">3. Another reason</option>
                </select>
              </div>

              {vacateReason === "Another reason" && (
                <div>
                  <textarea
                    rows={2}
                    required
                    maxLength={100}
                    placeholder="Specify reason..."
                    value={customVacateText}
                    onChange={(e) => setCustomVacateText(e.target.value)}
                    className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
              )}

              <div className={`flex space-x-2 pt-2 border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                <button type="button" onClick={() => setShowVacateModal(false)} className={`flex-1 py-2.5 text-xs font-bold rounded-xl ${
                  isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:bg-slate-100"
                }`}>Cancel</button>
                <button type="submit" disabled={submittingVacate} className="flex-1 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition shadow-md">
                  {submittingVacate ? "Sending..." : "Submit Vacate Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROPERTY PHOTOS & MEDIA TOUR MODAL */}
      {viewingHousePhotos && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-4xl w-full mx-auto flex items-center justify-between border-b border-white/10 pb-4">
            <button
              type="button"
              onClick={() => setViewingHousePhotos(null)}
              className="flex items-center space-x-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl border border-slate-700 transition cursor-pointer"
            >
              <span>← Back to Search</span>
            </button>
            <div className="text-right text-white">
              <h3 className="text-base font-bold">{viewingHousePhotos.apartment_name}</h3>
              <span className="text-xs text-slate-300">📍 {viewingHousePhotos.location} • Door {viewingHousePhotos.door_number}</span>
            </div>
          </div>

          <div className="max-w-4xl w-full mx-auto my-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {viewingHousePhotos.media_urls && viewingHousePhotos.media_urls.length > 0 ? (
                viewingHousePhotos.media_urls.map((imgUrl: string, idx: number) => (
                  <div key={idx} className="h-64 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md">
                    <img src={imgUrl} alt={`Apartment photo ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                  </div>
                ))
              ) : (
                <>
                  <div className="h-64 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md">
                    <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80" alt="Apartment Exterior" className="w-full h-full object-cover" />
                  </div>
                  <div className="h-64 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md">
                    <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80" alt="Living Room" className="w-full h-full object-cover" />
                  </div>
                </>
              )}
            </div>

            <div className={`border p-5 rounded-2xl space-y-2 text-xs shadow-sm ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-700"
            }`}>
              <span className="text-emerald-600 font-bold uppercase tracking-wider">Property Description</span>
              <p className="leading-relaxed text-sm">
                {viewingHousePhotos.description || "Well-maintained building, constant water supply, prepaid KPLC token meter, and 24/7 security gate."}
              </p>
            </div>
          </div>

          <div className="max-w-4xl w-full mx-auto border-t border-white/10 pt-4 flex items-center justify-between text-white">
            <div>
              <span className="text-xs text-slate-300 block font-medium">Monthly Rent</span>
              <span className="text-2xl font-black">KES {Number(viewingHousePhotos.monthly_rent).toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={() => handleBookRoom(viewingHousePhotos)}
              disabled={Boolean(assignedUnit) || Boolean(myPendingBooking) || Boolean(approvedPendingIdUnit)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg cursor-pointer disabled:opacity-40"
            >
              Book This Room Now ➔
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* PENDING BOOKING BANNER */}
        {myPendingBooking && (
          <div className={`border rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${
            isDark ? "bg-amber-950/40 border-amber-500/50" : "bg-amber-50 border-amber-300"
          }`}>
            <div className="flex items-start space-x-3">
              <span className="text-2xl mt-0.5">⏳</span>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? "text-amber-400" : "text-amber-900"}`}>Booking Request Under Landlord Review</h3>
                <p className={`text-xs mt-0.5 ${isDark ? "text-slate-300" : "text-amber-800"}`}>
                  You requested <strong>{myPendingBooking.door_number}</strong> at <strong>{myPendingBooking.apartment_name}</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className={`border text-xs font-bold px-4 py-2.5 rounded-xl transition shrink-0 cursor-pointer shadow-sm ${
                isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/40" : "bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border-red-200"
              }`}
            >
              Cancel Request ✕
            </button>
          </div>
        )}

        {/* CHECK-IN FORM */}
        {approvedPendingIdUnit && (
          <div className={`border-2 rounded-3xl p-6 shadow-md space-y-4 ${
            isDark ? "bg-slate-900 border-emerald-500/80 text-white" : "bg-white border-emerald-500 text-slate-900"
          }`}>
            <div className="flex items-start space-x-3">
              <span className="text-3xl">🎉</span>
              <div>
                <h3 className={`text-lg font-bold ${isDark ? "text-emerald-400" : "text-emerald-800"}`}>Your Booking Was Approved!</h3>
                <p className={`text-xs mt-0.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  The landlord approved your request for <strong>{approvedPendingIdUnit.door_number}</strong> at{" "}
                  <strong>{approvedPendingIdUnit.apartment_name}</strong>. Submit your Kenyan National ID Number and M-Pesa Code below to finalize, or decline if you changed your mind.
                </p>
              </div>
            </div>

            <form onSubmit={handleCompleteCheckIn} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>Kenyan National ID Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 34567890"
                  value={idNumberInput}
                  onChange={(e) => setIdNumberInput(e.target.value)}
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none ${
                    isDark ? "bg-slate-950 border-slate-700 text-white focus:border-emerald-400" : "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>M-Pesa Rent Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QK89XY72PA"
                  value={mpesaCodeInput}
                  onChange={(e) => setMpesaCodeInput(e.target.value)}
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm uppercase focus:outline-none ${
                    isDark ? "bg-slate-950 border-slate-700 text-white focus:border-emerald-400" : "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                  }`}
                />
              </div>

              <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApprovedCancelModal(true)}
                  className={`w-full sm:w-auto px-5 py-3 border font-bold rounded-xl transition text-xs cursor-pointer shadow-sm ${
                    isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/40" : "bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border-red-200"
                  }`}
                >
                  Decline / Cancel Booking ✕
                </button>

                <button
                  type="submit"
                  disabled={submittingCheckIn}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition text-xs shadow-md cursor-pointer"
                >
                  {submittingCheckIn ? "Allocating Unit..." : "Finalize & Auto-Allocate House"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 1: ACTIVE LEASE WITH UNIFORM 4TH DUE DATE & ADVANCE PAYMENT OPTIONS */}
        {activeTab === "lease" && (
          <div className="space-y-6">
            {assignedUnit ? (
              <div className={`border rounded-3xl p-5 sm:p-6 shadow-sm space-y-6 ${
                isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}>
                
                {/* DYNAMIC DUE DATE BANNER WITH WORKING PAY RENT BUTTON */}
                <div className={`border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  hasPaidRent
                    ? isDark ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : isDark ? "bg-amber-950/40 border-amber-500/40" : "bg-amber-50 border-amber-300"
                }`}>
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl mt-0.5">{hasPaidRent ? "✅" : "⏰"}</span>
                    <div>
                      <h4 className={`text-sm font-bold ${
                        hasPaidRent ? "text-emerald-500" : isDark ? "text-amber-400" : "text-amber-900"
                      }`}>
                        {hasPaidRent ? "Rent Cleared in Advance!" : "Monthly Rent Due Soon!"}
                      </h4>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                        {hasPaidRent
                          ? `Next rent payment will be due on ${displayDueDate}. Verified Ref: ${assignedUnit.mpesa_code || "Confirmed"}.`
                          : `Rent of KES ${Number(assignedUnit.monthly_rent).toLocaleString()} for ${assignedUnit.door_number} is due on ${displayDueDate}. Settle via M-Pesa or Bank.`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenPayModal}
                    className="w-full sm:w-auto bg-[#00A859] hover:bg-[#008f4c] text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>{hasPaidRent ? "Pay Months in Advance 💳" : "Pay Rent Now (M-Pesa / Bank) 💳"}</span>
                  </button>
                </div>

                {/* Lease Details Top Bar */}
                <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 gap-4 ${
                  isDark ? "border-slate-800" : "border-slate-200"
                }`}>
                  <div>
                    <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Active Lease</span>
                    <h2 className="text-xl sm:text-2xl font-black">{assignedUnit.apartment_name}</h2>
                    <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>📍 {assignedUnit.location}</span>
                  </div>
                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <span className={`text-[11px] block font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Monthly Rent</span>
                      <span className="text-lg sm:text-xl font-bold text-emerald-600">
                        KES {Number(assignedUnit.monthly_rent).toLocaleString()}
                      </span>
                    </div>

                    {!assignedUnit.vacate_status && (
                      <button
                        type="button"
                        onClick={() => setShowVacateModal(true)}
                        className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 text-xs font-bold px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                      >
                        Request to Vacate 🚪
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 METRIC CARDS INCLUDING LAST PAYMENT & NEXT DUE */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className={`p-4 rounded-2xl border ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <span className={`text-[11px] block font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Assigned Door</span>
                    <span className="text-base sm:text-lg font-bold text-blue-600">{assignedUnit.door_number}</span>
                  </div>

                  <div className={`p-4 rounded-2xl border ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <span className={`text-[11px] block font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Last Payment Date</span>
                    <span className="text-xs sm:text-sm font-bold font-mono">{lastPaymentDate}</span>
                  </div>

                  <div className={`p-4 rounded-2xl border ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <span className={`text-[11px] block font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Next Due Date</span>
                    <span className="text-xs sm:text-sm font-bold text-amber-500">{displayDueDate}</span>
                  </div>

                  <div className={`p-4 rounded-2xl border ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <span className={`text-[11px] block font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Rent Status</span>
                    <span className={`text-xs sm:text-sm font-bold ${hasPaidRent ? "text-emerald-600" : "text-red-500"}`}>
                      {hasPaidRent ? "✅ Cleared / In Advance" : "⚠️ Payment Due"}
                    </span>
                  </div>
                </div>

                {/* PAST PAYMENTS LEDGER */}
                {recentPayments.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Your Payment History Ledger</h4>
                    <div className="space-y-2">
                      {recentPayments.map((p) => (
                        <div key={p.id} className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                        }`}>
                          <div>
                            <span className="font-bold text-emerald-600">KES {Number(p.amount).toLocaleString()}</span>
                            <span className="text-[11px] text-slate-400 ml-2">Paid on {p.payment_date} ({p.months_paid || 1} mos) via {p.payment_method?.toUpperCase() || "M-PESA"}</span>
                            {p.reference_code && (
                              <span className="text-[10px] text-slate-500 font-mono ml-2">Ref: {p.reference_code}</span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 uppercase">
                            Verified
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : !approvedPendingIdUnit && (
              <div className={`text-center py-16 border rounded-3xl shadow-sm ${
                isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}>
                <span className="text-4xl block mb-2">🔑</span>
                <h3 className="font-bold text-base">No Active Lease Yet</h3>
                <p className={`text-xs mt-1 max-w-sm mx-auto mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Explore available apartments in the search tab to find and book your next keja!
                </p>
                <button
                  onClick={() => setActiveTab("search")}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer"
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
            <div className={`border rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row gap-3 shadow-sm ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}>
              <input
                type="text"
                placeholder="Search by area (e.g. Roysambu, Kilimani...)"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className={`flex-1 border rounded-xl px-3.5 py-2 text-sm focus:outline-none ${
                  isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                }`}
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`border rounded-xl px-3.5 py-2 text-sm focus:outline-none ${
                  isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                }`}
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
                  <div key={house.id} className={`border rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  }`}>
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-base">{house.apartment_name}</h3>
                          <span className={`text-xs block ${isDark ? "text-slate-400" : "text-slate-500"}`}>📍 {house.location}</span>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                          isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {house.unit_type}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center space-x-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                        }`}>
                          Door: {house.door_number}
                        </span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                          isPending
                            ? isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "bg-amber-100 text-amber-800"
                            : isDark ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {isPending ? "🔒 Reserved (Under Review)" : "🟢 Available"}
                        </span>
                      </div>

                      <p className={`text-xs mt-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{house.description || "Borehole water, prepaid token."}</p>
                    </div>

                    <div className={`border-t pt-4 mt-4 flex items-center justify-between ${
                      isDark ? "border-slate-800" : "border-slate-100"
                    }`}>
                      <span className="text-base font-extrabold">KES {Number(house.monthly_rent).toLocaleString()}</span>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setViewingHousePhotos(house)}
                          className={`text-xs font-bold px-3 py-2 rounded-xl border transition cursor-pointer ${
                            isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                          }`}
                        >
                          📷 Photos & Tour
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBookRoom(house)}
                          disabled={isPending || Boolean(assignedUnit) || Boolean(myPendingBooking) || Boolean(approvedPendingIdUnit)}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer"
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

        {/* TAB 3: NOTIFICATIONS (CLICKING DIRECTLY REDIRECTS TO PAYMENT PORTAL!) */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Your In-App Alerts</h2>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Click any rent reminder to open the payment portal directly!</p>
              </div>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.from("notifications").delete().eq("user_id", currentTenant.id);
                    setNotifications([]);
                  }}
                  className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer"
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
                    className={`border rounded-2xl p-4 space-y-1 shadow-sm transition cursor-pointer group ${
                      isDark ? "bg-slate-900 border-slate-800 hover:border-blue-500/60" : "bg-white border-slate-200 hover:border-blue-500"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-blue-600 group-hover:underline flex items-center gap-1.5">
                        <span>{n.title}</span>
                        <span className="text-[11px] opacity-70">➔ Click to Pay / View</span>
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed pt-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{n.message}</p>
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