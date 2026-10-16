import QRCode from "qrcode";

/**
 * Returns the full verification URL embedded in the QR code.
 * Points to the secure verification endpoint.
 */
export function getVerificationUrl(rawVerificationToken: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/verify/${rawVerificationToken}`;
}

/**
 * Generates an inline Data URL (base64 PNG) for display in web views.
 */
export async function generateQrDataUrl(textOrUrl: string): Promise<string> {
  return QRCode.toDataURL(textOrUrl, {
    width: 360,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#0F1B2B", // Navy
      light: "#FFFFFF",
    },
  });
}

/**
 * Generates a high-resolution PNG Buffer suitable for printing and file download.
 */
export async function generateQrPngBuffer(textOrUrl: string): Promise<Buffer> {
  return QRCode.toBuffer(textOrUrl, {
    width: 800,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#0F1B2B",
      light: "#FFFFFF",
    },
  });
}
