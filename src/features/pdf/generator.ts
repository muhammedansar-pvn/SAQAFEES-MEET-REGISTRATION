import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import { EVENT_CONFIG } from "@/config/event.config";

interface PassDetails {
  registrationId: string;
  name: string;
  place: string;
  shuhba: string;
  qrDataUrl: string;
}

let cachedBgBase64: string | null = null;

function getPosterBase64(): string | null {
  if (cachedBgBase64) return cachedBgBase64;
  try {
    const imgPath = path.join(process.cwd(), "public", "images", "pass-bg.png");
    if (fs.existsSync(imgPath)) {
      cachedBgBase64 = "data:image/png;base64," + fs.readFileSync(imgPath).toString("base64");
      return cachedBgBase64;
    }
  } catch (err) {
    console.error("Failed to load pass background image", err);
  }
  return null;
}

/**
 * Generates a clean, professional vector PDF pass for Saqafees Meet 2026.
 * Styled with the official event poster background and verified QR code pass badge.
 */
export function generatePdfPass(details: PassDetails): Uint8Array {
  // A5 Portrait (148 x 210 mm)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5",
  });

  const pageWidth = 148;
  const pageHeight = 210;
  const posterBg = getPosterBase64();

  if (posterBg) {
    // 1. Full-bleed official event poster background
    doc.addImage(posterBg, "PNG", 0, 0, pageWidth, pageHeight);

    // 2. Verified Participant Pass Card overlay (centered in open mid-section)
    const cardWidth = 106;
    const cardHeight = 70;
    const cardX = (pageWidth - cardWidth) / 2;
    const cardY = 77;

    // Card background with clean white fill and gold border
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(197, 160, 89);
    doc.setLineWidth(0.6);
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3.5, 3.5, "FD");

    // Participant Name
    doc.setTextColor(19, 34, 56);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(details.name.toUpperCase(), pageWidth / 2, cardY + 8, { align: "center" });

    // Registration ID
    doc.setTextColor(180, 130, 40);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(details.registrationId, pageWidth / 2, cardY + 13.5, { align: "center" });

    // Scannable High-Res QR Code
    const qrSize = 38;
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = cardY + 16;
    doc.addImage(details.qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // Department & Place
    doc.setTextColor(19, 34, 56);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(
      `${details.shuhba}  |  ${details.place.toUpperCase()}`,
      pageWidth / 2,
      cardY + 59,
      { align: "center" }
    );

    // Gate Instruction
    doc.setTextColor(130, 140, 150);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text("OFFICIAL ENTRY PASS · SCAN AT GATE FOR CHECK-IN", pageWidth / 2, cardY + 64, {
      align: "center",
    });
  } else {
    // Fallback vector pass design
    doc.setFillColor(253, 251, 247);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    doc.setFillColor(15, 27, 43);
    doc.rect(0, 0, pageWidth, 42, "F");

    doc.setFillColor(197, 160, 89);
    doc.rect(0, 42, pageWidth, 2.5, "F");

    doc.setTextColor(253, 251, 247);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("LIQAA' - 2025 SAQAFEES MEET", pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(197, 160, 89);
    doc.text("EVENT REGISTRATION & ENTRY PASS", pageWidth / 2, 28, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(200, 205, 215);
    doc.text(
      `${EVENT_CONFIG.dateFormatted} | ${EVENT_CONFIG.timeFormatted} IST | ${EVENT_CONFIG.venue}`,
      pageWidth / 2,
      35,
      { align: "center" }
    );

    // Participant Card Frame
    doc.setDrawColor(197, 160, 89);
    doc.setLineWidth(0.6);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, 52, pageWidth - 24, 72, 4, 4, "FD");

    doc.setFillColor(15, 27, 43);
    doc.rect(13, 53, pageWidth - 26, 8, "F");
    doc.setTextColor(253, 251, 247);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("PARTICIPANT DETAILS", 16, 58.5);

    doc.setTextColor(197, 160, 89);
    doc.text(`ID: ${details.registrationId}`, pageWidth - 16, 58.5, { align: "right" });

    doc.setTextColor(100, 110, 125);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("NAME:", 18, 70);

    doc.setTextColor(15, 27, 43);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(details.name.toUpperCase(), 18, 77);

    doc.setTextColor(100, 110, 125);
    doc.setFontSize(8);
    doc.text("PLACE:", 18, 88);

    doc.setTextColor(15, 27, 43);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(details.place, 18, 95);

    doc.setTextColor(100, 110, 125);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("SHUHBA (DEPARTMENT):", 18, 106);

    doc.setTextColor(27, 77, 62);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(details.shuhba, 18, 113);

    const qrSize = 46;
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = 130;

    doc.setDrawColor(220, 225, 235);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 3, 3, "FD");

    doc.addImage(details.qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    doc.setTextColor(15, 27, 43);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("SCAN FOR EVENT CHECK-IN", pageWidth / 2, qrY + qrSize + 9, { align: "center" });
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
