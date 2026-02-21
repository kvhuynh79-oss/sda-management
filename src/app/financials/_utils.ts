/** Convert an image URL to a base64 data URL for PDF embedding. */
export async function loadLogoAsDataUrl(url: string): Promise<string | undefined> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    return await new Promise<string>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("No canvas context")); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = url;
    });
  } catch {
    return undefined;
  }
}

/** Format a date string (YYYY-MM-DD) into human-readable format (e.g. "19 Jan 2026"). */
export function formatInvoiceDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

/** Format amount as AUD currency. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
}
