import { jsPDF } from "jspdf";
import { EVENT_CONFIG } from "@/config/event.config";

interface PassDetails {
  registrationId: string;
  name: string;
  place: string;
  shuhba: string;
  qrDataUrl: string;
}

/**
 * Generates a clean, professional vector PDF pass for Saqafees Meet 2026.
 * Styled with Deep Navy Blue (#0F1B2B), Gold (#C5A059), and White.
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

  // Background
  doc.setFillColor(253, 251, 247); // Warm cream
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Top Navy Header Banner
  doc.setFillColor(15, 27, 43); // Navy #0F1B2B
  doc.rect(0, 0, pageWidth, 42, "F");

  // Gold accent separator bar
  doc.setFillColor(197, 160, 89); // Gold #C5A059
  doc.rect(0, 42, pageWidth, 2.5, "F");

  // Header Title
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
  doc.text("Saturday, 21 November 2026 | 10:00 AM - 2:00 PM IST | Markaz", pageWidth / 2, 35, {
    align: "center",
  });

  // Participant Card Frame
  doc.setDrawColor(197, 160, 89);
  doc.setLineWidth(0.6);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, 52, pageWidth - 24, 72, 4, 4, "FD");

  // Participant Badge Header
  doc.setFillColor(15, 27, 43);
  doc.rect(13, 53, pageWidth - 26, 8, "F");
  doc.setTextColor(253, 251, 247);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("PARTICIPANT DETAILS", 16, 58.5);

  doc.setTextColor(197, 160, 89);
  doc.text(`ID: ${details.registrationId}`, pageWidth - 16, 58.5, { align: "right" });

  // Participant Details Grid
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

  doc.setTextColor(27, 77, 62); // Restrained Green
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(details.shuhba, 18, 113);

  // QR Code Box
  const qrSize = 46;
  const qrX = (pageWidth - qrSize) / 2;
  const qrY = 130;

  doc.setDrawColor(220, 225, 235);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 3, 3, "FD");

  // Insert QR Image
  doc.addImage(details.qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

  // Scan instruction
  doc.setTextColor(15, 27, 43);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("SCAN FOR EVENT CHECK-IN", pageWidth / 2, qrY + qrSize + 9, { align: "center" });

  // Entry Instructions Box
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(220, 225, 230);
  doc.roundedRect(12, 190, pageWidth - 24, 14, 2, 2, "FD");

  doc.setTextColor(100, 110, 125);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Please show this pass at the gate. Each pass is unique and allows single check-in.",
    pageWidth / 2,
    195,
    { align: "center" }
  );
  doc.text(
    "Venue: Markaz | Contact: " + EVENT_CONFIG.contact.phone,
    pageWidth / 2,
    200,
    { align: "center" }
  );

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
