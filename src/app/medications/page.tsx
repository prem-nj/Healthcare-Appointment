"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MedicalSafetyDisclaimer } from "@/components/ui/medical-safety-disclaimer";
import {
  Pill,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Bell,
  ArrowLeft,
  CalendarCheck,
} from "lucide-react";
import { format } from "date-fns";

export default function PatientMedicationsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/patient/medications")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setPrescriptions(data.data.prescriptions || []);
          setUpcomingReminders(data.data.upcomingReminders || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Pill className="w-8 h-8 text-blue-600" />
              Medications & Daily Reminders
            </h1>
            <p className="text-sm text-slate-500">
              Track your active prescriptions and automated medication reminder notifications
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
          </Link>
        </div>

        <MedicalSafetyDisclaimer />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Active Prescriptions (Left column) */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-blue-600" />
              Prescription History
            </h2>

            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className="h-44 rounded-xl bg-slate-200 animate-pulse" />
                ))}
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
                No active or past prescriptions found on your record.
              </div>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((p) => (
                  <Card key={p.id} className="shadow-xs bg-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Prescribed by {p.doctor.user.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {p.doctor.specialization.name} • {format(new Date(p.createdAt), "MMM d, yyyy")}
                          </CardDescription>
                        </div>
                        <Link href={`/appointments/${p.appointmentId}`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            View Appointment
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {p.notes && (
                        <div className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          Doctor note: &ldquo;{p.notes}&rdquo;
                        </div>
                      )}

                      <div className="space-y-2">
                        {p.medications.map((m: any) => (
                          <div
                            key={m.id}
                            className="rounded-lg border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-900 text-sm">{m.name}</div>
                              <div className="text-slate-500">
                                Dosage: <span className="font-medium text-slate-800">{m.dosage}</span> • Frequency:{" "}
                                <span className="font-medium text-slate-800 capitalize">
                                  {m.frequency.replace(/_/g, " ")}
                                </span>
                              </div>
                              {m.instructions && (
                                <div className="text-slate-600 italic">Instructions: {m.instructions}</div>
                              )}
                            </div>
                            <div className="text-right sm:text-right shrink-0">
                              <span className="rounded bg-blue-50 text-blue-700 px-2 py-1 text-[11px] font-medium">
                                Duration: {m.duration}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Reminders Timeline (Right column) */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Upcoming Reminder Schedule
            </h2>

            <Card className="shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Automated Alerts</CardTitle>
                <CardDescription className="text-xs">
                  Reminders are dispatched via email at scheduled dosages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-12 rounded bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : upcomingReminders.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                    No upcoming reminders scheduled for today.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {upcomingReminders.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border border-slate-200 p-3 flex items-center justify-between text-xs hover:bg-slate-50/50"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900">{r.medication.name}</div>
                          <div className="text-slate-500">{r.medication.dosage} • {r.medication.instructions || "As prescribed"}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-semibold text-blue-700 block">
                            {format(new Date(r.dueTime), "HH:mm 'UTC'")}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {format(new Date(r.dueTime), "MMM d")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
