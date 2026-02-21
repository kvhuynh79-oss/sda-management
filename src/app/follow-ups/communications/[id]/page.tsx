"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen } from "@/components/ui";
import { CommunicationTypeBadge, ContactTypeBadge, DirectionBadge } from "@/components/ui/Badge";
import { FormInput, FormSelect, FormTextarea, Button } from "@/components/forms";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import ThreadPickerModal from "@/components/communications/ThreadPickerModal";

export default function CommunicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const communicationId = params.id as string;

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isEditing, setIsEditing] = useState(searchParams.get("edit") === "true");
  const [isSaving, setIsSaving] = useState(false);
  const [showThreadPicker, setShowThreadPicker] = useState(false);

  const [formData, setFormData] = useState({
    communicationType: "phone_call" as "email" | "sms" | "phone_call" | "meeting" | "other",
    direction: "sent" as "sent" | "received",
    communicationDate: "",
    communicationTime: "",
    contactType: "ndia" as "ndia" | "support_coordinator" | "sil_provider" | "participant" | "family" | "plan_manager" | "ot" | "contractor" | "other",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    subject: "",
    summary: "",
    linkedParticipantId: "",
    linkedPropertyId: "",
  });

  const [useManualParticipant, setUseManualParticipant] = useState(false);
  const [manualParticipantName, setManualParticipantName] = useState("");
  const [propertyTbd, setPropertyTbd] = useState(false);
  const [stakeholderEntityType, setStakeholderEntityType] = useState<string>("");
  const [stakeholderEntityId, setStakeholderEntityId] = useState<string>("");

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser({ id: parsed._id || parsed.id, role: parsed.role });
    }
  }, []);

  const communication = useQuery(api.communications.getById, user ? { id: communicationId as Id<"communications">, userId: user.id as Id<"users"> } : "skip");
  const relatedTasks = useQuery(api.tasks.getByCommunication, user ? { communicationId: communicationId as Id<"communications">, userId: user.id as Id<"users"> } : "skip");
  const participants = useQuery(
    api.participants.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const properties = useQuery(api.properties.getAll, user ? { userId: user.id as Id<"users"> } : "skip");

  // Stakeholder entity queries for DB-linked dropdowns
  const supportCoordinators = useQuery(
    api.supportCoordinators.getAll,
    user && isEditing && formData.contactType === "support_coordinator"
      ? { userId: user.id as Id<"users">, status: "active" as const }
      : "skip"
  );
  const silProviders = useQuery(
    api.silProviders.getAll,
    user && isEditing && formData.contactType === "sil_provider"
      ? { userId: user.id as Id<"users">, status: "active" as const }
      : "skip"
  );
  const occupationalTherapists = useQuery(
    api.occupationalTherapists.getAll,
    user && isEditing && formData.contactType === "ot"
      ? { userId: user.id as Id<"users">, status: "active" as const }
      : "skip"
  );
  const contractors = useQuery(
    api.contractors.getAll,
    user && isEditing && formData.contactType === "contractor"
      ? { userId: user.id as Id<"users"> }
      : "skip"
  );

  const updateCommunication = useMutation(api.communications.update);
  const deleteCommunication = useMutation(api.communications.remove);
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();

  // Initialize form data when communication loads
  useEffect(() => {
    if (communication) {
      setFormData({
        communicationType: communication.communicationType,
        direction: communication.direction,
        communicationDate: communication.communicationDate,
        communicationTime: communication.communicationTime || "",
        contactType: communication.contactType,
        contactName: communication.contactName,
        contactEmail: communication.contactEmail || "",
        contactPhone: communication.contactPhone || "",
        subject: communication.subject || "",
        summary: communication.summary,
        linkedParticipantId: communication.linkedParticipantId || "",
        linkedPropertyId: communication.linkedPropertyId || "",
      });
      setUseManualParticipant(!!communication.freeTextParticipantName && !communication.linkedParticipantId);
      setManualParticipantName(communication.freeTextParticipantName || "");
      setPropertyTbd(!!communication.propertyTbd && !communication.linkedPropertyId);
      setStakeholderEntityType(communication.stakeholderEntityType || "");
      setStakeholderEntityId(communication.stakeholderEntityId || "");
    }
  }, [communication]);

  const handleSave = async () => {
    if (!user || !communication) return;
    setIsSaving(true);

    try {
      await updateCommunication({
        id: communication._id,
        communicationType: formData.communicationType,
        direction: formData.direction,
        communicationDate: formData.communicationDate,
        communicationTime: formData.communicationTime || undefined,
        contactType: formData.contactType,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        subject: formData.subject || undefined,
        summary: formData.summary,
        linkedParticipantId: formData.linkedParticipantId && !useManualParticipant
          ? (formData.linkedParticipantId as Id<"participants">)
          : undefined,
        linkedPropertyId: formData.linkedPropertyId && !propertyTbd
          ? (formData.linkedPropertyId as Id<"properties">)
          : undefined,
        freeTextParticipantName: useManualParticipant ? manualParticipantName : undefined,
        propertyTbd: propertyTbd || undefined,
        stakeholderEntityType: stakeholderEntityType
          ? (stakeholderEntityType as "support_coordinator" | "sil_provider" | "occupational_therapist" | "contractor" | "participant")
          : undefined,
        stakeholderEntityId: stakeholderEntityId || undefined,
        userId: user.id as Id<"users">,
      });
      setIsEditing(false);
    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  };

  const restoreCommunication = useMutation(api.communications.restore);
  const moveToThreadMutation = useMutation(api.communications.moveToThread);

  const handleDelete = async () => {
    if (!user || !communication) return;
    if (!(await confirmDialog({ title: "Confirm Delete", message: "Are you sure you want to delete this communication? It can be restored by an admin.", variant: "danger" }))) return;

    try {
      await deleteCommunication({
        id: communication._id,
        userId: user.id as Id<"users">,
      });
      router.push("/communications");
    } catch (error) {
    }
  };

  const handleRestore = async () => {
    if (!user || !communication) return;
    try {
      await restoreCommunication({
        id: communication._id,
        userId: user.id as Id<"users">,
      });
    } catch (error) {
    }
  };

  if (!user || communication === undefined || participants === undefined || properties === undefined) {
    return (
      <RequireAuth>
        <div className="min-h-screen bg-gray-900">
          <Header currentPage="communications" />
          <LoadingScreen fullScreen={false} message="Loading communication..." />
        </div>
      </RequireAuth>
    );
  }

  if (communication === null) {
    return (
      <RequireAuth>
        <div className="min-h-screen bg-gray-900">
          <Header currentPage="communications" />
          <main className="max-w-3xl mx-auto px-4 py-8 text-center">
            <p className="text-gray-400">Communication not found</p>
            <Link href="/follow-ups" className="text-teal-500 hover:text-teal-400 mt-4 inline-block">
              Back to Follow-ups
            </Link>
          </main>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="communications" />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-4 text-sm">
            <Link href="/follow-ups" className="text-gray-400 hover:text-white">
              Follow-ups
            </Link>
            <span className="text-gray-400 mx-2">/</span>
            <span className="text-white">Communication Details</span>
          </nav>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <DirectionBadge direction={communication.direction} />
                <CommunicationTypeBadge type={communication.communicationType} />
                <ContactTypeBadge contactType={communication.contactType} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {communication.contactName}
              </h1>
              {communication.subject && (
                <p className="text-gray-300 mt-1">{communication.subject}</p>
              )}
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="secondary" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} isLoading={isSaving}>
                    Save
                  </Button>
                </>
              ) : (
                <>
                  {(user.role === "admin" || user.role === "property_manager") && (
                    <button
                      onClick={() => setShowThreadPicker(true)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm"
                    >
                      Link to Thread
                    </button>
                  )}
                  <Link
                    href={`/follow-ups/tasks/new?communicationId=${communication._id}${communication.linkedParticipantId ? `&participantId=${communication.linkedParticipantId}` : ""}`}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
                  >
                    + Create Task
                  </Link>
                  <Button variant="secondary" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Deleted banner */}
          {communication.isDeleted && (
            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 flex items-center justify-between mb-4">
              <div>
                <p className="text-red-400 font-medium">This communication has been deleted</p>
                <p className="text-red-400/70 text-sm">
                  Deleted{communication.deletedAt ? ` on ${new Date(communication.deletedAt).toLocaleDateString()}` : ""}
                </p>
                {user.role !== "admin" && (
                  <p className="text-red-400/60 text-xs mt-1">Contact an admin to restore this communication.</p>
                )}
              </div>
              {user.role === "admin" && (
                <button
                  onClick={handleRestore}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  Restore
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
              {isEditing ? (
                <FormTextarea
                  label="Summary"
                  hideLabel
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={5}
                />
              ) : (
                <p className="text-gray-300 whitespace-pre-wrap">{communication.summary}</p>
              )}
            </div>

            {/* Details */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Details</h2>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormSelect
                    label="Type"
                    value={formData.communicationType}
                    onChange={(e) => setFormData({ ...formData, communicationType: e.target.value as any })}
                    options={[
                      { value: "phone_call", label: "Phone Call" },
                      { value: "email", label: "Email" },
                      { value: "sms", label: "SMS" },
                      { value: "meeting", label: "Meeting" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                  <FormSelect
                    label="Direction"
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value as any })}
                    options={[
                      { value: "sent", label: "Sent (Outgoing)" },
                      { value: "received", label: "Received (Incoming)" },
                    ]}
                  />
                  <FormInput
                    label="Date"
                    type="date"
                    value={formData.communicationDate}
                    onChange={(e) => setFormData({ ...formData, communicationDate: e.target.value })}
                  />
                  <FormInput
                    label="Time"
                    type="time"
                    value={formData.communicationTime}
                    onChange={(e) => setFormData({ ...formData, communicationTime: e.target.value })}
                  />
                  <FormSelect
                    label="Contact Type"
                    value={formData.contactType}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setFormData({ ...formData, contactType: newType });
                      // Reset stakeholder selection when contact type changes
                      setStakeholderEntityType("");
                      setStakeholderEntityId("");
                    }}
                    options={[
                      { value: "ndia", label: "NDIA" },
                      { value: "support_coordinator", label: "Support Coordinator" },
                      { value: "plan_manager", label: "Plan Manager" },
                      { value: "sil_provider", label: "SIL Provider" },
                      { value: "participant", label: "Participant" },
                      { value: "family", label: "Family Member" },
                      { value: "ot", label: "OT" },
                      { value: "contractor", label: "Contractor" },
                      { value: "other", label: "Other" },
                    ]}
                  />

                  {/* Link to Database Contact - conditional on contact type */}
                  {formData.contactType === "support_coordinator" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Link to Support Coordinator</label>
                      <select
                        value={stakeholderEntityId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setStakeholderEntityId(selectedId);
                          if (selectedId) {
                            setStakeholderEntityType("support_coordinator");
                            const sc = supportCoordinators?.find((s) => s._id === selectedId);
                            if (sc) {
                              setFormData((prev) => ({
                                ...prev,
                                contactName: `${sc.firstName} ${sc.lastName}`,
                                contactEmail: sc.email || prev.contactEmail,
                                contactPhone: sc.phone || prev.contactPhone,
                              }));
                            }
                          } else {
                            setStakeholderEntityType("");
                          }
                        }}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                      >
                        <option value="">-- Select from database --</option>
                        {(supportCoordinators || []).map((sc) => (
                          <option key={sc._id} value={sc._id}>
                            {sc.firstName} {sc.lastName}{sc.organization ? ` (${sc.organization})` : ""}
                          </option>
                        ))}
                      </select>
                      {stakeholderEntityId && (
                        <p className="mt-1 text-xs text-teal-400">Contact name and email auto-filled from database</p>
                      )}
                    </div>
                  )}

                  {formData.contactType === "sil_provider" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Link to SIL Provider</label>
                      <select
                        value={stakeholderEntityId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setStakeholderEntityId(selectedId);
                          if (selectedId) {
                            setStakeholderEntityType("sil_provider");
                            const sp = silProviders?.find((s) => s._id === selectedId);
                            if (sp) {
                              setFormData((prev) => ({
                                ...prev,
                                contactName: sp.contactName || sp.companyName,
                                contactEmail: sp.email || prev.contactEmail,
                                contactPhone: sp.phone || prev.contactPhone,
                              }));
                            }
                          } else {
                            setStakeholderEntityType("");
                          }
                        }}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                      >
                        <option value="">-- Select from database --</option>
                        {(silProviders || []).map((sp) => (
                          <option key={sp._id} value={sp._id}>
                            {sp.companyName}{sp.contactName ? ` (${sp.contactName})` : ""}
                          </option>
                        ))}
                      </select>
                      {stakeholderEntityId && (
                        <p className="mt-1 text-xs text-teal-400">Contact name and email auto-filled from database</p>
                      )}
                    </div>
                  )}

                  {formData.contactType === "ot" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Link to Occupational Therapist</label>
                      <select
                        value={stakeholderEntityId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setStakeholderEntityId(selectedId);
                          if (selectedId) {
                            setStakeholderEntityType("occupational_therapist");
                            const ot = occupationalTherapists?.find((o) => o._id === selectedId);
                            if (ot) {
                              setFormData((prev) => ({
                                ...prev,
                                contactName: `${ot.firstName} ${ot.lastName}`,
                                contactEmail: ot.email || prev.contactEmail,
                                contactPhone: ot.phone || prev.contactPhone,
                              }));
                            }
                          } else {
                            setStakeholderEntityType("");
                          }
                        }}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                      >
                        <option value="">-- Select from database --</option>
                        {(occupationalTherapists || []).map((ot) => (
                          <option key={ot._id} value={ot._id}>
                            {ot.firstName} {ot.lastName}{ot.organization ? ` (${ot.organization})` : ""}
                          </option>
                        ))}
                      </select>
                      {stakeholderEntityId && (
                        <p className="mt-1 text-xs text-teal-400">Contact name and email auto-filled from database</p>
                      )}
                    </div>
                  )}

                  {formData.contactType === "contractor" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Link to Contractor</label>
                      <select
                        value={stakeholderEntityId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setStakeholderEntityId(selectedId);
                          if (selectedId) {
                            setStakeholderEntityType("contractor");
                            const c = contractors?.find((ct) => ct._id === selectedId);
                            if (c) {
                              setFormData((prev) => ({
                                ...prev,
                                contactName: c.contactName || c.companyName,
                                contactEmail: c.email || prev.contactEmail,
                                contactPhone: c.phone || prev.contactPhone,
                              }));
                            }
                          } else {
                            setStakeholderEntityType("");
                          }
                        }}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                      >
                        <option value="">-- Select from database --</option>
                        {(contractors || []).map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.companyName}{c.contactName ? ` (${c.contactName})` : ""}
                          </option>
                        ))}
                      </select>
                      {stakeholderEntityId && (
                        <p className="mt-1 text-xs text-teal-400">Contact name and email auto-filled from database</p>
                      )}
                    </div>
                  )}

                  <FormInput
                    label="Contact Name"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  />
                  <FormInput
                    label="Subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                  {useManualParticipant ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Participant Name</label>
                      <input
                        type="text"
                        value={manualParticipantName}
                        onChange={(e) => setManualParticipantName(e.target.value)}
                        placeholder="Enter participant name"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setUseManualParticipant(false);
                          setManualParticipantName("");
                        }}
                        className="mt-1 text-xs text-teal-400 hover:text-teal-300"
                      >
                        Back to dropdown
                      </button>
                    </div>
                  ) : (
                    <FormSelect
                      label="Participant"
                      value={formData.linkedParticipantId}
                      onChange={(e) => {
                        if (e.target.value === "__manual__") {
                          setUseManualParticipant(true);
                          setFormData({ ...formData, linkedParticipantId: "" });
                        } else {
                          setFormData({ ...formData, linkedParticipantId: e.target.value });
                        }
                      }}
                      options={[
                        { value: "", label: "-- None --" },
                        ...(participants || []).map((p) => ({
                          value: p._id,
                          label: `${p.firstName} ${p.lastName}`,
                        })),
                        { value: "__manual__", label: "Enter name manually..." },
                      ]}
                    />
                  )}
                  <FormSelect
                    label="Property"
                    value={propertyTbd ? "__tbd__" : formData.linkedPropertyId}
                    onChange={(e) => {
                      if (e.target.value === "__tbd__") {
                        setPropertyTbd(true);
                        setFormData({ ...formData, linkedPropertyId: "" });
                      } else {
                        setPropertyTbd(false);
                        setFormData({ ...formData, linkedPropertyId: e.target.value });
                      }
                    }}
                    options={[
                      { value: "", label: "-- None --" },
                      ...(properties || []).map((p) => ({
                        value: p._id,
                        label: p.propertyName || p.addressLine1,
                      })),
                      { value: "__tbd__", label: "Unidentified / TBD" },
                    ]}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Date</span>
                    <p className="text-white">
                      {communication.communicationDate}
                      {communication.communicationTime && ` at ${communication.communicationTime}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Logged</span>
                    <p className="text-white">{new Date(communication.createdAt).toLocaleDateString()}</p>
                  </div>
                  {communication.contactEmail && (
                    <div>
                      <span className="text-gray-400">Email</span>
                      <p className="text-white">{communication.contactEmail}</p>
                    </div>
                  )}
                  {communication.contactPhone && (
                    <div>
                      <span className="text-gray-400">Phone</span>
                      <p className="text-white">{communication.contactPhone}</p>
                    </div>
                  )}
                  {communication.stakeholderEntityType && (
                    <div>
                      <span className="text-gray-400">Linked Entity</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded">
                          {communication.stakeholderEntityType === "support_coordinator" && "Support Coordinator"}
                          {communication.stakeholderEntityType === "sil_provider" && "SIL Provider"}
                          {communication.stakeholderEntityType === "occupational_therapist" && "OT"}
                          {communication.stakeholderEntityType === "contractor" && "Contractor"}
                          {communication.stakeholderEntityType === "participant" && "Participant"}
                        </span>
                        <span className="text-white text-xs">DB-Linked</span>
                      </div>
                    </div>
                  )}
                  {communication.participant && (
                    <div>
                      <span className="text-gray-400">Participant</span>
                      <p className="text-white">
                        <Link href={`/participants/${communication.linkedParticipantId}`} className="text-teal-500 hover:text-teal-400">
                          {communication.participant.firstName} {communication.participant.lastName}
                        </Link>
                      </p>
                    </div>
                  )}
                  {communication.freeTextParticipantName && !communication.linkedParticipantId && (
                    <div>
                      <span className="text-gray-400">Participant</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white">{communication.freeTextParticipantName}</span>
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Unlinked</span>
                      </div>
                    </div>
                  )}
                  {communication.property && (
                    <div>
                      <span className="text-gray-400">Property</span>
                      <p className="text-white">
                        <Link href={`/properties/${communication.linkedPropertyId}`} className="text-teal-500 hover:text-teal-400">
                          {communication.property.propertyName || communication.property.addressLine1}
                        </Link>
                      </p>
                    </div>
                  )}
                  {communication.propertyTbd && !communication.linkedPropertyId && (
                    <div>
                      <span className="text-gray-400">Property</span>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400">Unidentified / TBD</span>
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">TBD</span>
                      </div>
                    </div>
                  )}
                  {communication.createdByUser && (
                    <div>
                      <span className="text-gray-400">Logged By</span>
                      <p className="text-white">
                        {communication.createdByUser.firstName} {communication.createdByUser.lastName}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Attachment */}
            {communication.attachmentFileName && communication.attachmentUrl && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Attachment</h2>
                <a
                  href={communication.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                  <div>
                    <p className="text-white font-medium">{communication.attachmentFileName}</p>
                    <p className="text-gray-400 text-sm">Click to download</p>
                  </div>
                </a>
              </div>
            )}

            {/* Related Tasks */}
            {relatedTasks && relatedTasks.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Related Tasks</h2>
                <div className="space-y-2">
                  {relatedTasks.map((task) => (
                    <Link
                      key={task._id}
                      href={`/follow-ups/tasks/${task._id}`}
                      className="block p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white">{task.title}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          task.status === "completed" ? "bg-green-600" :
                          task.status === "in_progress" ? "bg-teal-700" :
                          "bg-yellow-600"
                        } text-white`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">Due: {task.dueDate}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Danger Zone */}
            {!communication.isDeleted && (
              <div className="bg-gray-800 rounded-lg p-6 border border-red-600/30">
                <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
                <Button variant="danger" onClick={handleDelete}>
                  Delete Communication
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* Thread Picker Modal */}
        <ThreadPickerModal
          isOpen={showThreadPicker}
          onClose={() => setShowThreadPicker(false)}
          excludeThreadId={communication.threadId}
          userId={user.id}
          onSelect={async (targetThreadId) => {
            try {
              await moveToThreadMutation({
                communicationId: communication._id as Id<"communications">,
                targetThreadId,
                actingUserId: user.id as Id<"users">,
              });
              setShowThreadPicker(false);
            } catch (error) {
              await alertDialog("Failed to move communication to thread. " + (error instanceof Error ? error.message : "Please try again."));
            }
          }}
        />
      </div>
    </RequireAuth>
  );
}
