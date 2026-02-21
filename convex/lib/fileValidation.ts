/**
 * Server-Side File Upload Validation (S6)
 *
 * Validates file uploads by checking file extension, MIME type, and size
 * before allowing storage. Prevents malicious file uploads.
 */

const ALLOWED_DOCUMENT_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
];

const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

const BLOCKED_EXTENSIONS = [
  ".exe", ".bat", ".sh", ".cmd", ".ps1", ".js", ".mjs",
  ".php", ".py", ".rb", ".com", ".scr", ".vbs", ".wsf",
  ".msi", ".dll", ".sys", ".reg", ".inf", ".hta",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a file upload based on file name, MIME type, and size.
 */
export function validateFileUpload(
  fileName: string,
  mimeType: string,
  fileSize: number,
  context: "document" | "image" | "photo" | "any" = "any"
): FileValidationResult {
  const effectiveContext = context === "photo" ? "image" : context;

  // 1. Check blocked extensions (case-insensitive)
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex >= 0) {
    const ext = fileName.toLowerCase().substring(dotIndex);
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: `File type ${ext} is not allowed.` };
    }
  }

  // 2. Check file size
  const maxSize = effectiveContext === "image" ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (fileSize > maxSize) {
    const limitMB = maxSize / (1024 * 1024);
    return { valid: false, error: `File exceeds ${limitMB}MB limit.` };
  }
  if (fileSize <= 0) {
    return { valid: false, error: "File is empty." };
  }

  // 3. Check MIME type against allowed list
  let allowed: string[];
  switch (effectiveContext) {
    case "image":
      allowed = ALLOWED_IMAGE_MIMES;
      break;
    case "document":
      allowed = ALLOWED_DOCUMENT_MIMES;
      break;
    case "any":
    default:
      allowed = [...ALLOWED_DOCUMENT_MIMES, ...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES];
      break;
  }

  if (!allowed.includes(mimeType)) {
    return {
      valid: false,
      error: `File type "${mimeType}" is not allowed. Accepted: ${allowed.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Sanitize a file name by removing path traversal and special characters.
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/\.\./g, "")
    .replace(/[<>:"\/\\|?*]/g, "_")
    .substring(0, 255);
}