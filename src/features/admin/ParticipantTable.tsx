"use client";

import { useState, useEffect, useCallback } from "react";
import { EVENT_CONFIG } from "@/config/event.config";

interface ParticipantItem {
  _id: string;
  registrationId: string;
  name: string;
  place: string;
  mobile: string;
  shuhba: string;
  checkInStatus: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  whatsappStatus: string;
  passAccessToken: string;
  createdAt: string;
}

export function ParticipantTable() {
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [shuhbaFilter, setShuhbaFilter] = useState("ALL");
  const [checkInFilter, setCheckInFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Edit Modal State
  const [editingParticipant, setEditingParticipant] = useState<ParticipantItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    place: "",
    mobile: "",
    shuhba: "",
    checkInStatus: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchParticipants = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        search,
        shuhba: shuhbaFilter,
        checkIn: checkInFilter,
      });

      const res = await fetch(`/api/admin/participants?${query.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setParticipants(data.participants || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, shuhbaFilter, checkInFilter]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleToggleCheckIn = async (participant: ParticipantItem) => {
    const newStatus = !participant.checkInStatus;
    try {
      const res = await fetch(`/api/admin/participants/${participant.registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkInStatus: newStatus }),
      });
      if (res.ok) {
        fetchParticipants();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (p: ParticipantItem) => {
    setEditingParticipant(p);
    setEditForm({
      name: p.name,
      place: p.place,
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

      setEditingParticipant(null);
      fetchParticipants();
    } catch {
      setModalError("Network error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (registrationId: string) => {
    if (!confirm(`Delete participant ${registrationId}?`)) return;
    try {
      const res = await fetch(`/api/admin/participants/${registrationId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchParticipants();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 text-xs text-[#132238]">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search name, phone, or ID..."
            value={search}
            onChange={handleSearchChange}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 text-xs focus:outline-none focus:border-[#132238]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={shuhbaFilter}
            onChange={(e) => {
              setShuhbaFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-lg border border-gray-300 bg-white text-xs focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {EVENT_CONFIG.shuhbaOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <select
            value={checkInFilter}
            onChange={(e) => {
              setCheckInFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-lg border border-gray-300 bg-white text-xs focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="checkedIn">Checked In</option>
            <option value="notCheckedIn">Pending</option>
          </select>

          <a
            href={`/api/admin/export?shuhba=${shuhbaFilter}&checkIn=${checkInFilter}`}
            download
            className="h-10 px-3.5 flex items-center rounded-lg border border-gray-300 hover:border-gray-400 font-medium transition-colors"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold">
              <th className="py-2.5 px-3">ID</th>
              <th className="py-2.5 px-3">Name</th>
              <th className="py-2.5 px-3">Place</th>
              <th className="py-2.5 px-3">Mobile</th>
              <th className="py-2.5 px-3">Shuhba</th>
              <th className="py-2.5 px-3">Check-in</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : participants.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  No participants found.
                </td>
              </tr>
            ) : (
              participants.map((p) => (
                <tr key={p.registrationId} className="hover:bg-gray-50/50">
                  <td className="py-2.5 px-3 font-mono font-medium">{p.registrationId}</td>
                  <td className="py-2.5 px-3 font-medium">{p.name}</td>
                  <td className="py-2.5 px-3 text-gray-600">{p.place}</td>
                  <td className="py-2.5 px-3 font-mono text-gray-600">{p.mobile}</td>
                  <td className="py-2.5 px-3">{p.shuhba}</td>
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => handleToggleCheckIn(p)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        p.checkInStatus
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                      title="Click to toggle status"
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
                      onClick={() => openEditModal(p)}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.registrationId)}
                      className="text-red-500 hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-100 flex items-center justify-between text-gray-500 text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-2.5 py-1 border border-gray-200 rounded disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {page} of {totalPages} ({totalCount} total)
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-2.5 py-1 border border-gray-200 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-bold">Edit Participant</h3>
              <button
                onClick={() => setEditingParticipant(null)}
                className="text-gray-400 hover:text-gray-600 text-base leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-2 bg-red-50 text-red-700 text-xs rounded">
                {modalError}
              </div>
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

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modalCheckIn"
                  checked={editForm.checkInStatus}
                  onChange={(e) =>
                    setEditForm({ ...editForm, checkInStatus: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="modalCheckIn" className="text-gray-700">
                  Mark as Checked In
                </label>
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
