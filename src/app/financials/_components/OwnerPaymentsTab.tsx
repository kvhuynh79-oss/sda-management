"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatCard } from "./StatCard";
import { formatCurrency } from "../_utils";

export function OwnerPaymentsTab({ userId }: { userId: string }) {
  const { alert: alertDialog } = useConfirmDialog();
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  const ownerPayments = useQuery(api.ownerPayments.getAll, { userId: userId as Id<"users"> });
  const properties = useQuery(api.properties.getAll, { userId: userId as Id<"users"> });
  const participants = useQuery(
    api.participants.getAll,
    { userId: userId as Id<"users"> }
  );
  const createOwnerPayment = useMutation(api.ownerPayments.create);

  const togglePropertyExpanded = (propertyName: string) => {
    setExpandedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propertyName)) {
        newSet.delete(propertyName);
      } else {
        newSet.add(propertyName);
      }
      return newSet;
    });
  };

  // Calculate suggested payment amount for a property
  const calculateSuggestedAmount = (propertyId: string) => {
    const property = properties?.find(p => p._id === propertyId);
    if (!property) return { sdaAmount: 0, rrcAmount: 0, managementFee: 0, netAmount: 0 };

    // Get participants at this property
    const propertyParticipants = participants?.filter(p => {
      const dwelling = p.dwelling;
      return dwelling && dwelling.propertyId === propertyId;
    }) || [];

    let totalSda = 0;
    let totalRrc = 0;

    for (const participant of propertyParticipants) {
      const plan = participant.currentPlan;
      if (plan) {
        totalSda += plan.monthlySdaAmount || 0;
        // Convert RRC to monthly if fortnightly
        const rrc = plan.reasonableRentContribution || 0;
        const rrcMonthly = plan.rentContributionFrequency === "fortnightly" ? rrc * 26 / 12 : rrc;
        totalRrc += rrcMonthly;
      }
    }

    const grossAmount = totalSda + totalRrc;
    const managementFeePercent = property.managementFeePercent || 0;
    const managementFee = grossAmount * (managementFeePercent / 100);
    const netAmount = grossAmount - managementFee;

    return { sdaAmount: totalSda, rrcAmount: totalRrc, managementFee, netAmount, managementFeePercent };
  };

  const filteredPayments = ownerPayments?.filter((payment) => {
    const matchesProperty = filterProperty === "all" || payment.propertyId === filterProperty;
    const matchesType = filterType === "all" || payment.paymentType === filterType;
    const matchesDateFrom = !dateFrom || payment.paymentDate >= dateFrom;
    const matchesDateTo = !dateTo || payment.paymentDate <= dateTo;
    return matchesProperty && matchesType && matchesDateFrom && matchesDateTo;
  });

  // Find properties with participants but no payment records
  const propertiesWithPayments = new Set(ownerPayments?.map(p => p.propertyId) || []);
  const propertiesWithParticipantsNoPayments = properties?.filter(property => {
    // Property not in payments list
    if (propertiesWithPayments.has(property._id)) return false;
    // Has at least one participant with a plan
    const propertyParticipants = participants?.filter(p => {
      const dwelling = p.dwelling;
      return dwelling && dwelling.propertyId === property._id;
    }) || [];
    return propertyParticipants.some(p => p.currentPlan?.monthlySdaAmount);
  }) || [];

  const generateOwnerStatement = async (propertyName: string, payments: NonNullable<typeof filteredPayments>) => {
    try {
      // Dynamic imports for PDF generation
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      // Use landscape orientation for the wide table
      const doc = new jsPDF({ orientation: "landscape" });
      const owner = payments[0]?.owner;
      const property = payments[0]?.property;
      const ownerName = owner?.companyName || `${owner?.firstName || ""} ${owner?.lastName || ""}`.trim() || "Unknown";

      // Get participants for this property
      const propertyParticipants = participants?.filter(p => {
        const dwelling = p.dwelling;
        return dwelling && dwelling.propertyId === property?._id;
      }) || [];

      // Generate past 12 months (historical, not projection)
      const monthPeriods: { label: string; monthKey: string }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        monthPeriods.push({ label, monthKey });
      }

      // Load logo with correct aspect ratio (positioned in top right)
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          logoImg.onload = () => {
            try {
              const naturalWidth = logoImg.naturalWidth;
              const naturalHeight = logoImg.naturalHeight;
              const maxWidth = 35;
              const aspectRatio = naturalWidth / naturalHeight;
              const height = maxWidth / aspectRatio;
              doc.addImage(logoImg, "JPEG", 250, 8, maxWidth, height);
            } catch {
              // Logo failed
            }
            resolve();
          };
          logoImg.onerror = () => resolve();
          logoImg.src = "/Logo.jpg";
          setTimeout(resolve, 1000);
        });
      } catch {
        // Continue without logo
      }

      // Owner name header (centered)
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(ownerName, 148, 12, { align: "center" });

      // Property address
      const propertyAddress = property?.addressLine1
        ? `${property.addressLine1}${property.suburb ? `, ${property.suburb}` : ""}${property.state ? ` ${property.state}` : ""}${property.postcode ? ` ${property.postcode}` : ""}`
        : propertyName;

      // Statement Title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("SDA RENTAL STATEMENT", 148, 20, { align: "center" });

      // Property address
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(propertyAddress, 148, 28, { align: "center" });

      // Statement period (historical)
      const startMonth = monthPeriods[0].label;
      const endMonth = monthPeriods[11].label;
      doc.setFontSize(10);
      doc.text(`Statement Period: ${startMonth} - ${endMonth}`, 148, 35, { align: "center" });

      let currentY = 45;
      let grandTotalSda = 0;
      let grandTotalRrc = 0;
      let grandTotalFee = 0;
      let grandTotalNet = 0;

      // Get management fee percent from property
      const managementFeePercent = property?.managementFeePercent || 30;

      // Special arrangement: if managementFeePercent is 100%, owner only gets RRC
      const isSpecialArrangement = managementFeePercent === 100;

      // Process each participant
      for (const participant of propertyParticipants) {
        const plan = participant.currentPlan;
        const dwelling = participant.dwelling;
        const participantName = `${participant.firstName} ${participant.lastName}`;
        const sdaCategory = dwelling?.sdaDesignCategory || "SDA";
        const annualSda = plan?.annualSdaBudget || (plan?.monthlySdaAmount ? plan.monthlySdaAmount * 12 : 0);
        const monthlySda = plan?.monthlySdaAmount || annualSda / 12;

        // Calculate RRC (combined, not split)
        const totalRrc = plan?.reasonableRentContribution || 0;
        const rrcFrequency = plan?.rentContributionFrequency || "fortnightly";
        const monthlyRrc = rrcFrequency === "fortnightly" ? totalRrc * 26 / 12 : totalRrc;

        // Check if need new page
        if (currentY > 140) {
          doc.addPage();
          currentY = 20;
        }

        // Participant header box
        doc.setFillColor(240, 240, 240);
        doc.rect(14, currentY, 269, 18, "F");
        doc.setDrawColor(200, 200, 200);
        doc.rect(14, currentY, 269, 18, "S");

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(participantName, 18, currentY + 6);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Address: ${propertyAddress}`, 18, currentY + 11);
        doc.text(`Dwelling: ${dwelling?.dwellingName || "Unit"} | SDA Category: ${sdaCategory}`, 18, currentY + 15);

        // Annual funding on right side
        doc.setFont("helvetica", "bold");
        doc.text(`Annual SDA Funding: ${formatCurrency(annualSda)}`, 270, currentY + 10, { align: "right" });

        currentY += 22;

        // Calculate monthly amounts based on arrangement type
        let monthlySubtotal: number;
        let monthlyFee: number;
        let monthlyNet: number;

        if (isSpecialArrangement) {
          monthlySubtotal = monthlySda + monthlyRrc;
          monthlyFee = monthlyRrc;
          monthlyNet = monthlySda;
        } else {
          monthlySubtotal = monthlySda + monthlyRrc;
          monthlyFee = monthlySubtotal * (managementFeePercent / 100);
          monthlyNet = monthlySubtotal - monthlyFee;
        }

        // Build table data with 12 historical month columns
        const planStartDate = plan?.planStartDate;
        const isMonthActive = (monthKey: string) => {
          if (!planStartDate) return true;
          const planYearMonth = planStartDate.substring(0, 7);
          return monthKey >= planYearMonth;
        };

        // Count active months for grand total calculation
        const activeMonthCount = monthPeriods.filter(m => isMonthActive(m.monthKey)).length;

        const tableHead = [["", ...monthPeriods.map(m => m.label)]];

        let tableBody;
        if (isSpecialArrangement) {
          tableBody = [
            ["SDA Funding", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlySda) : "-")],
            ["RRC (25% DSP + 100% CRA)", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlyRrc) : "-")],
            [{ content: "Subtotal Revenue", styles: { fontStyle: "bold" as const } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlySubtotal) : "-", styles: { fontStyle: "bold" as const } }))],
            ["Less: RRC to BLS (100%)", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? `(${formatCurrency(monthlyRrc)})` : "-")],
            [{ content: "Owner Share (SDA Only)", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlyNet) : "-", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }))],
          ];
        } else {
          tableBody = [
            ["SDA Funding", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlySda) : "-")],
            ["RRC (25% DSP + 100% CRA)", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlyRrc) : "-")],
            [{ content: "Subtotal Revenue", styles: { fontStyle: "bold" as const } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlySubtotal) : "-", styles: { fontStyle: "bold" as const } }))],
            [`Less: Provider Fee (${managementFeePercent}%)`, ...monthPeriods.map(m => isMonthActive(m.monthKey) ? `(${formatCurrency(monthlyFee)})` : "-")],
            [{ content: "Net to Owner", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlyNet) : "-", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }))],
          ];
        }

        autoTable(doc, {
          startY: currentY,
          head: tableHead,
          body: tableBody,
          theme: "grid",
          styles: { fontSize: 7, cellPadding: 1.5, halign: "right" },
          headStyles: { fillColor: [70, 130, 180], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
          columnStyles: {
            0: { cellWidth: 45, halign: "left" },
          },
          tableLineColor: [180, 180, 180],
          tableLineWidth: 0.1,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 50;

        // Accumulate grand totals (only active months)
        grandTotalSda += monthlySda * activeMonthCount;
        grandTotalRrc += monthlyRrc * activeMonthCount;
        grandTotalFee += monthlyFee * activeMonthCount;
        grandTotalNet += monthlyNet * activeMonthCount;
      }

      // Check if need new page for grand total
      if (currentY > 130) {
        doc.addPage();
        currentY = 20;
      }

      // Grand Total Section
      doc.setFillColor(50, 50, 50);
      doc.rect(14, currentY, 269, 8, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("GRAND TOTAL (12-Month Summary)", 18, currentY + 5.5);
      currentY += 12;

      // Grand total summary table - different for special arrangement
      const grandTotalBody = isSpecialArrangement ? [
        ["Total SDA Funding", formatCurrency(grandTotalSda)],
        ["Total RRC", formatCurrency(grandTotalRrc)],
        ["Gross Revenue", formatCurrency(grandTotalSda + grandTotalRrc)],
        ["Less: RRC to BLS (100%)", `(${formatCurrency(grandTotalRrc)})`],
        [{ content: "NET AMOUNT TO OWNER (SDA)", styles: { fontStyle: "bold" as const } }, { content: formatCurrency(grandTotalNet), styles: { fontStyle: "bold" as const } }],
      ] : [
        ["Total SDA Funding", formatCurrency(grandTotalSda)],
        ["Total RRC", formatCurrency(grandTotalRrc)],
        ["Gross Revenue", formatCurrency(grandTotalSda + grandTotalRrc)],
        [`Less: Provider Fee (${managementFeePercent}%)`, `(${formatCurrency(grandTotalFee)})`],
        [{ content: "NET AMOUNT TO OWNER", styles: { fontStyle: "bold" as const } }, { content: formatCurrency(grandTotalNet), styles: { fontStyle: "bold" as const } }],
      ];

      autoTable(doc, {
        startY: currentY,
        body: grandTotalBody,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 180 },
          1: { cellWidth: 60, halign: "right" },
        },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentY = (doc as any).lastAutoTable?.finalY + 10 || currentY + 40;

      // Payment History Section - Show actual payments made
      if (payments.length > 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("PAYMENTS MADE TO OWNER", 14, currentY);
        currentY += 4;

        const paymentRows = payments
          .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
          .map(p => [
            p.paymentDate,
            p.description || p.paymentType.replace("_", " "),
            p.bankReference || "-",
            formatCurrency(p.amount),
          ]);

        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        paymentRows.push([
          { content: "TOTAL PAID", styles: { fontStyle: "bold" as const } } as unknown as string,
          "",
          "",
          { content: formatCurrency(totalPaid), styles: { fontStyle: "bold" as const } } as unknown as string,
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [["Date", "Description", "Reference", "Amount"]],
          body: paymentRows,
          theme: "striped",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255], fontStyle: "bold" },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 100 },
            2: { cellWidth: 50 },
            3: { cellWidth: 40, halign: "right" },
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentY = (doc as any).lastAutoTable?.finalY + 10 || currentY + 40;
      }

      // Bank Details Section
      if (owner?.bankBsb && owner?.bankAccountNumber) {
        if (currentY > 170) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("PAYMENT DETAILS", 14, currentY);
        currentY += 6;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Account Name: ${owner.bankAccountName || ownerName}`, 14, currentY);
        doc.text(`BSB: ${owner.bankBsb}`, 14, currentY + 5);
        doc.text(`Account Number: ${owner.bankAccountNumber}`, 14, currentY + 10);
        currentY += 20;
      }

      // Notes Section
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 14, currentY);
      doc.setFont("helvetica", "normal");
      currentY += 4;

      const notes = isSpecialArrangement ? [
        "Special arrangement: SDA funding paid to owner, RRC retained by BLS",
        "RRC comprises 25% of Disability Support Pension + 100% Commonwealth Rent Assistance",
        "All amounts are in Australian Dollars (AUD)",
      ] : [
        "This statement shows historical revenue based on participant plans",
        "RRC comprises 25% of Disability Support Pension + 100% Commonwealth Rent Assistance",
        "All amounts are in Australian Dollars (AUD)",
      ];

      notes.forEach((note, i) => {
        doc.text(`\u2022 ${note}`, 14, currentY + (i * 4));
      });

      // Footer with page numbers
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${pageCount} | Generated: ${new Date().toLocaleDateString("en-AU")}`, 148, 200, { align: "center" });
      }

      const fileName = `SDA_Rental_Statement_-_${propertyName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toLocaleDateString("en-AU").replace(/\//g, "-")}.pdf`;
      doc.save(fileName);
    } catch (error) {
      await alertDialog(`Failed to generate statement: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Generate statement for property without payment records (using plan data)
  const generateStatementFromPlans = async (property: NonNullable<typeof properties>[0]) => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape" });
      const owner = property.owner;
      const ownerName = owner?.companyName || `${owner?.firstName || ""} ${owner?.lastName || ""}`.trim() || "Unknown";
      const propertyName = property.propertyName || property.addressLine1;

      // Get participants for this property
      const propertyParticipants = participants?.filter(p => {
        const dwelling = p.dwelling;
        return dwelling && dwelling.propertyId === property._id;
      }) || [];

      // Generate past 12 months
      const monthPeriods: { label: string; monthKey: string }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        monthPeriods.push({ label, monthKey });
      }

      // Load logo
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          logoImg.onload = () => {
            try {
              const naturalWidth = logoImg.naturalWidth;
              const naturalHeight = logoImg.naturalHeight;
              const maxWidth = 35;
              const aspectRatio = naturalWidth / naturalHeight;
              const height = maxWidth / aspectRatio;
              doc.addImage(logoImg, "JPEG", 250, 8, maxWidth, height);
            } catch {
              // Logo failed
            }
            resolve();
          };
          logoImg.onerror = () => resolve();
          logoImg.src = "/Logo.jpg";
          setTimeout(resolve, 1000);
        });
      } catch {
        // Continue without logo
      }

      // Header
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(ownerName, 148, 12, { align: "center" });

      const propertyAddress = `${property.addressLine1}${property.suburb ? `, ${property.suburb}` : ""}${property.state ? ` ${property.state}` : ""}${property.postcode ? ` ${property.postcode}` : ""}`;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("SDA RENTAL STATEMENT", 148, 20, { align: "center" });

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(propertyAddress, 148, 28, { align: "center" });

      const startMonth = monthPeriods[0].label;
      const endMonth = monthPeriods[11].label;
      doc.setFontSize(10);
      doc.text(`Statement Period: ${startMonth} - ${endMonth}`, 148, 35, { align: "center" });

      let currentY = 45;
      let grandTotalSda = 0;
      let grandTotalRrc = 0;
      let grandTotalFee = 0;
      let grandTotalNet = 0;

      const managementFeePercent = property.managementFeePercent || 30;
      const isSpecialArrangement = managementFeePercent === 100;

      for (const participant of propertyParticipants) {
        const plan = participant.currentPlan;
        const dwelling = participant.dwelling;
        const participantName = `${participant.firstName} ${participant.lastName}`;
        const sdaCategory = dwelling?.sdaDesignCategory || "SDA";
        const annualSda = plan?.annualSdaBudget || (plan?.monthlySdaAmount ? plan.monthlySdaAmount * 12 : 0);
        const monthlySda = plan?.monthlySdaAmount || annualSda / 12;

        const totalRrc = plan?.reasonableRentContribution || 0;
        const rrcFrequency = plan?.rentContributionFrequency || "fortnightly";
        const monthlyRrc = rrcFrequency === "fortnightly" ? totalRrc * 26 / 12 : totalRrc;

        if (currentY > 140) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFillColor(240, 240, 240);
        doc.rect(14, currentY, 269, 18, "F");
        doc.setDrawColor(200, 200, 200);
        doc.rect(14, currentY, 269, 18, "S");

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(participantName, 18, currentY + 6);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Address: ${propertyAddress}`, 18, currentY + 11);
        doc.text(`Dwelling: ${dwelling?.dwellingName || "Unit"} | SDA Category: ${sdaCategory}`, 18, currentY + 15);

        doc.setFont("helvetica", "bold");
        doc.text(`Annual SDA Funding: ${formatCurrency(annualSda)}`, 270, currentY + 10, { align: "right" });

        currentY += 22;

        let monthlySubtotal: number;
        let monthlyFee: number;
        let monthlyNet: number;

        if (isSpecialArrangement) {
          monthlySubtotal = monthlySda + monthlyRrc;
          monthlyFee = monthlyRrc;
          monthlyNet = monthlySda;
        } else {
          monthlySubtotal = monthlySda + monthlyRrc;
          monthlyFee = monthlySubtotal * (managementFeePercent / 100);
          monthlyNet = monthlySubtotal - monthlyFee;
        }

        // Check plan start date to only show amounts for active months
        const planStartDate = plan?.planStartDate;
        const isMonthActive = (monthKey: string) => {
          if (!planStartDate) return true;
          const planYearMonth = planStartDate.substring(0, 7);
          return monthKey >= planYearMonth;
        };

        const activeMonthCount = monthPeriods.filter(m => isMonthActive(m.monthKey)).length;

        const tableHead = [["", ...monthPeriods.map(m => m.label)]];

        let tableBody;
        if (isSpecialArrangement) {
          tableBody = [
            ["SDA Funding", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlySda) : "-")],
            ["RRC (25% DSP + 100% CRA)", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlyRrc) : "-")],
            [{ content: "Subtotal Revenue", styles: { fontStyle: "bold" as const } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlySubtotal) : "-", styles: { fontStyle: "bold" as const } }))],
            ["Less: RRC to BLS (100%)", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? `(${formatCurrency(monthlyRrc)})` : "-")],
            [{ content: "Owner Share (SDA Only)", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlyNet) : "-", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }))],
          ];
        } else {
          tableBody = [
            ["SDA Funding", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlySda) : "-")],
            ["RRC (25% DSP + 100% CRA)", ...monthPeriods.map(m => isMonthActive(m.monthKey) ? formatCurrency(monthlyRrc) : "-")],
            [{ content: "Subtotal Revenue", styles: { fontStyle: "bold" as const } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlySubtotal) : "-", styles: { fontStyle: "bold" as const } }))],
            [`Less: Provider Fee (${managementFeePercent}%)`, ...monthPeriods.map(m => isMonthActive(m.monthKey) ? `(${formatCurrency(monthlyFee)})` : "-")],
            [{ content: "Net to Owner", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }, ...monthPeriods.map(m => ({ content: isMonthActive(m.monthKey) ? formatCurrency(monthlyNet) : "-", styles: { fontStyle: "bold" as const, fillColor: [230, 230, 230] as [number, number, number] } }))],
          ];
        }

        autoTable(doc, {
          startY: currentY,
          head: tableHead,
          body: tableBody,
          theme: "grid",
          styles: { fontSize: 7, cellPadding: 1.5, halign: "right" },
          headStyles: { fillColor: [70, 130, 180], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
          columnStyles: { 0: { cellWidth: 45, halign: "left" } },
          tableLineColor: [180, 180, 180],
          tableLineWidth: 0.1,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 50;

        grandTotalSda += monthlySda * activeMonthCount;
        grandTotalRrc += monthlyRrc * activeMonthCount;
        grandTotalFee += monthlyFee * activeMonthCount;
        grandTotalNet += monthlyNet * activeMonthCount;
      }

      // Grand Total Section
      if (currentY > 150) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("ANNUAL SUMMARY", 14, currentY);
      currentY += 6;

      const summaryBody = isSpecialArrangement
        ? [
            ["Total SDA Funding (Annual)", formatCurrency(grandTotalSda)],
            ["Total RRC (Annual)", formatCurrency(grandTotalRrc)],
            ["Total Revenue", formatCurrency(grandTotalSda + grandTotalRrc)],
            ["Less: RRC to BLS", `(${formatCurrency(grandTotalFee)})`],
            [{ content: "NET AMOUNT TO OWNER (SDA)", styles: { fontStyle: "bold" as const, fillColor: [200, 230, 200] as [number, number, number] } }, { content: formatCurrency(grandTotalNet), styles: { fontStyle: "bold" as const, fillColor: [200, 230, 200] as [number, number, number] } }],
          ]
        : [
            ["Total SDA Funding (Annual)", formatCurrency(grandTotalSda)],
            ["Total RRC (Annual)", formatCurrency(grandTotalRrc)],
            ["Total Revenue", formatCurrency(grandTotalSda + grandTotalRrc)],
            [`Less: Provider Fee (${managementFeePercent}%)`, `(${formatCurrency(grandTotalFee)})`],
            [{ content: "NET AMOUNT TO OWNER", styles: { fontStyle: "bold" as const, fillColor: [200, 230, 200] as [number, number, number] } }, { content: formatCurrency(grandTotalNet), styles: { fontStyle: "bold" as const, fillColor: [200, 230, 200] as [number, number, number] } }],
          ];

      autoTable(doc, {
        startY: currentY,
        body: summaryBody,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 120, halign: "left" }, 1: { cellWidth: 60, halign: "right" } },
        tableLineColor: [180, 180, 180],
        tableLineWidth: 0.1,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentY = (doc as any).lastAutoTable?.finalY + 10 || currentY + 40;

      // Bank Details
      if (owner?.bankBsb && owner?.bankAccountNumber) {
        if (currentY > 170) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("PAYMENT DETAILS", 14, currentY);
        currentY += 6;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Account Name: ${owner.bankAccountName || ownerName}`, 14, currentY);
        doc.text(`BSB: ${owner.bankBsb}`, 14, currentY + 5);
        doc.text(`Account Number: ${owner.bankAccountNumber}`, 14, currentY + 10);
        currentY += 20;
      }

      // Notes
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 14, currentY);
      doc.setFont("helvetica", "normal");
      currentY += 4;

      const notes = isSpecialArrangement
        ? [
            "Special arrangement: SDA funding paid to owner, RRC retained by BLS",
            "RRC comprises 25% of Disability Support Pension + 100% Commonwealth Rent Assistance",
            "All amounts are in Australian Dollars (AUD)",
          ]
        : [
            "This statement shows expected revenue based on participant plans",
            "RRC comprises 25% of Disability Support Pension + 100% Commonwealth Rent Assistance",
            "All amounts are in Australian Dollars (AUD)",
          ];

      notes.forEach((note, i) => {
        doc.text(`\u2022 ${note}`, 14, currentY + i * 4);
      });

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${pageCount} | Generated: ${new Date().toLocaleDateString("en-AU")}`, 148, 200, { align: "center" });
      }

      const fileName = `SDA_Rental_Statement_-_${propertyName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toLocaleDateString("en-AU").replace(/\//g, "-")}.pdf`;
      doc.save(fileName);
    } catch (error) {
      await alertDialog(`Failed to generate statement: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const totalAmount = filteredPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  const getPaymentTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      interim: "bg-orange-600 text-white",
      sda_share: "bg-teal-700 text-white",
      rent_contribution: "bg-purple-600 text-white",
      other: "bg-gray-600 text-white",
    };
    const labels: Record<string, string> = {
      interim: "Interim",
      sda_share: "SDA Share",
      rent_contribution: "RRC",
      other: "Other",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[type] || "bg-gray-600 text-white"}`}>
        {labels[type] || type}
      </span>
    );
  };

  // Group payments by property
  const paymentsByProperty = filteredPayments?.reduce<Record<string, typeof filteredPayments>>((acc, payment) => {
    const propertyName = payment.property?.propertyName || payment.property?.addressLine1 || "Unknown";
    if (!acc[propertyName]) acc[propertyName] = [];
    acc[propertyName].push(payment);
    return acc;
  }, {});

  return (
    <div>
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 mr-4">
          <StatCard label="Total Disbursements" value={formatCurrency(totalAmount)} color="blue" />
          <StatCard label="Total Payments" value={(filteredPayments?.length || 0).toString()} color="green" />
          <StatCard label="Properties" value={Object.keys(paymentsByProperty || {}).length.toString()} color="yellow" />
        </div>
        <button
          onClick={() => setShowAddPaymentModal(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Payment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Properties</option>
            {properties?.map((property) => (
              <option key={property._id} value={property._id}>
                {property.propertyName || property.addressLine1}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Types</option>
            <option value="interim">Interim</option>
            <option value="sda_share">SDA Share</option>
            <option value="rent_contribution">Rent Contribution</option>
            <option value="other">Other</option>
          </select>
          <div>
            <label className="block text-xs text-gray-400 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>
      </div>

      {/* Payments by Property */}
      {!filteredPayments ? (
        <div className="text-gray-400 text-center py-8">Loading...</div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-400">No owner disbursements found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paymentsByProperty && Object.entries(paymentsByProperty).map(([propertyName, payments]) => {
            const propertyTotal = payments.reduce((sum, p) => sum + p.amount, 0);
            const owner = payments[0]?.owner;
            const isExpanded = expandedProperties.has(propertyName);
            return (
              <div key={propertyName} className="bg-gray-800 rounded-lg overflow-hidden">
                <div
                  className="bg-gray-700 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-650"
                  onClick={() => togglePropertyExpanded(propertyName)}
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div>
                      <h4 className="text-white font-medium">{propertyName}</h4>
                      <p className="text-gray-400 text-sm">
                        Owner: {owner?.companyName || `${owner?.firstName || ""} ${owner?.lastName || ""}`.trim() || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white font-medium">{formatCurrency(propertyTotal)}</p>
                      <p className="text-gray-400 text-sm">{payments.length} payment(s)</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); generateOwnerStatement(propertyName, payments); }}
                      className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded-lg flex items-center gap-2"
                      title="Generate PDF Statement"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Statement
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="overflow-x-auto"><table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Reference</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {payments.map((payment) => (
                        <tr key={payment._id} className="hover:bg-gray-700">
                          <td className="px-4 py-3 text-white text-sm">{payment.paymentDate}</td>
                          <td className="px-4 py-3">{getPaymentTypeBadge(payment.paymentType)}</td>
                          <td className="px-4 py-3 text-gray-400 text-sm">{payment.description || "-"}</td>
                          <td className="px-4 py-3 text-gray-400 text-sm">{payment.bankReference || "-"}</td>
                          <td className="px-4 py-3 text-right text-green-400 text-sm font-medium">{formatCurrency(payment.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Properties with participants but no payment records */}
      {propertiesWithParticipantsNoPayments.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Properties Awaiting Payment Records
          </h3>
          <div className="space-y-4">
            {propertiesWithParticipantsNoPayments.map((property) => {
              const suggested = calculateSuggestedAmount(property._id);
              const owner = property.owner;
              const propertyName = property.propertyName || property.addressLine1;
              const propertyParticipants = participants?.filter(p => {
                const dwelling = p.dwelling;
                return dwelling && dwelling.propertyId === property._id;
              }) || [];

              return (
                <div key={property._id} className="bg-gray-800 rounded-lg overflow-hidden border border-yellow-600/30">
                  <div className="bg-gray-700 px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full ring-2 ring-yellow-500/40 ring-offset-1 ring-offset-gray-700" />
                      <div>
                        <h4 className="text-white font-medium">{propertyName}</h4>
                        <p className="text-gray-400 text-sm">
                          Owner: {owner?.companyName || `${owner?.firstName || ""} ${owner?.lastName || ""}`.trim() || "Unknown"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-yellow-400 font-medium">{formatCurrency(suggested.netAmount)}/mo expected</p>
                        <p className="text-gray-400 text-sm">{propertyParticipants.length} participant(s)</p>
                      </div>
                      <button
                        onClick={() => generateStatementFromPlans(property)}
                        className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded-lg flex items-center gap-2"
                        title="Generate PDF Statement from Plan Data"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Statement
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-gray-700 text-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-300">
                      <div>
                        <span className="text-gray-400">Monthly SDA:</span> {formatCurrency(suggested.sdaAmount)}
                      </div>
                      <div>
                        <span className="text-gray-400">Monthly RRC:</span> {formatCurrency(suggested.rrcAmount)}
                      </div>
                      <div>
                        <span className="text-gray-400">Mgmt Fee ({suggested.managementFeePercent}%):</span> ({formatCurrency(suggested.managementFee)})
                      </div>
                      <div>
                        <span className="text-gray-400">Net to Owner:</span> <span className="text-green-400 font-medium">{formatCurrency(suggested.netAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPaymentModal && (
        <AddOwnerPaymentModal
          properties={properties || []}
          calculateSuggestedAmount={calculateSuggestedAmount}
          formatCurrency={formatCurrency}
          onClose={() => setShowAddPaymentModal(false)}
          onSubmit={async (data) => {
            try {
              await createOwnerPayment({
                userId: userId as Id<"users">,
                propertyId: data.propertyId as Id<"properties">,
                ownerId: data.ownerId as Id<"owners">,
                paymentType: data.paymentType as "interim" | "sda_share" | "rent_contribution" | "other",
                amount: data.amount,
                paymentDate: data.paymentDate,
                bankReference: data.bankReference || undefined,
                description: data.description || undefined,
                notes: data.notes || undefined,
              });
              setShowAddPaymentModal(false);
            } catch (error) {
              await alertDialog("Failed to create payment");
            }
          }}
        />
      )}
    </div>
  );
}

// Add Owner Payment Modal Component
function AddOwnerPaymentModal({
  properties,
  calculateSuggestedAmount,
  formatCurrency: fmtCurrency,
  onClose,
  onSubmit,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Array<any>;
  calculateSuggestedAmount: (propertyId: string) => { sdaAmount: number; rrcAmount: number; managementFee: number; netAmount: number; managementFeePercent?: number };
  formatCurrency: (amount: number) => string;
  onClose: () => void;
  onSubmit: (data: { propertyId: string; ownerId: string; paymentType: string; amount: number; paymentDate: string; bankReference?: string; description?: string; notes?: string }) => void;
}) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [paymentType, setPaymentType] = useState<string>("sda_share");
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [bankReference, setBankReference] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const selectedProperty = properties.find(p => p._id === selectedPropertyId);
  const suggested = selectedPropertyId ? calculateSuggestedAmount(selectedPropertyId) : null;

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    if (propertyId) {
      const calc = calculateSuggestedAmount(propertyId);
      setAmount(calc.netAmount.toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId || !amount) return;

    onSubmit({
      propertyId: selectedPropertyId,
      ownerId: selectedProperty?.ownerId || selectedProperty?.owner?._id || "",
      paymentType,
      amount: parseFloat(amount),
      paymentDate,
      bankReference: bankReference || undefined,
      description: description || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Add Owner Payment</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Selection */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Property *</label>
            <select
              value={selectedPropertyId}
              onChange={(e) => handlePropertyChange(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="">Select property...</option>
              {properties.map((property) => (
                <option key={property._id} value={property._id}>
                  {property.propertyName || property.addressLine1}
                </option>
              ))}
            </select>
          </div>

          {/* Suggested Amount Breakdown */}
          {suggested && selectedPropertyId && (
            <div className="bg-gray-700 rounded-lg p-3 text-sm">
              <p className="text-gray-300 font-medium mb-2">Suggested Calculation:</p>
              <div className="space-y-1 text-gray-400">
                <div className="flex justify-between">
                  <span>Monthly SDA:</span>
                  <span className="text-white">{fmtCurrency(suggested.sdaAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly RRC:</span>
                  <span className="text-white">{fmtCurrency(suggested.rrcAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-600 pt-1">
                  <span>Gross:</span>
                  <span className="text-white">{fmtCurrency(suggested.sdaAmount + suggested.rrcAmount)}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Management Fee ({suggested.managementFeePercent || 0}%):</span>
                  <span>-{fmtCurrency(suggested.managementFee)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-600 pt-1 font-medium">
                  <span className="text-green-400">Net to Owner:</span>
                  <span className="text-green-400">{fmtCurrency(suggested.netAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Type */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Payment Type *</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="sda_share">SDA Share</option>
              <option value="interim">Interim</option>
              <option value="rent_contribution">Rent Contribution</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Amount *</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Payment Date *</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Bank Reference */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Bank Reference</label>
            <input
              type="text"
              value={bankReference}
              onChange={(e) => setBankReference(e.target.value)}
              placeholder="Optional"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Month ending January"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedPropertyId || !amount}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg"
            >
              Add Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
