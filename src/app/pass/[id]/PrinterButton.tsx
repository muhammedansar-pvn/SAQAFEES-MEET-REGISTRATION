"use client";

export function PrinterButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:border-gray-500 transition-colors cursor-pointer"
    >
      Print Pass
    </button>
  );
}
