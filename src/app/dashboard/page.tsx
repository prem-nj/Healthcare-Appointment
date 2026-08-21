"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UrgencyBadge } from "@/components/ui/urgency-badge";
import { MedicalSafetyDisclaimer } from "@/components/ui/medical-safety-disclaimer";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Stethoscope,
  Pill,
  RefreshCw,
  ExternalLink,
  CalendarCheck,
  Sparkles,
  Plus,
} from "lucide-react";
import { format } from "date-fns";

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Modal States
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [activeAppt, setActiveAppt] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
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
    fetchDashboardData();
  }, []);

  const handleCancel = async () => {
    if (!activeAppt || !cancelReason) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/appointments/${activeAppt.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to cancel");
      setCancelModalOpen(false);
      setCancelReason("");
      fetchDashboardData();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!activeAppt || !rescheduleTime) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/appointments/${activeAppt.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStartTime: new Date(rescheduleTime).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to reschedule");
      setRescheduleModalOpen(false);
      setRescheduleTime("");
      fetchDashboardData();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const res = await fetch("/api/google/connect");
      const data = await res.json();
      if (data?.success && data?.data?.authUrl) {
        window.location.href = data.data.authUrl;
      } else {
        alert("Google Calendar OAuth credentials not configured in .env");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const upcomingAppointments = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "HELD" || a.status === "PENDING"
  );
  const pastAppointments = appointments.filter(
    (a) => a.status !== "CONFIRMED" && a.status !== "HELD" && a.status !== "PENDING"
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.name || "Patient"}
            </h1>
            <p className="text-sm text-slate-500">
              Manage your upcoming visits, medication schedules, and clinical summaries
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/doctors">
              <Button className="shadow-xs">
                <Plus className="mr-1.5 h-4 w-4" /> Book New Appointment
              </Button>
            </Link>
          </div>
        </div>

        <MedicalSafetyDisclaimer />

        {/* Quick Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Upcoming Visits</CardDescription>
              <CardTitle className="text-2xl font-bold">{upcomingAppointments.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">
              Confirmed consultations scheduled
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Google Calendar Sync</CardDescription>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">
                  {user?.googleCalendarConnection?.syncEnabled ? "Connected" : "Not Connected"}
                </CardTitle>
                <Badge variant={user?.googleCalendarConnection?.syncEnabled ? "success" : "secondary"}>
                  {user?.googleCalendarConnection?.syncEnabled ? "Active" : "Disabled"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-slate-500 pt-2">
              {user?.googleCalendarConnection?.syncEnabled ? (
                <span>Auto-syncing to: {user.googleCalendarConnection.email}</span>
              ) : (
                <Button variant="outline" size="sm" onClick={handleConnectCalendar} className="text-xs mt-1">
                  Connect Google Calendar
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Medication Hub</CardDescription>
              <CardTitle className="text-base font-bold">Active Prescriptions</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">
              <Link href="/medications" className="text-blue-600 hover:underline font-semibold flex items-center gap-1">
                <Pill className="w-3.5 h-3.5" /> View Schedules & Reminders →
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Upcoming Appointments
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="h-28 rounded-xl bg-slate-200 animate-pulse" />
              ))}
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-3">
              <CalendarCheck className="mx-auto h-8 w-8 text-slate-400" />
              <p className="text-sm font-semibold text-slate-800">No upcoming appointments scheduled</p>
              <Link href="/doctors">
                <Button size="sm">Find a Specialist & Book Slot</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {upcomingAppointments.map((appt) => (
                <Card key={appt.id} className="hover:border-blue-300 transition-colors shadow-xs">
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                          {appt.doctor.user.name.replace("Dr. ", "").charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-base">
                            {appt.doctor.user.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {appt.doctor.specialization.name} • Fee: ${appt.doctor.consultationFee}
                          </div>
                        </div>
                        <Badge variant="success">{appt.status}</Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          {format(new Date(appt.startTime), "EEEE, MMMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          {format(new Date(appt.startTime), "HH:mm")} - {format(new Date(appt.endTime), "HH:mm")} UTC
                        </span>
                        {appt.preVisitSummary && (
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            <UrgencyBadge level={appt.preVisitSummary.urgencyLevel} />
                          </span>
                        )}
                      </div>

                      {appt.symptomSubmission && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="font-semibold text-slate-800">Chief Complaint: </span>
                          <span>{appt.symptomSubmission.chiefComplaint}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col gap-2 shrink-0">
                      <Link href={`/appointments/${appt.id}`}>
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          View Details
                        </Button>
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setActiveAppt(appt);
                          setRescheduleModalOpen(true);
                        }}
                        className="text-xs"
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveAppt(appt);
                          setCancelModalOpen(true);
                        }}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Past Appointments Section */}
        <div className="space-y-4 pt-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            Past & Completed Appointments
          </h2>

          {pastAppointments.length === 0 ? (
            <div className="text-xs text-slate-500 italic">No past appointments recorded.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pastAppointments.map((appt) => (
                <Card key={appt.id} className="bg-slate-50/50">
                  <CardContent className="p-4 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{appt.doctor.user.name}</span>
                        <Badge
                          variant={
                            appt.status === "COMPLETED"
                              ? "success"
                              : appt.status.includes("CANCEL")
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {appt.status}
                        </Badge>
                      </div>
                      <div className="text-slate-500">
                        {format(new Date(appt.startTime), "MMM d, yyyy 'at' HH:mm")} • {appt.doctor.specialization.name}
                      </div>
                      {appt.cancellationReason && (
                        <div className="text-red-600 italic">Reason: {appt.cancellationReason}</div>
                      )}
                    </div>
                    <Link href={`/appointments/${appt.id}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        View Visit Summary →
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-white p-6 space-y-4">
            <CardTitle className="text-base text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Cancel Appointment
            </CardTitle>
            <p className="text-xs text-slate-600">
              Are you sure you want to cancel your appointment with {activeAppt?.doctor.user.name}? This will free up the slot and notify the doctor.
            </p>

            {actionError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{actionError}</div>}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Reason for cancellation</label>
              <Input
                placeholder="e.g., Scheduling conflict, feeling better"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)}>
                Go Back
              </Button>
              <Button
                variant="destructive"
                size="sm"
                isLoading={actionLoading}
                disabled={!cancelReason}
                onClick={handleCancel}
              >
                Confirm Cancellation
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-white p-6 space-y-4">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" /> Reschedule Appointment
            </CardTitle>
            <p className="text-xs text-slate-600">
              Select a new date and time for your consultation with {activeAppt?.doctor.user.name}.
            </p>

            {actionError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{actionError}</div>}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">New Date and Time</label>
              <Input
                type="datetime-local"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRescheduleModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={actionLoading}
                disabled={!rescheduleTime}
                onClick={handleReschedule}
              >
                Save New Time
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
