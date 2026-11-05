"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface VacantHouse {
  id: string;
  landlord_id: string;
  apartment_name: string;
  location: string;
  door_number: string;
  unit_type: string;
  monthly_rent: number;
  description: string;
  booking_status: string; // 'vacant' | 'pending' | 'occupied'
  pending_tenant_id?: string;
}

export default function TenantDashboard() {
  const router = useRouter();

  const [currentTenant, setCurrentTenant] = useState<any>(null);
  const [assignedUnit, setAssignedUnit] = useState<any>(null);
  const [myPendingBooking, setMyPendingBooking] = useState<VacantHouse | null>(null);
  const [marketHouses, setMarketHouses] = useState<VacantHouse[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Tabs: 'lease' | 'search' | 'notifications'
  const [activeTab, setActiveTab] = useState<"lease" | "search" | "notifications">("lease");

  const [searchLocation, setSearchLocation] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [hasPaidThisMonth, setHasPaidThisMonth] = useState(false);

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

    // 1. Fetch any unit actively occupied by THIS tenant
    const { data: unitData } = await supabase
      .from("units")
      .select("*")
      .eq("tenant_id", user.id)
      .eq("booking_status", "occupied")
      .maybeSingle();

    setAssignedUnit(unitData);

    // 2. Fetch marketplace units: only vacant or pending (approved occupied units disappear!)
    const { data: housesData } = await supabase
      .from("units")
      .select("*")
      .neq("booking_status", "occupied")
      .order("created_at", { ascending: false });

    const housesList = housesData || [];
    setMarketHouses(housesList);

    // 3. Check if THIS tenant already has an active pending booking
    const existingPending = housesList.find((h: any) => h.pending_tenant_id === user.id);
    setMyPendingBooking(existingPending || null);

    // 4. Fetch notifications for this tenant
    const { data: notifData } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setNotifications(notifData || []);
  };

  // BOOKING ACTION (Enforces 1 booking rule!)
  const handleBookRoom = async (house: VacantHouse) => {
    if (!currentTenant) return;

    // RULE 1: Block if tenant already has an active lease
    if (assignedUnit) {
      alert(`You already have an active lease at ${assignedUnit.apartment_name} (${assignedUnit.door_number}). You cannot book another apartment.`);
      return;
    }

    // RULE 2: Block if tenant already has a pending booking request
    if (myPendingBooking) {
      alert(`You already have an active pending request for ${myPendingBooking.door_number} at ${myPendingBooking.apartment_name}. You must wait for the landlord's review before booking another room!`);
      return;
    }

    // RULE 3: Block if house is already pending for someone else
    if (house.booking_status === "pending") {
      alert("This room is already reserved and pending landlord approval by another client.");
      return;
    }

    try {
      // Update unit to pending review
      const { error: unitError } = await supabase
        .from("units")
        .update({
          booking_status: "pending",
          is_vacant: false,
          pending_tenant_id: currentTenant.id,
        })
        .eq("id", house.id);

      if (unitError) throw unitError;

      // Send in-app alert to the landlord
      await supabase.from("notifications").insert([
        {
          user_id: house.landlord_id,
          title: "New Booking Request! 🔔",
          message: `A client (${currentTenant.email}) has requested to book ${house.door_number} at ${house.apartment_name}. Open your Booking Requests tab to Approve or Reject!`,
        },
      ]);

      alert(`Success! You have requested ${house.door_number} at ${house.apartment_name}. The unit is now marked as Reserved pending the landlord's decision.`);
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
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white">
            🔑
          </div>
          <div>
            <h1 className="text-lg font-bold">Tenant Portal</h1>
            <p className="text-xs text-slate-400">{currentTenant?.email}</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setActiveTab("lease")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === "lease" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            My Rental
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === "search" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            🔍 Explore Houses ({marketHouses.length})
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold relative transition ${
              activeTab === "notifications" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            🔔 In-App Alerts
            {notifications.length > 0 && (
              <span className="ml-1.5 bg-blue-400 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition"
        >
          Sign Out
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* ACTIVE BOOKING WARNING BANNER (Shown across the app if tenant has a pending request) */}
        {myPendingBooking && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⏳</span>
              <div>
                <h3 className="text-sm font-bold text-amber-400">Booking Request Pending Landlord Review</h3>
                <p className="text-xs text-slate-300">
                  You requested <strong>{myPendingBooking.door_number}</strong> at{" "}
                  <strong>{myPendingBooking.apartment_name}</strong>. You cannot apply for another unit until this request is approved or declined.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30 shrink-0 ml-3">
              Under Review
            </span>
          </div>
        )}

        {/* TAB 1: MY ASSIGNED RENTAL */}
        {activeTab === "lease" && (
          <div className="space-y-6">
            {assignedUnit ? (
              <>
                {/* 7-Day Payment Alert */}
                {!hasPaidThisMonth ? (
                  <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-5 flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <h2 className="text-sm font-bold text-amber-400">Rent Due in 7 Days!</h2>
                        <p className="text-xs text-slate-300 mt-1">
                          Rent for <strong>{assignedUnit.door_number}</strong> at{" "}
                          <strong>{assignedUnit.apartment_name}</strong> of{" "}
                          <strong>KES {Number(assignedUnit.monthly_rent).toLocaleString()}</strong> is due on the 12th.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setHasPaidThisMonth(true);
                        alert("Payment recorded! Landlord has been notified to verify.");
                      }}
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
                      <p className="text-xs text-slate-300">Your payment has been logged for landlord verification.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Your Assigned Door</span>
                    <div className="text-2xl font-extrabold text-blue-400 mt-2">{assignedUnit.door_number}</div>
                    <span className="text-xs text-slate-500 mt-1 block">{assignedUnit.apartment_name}</span>
                  </div>

                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Monthly Rent</span>
                    <div className="text-2xl font-extrabold text-white mt-2">
                      KES {Number(assignedUnit.monthly_rent).toLocaleString()}
                    </div>
                    <span className="text-xs text-slate-500 mt-1 block">Due on 12th of every month</span>
                  </div>

                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Lease State</span>
                    <div className="text-2xl font-extrabold text-emerald-400 mt-2">Active Tenant</div>
                    <span className="text-xs text-slate-500 mt-1 block">📍 {assignedUnit.location}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-slate-800/30 border border-slate-800 rounded-2xl">
                <span className="text-3xl block mb-2">🔑</span>
                <h3 className="font-bold text-base text-white">No Assigned Unit Yet</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto mb-4">
                  You are not currently living in an assigned unit. Browse our available apartments to request a room!
                </p>
                <button
                  onClick={() => setActiveTab("search")}
                  className="bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                >
                  Explore Available Houses
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXPLORE HOUSES (SHOWS VACANT & PENDING) */}
        {activeTab === "search" && (
          <div className="space-y-6">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5">
              <h2 className="text-base font-bold mb-3">Browse Rental Properties</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Filter by location (e.g. Kilimani, Roysambu...)"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="All">All Room Types</option>
                  <option value="Single Room">Single Room</option>
                  <option value="Bedsitter">Bedsitter</option>
                  <option value="1 Bedroom">1 Bedroom</option>
                  <option value="2 Bedroom">2 Bedroom</option>
                  <option value="3 Bedroom">3 Bedroom</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHouses.map((house) => {
                const isPending = house.booking_status === "pending";
                const isMyPending = house.pending_tenant_id === currentTenant?.id;
                const canBook = !assignedUnit && !myPendingBooking && !isPending;

                return (
                  <div
                    key={house.id}
                    className={`bg-slate-800/60 border rounded-2xl p-5 flex flex-col justify-between transition ${
                      isPending
                        ? "border-amber-500/30 opacity-90"
                        : "border-slate-700/60 hover:border-blue-500/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-white text-base">{house.apartment_name}</h3>
                          <span className="text-xs text-slate-400 block mt-0.5">📍 {house.location}</span>
                        </div>
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">
                          {house.unit_type}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center space-x-2">
                        <span className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                          Door: {house.door_number}
                        </span>

                        {/* LIVE STATE STATUS BADGE */}
                        {isPending ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            {isMyPending ? "⏳ Your Request Pending Review" : "🔒 Reserved (Pending Approval)"}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            🟢 Available Now
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-3">{house.description || "No description provided."}</p>
                    </div>

                    <div className="border-t border-slate-700/50 pt-4 mt-4 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block">Rent / Month</span>
                        <span className="text-lg font-extrabold text-white">
                          KES {Number(house.monthly_rent).toLocaleString()}
                        </span>
                      </div>

                      {/* SMART ACTION BUTTON */}
                      {isPending ? (
                        <button
                          disabled
                          className="bg-slate-700/50 text-slate-400 cursor-not-allowed text-xs font-bold px-4 py-2 rounded-lg"
                        >
                          {isMyPending ? "Pending Review" : "Reserved"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBookRoom(house)}
                          disabled={!canBook}
                          className={`text-xs font-bold px-4 py-2 rounded-lg transition ${
                            canBook
                              ? "bg-blue-500 hover:bg-blue-400 text-white cursor-pointer"
                              : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                          }`}
                        >
                          {assignedUnit
                            ? "Already Housed"
                            : myPendingBooking
                            ? "Active Request Pending"
                            : "Book Room Now"}
                        </button>
                      )}
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
            <h2 className="text-base font-bold">Your Notifications & Updates</h2>
            {notifications.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/40 border border-slate-700/60 rounded-2xl">
                <p className="text-slate-400 text-sm">No notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-blue-400">{n.title}</h4>
                    <p className="text-xs text-slate-200 mt-1">{n.message}</p>
                    <span className="text-[10px] text-slate-500 block mt-2">{new Date(n.created_at).toLocaleString()}</span>
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