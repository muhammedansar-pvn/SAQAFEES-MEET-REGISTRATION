import { EVENT_CONFIG } from "@/config/event.config";

export interface DepartmentTarget {
  code: string;       // Canonical code in EVENT_CONFIG.shuhbaOptions (e.g. "ILMUL NAFS")
  name: string;       // Target name (e.g. "Nafs")
  target: number;     // Target registration count
  aliases: string[];  // Aliases for robust matching
}

/**
 * Official Saqafees Meet Department Targets
 * Total: 474
 */
export const DEPARTMENT_TARGETS: DepartmentTarget[] = [
  {
    code: "ILMUL NAFS",
    name: "Nafs",
    target: 94,
    aliases: ["ILMUL NAFS", "NAFS", "ILUMU NAFS", "ILM NAFS"],
  },
  {
    code: "SHAREEA",
    name: "Shareea",
    target: 86,
    aliases: ["SHAREEA", "SHARIA", "SHAREE'A", "SHARIAH"],
  },
  {
    code: "ILMUL IDARA",
    name: "Idara",
    target: 85,
    aliases: ["ILMUL IDARA", "IDARA", "IMUL IDARA", "ILM IDARA"],
  },
  {
    code: "HADEES",
    name: "Hadees",
    target: 71,
    aliases: ["HADEES", "HADITH", "HADIS"],
  },
  {
    code: "THAFSEER",
    name: "Thafseer",
    target: 67,
    aliases: ["THAFSEER", "TAFSEER", "THAFSIR"],
  },
  {
    code: "WIRAS",
    name: "Wiras",
    target: 49,
    aliases: ["WIRAS", "VIRAS", "VEERAS"],
  },
  {
    code: "THAKHASSUS",
    name: "Thq",
    target: 18,
    aliases: ["THAKHASSUS", "THQ", "TAKHAZZUZ", "TAKHAZUZ"],
  },
  {
    code: "LUGA ARABIC",
    name: "Luga",
    target: 4,
    aliases: ["LUGA ARABIC", "LUGA", "LUGHA", "LUGHA ARABIC", "ARABIC"],
  },
];

export const TOTAL_DEPARTMENT_TARGET = 474;

export interface DepartmentProgressItem {
  code: string;               // e.g. "ILMUL NAFS"
  name: string;               // e.g. "Nafs"
  displayName: string;        // e.g. "ILMUL NAFS (Nafs)"
  target: number;             // Target count
  registeredCount: number;    // Number of registered participants
  checkedInCount: number;     // Number of checked-in participants
  remaining: number;          // Target - Registered (minimum 0)
  completionPercentage: number; // (Registered / Target) * 100, rounded to 1 decimal
  rawPercentage: number;      // Exact float for deterministic sorting
  visualPercentage: number;   // Visual bar width, capped at 100%
  isExceeded: boolean;        // True if registeredCount > target
}

export interface OverallProgress {
  totalTarget: number;
  totalRegistered: number;
  totalCheckedIn: number;
  totalRemaining: number;
  completionPercentage: number;
  visualPercentage: number;
}

/**
 * Normalizes any department string by trimming, uppercasing, and removing special characters.
 */
export function normalizeDepartmentKey(raw: string): string {
  if (!raw) return "";
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Maps a department name or alias to its official target configuration.
 * Avoids duplicate departments by resolving aliases to the canonical department.
 */
export function matchDepartmentTarget(departmentInput: string): DepartmentTarget | undefined {
  if (!departmentInput) return undefined;
  const normalized = normalizeDepartmentKey(departmentInput);

  for (const dept of DEPARTMENT_TARGETS) {
    if (normalizeDepartmentKey(dept.code) === normalized) return dept;
    if (normalizeDepartmentKey(dept.name) === normalized) return dept;
    for (const alias of dept.aliases) {
      if (normalizeDepartmentKey(alias) === normalized) return dept;
    }
  }

  return undefined;
}

export type InputDepartmentCounts =
  | Record<string, { total?: number; count?: number; checkedIn?: number }>
  | Array<{ _id: string; count?: number; total?: number; checkedIn?: number }>;

/**
 * Calculates department-wise registration progress from raw registration aggregation or stats map.
 * 
 * Requirements handled:
 * 1. Calculate number of registered participants per department using shuhba.
 * 2. Completion Percentage = (Registered Count / Department Target) * 100.
 * 3. Returns name, registered / target, remaining, completion percentage, visual progress.
 * 4. Sorts descending by completion percentage (highest first).
 * 5. Handles zero targets safely.
 * 6. Caps visual progress at 100% while reporting actual percentage if exceeded.
 * 7. Includes all official departments even if missing from input (0 registrations).
 */
export function calculateDepartmentProgress(input: InputDepartmentCounts): {
  departments: DepartmentProgressItem[];
  overall: OverallProgress;
} {
  // 1. Convert input to a normalized lookup map
  const countsByCode: Record<string, { registered: number; checkedIn: number }> = {};

  // Initialize for all official codes
  for (const dept of DEPARTMENT_TARGETS) {
    countsByCode[dept.code] = { registered: 0, checkedIn: 0 };
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      if (!item || !item._id) continue;
      const matched = matchDepartmentTarget(item._id);
      const regCount = Number(item.count ?? item.total ?? 0);
      const chkCount = Number(item.checkedIn ?? 0);

      if (matched) {
        countsByCode[matched.code].registered += regCount;
        countsByCode[matched.code].checkedIn += chkCount;
      }
    }
  } else if (input && typeof input === "object") {
    for (const [key, val] of Object.entries(input)) {
      if (!key || !val) continue;
      const matched = matchDepartmentTarget(key);
      const regCount = Number(val.count ?? val.total ?? 0);
      const chkCount = Number(val.checkedIn ?? 0);

      if (matched) {
        countsByCode[matched.code].registered += regCount;
        countsByCode[matched.code].checkedIn += chkCount;
      }
    }
  }

  // 2. Build progress item for every official department
  const departments: DepartmentProgressItem[] = DEPARTMENT_TARGETS.map((dept) => {
    const data = countsByCode[dept.code] || { registered: 0, checkedIn: 0 };
    const registeredCount = Math.max(0, data.registered);
    const checkedInCount = Math.max(0, data.checkedIn);
    const target = dept.target;

    // Remaining registrations
    const remaining = Math.max(0, target - registeredCount);

    // Completion percentage calculation
    // Completion Percentage = (Registered Count / Department Target) * 100
    // Safe division for zero target
    const rawPercentage = target > 0 ? (registeredCount / target) * 100 : 0;
    const completionPercentage = Math.round(rawPercentage * 10) / 10; // e.g. 47.9%

    // Visual progress bar capped at 100%
    const visualPercentage = Math.min(100, Math.max(0, completionPercentage));
    const isExceeded = registeredCount > target;

    // Display name showing existing department code and friendly target name
    const displayName =
      dept.code === dept.name.toUpperCase()
        ? dept.code
        : `${dept.code} (${dept.name})`;

    return {
      code: dept.code,
      name: dept.name,
      displayName,
      target,
      registeredCount,
      checkedInCount,
      remaining,
      completionPercentage,
      rawPercentage,
      visualPercentage,
      isExceeded,
    };
  });

  // 3. Sort departments in DESCENDING order by completion percentage (highest first)
  departments.sort((a, b) => {
    if (b.rawPercentage !== a.rawPercentage) {
      return b.rawPercentage - a.rawPercentage;
    }
    // Secondary tie-breaker: higher target first, then alphabetical by code
    if (b.target !== a.target) {
      return b.target - a.target;
    }
    return a.code.localeCompare(b.code);
  });

  // 4. Calculate overall progress
  const totalTarget = TOTAL_DEPARTMENT_TARGET;
  const totalRegistered = departments.reduce((acc, d) => acc + d.registeredCount, 0);
  const totalCheckedIn = departments.reduce((acc, d) => acc + d.checkedInCount, 0);
  const totalRemaining = Math.max(0, totalTarget - totalRegistered);
  const overallRaw = totalTarget > 0 ? (totalRegistered / totalTarget) * 100 : 0;
  const overallPercentage = Math.round(overallRaw * 10) / 10;
  const overallVisual = Math.min(100, Math.max(0, overallPercentage));

  const overall: OverallProgress = {
    totalTarget,
    totalRegistered,
    totalCheckedIn,
    totalRemaining,
    completionPercentage: overallPercentage,
    visualPercentage: overallVisual,
  };

  return { departments, overall };
}

/**
 * Formats a list of department participants into a clean WhatsApp-friendly text list.
 *
 * Example:
 * *HADEES*
 * 1. Muhammed Ansar — Tirur
 * 2. Abdul Rahman — Paravanna
 * 3. Ameen — Kozhikode
 *
 * Requirements:
 * - Only participant name and place (No mobile number, ID, stats, or other fields).
 * - Department name as heading wrapped in asterisks (*NAME*).
 * - Sequential numbering starting at 1.
 * - Em-dash separator: "Name — Place".
 * - Trim whitespace and handle missing name or place gracefully without undefined/null.
 */
export function formatDepartmentParticipantsText(
  departmentName: string,
  participants: Array<{ name?: string | null; place?: string | null }>
): string {
  const cleanHeading = (departmentName || "").trim().toUpperCase();
  const heading = `*${cleanHeading}*`;

  if (!participants || participants.length === 0) {
    return `${heading}\n_(No registered participants yet)_`;
  }

  const lines = participants.map((p, idx) => {
    const num = idx + 1;
    const name = (p?.name || "").trim();
    const place = (p?.place || "").trim();

    if (name && place) {
      return `${num}. ${name} — ${place}`;
    }
    if (name) {
      return `${num}. ${name}`;
    }
    if (place) {
      return `${num}. ${place}`;
    }
    return `${num}. Participant`;
  });

  return `${heading}\n${lines.join("\n")}`;
}
