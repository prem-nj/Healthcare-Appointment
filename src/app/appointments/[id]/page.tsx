"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UrgencyBadge } from "@/components/ui/urgency-badge";
import { MedicalSafetyDisclaimer } from "@/components/ui/medical-safety-disclaimer";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Sparkles,
  Pill,
  ArrowLeft,
  FileText,
  HelpCircle,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

export default function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState(false);

  const fetchAppointment = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}`);
      const data = await res.json();
      if (data?.success) {
        setAppointment(data.data.appointment);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const handleRetryAI = async (type: "PRE_VISIT" | "POST_VISIT") => {
    setRetryLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}/retry-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data?.success) {
        fetchAppointment();
      } else {
        alert(data?.error?.message || "Retry failed");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRetryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold text-slate-900">Appointment Not Found</h2>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <Badge
            variant={
              appointment.status === "CONFIRMED"
                ? "success"
                : appointment.status === "COMPLETED"
                ? "default"
                : "secondary"
            }
          >
            {appointment.status}
          </Badge>
        </div>

        {/* Appointment Header */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-900">
                  Appointment with {appointment.doctor.user.name}
                </h1>
                <p className="text-xs text-slate-500">
                  Specialty: {appointment.doctor.specialization.name} • Patient: {appointment.patient.user.name}
                </p>
              </div>
              <div className="flex flex-col text-xs text-slate-600 space-y-1 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  {format(new Date(appointment.startTime), "EEEE, MMMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  {format(new Date(appointment.startTime), "HH:mm")} - {format(new Date(appointment.endTime), "HH:mm")} UTC
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <MedicalSafetyDisclaimer />

        {/* 1. Patient Symptoms Card */}
        {appointment.symptomSubmission && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Submitted Patient Symptoms (Intake)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-500 block">Chief Complaint</span>
                  <span className="font-medium text-slate-900">{appointment.symptomSubmission.chiefComplaint}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Duration</span>
                  <span className="font-medium text-slate-900">{appointment.symptomSubmission.duration}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Severity</span>
                  <span className="font-medium text-slate-900">{appointment.symptomSubmission.severity}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-slate-700">Detailed Symptoms:</span>
                <p className="text-slate-600 whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200">
                  {appointment.symptomSubmission.symptoms}
                </p>
              </div>

              {appointment.symptomSubmission.additionalNotes && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700">Additional Context:</span>
                  <p className="text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                    {appointment.symptomSubmission.additionalNotes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 2. AI Pre-Visit Summary Card */}
        {appointment.preVisitSummary && (
          <Card className="border-blue-200 bg-blue-50/30 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  AI Pre-Visit Assistive Summary (For Clinical Review)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <UrgencyBadge level={appointment.preVisitSummary.urgencyLevel} />
                  {appointment.preVisitSummary.status === "FAILED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={retryLoading}
                      onClick={() => handleRetryAI("PRE_VISIT")}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Retry AI
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-slate-800">Clinical Focus / Chief Complaint:</span>
                <p className="text-slate-700 bg-white p-3 rounded-lg border border-blue-100">
                  {appointment.preVisitSummary.chiefComplaint}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" /> Suggested Clinical Inquiries for Doctor:
                </span>
                <div className="space-y-1.5">
                  {(appointment.preVisitSummary.suggestedQuestions as string[])?.map((q, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-blue-100 text-slate-700">
                      <span className="font-bold text-blue-600">{idx + 1}.</span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. Doctor Consultation & Notes */}
        {appointment.consultation && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-blue-600" />
                Doctor Consultation & Clinical Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {appointment.consultation.diagnosis && (
                <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
                  <span className="font-semibold text-emerald-900 block">Assessment / Diagnosis:</span>
                  <span className="font-medium text-emerald-950">{appointment.consultation.diagnosis}</span>
                </div>
              )}

              <div className="space-y-1">
                <span className="font-semibold text-slate-700">Clinical Consultation Notes:</span>
                <p className="text-slate-800 whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {appointment.consultation.clinicalNotes}
                </p>
              </div>

              {appointment.consultation.followUpInstructions && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700">Follow-up Instructions:</span>
                  <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {appointment.consultation.followUpInstructions}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 4. Prescription & Medications */}
        {appointment.prescription && appointment.prescription.medications?.length > 0 && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="w-4 h-4 text-purple-600" />
                Prescribed Medications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                      <th className="py-2.5 px-3">Medicine</th>
                      <th className="py-2.5 px-3">Dosage</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointment.prescription.medications.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{m.name}</td>
                        <td className="py-2.5 px-3 text-slate-700">{m.dosage}</td>
                        <td className="py-2.5 px-3 text-slate-700 capitalize">{m.frequency.replace(/_/g, " ")}</td>
                        <td className="py-2.5 px-3 text-slate-700">{m.duration}</td>
                        <td className="py-2.5 px-3 text-slate-600 italic">{m.instructions || "As directed"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 5. AI Post-Visit Patient-Friendly Summary */}
        {appointment.postVisitSummary && (
          <Card className="border-purple-200 bg-purple-50/30 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Patient-Friendly Visit Summary & Action Plan
                </CardTitle>
                {appointment.postVisitSummary.status === "FAILED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={retryLoading}
                    onClick={() => handleRetryAI("POST_VISIT")}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry AI
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-slate-800">Visit Explanation:</span>
                <p className="text-slate-800 bg-white p-3.5 rounded-lg border border-purple-100 leading-relaxed">
                  {appointment.postVisitSummary.patientFriendlySummary}
                </p>
              </div>

              {appointment.postVisitSummary.medicationScheduleSummary && (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-800">Daily Medication Routine:</span>
                  <p className="text-slate-800 bg-white p-3.5 rounded-lg border border-purple-100 leading-relaxed">
                    {appointment.postVisitSummary.medicationScheduleSummary}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <span className="font-semibold text-slate-800">Actionable Next Steps:</span>
                <div className="space-y-1.5">
                  {(appointment.postVisitSummary.followUpSteps as string[])?.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-purple-100 text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
