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
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRrcSettings, setShowRrcSettings] = useState(false);
  const [rrcFormData, setRrcFormData] = useState({
    dspFortnightlyRate: "1047.70",
    dspPercentage: "25",
    craFortnightlyRate: "230.80",
    craPercentage: "100",
  });

  const participants = useQuery(api.participants.getAll);
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

  const generateSdaQuotation = async () => {
    if (!selectedParticipant || !rrcCalculation) return;

    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Header
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Better Living Solutions P/L", pageWidth - margin, y, { align: "right" });
      y += 5;
      doc.text("ABN: 87 630 237 277", pageWidth - margin, y, { align: "right" });
      y += 5;
      doc.text("NDIS Provider: 405 005 2336", pageWidth - margin, y, { align: "right" });
      y += 15;

      // Title
      doc.setFontSize(18);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("SDA QUOTATION", pageWidth / 2, y, { align: "center" });
      y += 5;
      doc.setFontSize(14);
      doc.text("Letter of Offer", pageWidth / 2, y, { align: "center" });
      y += 15;

      // Date
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const today = new Date().toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      doc.text(`Date: ${today}`, margin, y);
      y += 15;

      // Participant Details
      doc.setFont("helvetica", "bold");
      doc.text("PARTICIPANT DETAILS", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${selectedParticipant.firstName} ${selectedParticipant.lastName}`, margin, y);
      y += 5;
      doc.text(`NDIS Number: ${selectedParticipant.ndisNumber}`, margin, y);
      y += 15;

      // Property Details
      doc.setFont("helvetica", "bold");
      doc.text("ACCOMMODATION DETAILS", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");

      const dwelling = selectedParticipant.dwelling;
      const property = selectedParticipant.property;

      if (property) {
        doc.text(`Property: ${property.propertyName || property.addressLine1}`, margin, y);
        y += 5;
        doc.text(`Address: ${property.addressLine1}${property.addressLine2 ? ", " + property.addressLine2 : ""}`, margin, y);
        y += 5;
        doc.text(`         ${property.suburb}, ${property.state} ${property.postcode}`, margin, y);
        y += 5;
      }

      if (dwelling) {
        doc.text(`Dwelling: ${dwelling.dwellingName}`, margin, y);
        y += 5;
        doc.text(`SDA Design Category: ${dwelling.sdaDesignCategory?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}`, margin, y);
        y += 5;
        doc.text(`Building Type: ${dwelling.sdaBuildingType?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}`, margin, y);
        y += 5;
        doc.text(`Bedrooms: ${dwelling.bedrooms}`, margin, y);
        y += 15;
      }

      // SDA Funding
      doc.setFont("helvetica", "bold");
      doc.text("SDA FUNDING", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");

      const sdaAmount = dwelling?.sdaRegisteredAmount || 0;
      doc.text(`Annual SDA Amount: ${formatCurrency(sdaAmount)}`, margin, y);
      y += 5;
      doc.text(`Weekly SDA Amount: ${formatCurrency(sdaAmount / 52)}`, margin, y);
      y += 15;

      // RRC Breakdown
      doc.setFont("helvetica", "bold");
      doc.text("REASONABLE RENT CONTRIBUTION (RRC)", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");

      doc.text(`Disability Support Pension (Fortnightly): ${formatCurrency(rrcCalculation.dspFortnightlyRate)}`, margin, y);
      y += 5;
      doc.text(`DSP Contribution (${rrcCalculation.dspPercentage}%): ${formatCurrency(rrcCalculation.dspContribution)} per fortnight`, margin, y);
      y += 7;

      doc.text(`Commonwealth Rent Assistance (Max Fortnightly): ${formatCurrency(rrcCalculation.craFortnightlyRate)}`, margin, y);
      y += 5;
      doc.text(`CRA Contribution (${rrcCalculation.craPercentage}%): ${formatCurrency(rrcCalculation.craContribution)} per fortnight`, margin, y);
      y += 10;

      // Total RRC
      doc.setFont("helvetica", "bold");
      doc.text(`Total RRC (Fortnightly): ${formatCurrency(rrcCalculation.totalFortnightly)}`, margin, y);
      y += 5;
      doc.text(`Total RRC (Weekly): ${formatCurrency(rrcCalculation.totalWeekly)}`, margin, y);
      y += 5;
      doc.text(`Total RRC (Monthly): ${formatCurrency(rrcCalculation.totalMonthly)}`, margin, y);
      y += 5;
      doc.text(`Total RRC (Annual): ${formatCurrency(rrcCalculation.totalAnnual)}`, margin, y);
      y += 15;

      // Summary Box
      doc.setDrawColor(0);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, pageWidth - margin * 2, 35, "F");
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL WEEKLY CHARGES", margin + 5, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      const weeklyTotal = (sdaAmount / 52) + rrcCalculation.totalWeekly;
      doc.text(`SDA Funding (Weekly): ${formatCurrency(sdaAmount / 52)}`, margin + 5, y);
      y += 5;
      doc.text(`RRC (Weekly): ${formatCurrency(rrcCalculation.totalWeekly)}`, margin + 5, y);
      y += 7;
      doc.setFont("helvetica", "bold");
      doc.text(`Total Weekly: ${formatCurrency(weeklyTotal)}`, margin + 5, y);
      y += 20;

      // Notes
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("* RRC rates are based on current Centrelink rates and may change.", margin, y);
      y += 4;
      doc.text(`* Rates last updated: ${rrcCalculation.lastUpdated || "N/A"}`, margin, y);
      y += 10;

      // Footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text("This quotation is valid for 30 days from the date of issue.", margin, y);

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
    if (!selectedParticipant || !rrcCalculation) return;

    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Header
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Better Living Solutions P/L", pageWidth - margin, y, { align: "right" });
      y += 5;
      doc.text("ABN: 87 630 237 277", pageWidth - margin, y, { align: "right" });
      y += 15;

      // Title
      doc.setFontSize(18);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("SDA ACCOMMODATION AGREEMENT", pageWidth / 2, y, { align: "center" });
      y += 15;

      // Date
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const today = new Date().toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      doc.text(`Date: ${today}`, margin, y);
      y += 15;

      // Parties
      doc.setFont("helvetica", "bold");
      doc.text("PARTIES TO THIS AGREEMENT", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.text("Provider: Better Living Solutions P/L (ABN 87 630 237 277)", margin, y);
      y += 5;
      doc.text(`Participant: ${selectedParticipant.firstName} ${selectedParticipant.lastName}`, margin, y);
      y += 5;
      doc.text(`NDIS Number: ${selectedParticipant.ndisNumber}`, margin, y);
      y += 15;

      // Property Details
      doc.setFont("helvetica", "bold");
      doc.text("PROPERTY DETAILS", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");

      const dwelling = selectedParticipant.dwelling;
      const property = selectedParticipant.property;

      if (property) {
        doc.text(`Address: ${property.addressLine1}${property.addressLine2 ? ", " + property.addressLine2 : ""}`, margin, y);
        y += 5;
        doc.text(`         ${property.suburb}, ${property.state} ${property.postcode}`, margin, y);
        y += 5;
      }

      if (dwelling) {
        doc.text(`Dwelling: ${dwelling.dwellingName}`, margin, y);
        y += 5;
        doc.text(`SDA Category: ${dwelling.sdaDesignCategory?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}`, margin, y);
        y += 15;
      }

      // Agreement Terms
      doc.setFont("helvetica", "bold");
      doc.text("AGREEMENT TERMS", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");

      const moveInDate = selectedParticipant.moveInDate
        ? new Date(selectedParticipant.moveInDate).toLocaleDateString("en-AU")
        : "TBA";
      doc.text(`Commencement Date: ${moveInDate}`, margin, y);
      y += 5;
      doc.text("Agreement Type: Ongoing (no fixed end date)", margin, y);
      y += 15;

      // Payment Details
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT DETAILS", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");

      const sdaAmount = dwelling?.sdaRegisteredAmount || 0;
      doc.text(`SDA Funding (Annual): ${formatCurrency(sdaAmount)}`, margin, y);
      y += 5;
      doc.text(`Reasonable Rent Contribution (Weekly): ${formatCurrency(rrcCalculation.totalWeekly)}`, margin, y);
      y += 5;
      doc.text("Payment Frequency: Fortnightly in arrears", margin, y);
      y += 15;

      // RRC Breakdown
      doc.setFont("helvetica", "bold");
      doc.text("RRC BREAKDOWN", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.text(`DSP Contribution (${rrcCalculation.dspPercentage}% of ${formatCurrency(rrcCalculation.dspFortnightlyRate)}): ${formatCurrency(rrcCalculation.dspContribution)}/fortnight`, margin, y);
      y += 5;
      doc.text(`CRA Contribution (${rrcCalculation.craPercentage}% of ${formatCurrency(rrcCalculation.craFortnightlyRate)}): ${formatCurrency(rrcCalculation.craContribution)}/fortnight`, margin, y);
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.text(`Total RRC: ${formatCurrency(rrcCalculation.totalFortnightly)}/fortnight`, margin, y);
      y += 20;

      // Terms and Conditions
      doc.setFont("helvetica", "bold");
      doc.text("TERMS AND CONDITIONS", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const terms = [
        "1. The Participant agrees to pay the Reasonable Rent Contribution as specified above.",
        "2. The Provider will claim SDA funding directly from the NDIA on behalf of the Participant.",
        "3. Either party may terminate this agreement with 90 days written notice.",
        "4. The Participant agrees to comply with the house rules and policies provided.",
        "5. The Provider will maintain the property in accordance with SDA requirements.",
        "6. RRC rates may be adjusted when Centrelink rates change (usually March and September).",
      ];

      terms.forEach((term) => {
        const lines = doc.splitTextToSize(term, pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 4 + 3;
      });

      y += 10;

      // Signature Section
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("SIGNATURES", margin, y);
      y += 15;

      doc.setFont("helvetica", "normal");
      doc.text("Provider Representative:", margin, y);
      doc.line(margin + 45, y, margin + 120, y);
      y += 7;
      doc.text("Name:", margin, y);
      doc.line(margin + 15, y, margin + 80, y);
      doc.text("Date:", margin + 90, y);
      doc.line(margin + 105, y, margin + 150, y);
      y += 15;

      doc.text("Participant:", margin, y);
      doc.line(margin + 30, y, margin + 120, y);
      y += 7;
      doc.text("Name:", margin, y);
      doc.line(margin + 15, y, margin + 80, y);
      doc.text("Date:", margin + 90, y);
      doc.line(margin + 105, y, margin + 150, y);

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
              </p>
              <button
                onClick={generateAccommodationAgreement}
                disabled={!selectedParticipant || isGenerating}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isGenerating ? "Generating..." : "Generate Agreement"}
              </button>
            </div>
          </div>

          {!selectedParticipant && (
            <p className="text-gray-500 text-sm mt-4 text-center">
              Select a participant above to generate documents.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
