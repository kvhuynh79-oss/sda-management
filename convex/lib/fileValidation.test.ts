import { describe, it, expect } from "vitest";
import { validateFileUpload, sanitizeFileName } from "./fileValidation";

// ---------------------------------------------------------------------------
// validateFileUpload
// ---------------------------------------------------------------------------
describe("validateFileUpload", () => {
  // -------------------------------------------------------------------------
  // Valid uploads
  // -------------------------------------------------------------------------
  describe("valid uploads", () => {
    it("accepts a PDF document", () => {
      const result = validateFileUpload("report.pdf", "application/pdf", 1024 * 1024, "document");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("accepts a Word document", () => {
      const result = validateFileUpload(
        "policy.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        500 * 1024,
        "document"
      );
      expect(result.valid).toBe(true);
    });

    it("accepts a JPEG image", () => {
      const result = validateFileUpload("photo.jpg", "image/jpeg", 2 * 1024 * 1024, "image");
      expect(result.valid).toBe(true);
    });

    it("accepts a PNG image", () => {
      const result = validateFileUpload("screenshot.png", "image/png", 1024 * 1024, "image");
      expect(result.valid).toBe(true);
    });

    it("accepts a video in 'any' context", () => {
      const result = validateFileUpload("clip.mp4", "video/mp4", 5 * 1024 * 1024, "any");
      expect(result.valid).toBe(true);
    });

    it("accepts an image in 'photo' context (maps to image)", () => {
      const result = validateFileUpload("photo.jpg", "image/jpeg", 2 * 1024 * 1024, "photo");
      expect(result.valid).toBe(true);
    });

    it("accepts a CSV file as document", () => {
      const result = validateFileUpload("data.csv", "text/csv", 1024, "document");
      expect(result.valid).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Blocked extensions
  // -------------------------------------------------------------------------
  describe("blocked extensions", () => {
    const blockedFiles = [
      { name: "virus.exe", mime: "application/octet-stream" },
      { name: "script.bat", mime: "application/octet-stream" },
      { name: "hack.sh", mime: "application/octet-stream" },
      { name: "malware.ps1", mime: "application/octet-stream" },
      { name: "inject.js", mime: "text/javascript" },
      { name: "backdoor.php", mime: "text/x-php" },
      { name: "shell.py", mime: "text/x-python" },
      { name: "attack.vbs", mime: "text/vbscript" },
      { name: "installer.msi", mime: "application/octet-stream" },
      { name: "library.dll", mime: "application/octet-stream" },
    ];

    for (const { name, mime } of blockedFiles) {
      it(`rejects ${name}`, () => {
        const result = validateFileUpload(name, mime, 1024, "any");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("not allowed");
      });
    }

    it("blocks extensions case-insensitively", () => {
      const result = validateFileUpload("VIRUS.EXE", "application/octet-stream", 1024, "any");
      expect(result.valid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // File size limits
  // -------------------------------------------------------------------------
  describe("file size limits", () => {
    it("rejects files exceeding 10MB for documents", () => {
      const result = validateFileUpload(
        "large.pdf",
        "application/pdf",
        11 * 1024 * 1024,
        "document"
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("10MB");
    });

    it("rejects images exceeding 5MB", () => {
      const result = validateFileUpload(
        "huge.jpg",
        "image/jpeg",
        6 * 1024 * 1024,
        "image"
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("5MB");
    });

    it("rejects empty files (0 bytes)", () => {
      const result = validateFileUpload("empty.pdf", "application/pdf", 0, "document");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("empty");
    });

    it("rejects negative file size", () => {
      const result = validateFileUpload("negative.pdf", "application/pdf", -1, "document");
      expect(result.valid).toBe(false);
    });

    it("accepts file at exactly 10MB for documents", () => {
      const result = validateFileUpload(
        "exact.pdf",
        "application/pdf",
        10 * 1024 * 1024,
        "document"
      );
      expect(result.valid).toBe(true);
    });

    it("accepts file at exactly 5MB for images", () => {
      const result = validateFileUpload(
        "exact.jpg",
        "image/jpeg",
        5 * 1024 * 1024,
        "image"
      );
      expect(result.valid).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // MIME type validation
  // -------------------------------------------------------------------------
  describe("MIME type validation", () => {
    it("rejects executable MIME type for document context", () => {
      const result = validateFileUpload(
        "file.pdf",
        "application/x-executable",
        1024,
        "document"
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    it("rejects video MIME type for image context", () => {
      const result = validateFileUpload("file.mp4", "video/mp4", 1024, "image");
      expect(result.valid).toBe(false);
    });

    it("rejects image MIME type for document context", () => {
      const result = validateFileUpload("file.jpg", "image/jpeg", 1024, "document");
      expect(result.valid).toBe(false);
    });

    it("accepts all allowed types in 'any' context", () => {
      // Document type in any context
      expect(validateFileUpload("f.pdf", "application/pdf", 1024, "any").valid).toBe(true);
      // Image type in any context
      expect(validateFileUpload("f.jpg", "image/jpeg", 1024, "any").valid).toBe(true);
      // Video type in any context
      expect(validateFileUpload("f.mp4", "video/mp4", 1024, "any").valid).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Default context
  // -------------------------------------------------------------------------
  describe("default context", () => {
    it("defaults to 'any' context when not specified", () => {
      const result = validateFileUpload("file.pdf", "application/pdf", 1024);
      expect(result.valid).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// sanitizeFileName
// ---------------------------------------------------------------------------
describe("sanitizeFileName", () => {
  it("removes path traversal sequences", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("etc/passwd");
  });

  it("replaces special characters with underscores", () => {
    const result = sanitizeFileName('file<name>:test"path.pdf');
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
    expect(result).not.toContain(":");
    expect(result).not.toContain('"');
  });

  it("truncates to 255 characters", () => {
    const longName = "a".repeat(300) + ".pdf";
    const result = sanitizeFileName(longName);
    expect(result.length).toBeLessThanOrEqual(255);
  });

  it("preserves normal file names", () => {
    expect(sanitizeFileName("document.pdf")).toBe("document.pdf");
    expect(sanitizeFileName("my-file_v2.docx")).toBe("my-file_v2.docx");
  });

  it("handles empty string", () => {
    expect(sanitizeFileName("")).toBe("");
  });

  it("removes backslash path separators", () => {
    const result = sanitizeFileName("C:\\Users\\file.pdf");
    expect(result).not.toContain("\\");
  });
});
