interface ComplaintData {
  _id: string;
  referenceNumber?: string;
  complainantType: string;
  complainantName?: string;
  category: string;
  severity: string;
  status: string;
  source?: string;
  receivedDate: string;
  acknowledgedDate?: string;
  acknowledgmentMethod?: string;
  resolutionDate?: string;
  resolutionDescription?: string;
  resolutionOutcome?: string;
  complainantSatisfied?: boolean;
  escalatedToNdisCommission?: boolean;
  escalationDate?: string;
  systemicIssueIdentified?: boolean;
  correctiveActionsTaken?: string;
  description: string;
  daysOpen: number;
  daysToAcknowledge: number | null;
  daysToResolve: number | null;
  participant?: { firstName: string; lastName: string } | null;
  property?: { addressLine1?: string; suburb?: string } | null;
  receivedByUser?: { firstName: string; lastName: string } | null;
  assignedToUser?: { firstName: string; lastName: string } | null;
}

function escapeField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatLabel(str: string): string {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateAU(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

const HEADERS = [
  "Reference Number",
  "Received Date",
  "Complainant Type",
  "Complainant Name",
  "Category",
  "Severity",
  "Status",
  "Source",
  "Acknowledged Date",
  "Ack Method",
  "Days to Acknowledge",
  "Resolution Date",
  "Days to Resolve",
  "Outcome",
  "Description",
  "Participant",
  "Property",
  "Received By",
  "Assigned To",
  "Complainant Satisfied",
  "Escalated to NDIS Commission",
  "Escalation Date",
  "Systemic Issue",
  "Corrective Actions",
  "Days Open",
];

export function generateComplaintsRegisterCsv(complaints: ComplaintData[]): void {
  const rows: string[][] = [HEADERS];

  for (const c of complaints) {
    rows.push([
      c.referenceNumber || "",
      formatDateAU(c.receivedDate),
      formatLabel(c.complainantType),
      c.complainantName || "Anonymous",
      formatLabel(c.category),
      formatLabel(c.severity),
      formatLabel(c.status),
      c.source ? formatLabel(c.source) : "",
      c.acknowledgedDate ? formatDateAU(c.acknowledgedDate) : "",
      c.acknowledgmentMethod ? formatLabel(c.acknowledgmentMethod) : "",
      c.daysToAcknowledge !== null ? String(c.daysToAcknowledge) : "",
      c.resolutionDate ? formatDateAU(c.resolutionDate) : "",
      c.daysToResolve !== null ? String(c.daysToResolve) : "",
      c.resolutionOutcome ? formatLabel(c.resolutionOutcome) : "",
      c.description,
      c.participant ? `${c.participant.firstName} ${c.participant.lastName}` : "",
      c.property ? `${c.property.addressLine1 || ""} ${c.property.suburb || ""}`.trim() : "",
      c.receivedByUser ? `${c.receivedByUser.firstName} ${c.receivedByUser.lastName}` : "",
      c.assignedToUser ? `${c.assignedToUser.firstName} ${c.assignedToUser.lastName}` : "",
      c.complainantSatisfied === true ? "Yes" : c.complainantSatisfied === false ? "No" : "",
      c.escalatedToNdisCommission ? "Yes" : "No",
      c.escalationDate ? formatDateAU(c.escalationDate) : "",
      c.systemicIssueIdentified ? "Yes" : "No",
      c.correctiveActionsTaken || "",
      String(c.daysOpen),
    ]);
  }

  const csv = rows.map((row) => row.map(escapeField).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = `Complaints_Register_${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
