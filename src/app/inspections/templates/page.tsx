"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Id } from "../../../../convex/_generated/dataModel";

export default function InspectionTemplatesPage() {
  const router = useRouter();
  const { alert: alertDialog } = useConfirmDialog();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const templates = useQuery(api.inspections.getTemplates, user ? { userId: user.id as Id<"users">, includeInactive: true } : "skip");
  const seedBLSTemplate = useMutation(api.inspections.seedBLSTemplate);
  const updateTemplate = useMutation(api.inspections.updateTemplate);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    const userId = parsed.id || parsed._id;

    // If user ID is missing, clear session and redirect to login
    if (!userId) {
      localStorage.removeItem("sda_user");
      router.push("/login");
      return;
    }

    setUser({
      id: userId,
      role: parsed.role,
    });
  }, [router]);

  const handleSeedTemplate = async () => {
    if (!user) return;

    // Check if BLS template already exists
    const existingBLS = templates?.find(t => t.name === "BLS Property Inspection");
    if (existingBLS) {
      await alertDialog("BLS Template already exists!");
      return;
    }

    // Validate user ID exists
    if (!user.id) {
      await alertDialog("Error: User ID not found. Please log out and log back in.");
      return;
    }

    try {
      await seedBLSTemplate({ createdBy: user.id as Id<"users"> });
      await alertDialog("BLS Template created successfully!");
    } catch (error: any) {
      console.error("Error seeding template:", error);
      const errorMessage = error?.message || "Unknown error";
      if (errorMessage.includes("already exists")) {
        await alertDialog("BLS Template already exists! Refresh the page to see it.");
      } else if (errorMessage.includes("Invalid ID")) {
        await alertDialog("Error: Your user session may be invalid. Please log out and log back in.");
      } else {
        await alertDialog(`Error creating template: ${errorMessage}`);
      }
    }
  };

  const handleToggleActive = async (templateId: Id<"inspectionTemplates">, currentActive: boolean) => {
    if (!user) return;
    await updateTemplate({
      userId: user.id as Id<"users">,
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
    <RequireAuth>
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
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/inspections" className="text-gray-400 hover:text-white">
                Inspections
              </Link>
            </li>
            <li className="text-gray-400">/</li>
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
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm"
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
              <div className="flex justify-center mb-4"><svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg></div>
              <p className="text-gray-400 mb-4">No templates found</p>
              <p className="text-gray-400 text-sm mb-4">
                Create the BLS Property Inspection template to get started.
              </p>
              <button
                onClick={handleSeedTemplate}
                className="inline-block px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
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
                      <p className="text-gray-400 text-sm mt-2">
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
                            <span className="text-gray-400 font-normal ml-2">
                              ({category.items.length} items)
                            </span>
                          </h3>
                          <ul className="space-y-1 pl-4">
                            {category.items.map((item, itemIndex) => (
                              <li
                                key={itemIndex}
                                className="text-gray-400 text-sm flex items-center gap-2"
                              >
                                <span className="text-gray-400">•</span>
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
          <p className="text-gray-400 text-sm mt-2">
            Custom templates can be created for specific inspection needs.
            Contact your administrator for custom template requests.
          </p>
        </div>
      </main>
    </div>
    </RequireAuth>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
