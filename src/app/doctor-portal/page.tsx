"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UrgencyBadge } from "@/components/ui/urgency-badge";
import { MedicalSafetyDisclaimer } from "@/components/ui/medical-safety-disclaimer";
import {
  Stethoscope,
  Calendar,
  Clock,
  User,
  Sparkles,
  Pill,
  CheckCircle2,
  Plus,
  Trash2,
  AlertTriangle,
  FileText,
  HelpCircle,
} from "lucide-react";
import { format, addDays } from "date-fns";

export default function DoctorPortalPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Consultation Modal State
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [activeAppt, setActiveAppt] = useState<any>(null);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [recommendedFollowUpDate, setRecommendedFollowUpDate] = useState("");
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [medications, setMedications] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchDoctorData = async () => {
    setLoading(true);
    try {
      const [authRes, apptRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/appointments"),
      ]);

      const authData = await authRes.json();
      const apptData = await apptRes.json();

      if (authData.success) setUser(authData.data.user);
      if (apptData.success) setAppointments(apptData.data.appointments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const handleOpenConsultModal = (appt: any) => {
    setActiveAppt(appt);
    setClinicalNotes(appt.consultation?.clinicalNotes || "");
    setDiagnosis(appt.consultation?.diagnosis || "");
    setFollowUpInstructions(appt.consultation?.followUpInstructions || "");
    setRecommendedFollowUpDate(
      appt.consultation?.recommendedFollowUpDate
        ? format(new Date(appt.consultation.recommendedFollowUpDate), "yyyy-MM-dd")
        : ""
    );
    setPrescriptionNotes(appt.prescription?.notes || "");
    setMedications(
      appt.prescription?.medications?.map((m: any) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions || "",
        startDate: format(new Date(m.startDate), "yyyy-MM-dd"),
        endDate: format(new Date(m.endDate), "yyyy-MM-dd"),
      })) || []
    );
    setSubmitError(null);
    setConsultModalOpen(true);
  };

  const handleAddMedication = () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const weekLaterStr = format(addDays(new Date(), 7), "yyyy-MM-dd");
    setMedications([
      ...medications,
      {
        name: "",
        dosage: "",
        frequency: "once_daily",
        duration: "7 days",
        instructions: "Take with meals",
        startDate: todayStr,
        endDate: weekLaterStr,
      },
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedChange = (index: number, field: string, value: string) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleSubmitConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppt) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        clinicalNotes,
        diagnosis: diagnosis || undefined,
        followUpInstructions: followUpInstructions || undefined,
        recommendedFollowUpDate: recommendedFollowUpDate
          ? new Date(recommendedFollowUpDate).toISOString()
          : undefined,
        prescriptionNotes: prescriptionNotes || undefined,
        medications: medications.map((m) => ({
          ...m,
          startDate: new Date(m.startDate).toISOString(),
          endDate: new Date(m.endDate).toISOString(),
        })),
      };

      const res = await fetch(`/api/appointments/${activeAppt.id}/consultation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to submit consultation");

      setConsultModalOpen(false);
      fetchDoctorData();
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to submit consultation");
    } finally {
      setSubmitting(false);
    }
  };

  const urgentAppointments = appointments.filter(
    (a) =>
      (a.status === "CONFIRMED" || a.status === "HELD") &&
      a.preVisitSummary?.urgencyLevel === "High"
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-8 h-8 text-blue-600" />
              Doctor Clinical Workspace
            </h1>
            <p className="text-sm text-slate-500">
              Welcome Dr. {user?.name}. Review patient symptoms, pre-visit summaries, and record clinical consultations.
            </p>
          </div>
        </div>

        <MedicalSafetyDisclaimer />

        {/* High Urgency Case Alert Banner if any */}
        {urgentAppointments.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-rose-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              High Urgency Pre-Visit Cases ({urgentAppointments.length})
            </div>
            <p className="text-xs">
              AI pre-visit intake has flagged high symptom severity for upcoming cases. Review chief complaints and suggested inquiries prior to consultation.
            </p>
          </div>
        )}

        {/* Appointments List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Scheduled Consultations ({appointments.length})
            </h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-32 rounded-xl bg-slate-200 animate-pulse" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-500">
              No appointments currently scheduled on your calendar.
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appt) => (
                <Card key={appt.id} className="shadow-xs hover:border-slate-300 transition-colors">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-base">
                          {appt.patient.user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-base flex items-center gap-2">
                            {appt.patient.user.name}
                            <Badge
                              variant={
                                appt.status === "CONFIRMED"
                                  ? "success"
                                  : appt.status === "COMPLETED"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {appt.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500">
                            Email: {appt.patient.user.email} • Phone: {appt.patient.user.phone || "N/A"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs text-slate-600">
                          <div className="font-medium text-slate-900">
                            {format(new Date(appt.startTime), "MMM d, yyyy")}
                          </div>
                          <div>
                            {format(new Date(appt.startTime), "HH:mm")} - {format(new Date(appt.endTime), "HH:mm")} UTC
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleOpenConsultModal(appt)}
                          className={appt.status === "COMPLETED" ? "bg-slate-700" : "bg-blue-600"}
                        >
                          {appt.status === "COMPLETED" ? "Edit Consultation" : "Record Consultation"}
                        </Button>
                      </div>
                    </div>

                    {/* Pre-visit AI & Symptoms preview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {appt.symptomSubmission && (
                        <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1.5">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-600" /> Patient Symptoms (Intake):
                          </span>
                          <div><span className="font-medium text-slate-700">Complaint:</span> {appt.symptomSubmission.chiefComplaint}</div>
                          <div><span className="font-medium text-slate-700">Duration:</span> {appt.symptomSubmission.duration} • <span className="font-medium text-slate-700">Severity:</span> {appt.symptomSubmission.severity}</div>
                          <p className="text-slate-600 italic line-clamp-2">{appt.symptomSubmission.symptoms}</p>
                        </div>
                      )}

                      {appt.preVisitSummary && (
                        <div className="rounded-lg bg-blue-50/50 p-3 border border-blue-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> AI Pre-Visit Assistant:
                            </span>
                            <UrgencyBadge level={appt.preVisitSummary.urgencyLevel} />
                          </div>
                          <div className="text-slate-700"><span className="font-medium">Summary:</span> {appt.preVisitSummary.chiefComplaint}</div>
                          <div className="text-slate-600 space-y-0.5">
                            <span className="font-medium text-slate-700 flex items-center gap-1">
                              <HelpCircle className="w-3 h-3 text-blue-600" /> Suggested Inquiries:
                            </span>
                            <ul className="list-disc list-inside text-[11px] text-slate-600 pl-1">
                              {(appt.preVisitSummary.suggestedQuestions as string[])?.slice(0, 2).map((q, idx) => (
                                <li key={idx} className="line-clamp-1">{q}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Consultation & Prescription Modal */}
      {consultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <Card className="w-full max-w-3xl bg-white p-6 my-8 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-6 h-6 text-blue-600" />
                Clinical Consultation & Prescription
              </CardTitle>
              <CardDescription>
                Patient: {activeAppt?.patient.user.name} • {format(new Date(activeAppt?.startTime), "MMMM d, yyyy")}
              </CardDescription>
            </div>

            {submitError && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitConsultation} className="space-y-6">
              {/* Clinical Notes & Diagnosis */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    Clinical Notes & Examination Findings <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    required
                    rows={4}
                    placeholder="Document subjective findings, physical exam observations, and clinical assessment..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800">Diagnosis / Clinical Impression</label>
                    <Input
                      placeholder="e.g. Tension headache, Acute viral pharyngitis"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800">Recommended Follow-up Date</label>
                    <Input
                      type="date"
                      value={recommendedFollowUpDate}
                      onChange={(e) => setRecommendedFollowUpDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">Follow-up Instructions & Lifestyle Advice</label>
                  <Textarea
                    rows={2}
                    placeholder="e.g., Hydrate, rest for 48 hours, return if fever exceeds 102F..."
                    value={followUpInstructions}
                    onChange={(e) => setFollowUpInstructions(e.target.value)}
                  />
                </div>
              </div>

              {/* Relational Prescription Builder */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-purple-600" />
                    Prescribed Medications & Schedules ({medications.length})
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMedication}
                    className="text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Medication
                  </Button>
                </div>

                {medications.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                    No medications added yet. Click &quot;Add Medication&quot; above to prescribe pharmaceuticals.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {medications.map((med, index) => (
                      <div key={index} className="rounded-lg border border-slate-200 p-4 bg-slate-50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-slate-700">Medication #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(index)}
                            className="text-red-500 hover:text-red-700 cursor-pointer p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-600">Medicine Name</label>
                            <Input
                              required
                              placeholder="e.g. Amoxicillin"
                              value={med.name}
                              onChange={(e) => handleMedChange(index, "name", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-600">Dosage</label>
                            <Input
                              required
                              placeholder="e.g. 500mg"
                              value={med.dosage}
                              onChange={(e) => handleMedChange(index, "dosage", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-600">Frequency</label>
                            <select
                              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                              value={med.frequency}
                              onChange={(e) => handleMedChange(index, "frequency", e.target.value)}
                            >
                              <option value="once_daily">Once Daily (09:00)</option>
                              <option value="twice_daily">Twice Daily (09:00, 21:00)</option>
                              <option value="three_times_daily">3 Times Daily (08:00, 14:00, 20:00)</option>
                              <option value="four_times_daily">4 Times Daily (08:00, 12:00, 16:00, 20:00)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-600">Duration</label>
                            <Input
                              required
                              placeholder="e.g. 7 days"
                              value={med.duration}
                              onChange={(e) => handleMedChange(index, "duration", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-600">Start Date</label>
                            <Input
                              type="date"
                              required
                              value={med.startDate}
                              onChange={(e) => handleMedChange(index, "startDate", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-600">End Date</label>
                            <Input
                              type="date"
                              required
                              value={med.endDate}
                              onChange={(e) => handleMedChange(index, "endDate", e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">Instructions for Patient</label>
                          <Input
                            placeholder="e.g. Take after breakfast with water"
                            value={med.instructions}
                            onChange={(e) => handleMedChange(index, "instructions", e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConsultModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Consultation & Generate Post-Visit AI Summary
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
