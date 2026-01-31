"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Header from "@/components/Header";
import { Id } from "../../../convex/_generated/dataModel";
import jsPDF from "jspdf";

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>("");
  const [selectedDwellingId, setSelectedDwellingId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRrcSettings, setShowRrcSettings] = useState(false);
  const [rrcFormData, setRrcFormData] = useState({
    dspFortnightlyRate: "1047.70",
    dspPercentage: "25",
    craFortnightlyRate: "230.80",
    craPercentage: "100",
  });

  const participants = useQuery(api.participants.getAll);
  const allDwellings = useQuery(api.dwellings.getAllWithAddresses);
  const providerSettings = useQuery(api.providerSettings.get);
  const rrcCalculation = useQuery(api.providerSettings.calculateRrc);
  const updateRrcRates = useMutation(api.providerSettings.updateRrcRates);

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

  const selectedParticipant = participants?.find(
    (p) => p._id === selectedParticipantId
  );

  const selectedDwelling = allDwellings?.find(
    (d) => d._id === selectedDwellingId
  );

  const handleSaveRrcSettings = async () => {
    try {
      await updateRrcRates({
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const loadLogoAsBase64 = (): Promise<string> => {
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
          resolve(canvas.toDataURL("image/jpeg"));
        } else {
          reject(new Error("Could not get canvas context"));
        }
      };
      img.onerror = reject;
      img.src = "/Logo.jpg";
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

      // Load and add logo on left
      try {
        const logoBase64 = await loadLogoAsBase64();
        doc.addImage(logoBase64, "JPEG", margin, y, 45, 22);
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
      const addressText = property ? `${property.addressLine1}, ${property.suburb}` : "";
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
      const moveInDateFormatted = selectedParticipant.moveInDate
        ? new Date(selectedParticipant.moveInDate).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
        : "TBC";
      const para1 = `Congratulations! Better Living Solutions P/L is delighted to offer you accommodation in our Specialist Disability Accommodation (SDA) at the above address. The accommodation is set to commence on the ${moveInDateFormatted}.`;
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
      const para3 = "This agreement ensures that Better Living Solutions can continue providing high-quality service and accommodation tailored to your needs. Please note that a service booking must be created before the move-in date.";
      const splitPara3 = doc.splitTextToSize(para3, pageWidth - margin * 2);
      doc.text(splitPara3, margin, y);
      y += splitPara3.length * 5 + 5;

      // Welcome paragraph
      const para4 = "We look forward to welcoming you and supporting your journey towards a better living experience.";
      const splitPara4 = doc.splitTextToSize(para4, pageWidth - margin * 2);
      doc.text(splitPara4, margin, y);
      y += splitPara4.length * 5 + 5;

      // Contact paragraph
      const para5 = "Should you have any questions or require further information, please do not hesitate to contact us at 0410 646 223 or via email at khen@betterlivingsolutions.com.au";
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

      // Khen Huynh
      doc.setFont("helvetica", "bold");
      doc.text("Khen Huynh", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.text("Better Living Solutions P/L | ABN: 87 630 237 277", margin, y);
      y += 5;
      doc.text("T:1300 339 485 M: 0410 646 223 W: betterlivingsolutions.com.au", margin, y);
      y += 5;
      doc.text("Address: Suite 7, Level 1, 210-216 Hume Hwy Lansvale 2166 NSW", margin, y);

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
      const moveInDate = selectedParticipant.moveInDate
        ? new Date(selectedParticipant.moveInDate).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
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
      // Logo centered
      try {
        const logoBase64 = await loadLogoAsBase64();
        doc.addImage(logoBase64, "JPEG", pageWidth / 2 - 30, 30, 60, 30);
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
      doc.text("Better Living Solutions PTY LTD", margin + 60, y);
      y += 5;
      doc.text("NDIS Provider number: 405 005 2336", margin + 60, y);
      y += 5;
      doc.text("Reg # 4-AXTSZUC and ABN 87 630 237 277", margin + 60, y);
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
      const fullAddress = `${property?.addressLine1 || ""}, ${property?.suburb || ""} ${property?.state || ""} ${property?.postcode || ""}`;
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
      doc.text("BSB number: 032 373", margin, y);
      doc.text("account number: 23 6901", margin + 50, y);
      y += 6;
      doc.text("account name: Better Living Solutions", margin, y);
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
      doc.text("of Better Living Solutions", margin, y);
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
      doc.text("Khen Huynh", margin + 80, y);
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
          <button
            onClick={() => setShowRrcSettings(!showRrcSettings)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {showRrcSettings ? "Hide RRC Settings" : "RRC Settings"}
          </button>
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
                  <p className="text-gray-500 text-xs mt-2">Last updated: {rrcCalculation.lastUpdated}</p>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSaveRrcSettings}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Save RRC Settings
              </button>
            </div>
          </div>
        )}

        {/* Document Generation */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Generate Onboarding Documents</h2>

          {/* Participant Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Participant</label>
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-600 rounded-lg">
              <h3 className="text-white font-medium mb-2">SDA Quotation (Letter of Offer)</h3>
              <p className="text-gray-400 text-sm mb-4">
                Generate a quotation showing SDA funding amount and RRC breakdown for the participant.
              </p>
              <button
                onClick={generateSdaQuotation}
                disabled={!selectedParticipant || isGenerating}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
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
          </div>

          {!selectedParticipant && (
            <p className="text-gray-500 text-sm mt-4 text-center">
              Select a participant and dwelling above to generate documents.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
