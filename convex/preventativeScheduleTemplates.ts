import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Type definitions for SDA compliance templates
type FrequencyType = "weekly" | "monthly" | "quarterly" | "biannually" | "annually";
type CategoryType = "plumbing" | "electrical" | "appliances" | "building" | "grounds" | "safety" | "general";

interface SDATemplate {
  taskName: string;
  description: string;
  category: CategoryType;
  frequencyType: FrequencyType;
  frequencyInterval: number;
  estimatedCost: number;
}

// SDA Compliance Template Schedules based on Better Living Solutions requirements
const SDA_COMPLIANCE_TEMPLATES: SDATemplate[] = [
  {
    taskName: "Air Conditioning Service",
    description: "Non-statutory service reports. Regular servicing to maintain efficiency and reliability.",
    category: "appliances",
    frequencyType: "monthly",
    frequencyInterval: 4, // Every 4 months
    estimatedCost: 150,
  },
  {
    taskName: "Electrical Switchboard & Test & Tag",
    description: "Annual AS3760 and WHS Regulation 2011. Testing of safety switches (RCD), switchboard inspection by licensed electrician. Date stamped sticker required in meter box.",
    category: "electrical",
    frequencyType: "annually",
    frequencyInterval: 1,
    estimatedCost: 250,
  },
  {
    taskName: "Thermostatic Mixing Valves (TMV) Service",
    description: "Statutory AS4032. Annual lubrication of mechanism and replacement of O ring. Cartridge change/TMV rebuild required every 3 years.",
    category: "plumbing",
    frequencyType: "annually",
    frequencyInterval: 1,
    estimatedCost: 200,
  },
  {
    taskName: "Termite and Pest Control Inspection",
    description: "Visual Timber-Pest Inspection (VTI) AS3660.2. Date stamped sticker required in meter box. Report any termite activity to Lessor immediately.",
    category: "safety",
    frequencyType: "annually",
    frequencyInterval: 1,
    estimatedCost: 180,
  },
  {
    taskName: "Portable Fire Extinguishers & Blankets",
    description: "Statutory AS1851 - Included in AFSS. 6 monthly inspection and testing.",
    category: "safety",
    frequencyType: "biannually",
    frequencyInterval: 1,
    estimatedCost: 120,
  },
  {
    taskName: "Fire Indication Panels/Detectors Inspection",
    description: "Statutory AS1851 - Included in AFSS. For BCA class 3 and class 9 must be inspected monthly. All detectors must be tested annually.",
    category: "safety",
    frequencyType: "monthly",
    frequencyInterval: 1,
    estimatedCost: 100,
  },
  {
    taskName: "Fire Sprinklers System Check",
    description: "Statutory - Included in AFSS. For AS2118.5 systems (class 1B) and AS2118.4 systems (class 3), monthly check required per AS1851.",
    category: "safety",
    frequencyType: "monthly",
    frequencyInterval: 1,
    estimatedCost: 100,
  },
  {
    taskName: "Evacuation/Exit Lighting Test",
    description: "Statutory AS2293.2 - Included in AFSS. 6 monthly testing for Class 1B (BCA Vol. 2 Cl 3.7.2) and Class 3.",
    category: "safety",
    frequencyType: "biannually",
    frequencyInterval: 1,
    estimatedCost: 100,
  },
  {
    taskName: "Septic System / AWTS Maintenance",
    description: "Statutory - Emptying as required. Councils require SDA to engage specialist for maintaining system. Tank should be desludged annually.",
    category: "plumbing",
    frequencyType: "annually",
    frequencyInterval: 1,
    estimatedCost: 400,
  },
  {
    taskName: "Pump and Tank Supply Systems",
    description: "For fire fighting: monthly as per AS1851. UV lamp (if installed) shall be replaced annually. Tank should be desludged annually.",
    category: "plumbing",
    frequencyType: "monthly",
    frequencyInterval: 1,
    estimatedCost: 80,
  },
  {
    taskName: "Backflow Prevention Device Testing",
    description: "Statutory AS2845.3. For incoming water service connecting to town main >25mm diameter. Annual testing with results submitted to water authority.",
    category: "plumbing",
    frequencyType: "annually",
    frequencyInterval: 1,
    estimatedCost: 150,
  },
  {
    taskName: "Gutter Cleaning and Maintenance",
    description: "Non-statutory. Frequency dependent on location. Properties in Bush Fire Prone areas require higher frequency. Minimum 1 per year.",
    category: "building",
    frequencyType: "annually",
    frequencyInterval: 1,
    estimatedCost: 200,
  },
  {
    taskName: "Lawn and Garden Care",
    description: "Non-statutory. Maintain external areas. Rural sites with acreage may need slashing/control of weeds.",
    category: "grounds",
    frequencyType: "monthly",
    frequencyInterval: 1,
    estimatedCost: 150,
  },
  {
    taskName: "Annual Fire Safety Statement (AFSS)",
    description: "Statutory requirement. AFSS must be completed by Fire Contractor, submitted to council, and displayed in building. Includes fire extinguishers, panels, sprinklers, and exit lighting.",
    category: "safety",
    frequencyType: "annually",
    frequencyInterval: 1,
    estimatedCost: 500,
  },
];

// Apply SDA compliance templates to a property
export const applySDAComplianceTemplates = mutation({
  args: {
    propertyId: v.id("properties"),
    dwellingId: v.optional(v.id("dwellings")),
    startDate: v.string(), // When to start the schedules
    contractorName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new Error("Property not found");

    const today = new Date(args.startDate);
    const createdSchedules: string[] = [];

    for (const template of SDA_COMPLIANCE_TEMPLATES) {
      // Calculate next due date based on frequency
      let nextDueDate = new Date(today);
      const freqType = template.frequencyType;
      const freqInterval = template.frequencyInterval;

      if (freqType === "monthly") {
        nextDueDate.setMonth(today.getMonth() + freqInterval);
      } else if (freqType === "quarterly") {
        nextDueDate.setMonth(today.getMonth() + (3 * freqInterval));
      } else if (freqType === "biannually") {
        nextDueDate.setMonth(today.getMonth() + (6 * freqInterval));
      } else if (freqType === "annually") {
        nextDueDate.setFullYear(today.getFullYear() + freqInterval);
      } else if (freqType === "weekly") {
        nextDueDate.setDate(today.getDate() + (7 * freqInterval));
      }

      const scheduleId = await ctx.db.insert("preventativeSchedule", {
        propertyId: args.propertyId,
        dwellingId: args.dwellingId,
        taskName: template.taskName,
        description: template.description,
        category: template.category,
        frequencyType: template.frequencyType,
        frequencyInterval: template.frequencyInterval,
        nextDueDate: nextDueDate.toISOString().split("T")[0],
        estimatedCost: template.estimatedCost,
        contractorName: args.contractorName,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      createdSchedules.push(scheduleId);
    }

    return {
      success: true,
      schedulesCreated: createdSchedules.length,
      scheduleIds: createdSchedules,
    };
  },
});

// Get available SDA compliance templates (for preview)
export const getSDAComplianceTemplates = mutation({
  args: {},
  handler: async () => {
    return {
      templates: SDA_COMPLIANCE_TEMPLATES,
      totalTemplates: SDA_COMPLIANCE_TEMPLATES.length,
      description: "Standard SDA preventative maintenance schedules based on Better Living Solutions compliance requirements",
    };
  },
});

// Apply selective templates (choose which ones to apply)
export const applySelectedTemplates = mutation({
  args: {
    propertyId: v.id("properties"),
    dwellingId: v.optional(v.id("dwellings")),
    startDate: v.string(),
    contractorName: v.optional(v.string()),
    templateIndices: v.array(v.number()), // Array of template indices to apply
  },
  handler: async (ctx, args) => {
    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new Error("Property not found");

    const today = new Date(args.startDate);
    const createdSchedules: string[] = [];

    for (const index of args.templateIndices) {
      if (index < 0 || index >= SDA_COMPLIANCE_TEMPLATES.length) {
        continue; // Skip invalid indices
      }

      const template = SDA_COMPLIANCE_TEMPLATES[index];

      // Calculate next due date
      let nextDueDate = new Date(today);
      const freqType = template.frequencyType;
      const freqInterval = template.frequencyInterval;

      if (freqType === "monthly") {
        nextDueDate.setMonth(today.getMonth() + freqInterval);
      } else if (freqType === "quarterly") {
        nextDueDate.setMonth(today.getMonth() + (3 * freqInterval));
      } else if (freqType === "biannually") {
        nextDueDate.setMonth(today.getMonth() + (6 * freqInterval));
      } else if (freqType === "annually") {
        nextDueDate.setFullYear(today.getFullYear() + freqInterval);
      } else if (freqType === "weekly") {
        nextDueDate.setDate(today.getDate() + (7 * freqInterval));
      }

      const scheduleId = await ctx.db.insert("preventativeSchedule", {
        propertyId: args.propertyId,
        dwellingId: args.dwellingId,
        taskName: template.taskName,
        description: template.description,
        category: template.category,
        frequencyType: template.frequencyType,
        frequencyInterval: template.frequencyInterval,
        nextDueDate: nextDueDate.toISOString().split("T")[0],
        estimatedCost: template.estimatedCost,
        contractorName: args.contractorName,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      createdSchedules.push(scheduleId);
    }

    return {
      success: true,
      schedulesCreated: createdSchedules.length,
      scheduleIds: createdSchedules,
    };
  },
});
