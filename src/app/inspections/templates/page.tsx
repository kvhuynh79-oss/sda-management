"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../../convex/_generated/dataModel";

export default function InspectionTemplatesPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ _id: string; role: string } | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const templates = useQuery(api.inspections.getTemplates, { includeInactive: true });
  const seedBLSTemplate = useMutation(api.inspections.seedBLSTemplate);
  const updateTemplate = useMutation(api.inspections.updateTemplate);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const handleSeedTemplate = async () => {
    if (!user) return;
    try {
      await seedBLSTemplate({ createdBy: user._id as Id<"users"> });
      alert("BLS Template created successfully!");
    } catch (error) {
      console.error("Error seeding template:", error);
      alert("Error creating template. It may already exist.");
    }
  };

  const handleToggleActive = async (templateId: Id<"inspectionTemplates">, currentActive: boolean) => {
    await updateTemplate({
      templateId,
      isActive: !currentActive,
    });
  };

  if (!user) {
    return <LoadingScreen />;
  }

  const getTotalItems = (template: any) => {
    return template.categories.reduce(
      (sum: number, category: any) => sum + category.items.length,
      0
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="inspections" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-gray-400 hover:text-white">
                Dashboard
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li>
              <Link href="/inspections" className="text-gray-400 hover:text-white">
                Inspections
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li className="text-white">Templates</li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Inspection Templates
            </h1>
            <p className="text-gray-400 mt-1">
              Manage inspection checklists and templates
            </p>
          </div>
          <button
            onClick={handleSeedTemplate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
          >
            + Create BLS Template
          </button>
        </div>

        {/* Templates List */}
        <div className="space-y-4">
          {templates === undefined ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <div className="text-gray-500 text-5xl mb-4">📋</div>
              <p className="text-gray-400 mb-4">No templates found</p>
              <p className="text-gray-500 text-sm mb-4">
                Create the BLS Property Inspection template to get started.
              </p>
              <button
                onClick={handleSeedTemplate}
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create BLS Template
              </button>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template._id}
                className="bg-gray-800 rounded-lg overflow-hidden"
              >
                {/* Template Header */}
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-semibold text-white">
                          {template.name}
                        </h2>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            template.isActive
                              ? "bg-green-600 text-white"
                              : "bg-gray-600 text-gray-300"
                          }`}
                        >
                          {template.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {template.description && (
                        <p className="text-gray-400 text-sm">
                          {template.description}
                        </p>
                      )}
                      <p className="text-gray-500 text-sm mt-2">
                        {template.categories.length} categories •{" "}
                        {getTotalItems(template)} items
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setExpandedTemplate(
                            expandedTemplate === template._id
                              ? null
                              : template._id
                          )
                        }
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                      >
                        {expandedTemplate === template._id
                          ? "Hide Details"
                          : "View Details"}
                      </button>
                      <button
                        onClick={() =>
                          handleToggleActive(template._id, template.isActive)
                        }
                        className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                          template.isActive
                            ? "bg-gray-700 hover:bg-gray-600 text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {template.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTemplate === template._id && (
                  <div className="border-t border-gray-700 p-4 sm:p-6">
                    <div className="space-y-4">
                      {template.categories.map((category, catIndex) => (
                        <div key={catIndex}>
                          <h3 className="text-white font-medium mb-2">
                            {category.name}
                            <span className="text-gray-500 font-normal ml-2">
                              ({category.items.length} items)
                            </span>
                          </h3>
                          <ul className="space-y-1 pl-4">
                            {category.items.map((item, itemIndex) => (
                              <li
                                key={itemIndex}
                                className="text-gray-400 text-sm flex items-center gap-2"
                              >
                                <span className="text-gray-600">•</span>
                                {item.name}
                                {item.required && (
                                  <span className="text-red-400 text-xs">
                                    (Required)
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Info Box */}
        <div className="bg-gray-800 rounded-lg p-4 mt-6">
          <h3 className="text-white font-medium mb-2">About Templates</h3>
          <p className="text-gray-400 text-sm">
            Inspection templates define the checklist items that inspectors will
            go through when conducting a property inspection. The BLS Property
            Inspection template includes standard categories like Heating &
            Cooling, Electrical, Plumbing, and individual room checks.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Custom templates can be created for specific inspection needs.
            Contact your administrator for custom template requests.
          </p>
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
