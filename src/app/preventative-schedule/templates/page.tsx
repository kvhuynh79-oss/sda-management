"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../../convex/_generated/dataModel";

const SDA_TEMPLATES = [
  {
    name: "Air Conditioning Service",
    frequency: "Every 4 months",
    category: "Appliances",
    statutory: false,
    cost: "$150",
  },
  {
    name: "Electrical Switchboard & Test & Tag",
    frequency: "Annually",
    category: "Electrical",
    statutory: true,
    cost: "$250",
  },
  {
    name: "Thermostatic Mixing Valves (TMV) Service",
    frequency: "Annually",
    category: "Plumbing",
    statutory: true,
    cost: "$200",
  },
  {
    name: "Termite and Pest Control Inspection",
    frequency: "Annually",
    category: "Safety",
    statutory: true,
    cost: "$180",
  },
  {
    name: "Portable Fire Extinguishers & Blankets",
    frequency: "6 monthly",
    category: "Safety",
    statutory: true,
    cost: "$120",
  },
  {
    name: "Fire Indication Panels/Detectors Inspection",
    frequency: "Monthly",
    category: "Safety",
    statutory: true,
    cost: "$100",
  },
  {
    name: "Fire Sprinklers System Check",
    frequency: "Monthly",
    category: "Safety",
    statutory: true,
    cost: "$100",
  },
  {
    name: "Evacuation/Exit Lighting Test",
    frequency: "6 monthly",
    category: "Safety",
    statutory: true,
    cost: "$100",
  },
  {
    name: "Septic System / AWTS Maintenance",
    frequency: "Annually",
    category: "Plumbing",
    statutory: true,
    cost: "$400",
  },
  {
    name: "Pump and Tank Supply Systems",
    frequency: "Monthly",
    category: "Plumbing",
    statutory: true,
    cost: "$80",
  },
  {
    name: "Backflow Prevention Device Testing",
    frequency: "Annually",
    category: "Plumbing",
    statutory: true,
    cost: "$150",
  },
  {
    name: "Gutter Cleaning and Maintenance",
    frequency: "Annually",
    category: "Building",
    statutory: false,
    cost: "$200",
  },
  {
    name: "Lawn and Garden Care",
    frequency: "Monthly",
    category: "Grounds",
    statutory: false,
    cost: "$150",
  },
  {
    name: "Annual Fire Safety Statement (AFSS)",
    frequency: "Annually",
    category: "Safety",
    statutory: true,
    cost: "$500",
  },
];

export default function ScheduleTemplatesPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedDwelling, setSelectedDwelling] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [contractorName, setContractorName] = useState<string>("");
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(true);

  const properties = useQuery(api.properties.getAll);
  const dwellings = useQuery(
    api.dwellings.getByProperty,
    selectedProperty ? { propertyId: selectedProperty as Id<"properties"> } : "skip"
  );

  const applyTemplates = useMutation(api.preventativeScheduleTemplates.applySDAComplianceTemplates);
  const applySelected = useMutation(api.preventativeScheduleTemplates.applySelectedTemplates);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));

    // Set default start date to today
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);

    // Select all templates by default
    setSelectedTemplates(SDA_TEMPLATES.map((_, index) => index));
  }, [router]);

  const handleToggleTemplate = (index: number) => {
    setSelectedTemplates((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(SDA_TEMPLATES.map((_, index) => index));
    }
    setSelectAll(!selectAll);
  };

  const handleApply = async () => {
    if (!selectedProperty || !startDate) {
      alert("Please select a property and start date");
      return;
    }

    if (selectedTemplates.length === 0) {
      alert("Please select at least one template");
      return;
    }

    try {
      if (selectedTemplates.length === SDA_TEMPLATES.length) {
        // Apply all templates
        await applyTemplates({
          propertyId: selectedProperty as Id<"properties">,
          dwellingId: selectedDwelling ? (selectedDwelling as Id<"dwellings">) : undefined,
          startDate,
          contractorName: contractorName || undefined,
        });
      } else {
        // Apply selected templates
        await applySelected({
          propertyId: selectedProperty as Id<"properties">,
          dwellingId: selectedDwelling ? (selectedDwelling as Id<"dwellings">) : undefined,
          startDate,
          contractorName: contractorName || undefined,
          templateIndices: selectedTemplates,
        });
      }

      alert(
        `Successfully created ${selectedTemplates.length} preventative maintenance schedule${
          selectedTemplates.length !== 1 ? "s" : ""
        }`
      );
      router.push("/preventative-schedule");
    } catch (err) {
      console.error("Failed to apply templates:", err);
      alert("Failed to apply templates. Please try again.");
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  const statutoryCount = selectedTemplates.filter((i) => SDA_TEMPLATES[i].statutory).length;
  const totalEstimatedCost = selectedTemplates.reduce((sum, i) => {
    const cost = parseInt(SDA_TEMPLATES[i].cost.replace("$", ""));
    return sum + cost;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="schedule" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/preventative-schedule"
            className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
          >
            ← Back to Preventative Schedule
          </Link>
          <h2 className="text-2xl font-bold text-white">SDA Compliance Templates</h2>
          <p className="text-gray-400 mt-1">
            Apply standard SDA preventative maintenance schedules based on Better Living Solutions
            requirements
          </p>
        </div>

        {/* Configuration Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Property & Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Property <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedProperty}
                onChange={(e) => {
                  setSelectedProperty(e.target.value);
                  setSelectedDwelling("");
                }}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select property...</option>
                {properties?.map((property) => (
                  <option key={property._id} value={property._id}>
                    {property.propertyName || property.addressLine1}, {property.suburb}
                  </option>
                ))}
              </select>
            </div>

            {selectedProperty && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Dwelling (Optional)
                </label>
                <select
                  value={selectedDwelling}
                  onChange={(e) => setSelectedDwelling(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Entire Property</option>
                  {dwellings?.map((dwelling) => (
                    <option key={dwelling._id} value={dwelling._id}>
                      {dwelling.dwellingName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Contractor (Optional)
              </label>
              <input
                type="text"
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                placeholder="Contractor name for all schedules"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Selected Templates</p>
            <p className="text-2xl font-bold text-blue-400">{selectedTemplates.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Statutory Requirements</p>
            <p className="text-2xl font-bold text-yellow-400">{statutoryCount}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-2">Est. Annual Cost</p>
            <p className="text-2xl font-bold text-green-400">${totalEstimatedCost}</p>
          </div>
        </div>

        {/* Template Selection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Select Templates to Apply</h3>
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            >
              {selectAll ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="space-y-2">
            {SDA_TEMPLATES.map((template, index) => (
              <label
                key={index}
                className="flex items-center p-4 bg-gray-700 hover:bg-gray-650 rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedTemplates.includes(index)}
                  onChange={() => handleToggleTemplate(index)}
                  className="w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="ml-4 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{template.name}</span>
                    {template.statutory && (
                      <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded-full">
                        STATUTORY
                      </span>
                    )}
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                      {template.category}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-1 text-sm text-gray-400">
                    <span>Frequency: {template.frequency}</span>
                    <span>Est. Cost: {template.cost}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleApply}
            disabled={!selectedProperty || selectedTemplates.length === 0}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Apply {selectedTemplates.length} Schedule{selectedTemplates.length !== 1 ? "s" : ""}
          </button>
          <Link
            href="/preventative-schedule"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors inline-block"
          >
            Cancel
          </Link>
        </div>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
