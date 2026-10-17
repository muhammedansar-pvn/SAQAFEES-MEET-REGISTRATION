"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { EVENT_CONFIG } from "@/config/event.config";
import {
  WHATSAPP_TEMPLATES,
  AVAILABLE_PLACEHOLDERS,
  WhatsAppTemplateType,
  interpolateWhatsAppTemplate,
} from "@/features/whatsapp/templates";
import { generateWhatsAppClickToChatUrl, formatMobileDisplay, isValidMobileNumber } from "@/lib/phone";

interface ParticipantItem {
  _id: string;
  registrationId: string;
  name: string;
  place: string;
  district?: string;
  mobile: string;
  shuhba: string;
  checkInStatus: boolean;
  whatsappStatus: string;
  passAccessToken: string;
  createdAt: string;
}

interface CampaignParticipant {
  participantId: string;
  registrationId: string;
  name: string;
  mobile: string;
  normalizedMobile: string;
  place?: string;
  district?: string;
  department: string;
  passAccessToken: string;
  status: "PENDING" | "OPENED" | "MARKED_SENT" | "SKIPPED" | "FAILED_TO_OPEN";
  openedAt?: string;
  markedAt?: string;
  notes?: string;
}

interface CampaignSummary {
  _id: string;
  title: string;
  templateType: string;
  status: "draft" | "in_progress" | "paused" | "completed";
  currentIndex: number;
  totalCount: number;
  createdAt: string;
  updatedAt: string;
  stats: {
    total: number;
    pending: number;
    opened: number;
    markedSent: number;
    skipped: number;
    failedToOpen: number;
  };
}

interface ActiveCampaign {
  _id: string;
  title: string;
  templateType: WhatsAppTemplateType;
  messageTemplate: string;
  status: "draft" | "in_progress" | "paused" | "completed";
  currentIndex: number;
  totalCount: number;
  participants: CampaignParticipant[];
}

const DISTRICT_OPTIONS = [
  "ALL",
  "Kozhikode",
  "Malappuram",
  "Wayanad",
  "Kannur",
  "Kasargod",
  "Palakkad",
  "Thrissur",
  "Ernakulam",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Pathanamthitta",
  "Kollam",
  "Thiruvananthapuram",
];

const MAX_BATCH_LIMIT = 500;

export function WhatsAppManager() {
  // Navigation / View modes: 'compose' | 'queue' | 'campaigns'
  const [activeTab, setActiveTab] = useState<"compose" | "queue" | "campaigns">("compose");

  // Selection & Participants State
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [search, setSearch] = useState("");
  const [shuhbaFilter, setShuhbaFilter] = useState("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Message Composer State
  const [campaignTitle, setCampaignTitle] = useState("");
  const [templateType, setTemplateType] = useState<WhatsAppTemplateType>("confirmation");
  const [messageTemplate, setMessageTemplate] = useState(
    WHATSAPP_TEMPLATES.confirmation.defaultTemplate
  );
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isStartingCampaign, setIsStartingCampaign] = useState(false);

  // Active Queue State
  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaign | null>(null);
  const [campaignsList, setCampaignsList] = useState<CampaignSummary[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [lastOpenedUrl, setLastOpenedUrl] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(
    null
  );

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      setToast({ message, type });
      setTimeout(() => {
        setToast((curr) => (curr?.message === message ? null : curr));
      }, 3500);
    },
    []
  );

  // Fetch Participants for selection
  const fetchParticipants = useCallback(async () => {
    setIsLoadingParticipants(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "25",
      });
      if (search.trim()) query.set("search", search.trim());
      if (shuhbaFilter !== "ALL") query.set("shuhba", shuhbaFilter);
      if (districtFilter !== "ALL") query.set("district", districtFilter);

      const res = await fetch(`/api/admin/participants?${query.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setParticipants(data.participants || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      } else {
        showToast(data.error || "Failed to load participants", "error");
      }
    } catch {
      showToast("Network error loading participants", "error");
    } finally {
      setIsLoadingParticipants(false);
    }
  }, [page, search, shuhbaFilter, districtFilter, showToast]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // Fetch Campaigns history
  const fetchCampaigns = useCallback(async () => {
    setIsLoadingCampaigns(true);
    try {
      const res = await fetch("/api/admin/whatsapp/campaigns");
      const data = await res.json();
      if (res.ok) {
        setCampaignsList(data.campaigns || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Check if an existing campaign is in progress and load it
  const loadCampaign = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/admin/whatsapp/campaigns/${campaignId}`);
      const data = await res.json();
      if (res.ok && data.campaign) {
        setActiveCampaign(data.campaign);
        setActiveTab("queue");
        showToast(`Loaded campaign: ${data.campaign.title}`, "info");
      } else {
        showToast("Failed to load campaign details", "error");
      }
    } catch {
      showToast("Network error loading campaign", "error");
    }
  };

  // Participant Selection Handlers
  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_BATCH_LIMIT) {
          showToast(`Maximum selection limit of ${MAX_BATCH_LIMIT} participants reached.`, "error");
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  // Select all matching the current filter (up to 500)
  const handleSelectAllFiltered = async () => {
    try {
      setIsLoadingParticipants(true);
      const query = new URLSearchParams({
        limit: "500", // Fetch up to 500 matching filter
      });
      if (search.trim()) query.set("search", search.trim());
      if (shuhbaFilter !== "ALL") query.set("shuhba", shuhbaFilter);
      if (districtFilter !== "ALL") query.set("district", districtFilter);

      const res = await fetch(`/api/admin/participants?${query.toString()}`);
      const data = await res.json();

      if (res.ok && Array.isArray(data.participants)) {
        const fetchedIds: string[] = data.participants.map((p: any) => p._id);
        const countToAdd = Math.min(fetchedIds.length, MAX_BATCH_LIMIT);
        const newSet = new Set(selectedIds);

        for (let i = 0; i < countToAdd; i++) {
          if (newSet.size >= MAX_BATCH_LIMIT) break;
          newSet.add(fetchedIds[i]);
        }

        setSelectedIds(newSet);
        showToast(`Selected ${newSet.size} participants (Limit: ${MAX_BATCH_LIMIT})`, "success");
      }
    } catch {
      showToast("Failed to select all filtered participants", "error");
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    showToast("Participant selection cleared", "info");
  };

  // Change Template Preset
  const handleTemplateChange = (type: WhatsAppTemplateType) => {
    setTemplateType(type);
    setMessageTemplate(WHATSAPP_TEMPLATES[type].defaultTemplate);
  };

  // Insert placeholder into message template textarea
  const handleInsertPlaceholder = (placeholderKey: string) => {
    setMessageTemplate((prev) => prev + " " + placeholderKey);
  };

  // Sample data for preview from first selected or first participant
  const sampleParticipant = useMemo(() => {
    if (selectedIds.size > 0) {
      const firstSelectedId = Array.from(selectedIds)[0];
      const found = participants.find((p) => p._id === firstSelectedId);
      if (found) return found;
    }
    return participants[0] || null;
  }, [selectedIds, participants]);

  // Interpolated preview text
  const previewMessage = useMemo(() => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://saqafees-meet.vercel.app";

    if (!sampleParticipant) {
      return interpolateWhatsAppTemplate(messageTemplate, {
        name: "Ahmed Kutty",
        department: "HADEES",
        district: "Kozhikode",
        place: "Markaz",
        registrationId: "LQM-2026-XXXXXXXX",
        entryPassUrl: `${origin}/confirmation/LQM-2026-XXXXXXXX?token=sample_token`,
      });
    }

    return interpolateWhatsAppTemplate(messageTemplate, {
      name: sampleParticipant.name,
      department: sampleParticipant.shuhba,
      district: sampleParticipant.district || "Calicut",
      place: sampleParticipant.place || "Markaz",
      registrationId: sampleParticipant.registrationId,
      entryPassUrl: `${origin}/confirmation/${sampleParticipant.registrationId}?token=${sampleParticipant.passAccessToken}`,
    });
  }, [messageTemplate, sampleParticipant]);

  // Start Campaign
  const handleStartCampaign = async () => {
    if (selectedIds.size === 0) {
      showToast("Please select at least 1 participant.", "error");
      return;
    }

    if (selectedIds.size > MAX_BATCH_LIMIT) {
      showToast(`Cannot exceed ${MAX_BATCH_LIMIT} participants per batch.`, "error");
      return;
    }

    if (!messageTemplate.trim()) {
      showToast("Message template cannot be empty.", "error");
      return;
    }

    const title =
      campaignTitle.trim() ||
      `${WHATSAPP_TEMPLATES[templateType].label} (${new Date().toLocaleDateString("en-IN")})`;

    setIsStartingCampaign(true);
    try {
      const res = await fetch("/api/admin/whatsapp/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          templateType,
          messageTemplate,
          participantIds: Array.from(selectedIds),
        }),
      });

      const data = await res.json();
      if (res.ok && data.campaignId) {
        showToast("Campaign prepared successfully! Launching queue...", "success");
        setShowConfirmModal(false);
        await loadCampaign(data.campaignId);
        fetchCampaigns();
      } else {
        showToast(data.error || "Failed to start campaign", "error");
      }
    } catch {
      showToast("Network error creating campaign", "error");
    } finally {
      setIsStartingCampaign(false);
    }
  };

  // Queue Operations
  const currentParticipant = useMemo(() => {
    if (!activeCampaign || !activeCampaign.participants.length) return null;
    return activeCampaign.participants[activeCampaign.currentIndex] || null;
  }, [activeCampaign]);

  const currentMessageText = useMemo(() => {
    if (!activeCampaign || !currentParticipant) return "";
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://saqafees-meet.vercel.app";

    return interpolateWhatsAppTemplate(activeCampaign.messageTemplate, {
      name: currentParticipant.name,
      department: currentParticipant.department,
      district: currentParticipant.district || "",
      place: currentParticipant.place || "",
      registrationId: currentParticipant.registrationId,
      entryPassUrl: `${origin}/confirmation/${currentParticipant.registrationId}?token=${currentParticipant.passAccessToken}`,
    });
  }, [activeCampaign, currentParticipant]);

  const clickToChatUrl = useMemo(() => {
    if (!currentParticipant || !currentMessageText) return "";
    return generateWhatsAppClickToChatUrl(currentParticipant.mobile, currentMessageText);
  }, [currentParticipant, currentMessageText]);

  // Click Open WhatsApp
  const handleOpenWhatsApp = async () => {
    if (!currentParticipant || !clickToChatUrl) {
      showToast("Invalid phone number or empty message.", "error");
      return;
    }

    setPopupBlocked(false);
    setLastOpenedUrl(clickToChatUrl);

    // Open WhatsApp Web or app in a new tab
    const win = window.open(clickToChatUrl, "_blank", "noopener,noreferrer");

    if (!win || win.closed || typeof win.closed === "undefined") {
      setPopupBlocked(true);
      showToast("Popup was blocked by your browser. Please allow popups or click the direct link.", "error");
    }

    // Update status to OPENED
    await updateParticipantStatus(currentParticipant.participantId, "OPENED");
  };

  // Update participant status inside current campaign
  const updateParticipantStatus = async (
    participantId: string,
    status: "OPENED" | "MARKED_SENT" | "SKIPPED" | "FAILED_TO_OPEN",
    autoAdvance: boolean = false
  ) => {
    if (!activeCampaign) return;
    setIsUpdatingStatus(true);

    try {
      const nextIndex =
        autoAdvance && activeCampaign.currentIndex < activeCampaign.participants.length - 1
          ? activeCampaign.currentIndex + 1
          : activeCampaign.currentIndex;

      const res = await fetch(`/api/admin/whatsapp/campaigns/${activeCampaign._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentIndex: nextIndex,
          participantAction: {
            participantId,
            status,
          },
        }),
      });

      if (res.ok) {
        // Optimistically update local active campaign
        setActiveCampaign((prev) => {
          if (!prev) return null;
          const updated = prev.participants.map((p) => {
            if (p.participantId === participantId || p.registrationId === participantId) {
              return { ...p, status };
            }
            return p;
          });
          return {
            ...prev,
            currentIndex: nextIndex,
            participants: updated,
          };
        });

        if (status === "MARKED_SENT") {
          showToast(`Marked as Sent: ${currentParticipant?.name}`, "success");
        } else if (status === "SKIPPED") {
          showToast(`Skipped: ${currentParticipant?.name}`, "info");
        }
      } else {
        showToast("Failed to record status in database", "error");
      }
    } catch {
      showToast("Network error recording status", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Jump to specific index in queue
  const handleJumpToIndex = async (index: number) => {
    if (!activeCampaign) return;
    const boundedIndex = Math.max(0, Math.min(index, activeCampaign.participants.length - 1));

    try {
      await fetch(`/api/admin/whatsapp/campaigns/${activeCampaign._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentIndex: boundedIndex }),
      });

      setActiveCampaign((prev) => (prev ? { ...prev, currentIndex: boundedIndex } : null));
    } catch {
      // ignore
    }
  };

  // Campaign Progress Statistics
  const activeStats = useMemo(() => {
    if (!activeCampaign) {
      return { total: 0, pending: 0, opened: 0, markedSent: 0, skipped: 0, failedToOpen: 0 };
    }
    const s = {
      total: activeCampaign.participants.length,
      pending: 0,
      opened: 0,
      markedSent: 0,
      skipped: 0,
      failedToOpen: 0,
    };
    activeCampaign.participants.forEach((p) => {
      if (p.status === "PENDING") s.pending++;
      else if (p.status === "OPENED") s.opened++;
      else if (p.status === "MARKED_SENT") s.markedSent++;
      else if (p.status === "SKIPPED") s.skipped++;
      else if (p.status === "FAILED_TO_OPEN") s.failedToOpen++;
    });
    return s;
  }, [activeCampaign]);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 py-2.5 px-4 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border transition-all animate-bounce ${
            toast.type === "success"
              ? "bg-[#132238] text-white border-amber-400/30"
              : toast.type === "error"
              ? "bg-red-600 text-white border-red-700"
              : "bg-gray-800 text-white border-gray-700"
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#132238] tracking-tight">
            WhatsApp Broadcast
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manual, 100% free WhatsApp Click-to-Chat bulk messaging for registered participants
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-lg text-xs font-semibold overflow-x-auto w-full sm:w-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("compose")}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "compose"
                ? "bg-[#132238] text-white shadow-xs"
                : "text-gray-600 hover:text-[#132238]"
            }`}
          >
            1. Select & Compose ({selectedIds.size})
          </button>
          <button
            type="button"
            onClick={() => {
              if (!activeCampaign) {
                showToast("No active queue. Prepare a campaign first or select one from history.", "info");
                return;
              }
              setActiveTab("queue");
            }}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "queue"
                ? "bg-[#132238] text-white shadow-xs"
                : "text-gray-600 hover:text-[#132238]"
            }`}
          >
            <span>2. Queue Runner</span>
            {activeCampaign && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("campaigns");
              fetchCampaigns();
            }}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "campaigns"
                ? "bg-[#132238] text-white shadow-xs"
                : "text-gray-600 hover:text-[#132238]"
            }`}
          >
            Campaign History
          </button>
        </div>
      </div>

      {/* VIEW 1: COMPOSE & SELECT */}
      {activeTab === "compose" && (
        <div className="space-y-6">
          {/* Important Notice Banner */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-3">
            <span className="text-base leading-none">💡</span>
            <div>
              <p className="font-bold">Standard WhatsApp Click-to-Chat (Zero-Cost)</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                This feature prepares personalized <code className="bg-amber-100 px-1 py-0.2 rounded font-mono">https://wa.me/</code> chats without any paid API fees.
                In the next step, you will click to open each chat in WhatsApp Web/Desktop and manually press Send.
                Maximum <strong>500 participants</strong> per batch.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns: Participant Selector */}
            <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-[#132238]">Select Participants</h2>
                  <p className="text-[11px] text-gray-500">
                    Filter by district or department, then select up to 500 recipients
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                      selectedIds.size >= MAX_BATCH_LIMIT
                        ? "bg-red-50 text-red-700 border-red-200"
                        : selectedIds.size > 0
                        ? "bg-amber-50 text-amber-900 border-amber-200"
                        : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    {selectedIds.size} / {MAX_BATCH_LIMIT} selected
                  </span>
                </div>
              </div>

              {/* Filters & Actions */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Search name, phone, ID..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="h-9 px-3 rounded-lg border border-gray-300 text-xs focus:outline-none focus:border-[#132238]"
                  />

                  <select
                    value={shuhbaFilter}
                    onChange={(e) => {
                      setShuhbaFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-9 px-2 rounded-lg border border-gray-300 bg-white text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Departments</option>
                    {EVENT_CONFIG.shuhbaOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>

                  <select
                    value={districtFilter}
                    onChange={(e) => {
                      setDistrictFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-9 px-2 rounded-lg border border-gray-300 bg-white text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Districts</option>
                    {DISTRICT_OPTIONS.filter((d) => d !== "ALL").map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Batch Selection Buttons */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="px-2.5 py-1 rounded bg-[#132238] hover:bg-[#1a2f4c] text-white text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Select All Filtered (Up to 500)
                    </button>
                    {selectedIds.size > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="px-2.5 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-600 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500">
                    Total Matching: <strong>{totalCount}</strong>
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 text-gray-600 text-[11px] font-semibold">
                      <tr>
                        <th className="py-2 px-3 w-8">
                          <input
                            type="checkbox"
                            checked={
                              participants.length > 0 &&
                              participants.every((p) => selectedIds.has(p._id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                const newSet = new Set(selectedIds);
                                participants.forEach((p) => {
                                  if (newSet.size < MAX_BATCH_LIMIT) newSet.add(p._id);
                                });
                                setSelectedIds(newSet);
                              } else {
                                const newSet = new Set(selectedIds);
                                participants.forEach((p) => newSet.delete(p._id));
                                setSelectedIds(newSet);
                              }
                            }}
                            className="rounded border-gray-300 text-[#132238] cursor-pointer"
                          />
                        </th>
                        <th className="py-2 px-3">Participant</th>
                        <th className="py-2 px-3">Mobile</th>
                        <th className="py-2 px-3">District</th>
                        <th className="py-2 px-3">Department</th>
                        <th className="py-2 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {isLoadingParticipants ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-gray-400">
                            Loading participants...
                          </td>
                        </tr>
                      ) : participants.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-gray-400">
                            No participants match current filters.
                          </td>
                        </tr>
                      ) : (
                        participants.map((p) => {
                          const isSelected = selectedIds.has(p._id);
                          const isMobileValid = isValidMobileNumber(p.mobile);

                          return (
                            <tr
                              key={p._id}
                              onClick={() => handleToggleSelectOne(p._id)}
                              className={`hover:bg-gray-50/80 cursor-pointer transition-colors ${
                                isSelected ? "bg-amber-50/40" : ""
                              }`}
                            >
                              <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectOne(p._id)}
                                  className="rounded border-gray-300 text-[#132238] cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <p className="font-semibold text-gray-900 truncate max-w-[140px]">
                                  {p.name}
                                </p>
                                <p className="font-mono text-[10px] text-gray-400">
                                  {p.registrationId}
                                </p>
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`font-mono text-[11px] ${
                                    isMobileValid ? "text-gray-700" : "text-red-600 font-bold"
                                  }`}
                                >
                                  {formatMobileDisplay(p.mobile) || p.mobile}
                                </span>
                                {!isMobileValid && (
                                  <span className="block text-[9px] text-red-600">Invalid</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-gray-600 text-[11px]">
                                {p.district || "—"}
                              </td>
                              <td className="py-2 px-3 text-gray-700 font-medium text-[11px]">
                                {p.shuhba}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    p.checkInStatus
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {p.checkInStatus ? "Checked In" : "Pending"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-2.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between text-[11px] text-gray-500">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      className="px-2.5 py-1 border border-gray-300 rounded bg-white disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span>
                      Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                      className="px-2.5 py-1 border border-gray-300 rounded bg-white disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right 5 Columns: Message Composer */}
            <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-[#132238]">Compose Message</h2>
                <p className="text-[11px] text-gray-500">
                  Select a template or customize with personalized placeholders
                </p>
              </div>

              {/* Campaign Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Saturday Attendance Reminder"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs focus:outline-none focus:border-[#132238]"
                />
              </div>

              {/* Template Presets */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Template Preset
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(WHATSAPP_TEMPLATES) as WhatsAppTemplateType[]).map((type) => {
                    const isSelected = templateType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleTemplateChange(type)}
                        className={`py-1.5 px-2.5 rounded-lg border text-left text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#132238] text-white border-[#132238]"
                            : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {WHATSAPP_TEMPLATES[type].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Placeholder Insert Pills */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Insert Placeholder:
                </label>
                <div className="flex flex-wrap gap-1">
                  {AVAILABLE_PLACEHOLDERS.map((ph) => (
                    <button
                      key={ph.key}
                      type="button"
                      onClick={() => handleInsertPlaceholder(ph.key)}
                      title={ph.description}
                      className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-mono text-[10px] transition-colors cursor-pointer"
                    >
                      {ph.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Message Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Message Content</label>
                  <span className="text-[10px] text-gray-400">
                    {messageTemplate.length} characters
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-300 text-xs font-mono focus:outline-none focus:border-[#132238] leading-relaxed resize-y"
                  placeholder="Type your WhatsApp message..."
                />
              </div>

              {/* Real-time Message Preview */}
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                    <span>💬</span> WhatsApp Live Preview
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Recipient: {sampleParticipant?.name || "Sample"}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 text-[11px] text-gray-800 whitespace-pre-wrap leading-relaxed shadow-2xs font-sans max-h-44 overflow-y-auto">
                  {previewMessage}
                </div>
              </div>

              {/* Launch Campaign Action */}
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={() => setShowConfirmModal(true)}
                className="w-full h-11 rounded-lg bg-[#132238] hover:bg-[#1a2f4c] text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
              >
                <span>🚀 Launch Click-to-Chat Queue</span>
                <span>({selectedIds.size} Participants)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ONE-AT-A-TIME QUEUE RUNNER */}
      {activeTab === "queue" && activeCampaign && (
        <div className="space-y-6">
          {/* Queue Progress Bar Header */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#C5A059]">
                  Active Campaign
                </span>
                <h2 className="text-lg font-extrabold text-[#132238]">
                  {activeCampaign.title}
                </h2>
                <p className="text-xs text-gray-500">
                  Total: {activeStats.total} participants · Created by {activeCampaign.status}
                </p>
              </div>

              {/* Progress Summary Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  ✓ {activeStats.markedSent} Sent
                </span>
                <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                  ↗ {activeStats.opened} Opened
                </span>
                <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-medium border border-gray-200">
                  ⏳ {activeStats.pending} Pending
                </span>
                {activeStats.skipped > 0 && (
                  <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-200">
                    ⏭ {activeStats.skipped} Skipped
                  </span>
                )}
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-600 font-medium">
                <span>
                  Queue Position:{" "}
                  <strong className="text-[#132238]">
                    {activeCampaign.currentIndex + 1} of {activeStats.total}
                  </strong>
                </span>
                <span>
                  {Math.round(
                    ((activeStats.markedSent + activeStats.skipped) /
                      Math.max(1, activeStats.total)) *
                      100
                  )}
                  % Completed
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{
                    width: `${(activeStats.markedSent / Math.max(1, activeStats.total)) * 100}%`,
                  }}
                  title={`Marked as sent: ${activeStats.markedSent}`}
                />
                <div
                  className="bg-blue-400 h-full transition-all duration-300"
                  style={{
                    width: `${(activeStats.opened / Math.max(1, activeStats.total)) * 100}%`,
                  }}
                  title={`Opened: ${activeStats.opened}`}
                />
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{
                    width: `${(activeStats.skipped / Math.max(1, activeStats.total)) * 100}%`,
                  }}
                  title={`Skipped: ${activeStats.skipped}`}
                />
              </div>
            </div>
          </div>

          {/* Popup Blocked Alert Banner */}
          {popupBlocked && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-3 animate-pulse">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-bold">Browser Blocked the WhatsApp Popup!</p>
                <p className="text-[11px] mt-0.5">
                  Your browser blocked opening WhatsApp in a new tab. Please click the direct button below or allow popups for this site.
                </p>
                {lastOpenedUrl && (
                  <a
                    href={lastOpenedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 px-3 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700 text-[11px]"
                  >
                    Click to Open WhatsApp Manually ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Current Participant Card */}
          {currentParticipant ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Columns: Recipient Card & Big Action Controls */}
              <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-6 shadow-2xs space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Current Recipient ({activeCampaign.currentIndex + 1} / {activeStats.total})
                    </span>
                    <h3 className="text-2xl font-black text-[#132238] mt-0.5">
                      {currentParticipant.name}
                    </h3>
                    <p className="font-mono text-xs text-amber-700 font-bold">
                      {currentParticipant.registrationId}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      currentParticipant.status === "MARKED_SENT"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : currentParticipant.status === "OPENED"
                        ? "bg-blue-50 text-blue-800 border-blue-300"
                        : currentParticipant.status === "SKIPPED"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    Status: {currentParticipant.status}
                  </span>
                </div>

                {/* Recipient Details Pill Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl text-xs">
                  <div>
                    <span className="text-gray-400 text-[10px] block font-medium">Mobile Number</span>
                    <span className="font-mono font-bold text-gray-800">
                      {formatMobileDisplay(currentParticipant.mobile)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] block font-medium">Department</span>
                    <span className="font-bold text-gray-800">{currentParticipant.department}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] block font-medium">District</span>
                    <span className="font-bold text-gray-800">
                      {currentParticipant.district || "Calicut"}
                    </span>
                  </div>
                </div>

                {/* PRIMARY ONE-CLICK ACTION: Open WhatsApp */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="w-full h-14 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-sm sm:text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.974.57 1.956.887 3.25.887h.005c3.181 0 5.767-2.587 5.768-5.766.001-3.182-2.585-5.768-5.767-5.768zm0 10.365c-1.144 0-2.063-.3-2.903-.8l-.208-.124-1.579.414.421-1.54-.136-.216c-.544-.866-.867-1.803-.866-2.833 0-2.617 2.129-4.746 4.747-4.746 1.267 0 2.458.494 3.354 1.39 1.002.998 1.488 2.19 1.487 3.456-.001 2.618-2.13 4.747-4.748 4.747z" />
                    </svg>
                    <span>Open WhatsApp & Continue</span>
                    <span className="text-xs opacity-90 font-normal">↗</span>
                  </button>

                  <p className="text-[11px] text-gray-500 text-center">
                    This prepares the prefilled chat in WhatsApp Web/Desktop. Press <strong>Send</strong> manually in WhatsApp, then choose an action below.
                  </p>
                </div>

                {/* POST-OPEN ADVANCE CHOICES */}
                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <span className="text-[11px] font-bold text-gray-700 block">
                    Step 2: Record Result & Advance to Next
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() =>
                        updateParticipantStatus(currentParticipant.participantId, "MARKED_SENT", true)
                      }
                      className="h-11 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>✓ Marked as Sent</span>
                    </button>

                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() =>
                        updateParticipantStatus(currentParticipant.participantId, "SKIPPED", true)
                      }
                      className="h-11 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>⏭ Skip</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="h-11 px-3 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>🔄 Retry Opening</span>
                    </button>
                  </div>
                </div>

                {/* Previous & Next Navigation */}
                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    disabled={activeCampaign.currentIndex <= 0}
                    onClick={() => handleJumpToIndex(activeCampaign.currentIndex - 1)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                  >
                    ← Previous
                  </button>

                  <span className="text-gray-400 text-[11px]">
                    Item {activeCampaign.currentIndex + 1} of {activeCampaign.participants.length}
                  </span>

                  <button
                    type="button"
                    disabled={
                      activeCampaign.currentIndex >= activeCampaign.participants.length - 1
                    }
                    onClick={() => handleJumpToIndex(activeCampaign.currentIndex + 1)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Right 5 Columns: Personalized Message & Quick Jump List */}
              <div className="lg:col-span-5 space-y-4">
                {/* Message to be sent */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#132238]">Prefilled Message</span>
                    <span className="text-[10px] text-gray-400">
                      {currentMessageText.length} chars
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-[11px] text-gray-800 font-sans whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                    {currentMessageText}
                  </div>
                </div>

                {/* Queue Jump List */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-2.5">
                  <span className="text-xs font-bold text-[#132238] block">
                    Queue List ({activeCampaign.participants.length})
                  </span>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 text-xs">
                    {activeCampaign.participants.map((p, idx) => {
                      const isCurrent = idx === activeCampaign.currentIndex;
                      return (
                        <div
                          key={p.registrationId}
                          onClick={() => handleJumpToIndex(idx)}
                          className={`py-2 px-2.5 rounded-md flex items-center justify-between cursor-pointer transition-colors ${
                            isCurrent
                              ? "bg-amber-100/70 font-bold text-[#132238]"
                              : "hover:bg-gray-50 text-gray-600"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-[10px] font-mono text-gray-400 w-5">
                              #{idx + 1}
                            </span>
                            <span className="truncate max-w-[130px]">{p.name}</span>
                          </div>

                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                              p.status === "MARKED_SENT"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "OPENED"
                                ? "bg-blue-100 text-blue-800"
                                : p.status === "SKIPPED"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
              <p>No participant loaded in current queue.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: CAMPAIGNS HISTORY */}
      {activeTab === "campaigns" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#132238]">Campaign History & Resumes</h2>
              <p className="text-xs text-gray-500">
                Pick any saved or unfinished broadcast campaign to resume sending
              </p>
            </div>
            <button
              type="button"
              onClick={fetchCampaigns}
              className="text-xs text-[#132238] underline hover:text-[#C5A059]"
            >
              Refresh
            </button>
          </div>

          {isLoadingCampaigns ? (
            <div className="py-12 text-center text-gray-400 text-xs">Loading campaigns...</div>
          ) : campaignsList.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              No WhatsApp campaigns created yet. Start one from the <strong>Select & Compose</strong> tab!
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {campaignsList.map((c) => (
                <div
                  key={c._id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 p-2 rounded-xl transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-[#132238]">{c.title}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          c.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : c.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>Total: {c.totalCount}</span>
                      <span>·</span>
                      <span className="text-emerald-700 font-semibold">
                        ✓ {c.stats.markedSent} Sent
                      </span>
                      <span>·</span>
                      <span className="text-blue-700">↗ {c.stats.opened} Opened</span>
                      <span>·</span>
                      <span>⏳ {c.stats.pending} Pending</span>
                      <span>·</span>
                      <span>{new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadCampaign(c._id)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#132238] hover:bg-[#1a2f4c] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Resume Queue →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION MODAL BEFORE LAUNCHING QUEUE */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-lg font-bold text-[#132238]">Start WhatsApp Campaign?</h3>
              <p className="text-xs text-gray-500 mt-1">
                You are about to queue <strong>{selectedIds.size} participants</strong> for standard WhatsApp Click-to-Chat delivery.
              </p>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs space-y-1.5 text-gray-700">
              <p>
                • <strong>Recipients:</strong> {selectedIds.size} participants (Limit: 500)
              </p>
              <p>
                • <strong>Method:</strong> Free Click-to-Chat (`https://wa.me/`)
              </p>
              <p>
                • <strong>Sending:</strong> One by one. You will click &quot;Open WhatsApp&quot; and manually press Send for each participant.
              </p>
              <p className="text-gray-500 text-[11px] pt-1">
                All progress is saved in MongoDB. You can pause or resume anytime.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isStartingCampaign}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isStartingCampaign}
                onClick={handleStartCampaign}
                className="px-5 py-2 bg-[#132238] hover:bg-[#1a2f4c] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isStartingCampaign ? "Preparing..." : "Confirm & Launch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
