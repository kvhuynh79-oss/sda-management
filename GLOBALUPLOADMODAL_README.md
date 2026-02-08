# GlobalUploadModal Component

## Overview
A comprehensive, production-ready document upload modal for MySDAManager with drag-drop support, smart category routing, and automatic compliance certification creation.

## Location
`src/components/GlobalUploadModal.tsx`

## Features

### 1. File Upload
- Drag & drop interface with visual feedback
- Click to browse fallback
- File type validation (PDF, Word, Excel, PNG, JPG)
- 50MB file size limit
- File preview with size display

### 2. Smart Routing (4 Categories)
- **Property** - Links document to a specific property
- **Participant** - Links document to NDIS participant
- **Compliance** - Organisation-wide certifications
- **Office** - General admin documents

### 3. Dynamic Entity Linking
- **Property**: Dropdown of all properties (shows address)
- **Participant**: Dropdown of all participants (shows name + NDIS number)
- **Compliance**: Optional property link + required expiry date
- **Office/Admin**: No entity linking required

### 4. Automatic Compliance Certification
When uploading compliance documents with expiry dates, the system automatically:
- Creates compliance certification record
- Links to property (if specified)
- Generates alerts for expiring certifications
- Tracks audit outcome and renewal

Compliance document types that trigger auto-creation:
- Fire Safety Certificate
- Building Compliance Certificate
- NDIS Practice Standards Cert
- SDA Design Certificate
- SDA Registration Cert
- NDIS Worker Screening

### 5. Invoice Processing
Conditional invoice fields shown for invoice/receipt/quote types:
- Invoice Number
- Invoice Date
- Amount (with $ prefix)
- Vendor
- Paid checkbox

### 6. Accessibility
- Full keyboard navigation
- ARIA labels and roles
- Focus management
- Screen reader support
- WCAG 2.1 AA compliant

## Usage

### Basic Usage

```tsx
import { useState } from "react";
import GlobalUploadModal from "@/components/GlobalUploadModal";

function MyPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Upload Document
      </button>

      <GlobalUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          console.log("Document uploaded successfully!");
          setIsModalOpen(false);
        }}
      />
    </>
  );
}
```

### Pre-filled Category & Entity

```tsx
<GlobalUploadModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  prefillCategory="property"
  prefillEntityId={propertyId}
  onSuccess={() => {
    // Refresh document list
    refetchDocuments();
    setIsModalOpen(false);
  }}
/>
```

### From Property Detail Page

```tsx
// In src/app/properties/[id]/page.tsx
const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

// In JSX:
<button onClick={() => setIsUploadModalOpen(true)}>
  Upload Property Document
</button>

<GlobalUploadModal
  isOpen={isUploadModalOpen}
  onClose={() => setIsUploadModalOpen(false)}
  prefillCategory="property"
  prefillEntityId={propertyId}
  onSuccess={() => {
    // Optionally refresh property documents
    router.refresh();
  }}
/>
```

### From Participant Detail Page

```tsx
<GlobalUploadModal
  isOpen={isUploadModalOpen}
  onClose={() => setIsUploadModalOpen(false)}
  prefillCategory="participant"
  prefillEntityId={participantId}
  onSuccess={() => {
    console.log("Participant document uploaded");
  }}
/>
```

## Props Interface

```typescript
interface GlobalUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillCategory?: "property" | "participant" | "organisation" | "dwelling" | "owner";
  prefillEntityId?: string;  // Pre-select the entity in dropdown
  onSuccess?: () => void;    // Called after successful upload
}
```

## Document Types Available

### Participant Documents
- NDIS Plan
- Accommodation Agreement
- SDA Quotation
- Centrepay Consent

### Property Documents
- Lease
- Fire Safety Certificate
- Building Compliance Certificate
- SDA Design Certificate

### Insurance Documents
- Public Liability Insurance
- Professional Indemnity Insurance
- Building Insurance
- Workers Compensation Insurance

### Compliance/Certification
- NDIS Practice Standards Cert
- SDA Registration Cert
- NDIS Worker Screening

### General
- Invoice
- Receipt
- Quote
- Report
- Other

## Validation Rules

1. File must be selected
2. Category must be selected
3. For Property/Participant categories: Entity must be selected
4. For Compliance category: Expiry date is required
5. File type must be in accepted list
6. File size must be under 50MB

## Backend Integration

The component uses these Convex mutations:

```typescript
// Generate upload URL
const uploadUrl = await generateUploadUrl();

// Create document record
await createDocument({
  fileName: string,
  fileSize: number,
  fileType: string,
  storageId: Id<"_storage">,
  documentType: DocumentType,
  documentCategory: DocumentCategory,
  linkedParticipantId?: Id<"participants">,
  linkedPropertyId?: Id<"properties">,
  description?: string,
  expiryDate?: string,
  invoiceNumber?: string,
  invoiceDate?: string,
  invoiceAmount?: number,
  vendor?: string,
  isPaid?: boolean,
  uploadedBy: Id<"users">,
});
```

## Styling
- Dark theme (bg-gray-900, bg-gray-800)
- Blue accents (blue-500, blue-600)
- Consistent with MySDAManager design system
- Responsive grid layouts
- Mobile-optimized dropdowns

## Future Enhancements
1. Multi-file upload support
2. Progress bar for large files
3. OCR text extraction for scanned documents
4. Document preview before upload
5. Template document library
6. Bulk upload via CSV
7. Document version control

## Files Modified
- Created: `src/components/GlobalUploadModal.tsx`
- Fixed: `convex/documents.ts` (certification auto-creation params)
- Fixed: `src/app/documents/new/page.tsx` (removed invalid userId param)
- Fixed: `src/app/documents/page.tsx` (stats display)

## Build Status
✅ Production build passes (68 pages, 0 errors)

## Next Steps
1. Add upload button to Header for global access
2. Integrate into property detail pages
3. Integrate into participant detail pages
4. Add keyboard shortcut (Cmd+U / Ctrl+U)
5. Add to onboarding flow for new participant documents
