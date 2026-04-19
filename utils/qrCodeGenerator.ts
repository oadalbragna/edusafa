/**
 * QR Code Generator Utility - أداة توليد رمز QR
 * 
 * Generates QR code data URL from text
 */

/**
 * Generate QR code as SVG data URL
 * Uses a simple QR code algorithm or API
 */
export function generateQRCodeURL(text: string): string {
  // Use QR Server API for reliable QR code generation
  const size = 200;
  const encodedText = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}&bgcolor=ffffff&color=000000&margin=10`;
}

/**
 * Generate QR code as canvas
 */
export function generateQRCodeCanvas(text: string, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Use QR Server API to load image
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = generateQRCodeURL(text);
}

/**
 * Get QR code data for parent linking
 */
export function getParentQRCodeData(studentUid: string, inviteCode: string, studentName: string): string {
  return JSON.stringify({
    type: 'parent_invite',
    code: inviteCode,
    uid: studentUid,
    name: studentName,
    timestamp: Date.now()
  });
}

export const QRCodeGenerator = {
  generateQRCodeURL,
  generateQRCodeCanvas,
  getParentQRCodeData
};

export default QRCodeGenerator;
