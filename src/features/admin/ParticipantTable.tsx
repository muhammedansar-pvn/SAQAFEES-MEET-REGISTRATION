"use client";

import { useState, useEffect, useCallback } from "react";
import { EVENT_CONFIG } from "@/config/event.config";

interface ParticipantItem {
  _id: string;
  registrationId: string;
  name: string;
  place: string;
  district?: string;
  participateFully?: boolean;
  wantsFood?: boolean;
  mobile: string;
  shuhba: string;
  checkInStatus: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  whatsappStatus: string;
  passAccessToken: string;
  createdAt: string;
}

interface DepartmentStat {
  total: number;
  checkedIn: number;
  percentage: number;
}

interface ToastState {
  message: string;
  type: "success" | "error" | "info";
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback
    }
  }
  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }
  return false;
}

export function ParticipantTable() {
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [shuhbaFilter, setShuhbaFilter] = useState("ALL");
  const [checkInFilter, setCheckInFilter] = useState("ALL");
  const [participateFilter, setParticipateFilter] = useState("ALL"); // ALL | yes | no
  const [foodFilter, setFoodFilter] = useState("ALL"); // ALL | yes | no
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0); // Filtered count
  const [overallTotal, setOverallTotal] = useState(0); // Absolute total in DB

  // Department Stats State
  const [departmentStats, setDepartmentStats] = useState<Record<string, DepartmentStat>>({});
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [copyingDept, setCopyingDept] = useState<string | null>(null);
  const [isCopyingReport, setIsCopyingReport] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<ToastState | null>(null);

  // Edit Modal State
  const [editingParticipant, setEditingParticipant] = useState<ParticipantItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    place: "",
    district: "",
    participateFully: true,
    wantsFood: true,
    mobile: "",
    shuhba: "",
    checkInStatus: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deletingParticipant, setDeletingParticipant] = useState<ParticipantItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 3500);
  }, []);

  // Fetch Department Stats
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (res.ok) {
        if (data.shuhbaStats) {
          setDepartmentStats(data.shuhbaStats);
        }
        if (data.summary?.totalRegistrations !== undefined) {
          setOverallTotal(data.summary.totalRegistrations);
        }
      }
    } catch (err) {
      console.error("[Stats Fetch Error]", err);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch Participants list with active filters & pagination
  const fetchParticipants = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        search,
        shuhba: shuhbaFilter,
        checkIn: checkInFilter,
        participateFully: participateFilter,
        wantsFood: foodFilter,
      });

      const res = await fetch(`/api/admin/participants?${query.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setParticipants(data.participants || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total ?? 0);
        if (data.overallTotal !== undefined) {
          setOverallTotal(data.overallTotal);
        }
      } else {
        showToast(data.error || "Failed to load participants", "error");
      }
    } catch {
      showToast("Network error while loading participants", "error");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, shuhbaFilter, checkInFilter, participateFilter, foodFilter, showToast]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setShuhbaFilter("ALL");
    setCheckInFilter("ALL");
    setParticipateFilter("ALL");
    setFoodFilter("ALL");
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    shuhbaFilter !== "ALL" ||
    checkInFilter !== "ALL" ||
    participateFilter !== "ALL" ||
    foodFilter !== "ALL";

  const handleToggleCheckIn = async (participant: ParticipantItem) => {
    const newStatus = !participant.checkInStatus;
    try {
      const res = await fetch(`/api/admin/participants/${participant.registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkInStatus: newStatus }),
      });
      if (res.ok) {
        showToast(
          `Participant ${participant.registrationId} marked as ${
            newStatus ? "Checked In" : "Pending"
          }`
        );
        fetchParticipants();
        fetchStats();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update check-in status", "error");
      }
    } catch {
      showToast("Network error updating status", "error");
    }
  };

  // Edit Modal Handlers
  const openEditModal = (p: ParticipantItem) => {
    setEditingParticipant(p);
    setEditForm({
      name: p.name,
      place: p.place,
      district: p.district || "",
      participateFully: p.participateFully ?? true,
      wantsFood: p.wantsFood ?? true,
      mobile: p.mobile,
      shuhba: p.shuhba,
      checkInStatus: p.checkInStatus,
    });
    setModalError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    setIsSaving(true);
    setModalError(null);

    try {
      const res = await fetch(`/api/admin/participants/${editingParticipant.registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Failed to update participant");
        setIsSaving(false);
        return;
      }

      showToast(`Participant ${editingParticipant.registrationId} updated successfully`);
      setEditingParticipant(null);
      fetchParticipants();
      fetchStats();
    } catch {
      setModalError("Network error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Modal Handlers
  const openDeleteModal = (p: ParticipantItem) => {
    setDeletingParticipant(p);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingParticipant) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/participants/${deletingParticipant.registrationId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete participant record");
        setIsDeleting(false);
        return;
      }

      const deletedId = deletingParticipant.registrationId;
      setDeletingParticipant(null);
      showToast(`Participant ${deletedId} deleted successfully from database`);
      // Update both table and live statistics immediately
      fetchParticipants();
      fetchStats();
    } catch {
      setDeleteError("Network error while deleting participant.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy Department List (TSV Format)
  const handleCopyDepartmentList = async (shuhba: string) => {
    setCopyingDept(shuhba);
    try {
      const res = await fetch(`/api/admin/participants?shuhba=${encodeURIComponent(shuhba)}&limit=2000`);
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to fetch department participants", "error");
        setCopyingDept(null);
        return;
      }

      const list: ParticipantItem[] = data.participants || [];
      if (list.length === 0) {
        showToast(`No participants registered in department ${shuhba} yet.`, "info");
        setCopyingDept(null);
        return;
      }

      // Tab-separated format (ideal for Excel, Google Sheets, WhatsApp)
      const headerLine = "No.\tName\tPlace\tDistrict\tMobile\tDepartment\tParticipate Fully\tWants Food";
      const rows = list.map((p, idx) => {
        const fully = p.participateFully !== false ? "Yes" : "No";
        const food = p.wantsFood !== false ? "Yes" : "No";
        return `${idx + 1}\t${p.name}\t${p.place}\t${p.district || ""}\t${p.mobile}\t${p.shuhba}\t${fully}\t${food}`;
      });

      const tsvContent = `Department: ${shuhba}\nTotal: ${list.length}\n\n${headerLine}\n${rows.join("\n")}`;

      const copied = await copyTextToClipboard(tsvContent);
      if (copied) {
        showToast(`Copied ${list.length} participants from ${shuhba} to clipboard!`);
      } else {
        showToast("Unable to write to clipboard. Check browser permissions.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error generating department list", "error");
    } finally {
      setCopyingDept(null);
    }
  };

  // Copy WhatsApp Registration Progress Report
  const handleCopyWhatsAppReport = async (detailed: boolean = false) => {
    setIsCopyingReport(true);
    try {
      // 1. Fetch latest fresh statistics
      const statsRes = await fetch("/api/admin/stats");
      const statsData = await statsRes.json();

      const latestStats: Record<string, DepartmentStat> = statsData.shuhbaStats || {};
      const latestTotal: number = statsData.summary?.totalRegistrations ?? overallTotal;

      const formattedDate = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      let sumOfDepartments = 0;
      const breakdownLines = EVENT_CONFIG.shuhbaOptions.map((shuhba, idx) => {
        const count = latestStats[shuhba]?.total ?? 0;
        sumOfDepartments += count;
        return `${idx + 1}. ${shuhba} — ${count}`;
      });

      let reportText = "";

      if (!detailed) {
        reportText = [
          `*📊 SAQAFEES MEET — REGISTRATION UPDATE*`,
          ``,
          `📌 *Total Registrations: ${latestTotal}*`,
          ``,
          `*Department-wise Breakdown*`,
          ``,
          breakdownLines.join("\n"),
          ``,
          `*Total: ${sumOfDepartments}*`,
          ``,
          `_Updated: ${formattedDate}_`,
        ].join("\n");
      } else {
        // Detailed Report: fetch all participants grouped by department
        const participantsRes = await fetch(`/api/admin/participants?limit=2000`);
        const pData = await participantsRes.json();
        const allParticipants: ParticipantItem[] = pData.participants || [];

        const groupedLines: string[] = [];
        EVENT_CONFIG.shuhbaOptions.forEach((shuhba, idx) => {
          const deptParticipants = allParticipants.filter((p) => p.shuhba === shuhba);
          groupedLines.push(`\n*${idx + 1}. ${shuhba} (${deptParticipants.length})*`);
          if (deptParticipants.length === 0) {
            groupedLines.push(`  _(No registrations yet)_`);
          } else {
            deptParticipants.forEach((p, pIdx) => {
              groupedLines.push(
                `  ${pIdx + 1}. ${p.name} — ${p.place}${p.district ? ` (${p.district})` : ""}`
              );
            });
          }
        });

        reportText = [
          `*📊 SAQAFEES MEET — DETAILED REGISTRATION REPORT*`,
          ``,
          `📌 *Total Registrations: ${latestTotal}*`,
          groupedLines.join("\n"),
          ``,
          `*Overall Total: ${latestTotal}*`,
          `_Updated: ${formattedDate}_`,
        ].join("\n");
      }

      const success = await copyTextToClipboard(reportText);
      if (success) {
        showToast(
          detailed
            ? "Detailed WhatsApp report copied to clipboard!"
            : "WhatsApp registration report copied to clipboard!"
        );
      } else {
        showToast("Clipboard access denied. Please allow clipboard permissions.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to generate WhatsApp report", "error");
    } finally {
      setIsCopyingReport(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-[#132238]">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg border text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-[#132238] text-white border-amber-400/40"
              : toast.type === "error"
              ? "bg-red-700 text-white border-red-800"
              : "bg-gray-800 text-white border-gray-700"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "⚠" : "ℹ"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Actions: WhatsApp Report & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-200">
        <div>
          <h2 className="text-sm font-bold text-[#132238]">Registration Overview & Reports</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Real-time department statistics and broadcast report generator
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent WhatsApp Report Button */}
          <button
            type="button"
            onClick={() => handleCopyWhatsAppReport(false)}
            disabled={isCopyingReport}
            className="h-9 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
            title="Copy formatted WhatsApp registration summary"
          >
            <span className="text-sm">📋</span>
            <span>{isCopyingReport ? "Generating..." : "Copy WhatsApp Report"}</span>
          </button>

          {/* Optional Detailed WhatsApp Report */}
          <button
            type="button"
            onClick={() => handleCopyWhatsAppReport(true)}
            disabled={isCopyingReport}
            className="h-9 px-3 rounded-lg border border-gray-300 hover:border-gray-400 bg-white font-medium text-gray-700 transition-colors cursor-pointer disabled:opacity-60"
            title="Copy detailed participant breakdown for WhatsApp"
          >
            Copy Detailed Report
          </button>

          <button
            type="button"
            onClick={() => {
              fetchParticipants();
              fetchStats();
              showToast("Dashboard refreshed");
            }}
            className="h-9 px-2.5 rounded-lg border border-gray-300 hover:border-gray-400 bg-white text-gray-600 transition-colors cursor-pointer"
            title="Refresh statistics and participant table"
          >
            ↻
          </button>
        </div>
      </div>

      {/* 3. Department-wise Registration Statistics Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Department-wise Registrations
            </h3>
            {isStatsLoading && <span className="text-[10px] text-gray-400">Updating...</span>}
          </div>
          <span className="text-[11px] text-gray-500">
            Total Across Departments: <strong className="text-[#132238]">{overallTotal}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {EVENT_CONFIG.shuhbaOptions.map((shuhba) => {
            const stat = departmentStats[shuhba] || { total: 0, checkedIn: 0, percentage: 0 };
            const isFilterActive = shuhbaFilter === shuhba;
            const isCopying = copyingDept === shuhba;

            return (
              <div
                key={shuhba}
                className={`relative rounded-xl border p-3 flex flex-col justify-between transition-all ${
                  isFilterActive
                    ? "bg-[#132238] text-white border-[#132238] shadow-sm"
                    : "bg-white border-gray-200 hover:border-gray-300 text-[#132238]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold tracking-tight uppercase truncate ${
                        isFilterActive ? "text-amber-300" : "text-gray-700"
                      }`}
                      title={shuhba}
                    >
                      {shuhba}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                        isFilterActive
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {stat.percentage}%
                    </span>
                  </div>

                  <p
                    className={`text-xl font-extrabold mt-1.5 ${
                      isFilterActive ? "text-white" : "text-[#132238]"
                    }`}
                  >
                    {stat.total}
                  </p>
                  <p
                    className={`text-[10px] mt-0.5 ${
                      isFilterActive ? "text-gray-300" : "text-gray-400"
                    }`}
                  >
                    {stat.checkedIn} checked in
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-100/30 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopyDepartmentList(shuhba)}
                    disabled={isCopying}
                    className={`flex-1 py-1 px-1 rounded text-[10px] font-medium text-center transition-colors cursor-pointer ${
                      isFilterActive
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                    title={`Copy list of registered participants in ${shuhba}`}
                  >
                    {isCopying ? "..." : "Copy"}
                  </button>

                  <a
                    href={`/api/admin/export?shuhba=${encodeURIComponent(shuhba)}`}
                    download={`saqafees-${shuhba.toLowerCase()}.csv`}
                    className={`py-1 px-1.5 rounded text-[10px] font-medium text-center transition-colors ${
                      isFilterActive
                        ? "bg-white/10 hover:bg-white/20 text-white"
                        : "border border-gray-200 hover:bg-gray-50 text-gray-500"
                    }`}
                    title={`Download CSV for ${shuhba}`}
                  >
                    CSV
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1. Registration Filters Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search name, place, district, phone, ID..."
              value={search}
              onChange={handleSearchChange}
              className="w-full h-10 px-3.5 rounded-lg border border-gray-300 text-xs focus:outline-none focus:border-[#132238] transition-colors"
            />
          </div>

          {/* Quick Action Export CSV */}
          <div className="flex items-center gap-2">
            <a
              href={`/api/admin/export?shuhba=${encodeURIComponent(shuhbaFilter)}&checkIn=${encodeURIComponent(
                checkInFilter
              )}&participateFully=${encodeURIComponent(participateFilter)}&wantsFood=${encodeURIComponent(
                foodFilter
              )}`}
              download
              className="h-10 px-3.5 flex items-center gap-1.5 rounded-lg border border-gray-300 hover:border-gray-400 font-medium transition-colors bg-white"
              title="Export currently filtered list as CSV"
            >
              <span>Export CSV</span>
              <span className="text-gray-400 text-[10px]">({totalCount})</span>
            </a>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-10 px-3 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 font-medium transition-colors cursor-pointer text-xs"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-gray-100">
          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Department</label>
            <select
              value={shuhbaFilter}
              onChange={(e) => {
                setShuhbaFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-2.5 rounded-lg border border-gray-300 bg-white text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {EVENT_CONFIG.shuhbaOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} ({departmentStats[opt]?.total ?? 0})
                </option>
              ))}
            </select>
          </div>

          {/* Check-In Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Check-in Status</label>
            <select
              value={checkInFilter}
              onChange={(e) => {
                setCheckInFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-2.5 rounded-lg border border-gray-300 bg-white text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="checkedIn">Checked In</option>
              <option value="notCheckedIn">Pending</option>
            </select>
          </div>

          {/* Participation Filter (Will you participate fully?) */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Participate Fully?
            </label>
            <select
              value={participateFilter}
              onChange={(e) => {
                setParticipateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-2.5 rounded-lg border border-gray-300 bg-white text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Participants</option>
              <option value="yes">Yes (Full Attendance)</option>
              <option value="no">No (Partial Attendance)</option>
            </select>
          </div>

          {/* Food Filter (Do you want food?) */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Want Food?</label>
            <select
              value={foodFilter}
              onChange={(e) => {
                setFoodFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-2.5 rounded-lg border border-gray-300 bg-white text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Food Options</option>
              <option value="yes">Yes (Needs Food)</option>
              <option value="no">No (No Food)</option>
            </select>
          </div>
        </div>

        {/* Filter Summary Counter */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <span>
              Showing <strong className="text-[#132238]">{participants.length}</strong> of{" "}
              <strong className="text-[#132238]">{totalCount}</strong> filtered participants
            </span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">
              Overall Total in Database: <strong className="text-[#132238]">{overallTotal}</strong>
            </span>
          </div>

          {hasActiveFilters && (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
              Active Filters Applied
            </span>
          )}
        </div>
      </div>

      {/* Participants Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold text-[11px]">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Place / District</th>
                <th className="py-2.5 px-3">Mobile</th>
                <th className="py-2.5 px-3">Shuhba</th>
                <th className="py-2.5 px-3">Attendance & Food</th>
                <th className="py-2.5 px-3">Check-in</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Loading participants...
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <p className="font-medium text-gray-600">No participants match your criteria.</p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-2 text-xs text-[#132238] underline hover:text-[#C5A059]"
                      >
                        Reset all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                participants.map((p) => (
                  <tr key={p.registrationId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#132238]">
                      {p.registrationId}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#132238]">{p.name}</td>
                    <td className="py-2.5 px-3 text-gray-600">
                      <div>{p.place}</div>
                      {p.district && <div className="text-[10px] text-gray-400">{p.district}</div>}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-600">{p.mobile}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-gray-800 text-[11px]">{p.shuhba}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-0.5 text-[10px]">
                        <span
                          className={
                            p.participateFully !== false
                              ? "text-emerald-700 font-semibold"
                              : "text-amber-700 font-medium"
                          }
                        >
                          Full: {p.participateFully !== false ? "Yes" : "No"}
                        </span>
                        <span
                          className={
                            p.wantsFood !== false
                              ? "text-blue-700 font-semibold"
                              : "text-gray-500"
                          }
                        >
                          Food: {p.wantsFood !== false ? "Yes" : "No"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleToggleCheckIn(p)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          p.checkInStatus
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200"
                        }`}
                        title="Click to toggle check-in status"
                      >
                        {p.checkInStatus ? "✓ Checked In" : "Pending"}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <a
                        href={`/api/registrations/${p.registrationId}/pass?token=${p.passAccessToken}`}
                        download={`Pass-${p.registrationId}.pdf`}
                        className="text-gray-500 hover:text-[#132238] underline"
                      >
                        PDF
                      </a>
                      <a
                        href={`/api/registrations/${p.registrationId}/qr?token=${p.passAccessToken}`}
                        download={`QR-${p.registrationId}.png`}
                        className="text-gray-500 hover:text-[#132238] underline"
                      >
                        QR
                      </a>
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="text-blue-600 hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(p)}
                        className="text-red-600 hover:underline cursor-pointer font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-100 flex items-center justify-between text-gray-500 text-xs bg-gray-50/50">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white disabled:opacity-40 hover:border-gray-400 transition-colors"
            >
              Prev
            </button>
            <span>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} matching)
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white disabled:opacity-40 hover:border-gray-400 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* 5. Overall Registration Count Prominently at Bottom */}
      <div className="rounded-2xl p-6 bg-[#132238] text-white shadow-sm border border-[#1e3456] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C5A059]">
            Official Event Ledger
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5">
            TOTAL REGISTRATIONS: {overallTotal}
          </h2>
          <p className="text-xs text-gray-300 mt-1">
            Real-time count verified directly from MongoDB database
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleCopyWhatsAppReport(false)}
            className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Copy WhatsApp Report
          </button>
          <a
            href="/api/admin/export"
            download
            className="h-10 px-4 flex items-center rounded-lg border border-gray-400 hover:border-white text-white font-medium text-xs transition-colors"
          >
            Export All Records
          </a>
        </div>
      </div>

      {/* 2. Fixed Delete Confirmation Modal */}
      {deletingParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 border border-gray-200 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-bold text-red-600 flex items-center gap-1.5 text-sm">
                <span>⚠</span>
                <span>Confirm Permanent Deletion</span>
              </h3>
              <button
                type="button"
                onClick={() => setDeletingParticipant(null)}
                disabled={isDeleting}
                className="text-gray-400 hover:text-gray-600 text-base leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {deleteError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {deleteError}
              </div>
            )}

            <div className="space-y-2 text-xs text-gray-700">
              <p>
                Are you sure you want to permanently delete this registration? This will delete the
                participant document, QR code access, and verification credentials from MongoDB.
              </p>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 font-mono text-[11px] space-y-1">
                <div>
                  <span className="text-gray-500">ID:</span>{" "}
                  <strong>{deletingParticipant.registrationId}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Name:</span>{" "}
                  <strong>{deletingParticipant.name}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Mobile:</span> {deletingParticipant.mobile}
                </div>
                <div>
                  <span className="text-gray-500">Dept:</span> {deletingParticipant.shuhba}
                </div>
              </div>

              <p className="text-[11px] text-red-500 font-medium">This action cannot be undone.</p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingParticipant(null)}
                className="px-3.5 py-2 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold disabled:opacity-60 transition-colors cursor-pointer shadow-xs"
              >
                {isDeleting ? "Deleting from Database..." : "Delete Participant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-bold">Edit Participant</h3>
              <button
                type="button"
                onClick={() => setEditingParticipant(null)}
                className="text-gray-400 hover:text-gray-600 text-base leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-2 bg-red-50 text-red-700 text-xs rounded">{modalError}</div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full h-9 px-3 border border-gray-300 rounded text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-600 mb-1">Place</label>
                  <input
                    type="text"
                    required
                    value={editForm.place}
                    onChange={(e) => setEditForm({ ...editForm, place: e.target.value })}
                    className="w-full h-9 px-3 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">District</label>
                  <input
                    type="text"
                    required
                    value={editForm.district}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    className="w-full h-9 px-3 border border-gray-300 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 mb-1">Mobile</label>
                <input
                  type="tel"
                  required
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  className="w-full h-9 px-3 border border-gray-300 rounded text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-600 mb-1">Shuhba</label>
                <select
                  value={editForm.shuhba}
                  onChange={(e) => setEditForm({ ...editForm, shuhba: e.target.value })}
                  className="w-full h-9 px-2 border border-gray-300 rounded text-xs bg-white"
                >
                  {EVENT_CONFIG.shuhbaOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="modalParticipate"
                    checked={editForm.participateFully}
                    onChange={(e) =>
                      setEditForm({ ...editForm, participateFully: e.target.checked })
                    }
                    className="rounded"
                  />
                  <label htmlFor="modalParticipate" className="text-gray-700">
                    Will Participate Fully
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="modalWantsFood"
                    checked={editForm.wantsFood}
                    onChange={(e) => setEditForm({ ...editForm, wantsFood: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="modalWantsFood" className="text-gray-700">
                    Wants Food
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="modalCheckIn"
                    checked={editForm.checkInStatus}
                    onChange={(e) =>
                      setEditForm({ ...editForm, checkInStatus: e.target.checked })
                    }
                    className="rounded"
                  />
                  <label htmlFor="modalCheckIn" className="text-gray-700 font-medium">
                    Mark as Checked In
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingParticipant(null)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-[#132238] text-white rounded text-xs font-medium disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
