"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Header from "@/components/Header";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Id } from "../../../convex/_generated/dataModel";
import { useOrganization } from "@/contexts/OrganizationContext";
import jsPDF from "jspdf";

// Types for AI parsing
interface ExtractedParticipant {
  firstName: string;
  lastName: string;
  ndisNumber: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface ExtractedPlan {
  planStartDate?: string;
  planEndDate?: string;
  sdaDesignCategory?: "improved_liveability" | "fully_accessible" | "robust" | "high_physical_support";
  sdaEligibilityType?: "standard" | "higher_needs";
  fundingManagementType?: "ndia_managed" | "plan_managed" | "self_managed";
  planManagerName?: string;
  planManagerEmail?: string;
  planManagerPhone?: string;
  annualSdaBudget?: number;
  supportItemNumber?: string;
}

interface ExtractedData {
  participant: ExtractedParticipant;
  plan: ExtractedPlan;
  confidence: number;
  warnings: string[];
  rawNotes: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { alert: alertDialog } = useConfirmDialog();
  const { organization } = useOrganization();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>("");
  const [selectedDwellingId, setSelectedDwellingId] = useState<string>("");
  const [proposedMoveInDate, setProposedMoveInDate] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRrcSettings, setShowRrcSettings] = useState(false);
  const [rrcFormData, setRrcFormData] = useState({
    dspFortnightlyRate: "1047.70",
    dspPercentage: "25",
    craFortnightlyRate: "230.80",
    craPercentage: "100",
  });
  const [showMtaSettings, setShowMtaSettings] = useState(false);
  const [mtaFormData, setMtaFormData] = useState({
    mtaDailyRate: "152.03",
    mtaSupportItemNumber: "01_082_0115_1_1",
  });
  const [mtaStartDate, setMtaStartDate] = useState("");
  const [mtaEndDate, setMtaEndDate] = useState("");
  const [mtaPlanManagerName, setMtaPlanManagerName] = useState("");
  const [mtaPlanManagerEmail, setMtaPlanManagerEmail] = useState("");

  // AI Import states
  const [showAiImport, setShowAiImport] = useState(false);
  const [aiImportStep, setAiImportStep] = useState<"upload" | "review" | "confirm">("upload");
  const [isParsing, setIsParsing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editedParticipant, setEditedParticipant] = useState<ExtractedParticipant | null>(null);
  const [editedPlan, setEditedPlan] = useState<ExtractedPlan | null>(null);
  const [selectedAiDwellingId, setSelectedAiDwellingId] = useState<string>("");
  const [aiMoveInDate, setAiMoveInDate] = useState<string>("");
  const [aiClaimDay, setAiClaimDay] = useState<string>("1");
  const [isCreating, setIsCreating] = useState(false);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  // AI actions
  const parseNdisPlanWithVision = useAction(api.aiParsing.parseNdisPlanWithVision);
  const createFromExtracted = useMutation(api.aiParsing.createFromExtracted);

  const participants = useQuery(
    api.participants.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const allDwellings = useQuery(api.dwellings.getAllWithAddresses, user ? { userId: user.id as Id<"users"> } : "skip");
  const providerSettings = useQuery(api.providerSettings.get, user ? { userId: user.id as Id<"users"> } : "skip");
  const rrcCalculation = useQuery(api.providerSettings.calculateRrc, user ? { userId: user.id as Id<"users"> } : "skip");
  const updateRrcRates = useMutation(api.providerSettings.updateRrcRates);
  const updateMtaSettings = useMutation(api.providerSettings.updateMtaSettings);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  useEffect(() => {
    if (providerSettings) {
      setRrcFormData({
        dspFortnightlyRate: String(providerSettings.dspFortnightlyRate || 1047.70),
        dspPercentage: String(providerSettings.dspPercentage || 25),
        craFortnightlyRate: String(providerSettings.craFortnightlyRate || 230.80),
        craPercentage: String(providerSettings.craPercentage || 100),
      });
    }
  }, [providerSettings]);

  useEffect(() => {
    if (providerSettings) {
      setMtaFormData({
        mtaDailyRate: String(providerSettings.mtaDailyRate || 152.03),
        mtaSupportItemNumber: providerSettings.mtaSupportItemNumber || "01_082_0115_1_1",
      });
    }
  }, [providerSettings]);

  const selectedParticipant = participants?.find(
    (p) => p._id === selectedParticipantId
  );

  const selectedDwelling = allDwellings?.find(
    (d) => d._id === selectedDwellingId
  );

  useEffect(() => {
    if (selectedParticipant) {
      // Try to get plan manager info from participant's plan
      const plan = (selectedParticipant as any).plan;
      if (plan?.planManagerName) setMtaPlanManagerName(plan.planManagerName);
      if (plan?.planManagerEmail) setMtaPlanManagerEmail(plan.planManagerEmail);
    }
  }, [selectedParticipant]);

  const handleSaveRrcSettings = async () => {
    try {
      await updateRrcRates({
        userId: user!.id as Id<"users">,
        dspFortnightlyRate: parseFloat(rrcFormData.dspFortnightlyRate),
        dspPercentage: parseFloat(rrcFormData.dspPercentage),
        craFortnightlyRate: parseFloat(rrcFormData.craFortnightlyRate),
        craPercentage: parseFloat(rrcFormData.craPercentage),
      });
      setShowRrcSettings(false);
    } catch (err) {
      console.error("Failed to save RRC settings:", err);
    }
  };

  const handleSaveMtaSettings = async () => {
    try {
      await updateMtaSettings({
        userId: user!.id as Id<"users">,
        mtaDailyRate: parseFloat(mtaFormData.mtaDailyRate),
        mtaSupportItemNumber: mtaFormData.mtaSupportItemNumber || undefined,
      });
      setShowMtaSettings(false);
    } catch (err) {
      console.error("Failed to save MTA settings:", err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const loadLogoAsBase64 = (logoUrl?: string): Promise<{ data: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve({ data: canvas.toDataURL("image/jpeg"), width: img.width, height: img.height });
        } else {
          reject(new Error("Could not get canvas context"));
        }
      };
      img.onerror = reject;
      img.src = logoUrl || "/Logo.jpg";
    });
  };

  const formatSdaCategory = (category: string) => {
    const categories: Record<string, string> = {
      improved_liveability: "Improved Liveability",
      fully_accessible: "Fully Accessible",
      robust: "Robust",
      high_physical_support: "High Physical Support",
    };
    return categories[category] || category;
  };

  const generateSdaQuotation = async () => {
    if (!selectedParticipant || !rrcCalculation) return;

    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 15;

      const dwelling = selectedParticipant.dwelling;
      const property = selectedParticipant.property;
      const sdaAmount = dwelling?.sdaRegisteredAmount || 0;

      // Load and add logo on left (max 45mm wide, 22mm tall, preserving aspect ratio)
      try {
        const logo = await loadLogoAsBase64(organization?.resolvedLogoUrl);
        const maxW = 45, maxH = 22;
        const ratio = Math.min(maxW / logo.width, maxH / logo.height);
        const w = logo.width * ratio;
        const h = logo.height * ratio;
        doc.addImage(logo.data, "JPEG", margin, y, w, h);
      } catch {
        console.log("Logo could not be loaded");
      }

      // Title on right - LETTER OF OFFER – SDA QUOTATION
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("LETTER OF OFFER –", pageWidth - margin, y + 8, { align: "right" });
      doc.text("SDA QUOTATION", pageWidth - margin, y + 16, { align: "right" });

      y += 35;

      // Date
      const today = new Date();
      const dateStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Date: ", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(dateStr, margin + 12, y);
      y += 6;

      // Letter of Offer for Specialist Disability Accommodation
      doc.setFont("helvetica", "bold");
      doc.text("Letter of Offer for Specialist Disability Accommodation", margin, y);
      y += 6;

      // Participant details
      doc.text("Participant: ", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedParticipant.firstName} ${selectedParticipant.lastName}`, margin + 25, y);
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.text("NDIS Number: ", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(selectedParticipant.ndisNumber, margin + 30, y);
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Address of Accommodation: ", margin, y);
      doc.setFont("helvetica", "normal");
      // Simple approach: Dwelling Number + Street Name (without number) + Suburb
      const quotationStreetName = property?.addressLine1?.replace(/^\d+\s*/, "") || property?.addressLine1;
      let addressText = "";
      if (dwelling?.dwellingName && property) {
        addressText = `${dwelling.dwellingName} ${quotationStreetName}, ${property.suburb}`;
      } else if (property) {
        addressText = `${property.addressLine1}, ${property.suburb}`;
      }
      doc.text(addressText, margin + 55, y);
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Dwelling Category: ", margin, y);
      doc.setFont("helvetica", "normal");
      const dwellingCategoryText = `${formatSdaCategory(dwelling?.sdaDesignCategory || "")} – ${dwelling?.dwellingType || "House"} ${dwelling?.maxParticipants || 3} residents with OOA`;
      doc.text(dwellingCategoryText, margin + 40, y);
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.text("Dwelling Enrolment Date: ", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(dwelling?.registrationDate || "TBC", margin + 48, y);
      y += 12;

      // Dear Mr/Ms Name
      doc.text(`Dear Mr ${selectedParticipant.lastName},`, margin, y);
      y += 8;

      // Body paragraph 1
      doc.setFontSize(11);
      // Use proposed move-in date if set, otherwise fall back to participant's move-in date
      const effectiveMoveInDate = proposedMoveInDate || selectedParticipant.moveInDate;
      const moveInDateFormatted = effectiveMoveInDate
        ? new Date(effectiveMoveInDate).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
        : "TBC";
      const orgDisplayName = providerSettings?.providerName || organization?.name || "MySDAManager";
      const para1 = `Congratulations! ${orgDisplayName} is delighted to offer you accommodation in our Specialist Disability Accommodation (SDA) at the above address. The accommodation is set to commence on the ${moveInDateFormatted}.`;
      const splitPara1 = doc.splitTextToSize(para1, pageWidth - margin * 2);
      doc.text(splitPara1, margin, y);
      y += splitPara1.length * 5 + 5;

      // Body paragraph 2
      const para2 = `To cater to your needs during your stay, we will claim SDA funding from the National Disability Insurance Scheme (NDIS) for ${formatCurrency(sdaAmount)}. Additionally, we will also be claiming Reasonable Rent Contributions (RRC) as detailed below:`;
      const splitPara2 = doc.splitTextToSize(para2, pageWidth - margin * 2);
      doc.text(splitPara2, margin, y);
      y += splitPara2.length * 5 + 8;

      // RRC Table - simple two column layout matching template
      doc.setFont("helvetica", "bold");
      doc.text("Contribution Component", margin, y);
      doc.text("Amount (AUD)", margin + 100, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.text("25% Disability Support Pension", margin, y);
      doc.text(rrcCalculation.dspContribution.toFixed(2), margin + 100, y);
      y += 6;

      doc.text("100% Commonwealth Rental Assistance", margin, y);
      doc.text(rrcCalculation.craContribution.toFixed(2), margin + 100, y);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.text("Total Reasonable Rent Contribution (RRC)", margin, y);
      doc.text(rrcCalculation.totalFortnightly.toFixed(2), margin + 100, y);
      y += 10;

      // Agreement paragraph
      doc.setFont("helvetica", "normal");
      const para3 = `This agreement ensures that ${orgDisplayName} can continue providing high-quality service and accommodation tailored to your needs. Please note that a service booking must be created before the move-in date.`;
      const splitPara3 = doc.splitTextToSize(para3, pageWidth - margin * 2);
      doc.text(splitPara3, margin, y);
      y += splitPara3.length * 5 + 5;

      // Welcome paragraph
      const para4 = "We look forward to welcoming you and supporting your journey towards a better living experience.";
      const splitPara4 = doc.splitTextToSize(para4, pageWidth - margin * 2);
      doc.text(splitPara4, margin, y);
      y += splitPara4.length * 5 + 5;

      // Contact paragraph
      const contactPhone = providerSettings?.contactPhone || "our office";
      const contactEmail = providerSettings?.contactEmail || "";
      const para5 = contactEmail
        ? `Should you have any questions or require further information, please do not hesitate to contact us at ${contactPhone} or via email at ${contactEmail}`
        : `Should you have any questions or require further information, please do not hesitate to contact us at ${contactPhone}`;
      const splitPara5 = doc.splitTextToSize(para5, pageWidth - margin * 2);
      doc.text(splitPara5, margin, y);
      y += splitPara5.length * 5 + 10;

      // Yours sincerely
      doc.text("Yours sincerely,", margin, y);
      y += 15;

      // Signature line placeholder
      doc.setDrawColor(0);
      doc.line(margin, y, margin + 40, y);
      y += 8;

      // Signatory name and title
      const sigName = providerSettings?.signatoryName || "";
      if (sigName) {
        doc.setFont("helvetica", "bold");
        doc.text(sigName, margin, y);
        y += 5;
      }
      const sigTitle = providerSettings?.signatoryTitle || "";
      if (sigTitle) {
        doc.setFont("helvetica", "normal");
        doc.text(sigTitle, margin, y);
        y += 5;
      }
      doc.setFont("helvetica", "normal");
      const footerAbn = providerSettings?.abn ? ` | ABN: ${providerSettings.abn}` : "";
      doc.text(`${orgDisplayName}${footerAbn}`, margin, y);
      y += 5;
      const footerContact = [
        providerSettings?.contactPhone ? `T: ${providerSettings.contactPhone}` : "",
        providerSettings?.contactEmail ? `E: ${providerSettings.contactEmail}` : "",
      ].filter(Boolean).join(" | ");
      if (footerContact) doc.text(footerContact, margin, y);
      if (footerContact) y += 5;
      if (providerSettings?.address) doc.text(`Address: ${providerSettings.address}`, margin, y);

      // Save the PDF
      const fileName = `SDA_Quotation_${selectedParticipant.firstName}_${selectedParticipant.lastName}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAccommodationAgreement = async () => {
    if (!selectedParticipant || !rrcCalculation || !selectedDwelling) return;

    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let y = 20;
      let pageNum = 1;

      // Use the selected dwelling instead of participant's dwelling
      const dwelling = selectedDwelling;
      // Parse property info from the dwelling's fullAddress
      const addressParts = selectedDwelling.propertyAddress.split(", ");
      const property = {
        addressLine1: addressParts[0] || "",
        suburb: addressParts[1]?.split(" ")[0] || "",
        state: addressParts[1]?.split(" ")[1] || "",
        postcode: addressParts[1]?.split(" ")[2] || "",
      };
      const sdaAmount = dwelling?.sdaRegisteredAmount || 0;
      // Use proposed move-in date if set, otherwise fall back to participant's move-in date
      const effectiveMoveInDate = proposedMoveInDate || selectedParticipant.moveInDate;
      const moveInDate = effectiveMoveInDate
        ? new Date(effectiveMoveInDate).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "_______________";

      const addPageFooter = (num: number) => {
        doc.setFontSize(9);
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        doc.text(`${num} | Page`, margin, pageHeight - 10);
      };

      const checkNewPage = (currentY: number, neededSpace: number = 25): number => {
        if (currentY + neededSpace > pageHeight - 20) {
          addPageFooter(pageNum);
          doc.addPage();
          pageNum++;
          return 25;
        }
        return currentY;
      };

      // ==================== PAGE 1 - COVER PAGE ====================
      // Logo centered (max 60mm wide, 30mm tall, preserving aspect ratio)
      try {
        const logo = await loadLogoAsBase64(organization?.resolvedLogoUrl);
        const maxW = 60, maxH = 30;
        const ratio = Math.min(maxW / logo.width, maxH / logo.height);
        const w = logo.width * ratio;
        const h = logo.height * ratio;
        doc.addImage(logo.data, "JPEG", pageWidth / 2 - w / 2, 30, w, h);
      } catch {
        console.log("Logo could not be loaded");
      }

      y = 80;

      // Title
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Accommodation Agreement", pageWidth / 2, y, { align: "center" });
      y += 15;

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("For Specialist Disability Accommodation under", pageWidth / 2, y, { align: "center" });
      y += 7;
      doc.text("the National Disability Insurance Scheme (or", pageWidth / 2, y, { align: "center" });
      y += 7;
      doc.text("Continuity of Support Program)", pageWidth / 2, y, { align: "center" });
      y += 40;

      // Disclaimer
      doc.setFontSize(9);
      const disclaimerText = "Disclaimer: This Agreement has been prepared to assist the parties in outlining their rights and responsibilities in providing Specialist Disability Accommodation under the National Disability Insurance Scheme (NDIS). Parties should seek their own legal advice as required in respect of the terms contained in this Agreement. The NSW Department of Family and Community Services is not liable for any losses sustained by the parties' reliance on this sample agreement. Parties should also refer to the NDIS Terms of Business (including any updates) at the time of signing this Agreement and other operational rules from time to time.";
      const splitDisclaimer = doc.splitTextToSize(disclaimerText, pageWidth - margin * 2);
      doc.text(splitDisclaimer, margin, y);

      addPageFooter(pageNum);

      // ==================== PAGE 2 - PARTIES AND PROPERTY ====================
      doc.addPage();
      pageNum++;
      y = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Accommodation Agreement", pageWidth / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("For Specialist Disability Accommodation under the", pageWidth / 2, y, { align: "center" });
      y += 5;
      doc.text("National Disability Insurance Scheme or Continuity of Support Program", pageWidth / 2, y, { align: "center" });
      y += 12;

      // Parties section
      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 102, 153);
      doc.text("Parties", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      const partiesIntro = `This Accommodation Agreement is for ${selectedParticipant.firstName} ${selectedParticipant.lastName}, a participant in the National Disability Insurance Scheme, and is made between:`;
      const splitPartiesIntro = doc.splitTextToSize(partiesIntro, pageWidth - margin * 2);
      doc.text(splitPartiesIntro, margin, y);
      y += splitPartiesIntro.length * 5 + 5;

      // Parties table
      doc.setFont("helvetica", "bold");
      doc.text("You or your representative", margin, y);
      y += 6;
      doc.setFont("helvetica", "bolditalic");
      doc.text(`${selectedParticipant.firstName} ${selectedParticipant.lastName}`, margin + 60, y - 6);
      doc.setFont("helvetica", "bolditalic");
      doc.text(`NDIS # ${selectedParticipant.ndisNumber}`, margin + 60, y);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.text("And", margin, y);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.text("Accommodation Provider", margin, y);
      doc.setFont("helvetica", "bolditalic");
      const agreementOrgName = providerSettings?.providerName || organization?.name || "MySDAManager";
      doc.text(agreementOrgName, margin + 60, y);
      y += 5;
      const ndisNumber = providerSettings?.ndisRegistrationNumber || "";
      if (ndisNumber) doc.text(`NDIS Provider number: ${ndisNumber}`, margin + 60, y);
      if (ndisNumber) y += 5;
      const agreementAbn = providerSettings?.abn || "";
      if (agreementAbn) doc.text(`ABN ${agreementAbn}`, margin + 60, y);
      y += 15;

      // The Property section
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 102, 153);
      doc.text("The Property", margin, y);
      y += 12;

      doc.setFontSize(10);
      doc.setTextColor(0);

      // Property table - improved layout
      const propCol1 = 55;
      const propCol2 = pageWidth - margin * 2 - propCol1;
      const rowHeight = 12;
      doc.setDrawColor(100, 100, 100);

      // Header row with background
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, propCol1, rowHeight, "FD");
      doc.rect(margin + propCol1, y, propCol2, rowHeight, "FD");
      doc.setFont("helvetica", "bold");
      doc.text("Your Room", margin + 3, y + 8);
      doc.text("Property Address & SDA Registration Details", margin + propCol1 + 3, y + 8);
      y += rowHeight;

      // Data row
      const dataRowHeight = 22;
      doc.setFont("helvetica", "normal");
      doc.rect(margin, y, propCol1, dataRowHeight);
      doc.rect(margin + propCol1, y, propCol2, dataRowHeight);
      doc.text(`${dwelling?.maxParticipants || 3} Resident House`, margin + 3, y + 8);
      doc.text("without OOA", margin + 3, y + 15);
      // Simple approach: Dwelling Number + Street Name (without number) + Suburb + State + Postcode
      const streetName = property?.addressLine1?.replace(/^\d+\s*/, "") || property?.addressLine1;
      let fullAddress = "";
      if (dwelling?.dwellingName) {
        fullAddress = `${dwelling.dwellingName} ${streetName}, ${property?.suburb || ""} ${property?.state || ""} ${property?.postcode || ""}`;
      } else {
        fullAddress = `${property?.addressLine1 || ""}, ${property?.suburb || ""} ${property?.state || ""} ${property?.postcode || ""}`;
      }
      doc.text(fullAddress, margin + propCol1 + 3, y + 8);
      doc.text(`SDA Category: ${formatSdaCategory(dwelling?.sdaDesignCategory || "")}`, margin + propCol1 + 3, y + 15);
      y += dataRowHeight + 8;

      doc.text("The furniture in your room is:", margin, y);
      doc.text("Owned by the Service Provider", margin + 60, y);
      y += 10;

      doc.text("The Shared Areas in the property that you can use are:", margin, y);
      y += 8;

      // Shared areas checkboxes - 3 columns
      const areas = [
        { name: "Kitchen", checked: true },
        { name: "Bathroom", checked: true },
        { name: "Lounge Room", checked: true },
        { name: "Laundry", checked: true },
        { name: "Garage", checked: false },
        { name: "Outdoor Area", checked: true },
        { name: "Corridors and walkways", checked: true },
        { name: "Other", checked: false },
      ];

      let areaCol = 0;
      const colWidth = (pageWidth - margin * 2) / 3;
      areas.forEach((area, idx) => {
        const xPos = margin + (areaCol * colWidth);
        doc.rect(xPos, y - 3, 4, 4);
        if (area.checked) {
          doc.line(xPos, y - 3, xPos + 4, y + 1);
          doc.line(xPos + 4, y - 3, xPos, y + 1);
        }
        doc.text(area.name, xPos + 6, y);
        areaCol++;
        if (areaCol >= 3) {
          areaCol = 0;
          y += 7;
        }
      });
      if (areaCol !== 0) y += 7;

      addPageFooter(pageNum);

      // ==================== PAGE 3 - ACCOMMODATION PAYMENTS ====================
      doc.addPage();
      pageNum++;
      y = 20;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 102, 153);
      doc.text("Accommodation Payments", margin, y);
      y += 12;

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setDrawColor(100, 100, 100);

      // RRC table - improved layout
      const payCol1 = 95;
      const payCol2 = pageWidth - margin * 2 - payCol1;
      const payRowHeight = 14;

      // Header row
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, payCol1, payRowHeight, "FD");
      doc.rect(margin + payCol1, y, payCol2, payRowHeight, "FD");
      doc.setFont("helvetica", "bold");
      doc.text("Contribution Type", margin + 3, y + 9);
      doc.text("Amount", margin + payCol1 + 3, y + 9);
      y += payRowHeight;

      // Row 1: Reasonable Rent Contribution
      doc.setFont("helvetica", "normal");
      doc.rect(margin, y, payCol1, payRowHeight);
      doc.rect(margin + payCol1, y, payCol2, payRowHeight);
      doc.text("Your Reasonable Rent Contribution", margin + 3, y + 9);
      doc.text("25% of Disability Support Pension", margin + payCol1 + 3, y + 9);
      y += payRowHeight;

      // Row 2: Commonwealth Rent Assistance
      doc.rect(margin, y, payCol1, payRowHeight);
      doc.rect(margin + payCol1, y, payCol2, payRowHeight);
      doc.text("Commonwealth Rent Assistance", margin + 3, y + 9);
      doc.text("100% of CRA entitlement", margin + payCol1 + 3, y + 9);
      y += payRowHeight;

      // Row 3: Total - highlighted
      doc.setFillColor(230, 245, 255);
      doc.rect(margin, y, payCol1, payRowHeight, "FD");
      doc.rect(margin + payCol1, y, payCol2, payRowHeight, "FD");
      doc.setFont("helvetica", "bold");
      doc.text("Payment Frequency: Fortnightly", margin + 3, y + 9);
      doc.text(`Total: $${rrcCalculation.totalFortnightly.toFixed(2)}`, margin + payCol1 + 3, y + 9);
      y += payRowHeight + 10;

      // Board payment note
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      const boardNote = "Payment for board will be collected as part of the Service Agreement with your Service Provider. Please refer to the Service Agreement with your Service Provider for the amount of your board payment, what costs the board payment will cover and the method and timing for the board payment.";
      const splitBoardNote = doc.splitTextToSize(boardNote, pageWidth - margin * 2);
      doc.text(splitBoardNote, margin, y);
      y += splitBoardNote.length * 4 + 8;

      // Payment methods
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("How payments will be made:", margin, y);
      y += 7;

      // Draw checkboxes for payment methods
      const paymentMethods = [
        { name: "cheque", checked: false },
        { name: "cash", checked: false },
        { name: "electronic transfer (EFT)", checked: true },
        { name: "Direct Debit", checked: false },
      ];

      let paymentX = margin;
      paymentMethods.forEach((method) => {
        // Draw checkbox
        doc.rect(paymentX, y - 3, 4, 4);
        if (method.checked) {
          doc.line(paymentX, y - 3, paymentX + 4, y + 1);
          doc.line(paymentX + 4, y - 3, paymentX, y + 1);
        }
        doc.text(method.name, paymentX + 6, y);
        paymentX += doc.getTextWidth(method.name) + 15;
      });
      y += 8;

      doc.text("If EFT or Direct Debit please make payments payable to the following bank account:", margin, y);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.text(`BSB number: ${providerSettings?.bankBsb || "___"}`, margin, y);
      doc.text(`account number: ${providerSettings?.bankAccountNumber || "___"}`, margin + 50, y);
      y += 6;
      const bankAcctName = providerSettings?.bankAccountName || providerSettings?.providerName || organization?.name || "MySDAManager";
      doc.text(`account name: ${bankAcctName}`, margin, y);
      y += 6;
      doc.text(`payment reference: ${selectedParticipant.firstName} ${selectedParticipant.lastName}`, margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.text("or other method agreed:", margin, y);
      y += 12;

      // Provider acknowledgment paragraphs
      doc.setFontSize(10);
      const ackPara1 = "The Accommodation Provider acknowledges and agrees that your payment obligations under this Accommodation Agreement may be satisfied by Department of Human Services or the NDIA or the Service Provider (where possible) on your behalf.";
      const splitAck1 = doc.splitTextToSize(ackPara1, pageWidth - margin * 2);
      doc.text(splitAck1, margin, y);
      y += splitAck1.length * 5 + 5;

      const ackPara2 = "The Accommodation Provider acknowledges that any money received by the Service Provider from the State which relates to rental payments (Prepaid Rent), will be paid to the Accommodation Provider by the Service Provider on your behalf and used to pay for your Reasonable Rent Contribution.";
      const splitAck2 = doc.splitTextToSize(ackPara2, pageWidth - margin * 2);
      doc.text(splitAck2, margin, y);
      y += splitAck2.length * 5 + 5;

      const ackPara3 = "The Accommodation Provider agrees to use the Prepaid Rent to pay for your Reasonable Rent Contribution until the Prepaid Rent has been used completely. Once used completely, you agree to pay the Reasonable Rent Contribution (or a portion of it for the first payment, if applicable) to the Accommodation Provider from that date onwards.";
      const splitAck3 = doc.splitTextToSize(ackPara3, pageWidth - margin * 2);
      doc.text(splitAck3, margin, y);
      y += splitAck3.length * 5 + 10;

      // Length of Agreement section
      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 102, 153);
      doc.text("Length of this Accommodation Agreement", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      const lengthPara = `This Accommodation Agreement will start on ${moveInDate} and continue until you or the Accommodation Provider ends the agreement earlier (see 'Ending this Accommodation Agreement'). Unless otherwise stated.`;
      const splitLength = doc.splitTextToSize(lengthPara, pageWidth - margin * 2);
      doc.text(splitLength, margin, y);
      y += splitLength.length * 5 + 5;

      const lengthPara2 = "The Accommodation Provider agrees that you have the right to occupy your room and use the Shared Areas during the length of this Accommodation Agreement.";
      const splitLength2 = doc.splitTextToSize(lengthPara2, pageWidth - margin * 2);
      doc.text(splitLength2, margin, y);
      y += splitLength2.length * 5 + 5;

      doc.text("Duration of this lease is 24 months with an option to renew if submitted in writing.", margin, y);

      addPageFooter(pageNum);

      // ==================== PAGE 4 - NDIS AND RESPONSIBILITIES ====================
      doc.addPage();
      pageNum++;
      y = 20;

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text("This Accommodation Agreement will terminate automatically if you stop living at the property permanently.", margin, y);
      y += 12;

      // The NDIS section
      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 102, 153);
      doc.text("The NDIS and this Accommodation Agreement", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      const ndisIntro = "This Accommodation Agreement is made for the purpose of providing you with Specialist Disability Accommodation under your National Disability Insurance Scheme (NDIS) or Continuity of Support (COS) plan.";
      const splitNdisIntro = doc.splitTextToSize(ndisIntro, pageWidth - margin * 2);
      doc.text(splitNdisIntro, margin, y);
      y += splitNdisIntro.length * 5 + 5;

      doc.text("A copy of your NDIS plan or your COS plan or equivalent is attached to this Accommodation Agreement", margin, y);
      y += 8;

      doc.text("The Parties agree that this Accommodation Agreement is made in the context of the NDIS or COS, which are schemes that aim to:", margin, y);
      y += 6;
      doc.text("• support the independence and social and economic participation of people with disability; and", margin + 5, y);
      y += 5;
      doc.text("• enable people with a disability to exercise choice and control in the pursuit of their goals and the planning and delivery of their supports.", margin + 5, y);
      y += 10;

      const ndisProvision = "If, from time to time, the provisions within this Accommodation Agreement differ from any requirements specified by the NDIA in respect of Specialist Disability Accommodation or the Accommodation Provider, the Accommodation Provider agrees that it will satisfy, as a minimum, all such requirements set by the NDIA.";
      const splitNdisProvision = doc.splitTextToSize(ndisProvision, pageWidth - margin * 2);
      doc.text(splitNdisProvision, margin, y);
      y += splitNdisProvision.length * 5 + 10;

      // Responsibilities of Accommodation Provider
      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 102, 153);
      doc.text("Responsibilities of Accommodation Provider", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text("The Accommodation Provider agrees to:", margin, y);
      y += 6;

      const providerResp = [
        "a property maintenance report is done every 3 months. A register will be kept and monitored",
        "provide and maintain the property in a good state of repair (including to ensure that the property is reasonably clean before the start of this Accommodation Agreement) and respond in a timely manner to requests for maintenance, having regard to the safety, security and privacy of the occupants;",
        "ensure the property is fitted with adequate locks and security features to enable the home to be kept reasonably secure;",
        "take all reasonable steps to enable you to have quiet enjoyment of your room;",
        "do all things required to remain a registered Specialist Disability Accommodation provider;",
        "treat you with courtesy and respect;",
        "give you information about managing complaints or disagreements;",
        "listen to your feedback and resolve problems quickly;",
        "assist you should there be a need to replace the Service Provider (see Change of Service Provider and Attachment 4 below);",
        "give you the required notice if the Accommodation Provider needs to end the Agreement;",
        "protect your privacy and confidential information;",
      ];

      providerResp.forEach((resp) => {
        y = checkNewPage(y, 12);
        const respText = `• ${resp}`;
        const splitResp = doc.splitTextToSize(respText, pageWidth - margin * 2 - 5);
        doc.text(splitResp, margin, y);
        y += splitResp.length * 5 + 2;
      });

      addPageFooter(pageNum);

      // ==================== PAGE 5 - MORE RESPONSIBILITIES ====================
      doc.addPage();
      pageNum++;
      y = 20;

      doc.setFontSize(10);
      doc.setTextColor(0);

      const moreProviderResp = [
        "write to you within five (5) business days if the contact details shown in this Agreement change;",
        "provide supports in a way that complies with all relevant laws, including the National Disability Insurance Scheme Act 2013, its rules and the Australian Consumer Law;",
        "provide accommodation which complies with all relevant building codes, accommodation standards and all relevant laws;",
        "comply with all other standards, guidelines and codes of conduct as applicable including the NDIS Terms of Business for Registered Providers of Specialist Disability Accommodation providing accommodation to NDIS SDA approved Participants, or the relevant requirements of the Commonwealth Department of Health regarding the COS program.",
        "issue invoices to you as required under relevant consumer laws and if requested by you;",
        "have appropriate insurances in place for workers compensation, public liability, professional indemnity and home and contents insurance and to keep these insurances current during this Agreement; and",
        "take all necessary steps to fulfil its obligations to workers and other people at the property under the work health and safety legislation.",
      ];

      moreProviderResp.forEach((resp) => {
        y = checkNewPage(y, 12);
        const respText = `• ${resp}`;
        const splitResp = doc.splitTextToSize(respText, pageWidth - margin * 2 - 5);
        doc.text(splitResp, margin, y);
        y += splitResp.length * 5 + 2;
      });
      y += 10;

      // Your Responsibilities
      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 102, 153);
      doc.text("Your Responsibilities", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text("You agree:", margin, y);
      y += 6;

      const yourResp = [
        "to make the accommodation payments (see 'Accommodation Payments' below);",
        "to treat the Accommodation Provider and their staff and contractors with courtesy and respect;",
        "to use the property for residential purposes only and not for any other purpose (including any illegal purpose);",
        "to treat other occupants fairly and respectfully",
        "not to intentionally damage your room or any other part of the property;",
        "to respect other occupants and their right to treat the property as their home;",
        "to notify the Accommodation Provider of any maintenance or repair work that needs to be done in your room as set out in Attachment 6 - Maintenance Reporting Process;",
        "notify the Accommodation Provider if you are planning any holidays or other absences; and",
        "to give the Accommodation Provider the required notice if you need to end the Accommodation Agreement (see 'Ending this Accommodation Agreement' below).",
        "Failure to meet your responsibilities may result in termination of lease.",
      ];

      yourResp.forEach((resp) => {
        y = checkNewPage(y, 12);
        const respText = `• ${resp}`;
        const splitResp = doc.splitTextToSize(respText, pageWidth - margin * 2 - 5);
        doc.text(splitResp, margin, y);
        y += splitResp.length * 5 + 2;
      });
      y += 8;

      // Alterations section
      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 102, 153);
      doc.text("Alterations to the property", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      const alterPara = "If you require any alterations to be made to the property for your use (for example, the installation of ramps or hoists in the property), to the extent the Accommodation Provider agrees, in its absolute discretion, to make these alterations, you must pay the Accommodation Provider for the costs it incurs in making these alterations.";
      const splitAlter = doc.splitTextToSize(alterPara, pageWidth - margin * 2);
      doc.text(splitAlter, margin, y);

      addPageFooter(pageNum);

      // ==================== CONTINUE WITH REMAINING PAGES (SIMPLIFIED) ====================
      // Adding key sections: Conflict of Interest, House Rules, Accommodation Payments details,
      // Inspections, Ending Agreement, Contact Details, Signatures, Attachments

      // PAGE 6 - Conflict of Interest, House Rules, Accommodation Payments
      doc.addPage();
      pageNum++;
      y = 20;

      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 102, 153);
      doc.text("Conflict of Interest and Relationships", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      const conflictIntro = "You acknowledge that the Supported Independent Living Service Provider is required to have an agreement in place with the Accommodation Provider who is managing the property.";
      const splitConflict = doc.splitTextToSize(conflictIntro, pageWidth - margin * 2);
      doc.text(splitConflict, margin, y);
      y += splitConflict.length * 5 + 5;

      const conflictNote = "In some instances, there may be a relationship between the two providers which means they are not completely independent. You need to be comfortable with the relationship between your Accommodation Provider and your Service Provider before you sign this Agreement.";
      const splitConflictNote = doc.splitTextToSize(conflictNote, pageWidth - margin * 2);
      doc.text(splitConflictNote, margin, y);
      y += splitConflictNote.length * 5 + 5;

      doc.text("Details of this relationship are:", margin, y);
      y += 8;

      // Draw checkboxes for relationship options (No relationship selected by default)
      const relationshipOptions = [
        { name: "No relationship", checked: true },
        { name: "Accommodation Provider and Service Provider are the same", checked: false },
        { name: "Accommodation Provider and Service Provider have the same management", checked: false },
        { name: "Accommodation Provider and Service Provider are part of a joint venture.", checked: false },
        { name: "Other:", checked: false },
      ];

      relationshipOptions.forEach((option) => {
        // Draw checkbox
        doc.rect(margin + 5, y - 3, 4, 4);
        if (option.checked) {
          doc.line(margin + 5, y - 3, margin + 9, y + 1);
          doc.line(margin + 9, y - 3, margin + 5, y + 1);
        }
        doc.text(option.name, margin + 12, y);
        y += 6;
      });
      y += 4;

      doc.text("Details:", margin, y);
      y += 15;

      // House Rules section
      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 102, 153);
      doc.text("House Rules", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      const houseRulesText = "You will be required to comply with House Rules which you and the other occupants of the home will prepare and agree on within the first 3 months of the Service Agreement with your Service Provider.";
      const splitHouseRules = doc.splitTextToSize(houseRulesText, pageWidth - margin * 2);
      doc.text(splitHouseRules, margin, y);
      y += splitHouseRules.length * 5 + 5;

      doc.text("Please refer to the Service Agreement with your Service Provider for more information about these House Rules.", margin, y);
      y += 15;

      // Accommodation Payments section
      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 102, 153);
      doc.text("Accommodation Payments", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0, 102, 153);
      doc.setFont("helvetica", "bold");
      doc.text("SDA Payment", margin, y);
      y += 6;

      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      const sdaPaymentText = "#The Accommodation Provider will seek payment of the Specialist Disability Accommodation Payment from the NDIA in accordance with the relevant NDIS rules, guidelines and terms of business.";
      const splitSdaPayment = doc.splitTextToSize(sdaPaymentText, pageWidth - margin * 2);
      doc.text(splitSdaPayment, margin, y);
      y += splitSdaPayment.length * 5 + 5;

      doc.text("OR", margin, y);
      y += 5;

      const cosPaymentText = "#The Accommodation Provider will seek payment for Continuity of Support (COS) from the Commonwealth Department of Health.";
      const splitCosPayment = doc.splitTextToSize(cosPaymentText, pageWidth - margin * 2);
      doc.text(splitCosPayment, margin, y);
      y += splitCosPayment.length * 5 + 8;

      doc.setTextColor(0, 102, 153);
      doc.setFont("helvetica", "bold");
      doc.text("Reasonable Rent Contribution", margin, y);
      y += 6;

      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      const rrcText = "You agree to pay the Reasonable Rent Contribution which is included on page 3 of this Accommodation Agreement. The contribution is 25% of the base rate of the single Disability Support Pension that would apply to you assuming you are eligible to receive the Disability";
      const splitRrcText = doc.splitTextToSize(rrcText, pageWidth - margin * 2);
      doc.text(splitRrcText, margin, y);

      addPageFooter(pageNum);

      // Continue with more pages following the same pattern...
      // For brevity, I'll add the key remaining sections

      // PAGE 7 onwards - Inspections, Written Receipts, Absences
      doc.addPage();
      pageNum++;
      y = 20;

      const rrcCont = "Support Pension, together with that 100% of your Commonwealth Rental Assistance payment as set out in Attachment 3, if you receive one.";
      const splitRrcCont = doc.splitTextToSize(rrcCont, pageWidth - margin * 2);
      doc.text(splitRrcCont, margin, y);
      y += splitRrcCont.length * 5 + 5;

      const rrcChange = "Because your Reasonable Rental Contribution is a percentage, it will change when either the amount of the Disability Support Pension and/or Commonwealth Rental Assistance change. You agree to pay the increase when notified by the Accommodation Provider who will let you know at least 28 days before the increase occurs.";
      const splitRrcChange = doc.splitTextToSize(rrcChange, pageWidth - margin * 2);
      doc.text(splitRrcChange, margin, y);
      y += splitRrcChange.length * 5 + 5;

      const rrcNotEligible = "If you are not eligible for either a Disability Support Pension or Commonwealth Rental Assistance then your Reasonable Rent Contribution will be calculated as 25% of the basic rate of the Disability Support Pension applicable for your circumstances.";
      const splitRrcNotEligible = doc.splitTextToSize(rrcNotEligible, pageWidth - margin * 2);
      doc.text(splitRrcNotEligible, margin, y);
      y += splitRrcNotEligible.length * 5 + 10;

      // Written Receipts
      doc.setTextColor(0, 102, 153);
      doc.setFont("helvetica", "bold");
      doc.text("Written Receipts", margin, y);
      y += 6;
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      doc.text("The Accommodation Provider must provide written receipts to you within two weeks of any payment.", margin, y);
      y += 10;

      // Absences
      doc.setTextColor(0, 102, 153);
      doc.setFont("helvetica", "bold");
      doc.text("Absences", margin, y);
      y += 6;
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      const absencePara = "If you are temporarily absent from the property for a period of time up to a maximum of 60 days (for example, if you go on holiday) you are required to tell the Accommodation Provider and are still required to make the Accommodation Payments detailed on page 3 of this Agreement.";
      const splitAbsence = doc.splitTextToSize(absencePara, pageWidth - margin * 2);
      doc.text(splitAbsence, margin, y);
      y += splitAbsence.length * 5 + 5;

      const absenceTerminate = "If you are absent from the property for a period of time in excess of 60 days, then this Agreement will terminate from the date that the Accommodation Payments and any other payments required under this Agreement are due to the Accommodation Provider but not paid by the relevant due date.";
      const splitAbsenceTerminate = doc.splitTextToSize(absenceTerminate, pageWidth - margin * 2);
      doc.text(splitAbsenceTerminate, margin, y);
      y += splitAbsenceTerminate.length * 5 + 10;

      // Inspections section
      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 102, 153);
      doc.text("Inspections and Access", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text("The Accommodation Provider may or may not be the same as the Property Owner.", margin, y);
      y += 6;

      const inspectPara = "The Accommodation Provider can visit and inspect the shared areas at any reasonable time. Repairs, cleaning, maintenance, upgrades and renovations of the shared areas can be done by the Accommodation Provider at any reasonable time.";
      const splitInspect = doc.splitTextToSize(inspectPara, pageWidth - margin * 2);
      doc.text(splitInspect, margin, y);
      y += splitInspect.length * 5 + 5;

      doc.text("The Accommodation Provider may need to enter your room from time to time, and must give you notice as set out below:", margin, y);
      y += 8;

      // Inspection table
      const inspCol1 = 100;
      const inspCol2 = pageWidth - margin * 2 - inspCol1;
      doc.setDrawColor(0);

      doc.rect(margin, y, inspCol1, 8);
      doc.rect(margin + inspCol1, y, inspCol2, 8);
      doc.setFont("helvetica", "bold");
      doc.text("Reason access is required", margin + 2, y + 5.5);
      doc.text("Notice period", margin + inspCol1 + 2, y + 5.5);
      y += 8;

      const inspectionRows = [
        ["In an emergency, or to carry out emergency repairs or inspections", "Immediate access"],
        ["To carry out general repairs and maintenance", "24 hours"],
        ["To carry out any other works, including structural works or property upgrades", "24 hours"],
        ["To show the room to a prospective resident after notice to terminate has been given", "48 hours"],
        ["To carry out inspections", "48 hours"],
        ["For any other reason", "48 hours"],
      ];

      doc.setFont("helvetica", "normal");
      inspectionRows.forEach((row) => {
        const rowText = doc.splitTextToSize(row[0], inspCol1 - 4);
        const rowHeight = Math.max(rowText.length * 5 + 3, 8);
        doc.rect(margin, y, inspCol1, rowHeight);
        doc.rect(margin + inspCol1, y, inspCol2, rowHeight);
        doc.text(rowText, margin + 2, y + 5);
        doc.text(row[1], margin + inspCol1 + 2, y + 5);
        y += rowHeight;
      });

      addPageFooter(pageNum);

      // SIGNATURES PAGE
      doc.addPage();
      pageNum++;
      y = 20;

      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 102, 153);
      doc.text("Agreement signatures", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text("The Parties agree to the terms and conditions of this Accommodation Agreement.", margin, y);
      y += 15;

      // Participant signature
      doc.text("Signed by Participant or", margin, y);
      y += 5;
      doc.text("Participant's Representative", margin, y);
      y += 10;

      doc.line(margin + 80, y, margin + 150, y);
      doc.text("Signature", margin + 80, y + 5);
      y += 15;

      doc.line(margin, y, margin + 60, y);
      doc.text("Date", margin, y + 5);
      doc.line(margin + 80, y, margin + 150, y);
      doc.text("Name", margin + 80, y + 5);
      y += 30;

      // Provider signature
      doc.text("Signed by Authorised Representative", margin, y);
      y += 5;
      const sigOrgName = providerSettings?.providerName || organization?.name || "MySDAManager";
      doc.text(`of ${sigOrgName}`, margin, y);
      y += 10;

      doc.line(margin + 80, y, margin + 150, y);
      doc.text("Signature", margin + 80, y + 5);
      y += 15;

      doc.setFont("helvetica", "bold");
      const todayDate = new Date();
      const signDate = `${todayDate.getDate().toString().padStart(2, "0")}/${(todayDate.getMonth() + 1).toString().padStart(2, "0")}/${todayDate.getFullYear()}`;
      doc.text(signDate, margin, y);
      doc.setFont("helvetica", "normal");
      doc.line(margin, y + 2, margin + 60, y + 2);
      doc.text("Date", margin, y + 7);
      doc.text(providerSettings?.signatoryName || "", margin + 80, y);
      doc.line(margin + 80, y + 2, margin + 150, y + 2);
      doc.text("Name", margin + 80, y + 7);

      addPageFooter(pageNum);

      // ATTACHMENT 1 - List of Furnishings
      doc.addPage();
      pageNum++;
      y = 20;

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 102, 153);
      doc.text("Attachment 1 – List of Furnishings", margin, y);
      y += 12;

      doc.setFontSize(10);
      doc.setTextColor(0);

      // Furnishings table
      const furnCol1 = 50;
      const furnCol2 = 50;
      const furnCol3 = pageWidth - margin * 2 - furnCol1 - furnCol2;

      doc.setDrawColor(0);
      doc.rect(margin, y, furnCol1, 8);
      doc.rect(margin + furnCol1, y, furnCol2, 8);
      doc.rect(margin + furnCol1 + furnCol2, y, furnCol3, 8);
      doc.setFont("helvetica", "bold");
      doc.text("Item", margin + 2, y + 5.5);
      doc.text("Owner", margin + furnCol1 + 2, y + 5.5);
      doc.text("Date of purchase (if known)", margin + furnCol1 + furnCol2 + 2, y + 5.5);
      y += 8;

      const furnishings = ["Bed", "Wardrobe", "Drawers", "Bedside table", "Television", "Radio", "Refrigerator", "", ""];
      doc.setFont("helvetica", "normal");
      furnishings.forEach((item) => {
        doc.rect(margin, y, furnCol1, 8);
        doc.rect(margin + furnCol1, y, furnCol2, 8);
        doc.rect(margin + furnCol1 + furnCol2, y, furnCol3, 8);
        doc.text(item, margin + 2, y + 5.5);
        y += 8;
      });

      addPageFooter(pageNum);

      // ATTACHMENT 2 - NDIS Plan
      doc.addPage();
      pageNum++;
      y = 20;

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 102, 153);
      doc.text("Attachment 2 – Copy of your NDIS plan or COS plan", margin, y);
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFont("helvetica", "italic");
      doc.text("[Attach a copy of your NDIS plan or delete this page if not required]", margin, y);

      addPageFooter(pageNum);

      // Save the PDF
      const fileName = `Accommodation_Agreement_${selectedParticipant.firstName}_${selectedParticipant.lastName}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMtaSchedule = async () => {
    if (!selectedParticipant || !mtaStartDate || !mtaEndDate) return;

    setIsGenerating(true);
    try {
      // Portrait A4: 210mm x 297mm (matching BLS template exactly)
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;

      // Calculate days and budget
      const start = new Date(mtaStartDate);
      const end = new Date(mtaEndDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const dailyRate = parseFloat(mtaFormData.mtaDailyRate) || 152.03;
      const totalBudget = dailyRate * days;
      const supportItemNumber = mtaFormData.mtaSupportItemNumber || "01_082_0115_1_1";

      // Org details
      const orgName = providerSettings?.providerName || organization?.name || "Provider";
      const orgAbn = providerSettings?.abn || "";
      const orgPhone = providerSettings?.contactPhone || "";
      const orgAddress = providerSettings?.address || "";
      const orgNdisReg = providerSettings?.ndisRegistrationNumber || "";
      const orgEmail = providerSettings?.contactEmail || "";
      const signatoryName = providerSettings?.signatoryName || "";

      // Participant details
      const participantName = `${selectedParticipant.firstName} ${selectedParticipant.lastName}`;
      const participantDob = selectedParticipant.dateOfBirth
        ? new Date(selectedParticipant.dateOfBirth).toLocaleDateString("en-AU")
        : "";
      const participantNdis = selectedParticipant.ndisNumber || "";
      const participantAddress = selectedParticipant.dwelling
        ? `${selectedParticipant.dwelling.dwellingName || ""} ${selectedParticipant.property?.addressLine1 || ""}`.trim()
        : selectedParticipant.property?.addressLine1 || "";

      // Format dates as dd/mm/yyyy
      const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });
      };

      // Try to load org logo (preserve aspect ratio)
      let logoData: { data: string; width: number; height: number } | null = null;
      try {
        logoData = await loadLogoAsBase64(organization?.resolvedLogoUrl);
      } catch {
        // Continue without logo
      }

      // Helper: draw org footer at bottom of a page
      const drawFooter = () => {
        const footerY = pageHeight - 25;
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(`${orgName}${orgAbn ? ` | ABN: ${orgAbn}` : ""}`, margin, footerY);
        const line2Parts: string[] = [];
        if (orgPhone) line2Parts.push(`T:${orgPhone}`);
        if (orgEmail) line2Parts.push(`W: ${orgEmail}`);
        if (line2Parts.length > 0) {
          doc.text(line2Parts.join(" "), margin, footerY + 4);
        }
        if (orgAddress) {
          doc.text(`Address: ${orgAddress}`, margin, footerY + 8);
        }
        if (orgNdisReg) {
          doc.text(`NDIS Reg # ${orgNdisReg}`, margin, footerY + 12);
        }
      };

      // Helper: draw org logo top-right (preserves aspect ratio, no stretching)
      const drawLogo = (startY: number) => {
        if (logoData) {
          const maxW = 50;
          const maxH = 28;
          const ratio = Math.min(maxW / logoData.width, maxH / logoData.height);
          const logoW = logoData.width * ratio;
          const logoH = logoData.height * ratio;
          doc.addImage(logoData.data, "JPEG", pageWidth - margin - logoW, startY, logoW, logoH);
        }
      };

      // ==========================================
      // PAGE 1 - Schedule of Supports
      // ==========================================
      let y = 15;

      // Logo top-right
      drawLogo(y);

      // Blue header bar: "Schedule of Supports"
      y += 35;
      doc.setFillColor(66, 133, 244);
      doc.rect(margin, y, contentWidth, 14, "F");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("Schedule of Supports", pageWidth / 2, y + 10, { align: "center" });

      // Sub-header: "Schedule of Supports / Participant Support Plan"
      y += 22;
      doc.setFontSize(12);
      doc.setTextColor(66, 133, 244);
      doc.text("Schedule of Supports / Participant Support Plan", margin, y);

      // Participant info table (3 columns, 3 rows)
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);

      const colW1 = contentWidth / 3;
      const rowH = 10;

      // Row 1: Name | DOB | NDIS Number
      doc.rect(margin, y, colW1, rowH);
      doc.rect(margin + colW1, y, colW1, rowH);
      doc.rect(margin + 2 * colW1, y, colW1, rowH);

      doc.setFont("helvetica", "bold");
      doc.text("Name: ", margin + 2, y + 7);
      doc.setFont("helvetica", "normal");
      doc.text(participantName, margin + 2 + doc.getTextWidth("Name: "), y + 7);

      doc.setFont("helvetica", "bold");
      doc.text("DOB: ", margin + colW1 + 2, y + 7);
      doc.setFont("helvetica", "normal");
      doc.text(participantDob, margin + colW1 + 2 + doc.getTextWidth("DOB: "), y + 7);

      doc.setFont("helvetica", "bold");
      doc.text("NDIS Number: ", margin + 2 * colW1 + 2, y + 7);
      doc.setFont("helvetica", "normal");
      doc.text(participantNdis, margin + 2 * colW1 + 2 + doc.getTextWidth("NDIS Number: "), y + 7);

      // Row 2: Contact Details | Start date of agreement | End date of agreement
      y += rowH;
      doc.rect(margin, y, colW1, rowH);
      doc.rect(margin + colW1, y, colW1, rowH);
      doc.rect(margin + 2 * colW1, y, colW1, rowH);

      doc.setFont("helvetica", "bold");
      doc.text("Contact Details:", margin + 2, y + 7);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Start date of agreement:", margin + colW1 + 2, y + 7);
      doc.setFont("helvetica", "normal");
      doc.text(formatDate(mtaStartDate), margin + colW1 + 2 + doc.getTextWidth("Start date of agreement:"), y + 7);

      doc.setFont("helvetica", "bold");
      doc.text("End date of agreement: ", margin + 2 * colW1 + 2, y + 7);
      doc.setFont("helvetica", "normal");
      doc.text(formatDate(mtaEndDate), margin + 2 * colW1 + 2 + doc.getTextWidth("End date of agreement: "), y + 7);
      doc.setFontSize(10);

      // Row 3: Address (full width)
      y += rowH;
      doc.rect(margin, y, contentWidth, rowH);
      doc.setFont("helvetica", "bold");
      doc.text("Address:", margin + 2, y + 7);
      doc.setFont("helvetica", "normal");
      doc.text(participantAddress, margin + 2 + doc.getTextWidth("Address:"), y + 7);

      // "Supports provided" section heading
      y += rowH + 12;
      doc.setFontSize(14);
      doc.setTextColor(66, 133, 244);
      doc.text("Supports provided", margin, y);

      // "Support Category Name: MTA"
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Support Category Name: ", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text("MTA", margin + doc.getTextWidth("Support Category Name: "), y);

      // Support table (5 columns matching BLS template exactly)
      y += 10;
      const cols = [
        { header: "Support Category", width: 25 },
        { header: "Support Item Numbers\n(if known)", width: 30 },
        { header: "Support Item Description", width: 30 },
        { header: "Plan manager", width: 40 },
        { header: "Total Support Budget ($)", width: 30 },
      ];
      const totalColWeight = cols.reduce((s, c) => s + c.width, 0);
      const colWidths = cols.map(c => (c.width / totalColWeight) * contentWidth);

      // Table header row (gray background)
      const headerRowH = 14;
      doc.setFillColor(240, 240, 240);
      let xPos = margin;
      for (let i = 0; i < cols.length; i++) {
        doc.rect(xPos, y, colWidths[i], headerRowH, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        const lines = cols[i].header.split("\n");
        for (let j = 0; j < lines.length; j++) {
          doc.text(lines[j], xPos + 2, y + 6 + j * 4);
        }
        xPos += colWidths[i];
      }

      // Data row
      y += headerRowH;
      const dataRowH = 22;
      xPos = margin;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      // Support Category
      doc.rect(xPos, y, colWidths[0], dataRowH);
      doc.text("CORE", xPos + 2, y + 12);
      xPos += colWidths[0];

      // Support Item Numbers
      doc.rect(xPos, y, colWidths[1], dataRowH);
      doc.text(supportItemNumber, xPos + 2, y + 12);
      xPos += colWidths[1];

      // Support Item Description (split on two lines like BLS template)
      doc.rect(xPos, y, colWidths[2], dataRowH);
      doc.text("Medium Term", xPos + 2, y + 9);
      doc.text("Accommodation", xPos + 2, y + 14);
      xPos += colWidths[2];

      // Plan manager (name + email on separate lines)
      doc.rect(xPos, y, colWidths[3], dataRowH);
      doc.text(mtaPlanManagerName || "", xPos + 2, y + 9);
      doc.setFontSize(8);
      doc.text(mtaPlanManagerEmail || "", xPos + 2, y + 14);
      doc.setFontSize(9);
      xPos += colWidths[3];

      // Total Support Budget ($X.XX x N days + bold total)
      doc.rect(xPos, y, colWidths[4], dataRowH);
      doc.text(`$${dailyRate.toFixed(2)} x ${days} days`, xPos + 2, y + 9);
      doc.setFont("helvetica", "bold");
      doc.text(`$${totalBudget.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`, xPos + 2, y + 16);
      doc.setFont("helvetica", "normal");

      // Page 1 footer
      drawFooter();

      // ==========================================
      // PAGE 2 - Service Agreement Signatures
      // ==========================================
      doc.addPage();
      y = 15;

      // Logo top-right
      drawLogo(y);

      // Heading
      y += 45;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("SERVICE AGREEMENT SIGNATURES", margin, y);

      // Terms text
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        "The Parties agree to the terms and conditions of this Service Agreement/outlined schedule of support.",
        margin,
        y
      );

      // Participant signature block
      y += 30;
      const halfWidth = (contentWidth - 10) / 2;
      doc.setLineWidth(0.5);

      // Left: Signature line
      doc.line(margin, y, margin + halfWidth, y);
      // Right: Name line
      doc.line(margin + halfWidth + 10, y, pageWidth - margin, y);

      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bolditalic");
      doc.text("Signature of Participant /", margin, y);
      doc.text("Participant\u2019s representative", margin, y + 4);

      doc.text("Name of Participant / Participant\u2019s", margin + halfWidth + 10, y);
      doc.text("representative", margin + halfWidth + 10, y + 4);

      // Date line for participant
      y += 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Date:", margin, y);
      doc.line(margin + 15, y, margin + 80, y);

      // Provider signature block
      y += 30;
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + halfWidth, y);
      doc.line(margin + halfWidth + 10, y, pageWidth - margin, y);

      // Provider signatory name (pre-filled above the right line)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(signatoryName, margin + halfWidth + 12, y - 3);

      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bolditalic");
      doc.text("Signature of authorised person from", margin, y);
      doc.text(`${orgName}`, margin, y + 4);

      doc.text("Name of authorised person from", margin + halfWidth + 10, y);
      doc.text(`${orgName}`, margin + halfWidth + 10, y + 4);

      // Date line for provider (pre-filled with today)
      y += 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Date:", margin, y);
      doc.setFont("helvetica", "normal");
      const today = new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });
      doc.text(today, margin + 17, y);
      doc.line(margin + 15, y + 1, margin + 80, y + 1);

      // Page 2 footer
      drawFooter();

      // Save PDF
      doc.save(`Schedule_of_Supports_MTA_${selectedParticipant.firstName}_${selectedParticipant.lastName}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("MTA Schedule generation error:", err);
      await alertDialog("Failed to generate MTA Schedule of Supports. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="onboarding" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Participant Onboarding</h1>
            <p className="text-gray-400 mt-1">Generate onboarding documents for participants</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowAiImport(true);
                setAiImportStep("upload");
                setExtractedData(null);
                setEditedParticipant(null);
                setEditedPlan(null);
                setParseError(null);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Import
            </button>
            <button
              onClick={() => setShowRrcSettings(!showRrcSettings)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {showRrcSettings ? "Hide RRC Settings" : "RRC Settings"}
            </button>
            <button
              onClick={() => setShowMtaSettings(!showMtaSettings)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {showMtaSettings ? "Hide MTA Settings" : "MTA Settings"}
            </button>
          </div>
        </div>

        {/* RRC Settings Panel */}
        {showRrcSettings && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Reasonable Rent Contribution (RRC) Settings</h2>
            <p className="text-gray-400 text-sm mb-4">
              These rates are based on Centrelink payments and typically change in March and September each year.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-white font-medium">Disability Support Pension (DSP)</h3>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fortnightly Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rrcFormData.dspFortnightlyRate}
                    onChange={(e) => setRrcFormData({ ...rrcFormData, dspFortnightlyRate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Percentage Contribution (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={rrcFormData.dspPercentage}
                    onChange={(e) => setRrcFormData({ ...rrcFormData, dspPercentage: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-white font-medium">Commonwealth Rent Assistance (CRA)</h3>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Fortnightly Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rrcFormData.craFortnightlyRate}
                    onChange={(e) => setRrcFormData({ ...rrcFormData, craFortnightlyRate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Percentage Contribution (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={rrcFormData.craPercentage}
                    onChange={(e) => setRrcFormData({ ...rrcFormData, craPercentage: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>

            {/* Current Calculation */}
            {rrcCalculation && (
              <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                <h4 className="text-white font-medium mb-2">Current RRC Calculation</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">DSP Contribution</p>
                    <p className="text-white font-medium">{formatCurrency(rrcCalculation.dspContribution)}/fn</p>
                  </div>
                  <div>
                    <p className="text-gray-400">CRA Contribution</p>
                    <p className="text-white font-medium">{formatCurrency(rrcCalculation.craContribution)}/fn</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Fortnightly</p>
                    <p className="text-white font-medium">{formatCurrency(rrcCalculation.totalFortnightly)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Weekly</p>
                    <p className="text-green-400 font-medium">{formatCurrency(rrcCalculation.totalWeekly)}</p>
                  </div>
                </div>
                {rrcCalculation.lastUpdated && (
                  <p className="text-gray-400 text-xs mt-2">Last updated: {rrcCalculation.lastUpdated}</p>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSaveRrcSettings}
                className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
              >
                Save RRC Settings
              </button>
            </div>
          </div>
        )}

        {/* MTA Settings Panel */}
        {showMtaSettings && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Medium Term Accommodation (MTA) Settings</h2>
            <p className="text-gray-400 text-sm mb-4">
              Set the daily MTA rate and support item number for Schedule of Supports documents.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Daily MTA Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={mtaFormData.mtaDailyRate}
                  onChange={(e) => setMtaFormData({ ...mtaFormData, mtaDailyRate: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Support Item Number</label>
                <input
                  type="text"
                  value={mtaFormData.mtaSupportItemNumber}
                  onChange={(e) => setMtaFormData({ ...mtaFormData, mtaSupportItemNumber: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="01_082_0115_1_1"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSaveMtaSettings}
                className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
              >
                Save MTA Settings
              </button>
            </div>
          </div>
        )}

        {/* Document Generation */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Generate Onboarding Documents</h2>

          {/* Participant Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-1">Select Participant</label>
            <select
              value={selectedParticipantId}
              onChange={(e) => setSelectedParticipantId(e.target.value)}
              className="w-full md:w-1/2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="">-- Select a participant --</option>
              {participants?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.firstName} {p.lastName} - {p.ndisNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Dwelling Selection for Accommodation Agreement */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Select Dwelling (for Accommodation Agreement)
            </label>
            <select
              value={selectedDwellingId}
              onChange={(e) => setSelectedDwellingId(e.target.value)}
              className="w-full md:w-1/2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="">-- Select a dwelling --</option>
              {allDwellings?.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.fullAddress} ({formatSdaCategory(d.sdaDesignCategory)})
                </option>
              ))}
            </select>
            {selectedDwelling && (
              <p className="mt-2 text-sm text-gray-400">
                SDA Amount: {formatCurrency(selectedDwelling.sdaRegisteredAmount || 0)}/year |
                Max Participants: {selectedDwelling.maxParticipants}
              </p>
            )}
          </div>

          {/* Proposed Move-in Date */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Proposed Move-in Date
            </label>
            <input
              type="date"
              value={proposedMoveInDate}
              onChange={(e) => setProposedMoveInDate(e.target.value)}
              className="w-full md:w-1/3 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
            <p className="mt-1 text-sm text-gray-400">
              This date will appear in the SDA Quotation and Accommodation Agreement documents.
              {selectedParticipant?.moveInDate && !proposedMoveInDate && (
                <span className="text-yellow-400 block mt-1">
                  Currently using participant&apos;s existing move-in date: {new Date(selectedParticipant.moveInDate).toLocaleDateString("en-AU")}
                </span>
              )}
            </p>
          </div>

          {/* MTA Agreement Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">MTA Start Date</label>
              <input
                type="date"
                value={mtaStartDate}
                onChange={(e) => setMtaStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">MTA End Date</label>
              <input
                type="date"
                value={mtaEndDate}
                onChange={(e) => setMtaEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Plan Manager Name</label>
              <input
                type="text"
                value={mtaPlanManagerName}
                onChange={(e) => setMtaPlanManagerName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="e.g. My Integra"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Plan Manager Email</label>
              <input
                type="text"
                value={mtaPlanManagerEmail}
                onChange={(e) => setMtaPlanManagerEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="e.g. choiceandcontrol@myintegra.com.au"
              />
            </div>
          </div>

          {/* Selected Participant Details */}
          {selectedParticipant && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-white font-medium mb-3">Participant Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Name</p>
                  <p className="text-white">{selectedParticipant.firstName} {selectedParticipant.lastName}</p>
                </div>
                <div>
                  <p className="text-gray-400">NDIS Number</p>
                  <p className="text-white">{selectedParticipant.ndisNumber}</p>
                </div>
                <div>
                  <p className="text-gray-400">Move-in Date</p>
                  <p className="text-white">
                    {selectedParticipant.moveInDate
                      ? new Date(selectedParticipant.moveInDate).toLocaleDateString("en-AU")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Property</p>
                  <p className="text-white">
                    {selectedParticipant.property?.propertyName || selectedParticipant.property?.addressLine1 || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Dwelling</p>
                  <p className="text-white">{selectedParticipant.dwelling?.dwellingName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-400">SDA Amount (Annual)</p>
                  <p className="text-green-400 font-medium">
                    {selectedParticipant.dwelling?.sdaRegisteredAmount
                      ? formatCurrency(selectedParticipant.dwelling.sdaRegisteredAmount)
                      : "Not set"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Document Generation Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-600 rounded-lg">
              <h3 className="text-white font-medium mb-2">SDA Quotation (Letter of Offer)</h3>
              <p className="text-gray-400 text-sm mb-4">
                Generate a quotation showing SDA funding amount and RRC breakdown for the participant.
              </p>
              <button
                onClick={generateSdaQuotation}
                disabled={!selectedParticipant || isGenerating}
                className="w-full px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isGenerating ? "Generating..." : "Generate SDA Quotation"}
              </button>
            </div>

            <div className="p-4 border border-gray-600 rounded-lg">
              <h3 className="text-white font-medium mb-2">Accommodation Agreement</h3>
              <p className="text-gray-400 text-sm mb-4">
                Generate the formal accommodation agreement document for signing.
                {!selectedDwelling && selectedParticipant && (
                  <span className="text-yellow-400 block mt-1">Please select a dwelling above.</span>
                )}
              </p>
              <button
                onClick={generateAccommodationAgreement}
                disabled={!selectedParticipant || !selectedDwelling || isGenerating}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isGenerating ? "Generating..." : "Generate Agreement"}
              </button>
            </div>

            <div className="p-4 border border-gray-600 rounded-lg">
              <h3 className="text-white font-medium mb-2">Schedule of Supports (MTA)</h3>
              <p className="text-gray-400 text-sm mb-4">
                Generate MTA Schedule of Supports for plan manager claiming.
                {!mtaStartDate && selectedParticipant && (
                  <span className="text-yellow-400 block mt-1">Please enter MTA start and end dates above.</span>
                )}
              </p>
              <button
                onClick={generateMtaSchedule}
                disabled={!selectedParticipant || !mtaStartDate || !mtaEndDate || isGenerating}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isGenerating ? "Generating..." : "Generate MTA Schedule"}
              </button>
            </div>
          </div>

          {!selectedParticipant && (
            <p className="text-gray-400 text-sm mt-4 text-center">
              Select a participant and dwelling above to generate documents.
            </p>
          )}
        </div>
      </main>

      {/* AI Import Modal */}
      {showAiImport && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI-Powered NDIS Plan Import
                </h2>
                <p className="text-gray-400 text-sm">Upload an NDIS plan to automatically extract participant details</p>
              </div>
              <button
                onClick={() => setShowAiImport(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Progress Steps */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${aiImportStep === "upload" ? "bg-purple-600" : "bg-green-600"} text-white font-medium`}>
                    {aiImportStep === "upload" ? "1" : "✓"}
                  </div>
                  <span className={`ml-2 ${aiImportStep === "upload" ? "text-white" : "text-gray-400"}`}>Upload</span>
                </div>
                <div className={`w-16 h-1 mx-2 ${aiImportStep !== "upload" ? "bg-green-600" : "bg-gray-600"}`} />
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${aiImportStep === "review" ? "bg-purple-600" : aiImportStep === "confirm" ? "bg-green-600" : "bg-gray-600"} text-white font-medium`}>
                    {aiImportStep === "confirm" ? "✓" : "2"}
                  </div>
                  <span className={`ml-2 ${aiImportStep === "review" ? "text-white" : "text-gray-400"}`}>Review</span>
                </div>
                <div className={`w-16 h-1 mx-2 ${aiImportStep === "confirm" ? "bg-green-600" : "bg-gray-600"}`} />
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${aiImportStep === "confirm" ? "bg-purple-600" : "bg-gray-600"} text-white font-medium`}>
                    3
                  </div>
                  <span className={`ml-2 ${aiImportStep === "confirm" ? "text-white" : "text-gray-400"}`}>Confirm</span>
                </div>
              </div>

              {/* Step 1: Upload */}
              {aiImportStep === "upload" && (
                <div className="space-y-6">
                  <div
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors relative ${
                      isParsing
                        ? "border-purple-500 bg-purple-900/20"
                        : isDragOver
                          ? "border-purple-400 bg-purple-900/30 ring-4 ring-purple-500/50"
                          : "border-gray-600 hover:border-purple-500"
                    }`}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Only set dragOver to false if we're leaving the container itself
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX;
                      const y = e.clientY;
                      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                        setIsDragOver(false);
                      }
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(false);

                      const file = e.dataTransfer.files?.[0];
                      if (!file) return;

                      // Validate file type
                      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
                        setParseError("Please upload a PDF or image file");
                        return;
                      }

                      setIsParsing(true);
                      setParseError(null);

                      try {
                        const reader = new FileReader();
                        reader.onload = async () => {
                          const base64 = (reader.result as string).split(",")[1];
                          try {
                            const result = await parseNdisPlanWithVision({
                              fileBase64: base64,
                              mediaType: file.type,
                            });
                            setExtractedData(result);
                            setEditedParticipant(result.participant);
                            setEditedPlan(result.plan);
                            setAiImportStep("review");
                          } catch (err: any) {
                            setParseError(err.message || "Failed to parse document");
                          } finally {
                            setIsParsing(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      } catch (err: any) {
                        setParseError(err.message || "Failed to read file");
                        setIsParsing(false);
                      }
                    }}
                  >
                    {/* Drag overlay */}
                    {isDragOver && !isParsing && (
                      <div className="absolute inset-0 bg-purple-600/20 rounded-lg flex items-center justify-center z-10 pointer-events-none">
                        <div className="text-center">
                          <svg className="w-16 h-16 mx-auto text-purple-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-purple-300 font-medium text-lg">Drop to upload</p>
                        </div>
                      </div>
                    )}

                    {isParsing ? (
                      <div className="space-y-4">
                        <div className="w-16 h-16 mx-auto border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-white font-medium">Analyzing document with AI...</p>
                        <p className="text-gray-400 text-sm">This may take a moment</p>
                      </div>
                    ) : (
                      <>
                        <input
                          ref={aiFileInputRef}
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setIsParsing(true);
                            setParseError(null);

                            try {
                              // Convert file to base64
                              const reader = new FileReader();
                              reader.onload = async () => {
                                const base64 = (reader.result as string).split(",")[1];
                                try {
                                  const result = await parseNdisPlanWithVision({
                                    fileBase64: base64,
                                    mediaType: file.type,
                                  });
                                  setExtractedData(result);
                                  setEditedParticipant(result.participant);
                                  setEditedPlan(result.plan);
                                  setAiImportStep("review");
                                } catch (err: any) {
                                  setParseError(err.message || "Failed to parse document");
                                } finally {
                                  setIsParsing(false);
                                }
                              };
                              reader.readAsDataURL(file);
                            } catch (err: any) {
                              setParseError(err.message || "Failed to read file");
                              setIsParsing(false);
                            }
                          }}
                        />
                        <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-white font-medium mb-2">Drop your NDIS plan here</p>
                        <p className="text-gray-400 text-sm mb-4">or click to browse (PDF or image)</p>
                        <button
                          onClick={() => aiFileInputRef.current?.click()}
                          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                          Select File
                        </button>
                      </>
                    )}
                  </div>

                  {parseError && (
                    <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
                      <p className="text-red-400 font-medium">Error parsing document</p>
                      <p className="text-red-300 text-sm mt-1">{parseError}</p>
                    </div>
                  )}

                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2">Supported Documents</h4>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• NDIS Plan PDFs (official NDIS documents)</li>
                      <li>• Scanned plan documents (images)</li>
                      <li>• Plan manager correspondence with plan details</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Step 2: Review */}
              {aiImportStep === "review" && editedParticipant && editedPlan && (
                <div className="space-y-6">
                  {/* Confidence & Warnings */}
                  {extractedData && (
                    <div className="flex gap-4 mb-4">
                      <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-lg">
                        <span className="text-gray-400 text-sm">Confidence:</span>
                        <span className={`font-medium ${extractedData.confidence >= 0.8 ? "text-green-400" : extractedData.confidence >= 0.5 ? "text-yellow-400" : "text-red-400"}`}>
                          {Math.round(extractedData.confidence * 100)}%
                        </span>
                      </div>
                      {extractedData.warnings.length > 0 && (
                        <div className="flex-1 bg-yellow-900/30 border border-yellow-600 rounded-lg px-3 py-1">
                          <span className="text-yellow-400 text-sm">{extractedData.warnings.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Participant Details */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-4">Participant Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">First Name *</label>
                        <input
                          type="text"
                          value={editedParticipant.firstName}
                          onChange={(e) => setEditedParticipant({ ...editedParticipant, firstName: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Last Name *</label>
                        <input
                          type="text"
                          value={editedParticipant.lastName}
                          onChange={(e) => setEditedParticipant({ ...editedParticipant, lastName: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">NDIS Number *</label>
                        <input
                          type="text"
                          value={editedParticipant.ndisNumber}
                          onChange={(e) => setEditedParticipant({ ...editedParticipant, ndisNumber: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={editedParticipant.dateOfBirth || ""}
                          onChange={(e) => setEditedParticipant({ ...editedParticipant, dateOfBirth: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Email</label>
                        <input
                          type="email"
                          value={editedParticipant.email || ""}
                          onChange={(e) => setEditedParticipant({ ...editedParticipant, email: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={editedParticipant.phone || ""}
                          onChange={(e) => setEditedParticipant({ ...editedParticipant, phone: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Plan Details */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-4">Plan Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Plan Start Date *</label>
                        <input
                          type="date"
                          value={editedPlan.planStartDate || ""}
                          onChange={(e) => setEditedPlan({ ...editedPlan, planStartDate: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Plan End Date *</label>
                        <input
                          type="date"
                          value={editedPlan.planEndDate || ""}
                          onChange={(e) => setEditedPlan({ ...editedPlan, planEndDate: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">SDA Design Category *</label>
                        <select
                          value={editedPlan.sdaDesignCategory || ""}
                          onChange={(e) => setEditedPlan({ ...editedPlan, sdaDesignCategory: e.target.value as any })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        >
                          <option value="">Select category</option>
                          <option value="improved_liveability">Improved Liveability</option>
                          <option value="fully_accessible">Fully Accessible</option>
                          <option value="robust">Robust</option>
                          <option value="high_physical_support">High Physical Support</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">SDA Eligibility Type *</label>
                        <select
                          value={editedPlan.sdaEligibilityType || ""}
                          onChange={(e) => setEditedPlan({ ...editedPlan, sdaEligibilityType: e.target.value as any })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        >
                          <option value="">Select type</option>
                          <option value="standard">Standard</option>
                          <option value="higher_needs">Higher Needs</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Funding Management *</label>
                        <select
                          value={editedPlan.fundingManagementType || ""}
                          onChange={(e) => setEditedPlan({ ...editedPlan, fundingManagementType: e.target.value as any })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        >
                          <option value="">Select management type</option>
                          <option value="ndia_managed">NDIA Managed</option>
                          <option value="plan_managed">Plan Managed</option>
                          <option value="self_managed">Self Managed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Annual SDA Budget ($) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editedPlan.annualSdaBudget || ""}
                          onChange={(e) => setEditedPlan({ ...editedPlan, annualSdaBudget: parseFloat(e.target.value) || undefined })}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                      {editedPlan.fundingManagementType === "plan_managed" && (
                        <>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Plan Manager Name</label>
                            <input
                              type="text"
                              value={editedPlan.planManagerName || ""}
                              onChange={(e) => setEditedPlan({ ...editedPlan, planManagerName: e.target.value })}
                              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Plan Manager Email</label>
                            <input
                              type="email"
                              value={editedPlan.planManagerEmail || ""}
                              onChange={(e) => setEditedPlan({ ...editedPlan, planManagerEmail: e.target.value })}
                              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Support Item Number</label>
                        <input
                          type="text"
                          value={editedPlan.supportItemNumber || ""}
                          onChange={(e) => setEditedPlan({ ...editedPlan, supportItemNumber: e.target.value })}
                          placeholder="e.g. 01_052_0115_1_1"
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Raw Notes if any */}
                  {extractedData?.rawNotes && (
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-2">Additional Notes from Document</h3>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">{extractedData.rawNotes}</p>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => {
                        setAiImportStep("upload");
                        setExtractedData(null);
                      }}
                      className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setAiImportStep("confirm")}
                      disabled={!editedParticipant.firstName || !editedParticipant.lastName || !editedParticipant.ndisNumber}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Continue to Confirm
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {aiImportStep === "confirm" && editedParticipant && editedPlan && (
                <div className="space-y-6">
                  <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
                    <p className="text-green-400 font-medium">Almost done! Select a dwelling and move-in date to complete the import.</p>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-4">Participant Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Name</p>
                        <p className="text-white font-medium">{editedParticipant.firstName} {editedParticipant.lastName}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">NDIS Number</p>
                        <p className="text-white font-medium">{editedParticipant.ndisNumber}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Plan Dates</p>
                        <p className="text-white font-medium">{editedPlan.planStartDate} to {editedPlan.planEndDate}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Annual SDA Budget</p>
                        <p className="text-green-400 font-medium">${(editedPlan.annualSdaBudget || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Select Dwelling *</label>
                      <select
                        value={selectedAiDwellingId}
                        onChange={(e) => setSelectedAiDwellingId(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      >
                        <option value="">-- Select a dwelling --</option>
                        {allDwellings?.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.fullAddress} ({formatSdaCategory(d.sdaDesignCategory)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Move-in Date *</label>
                      <input
                        type="date"
                        value={aiMoveInDate}
                        onChange={(e) => setAiMoveInDate(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Claim Day of Month</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={aiClaimDay}
                        onChange={(e) => setAiClaimDay(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                      <p className="text-gray-400 text-xs mt-1">Day of the month when SDA claims are due</p>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setAiImportStep("review")}
                      className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={async () => {
                        if (!selectedAiDwellingId || !aiMoveInDate || !user) return;

                        setIsCreating(true);
                        try {
                          await createFromExtracted({
                            participant: {
                              firstName: editedParticipant.firstName,
                              lastName: editedParticipant.lastName,
                              ndisNumber: editedParticipant.ndisNumber,
                              dateOfBirth: editedParticipant.dateOfBirth || undefined,
                              email: editedParticipant.email || undefined,
                              phone: editedParticipant.phone || undefined,
                            },
                            plan: {
                              planStartDate: editedPlan.planStartDate || "",
                              planEndDate: editedPlan.planEndDate || "",
                              sdaDesignCategory: editedPlan.sdaDesignCategory || "improved_liveability",
                              sdaEligibilityType: editedPlan.sdaEligibilityType || "standard",
                              fundingManagementType: editedPlan.fundingManagementType || "ndia_managed",
                              planManagerName: editedPlan.planManagerName,
                              planManagerEmail: editedPlan.planManagerEmail,
                              planManagerPhone: editedPlan.planManagerPhone,
                              annualSdaBudget: editedPlan.annualSdaBudget || 0,
                              supportItemNumber: editedPlan.supportItemNumber,
                              claimDay: parseInt(aiClaimDay) || 1,
                            },
                            dwellingId: selectedAiDwellingId as Id<"dwellings">,
                            moveInDate: aiMoveInDate,
                            userId: user.id as Id<"users">,
                          });

                          // Success - close modal and reset
                          setShowAiImport(false);
                          setAiImportStep("upload");
                          setExtractedData(null);
                          setEditedParticipant(null);
                          setEditedPlan(null);
                          setSelectedAiDwellingId("");
                          setAiMoveInDate("");
                          await alertDialog("Participant created successfully!");
                        } catch (err: any) {
                          await alertDialog(`Error: ${err.message}`);
                        } finally {
                          setIsCreating(false);
                        }
                      }}
                      disabled={!selectedAiDwellingId || !aiMoveInDate || isCreating}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      {isCreating ? "Creating..." : "Create Participant"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
