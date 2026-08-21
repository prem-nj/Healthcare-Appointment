"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MedicalSafetyDisclaimer } from "@/components/ui/medical-safety-disclaimer";
import {
  Shield,
  Users,
  Stethoscope,
  Calendar,
  Bell,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Clock,
  DollarSign,
  FileText,
  Activity,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

export default function AdminConsolePage() {
  const [stats, setStats] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs: "overview" | "doctors" | "leaves" | "notifications" | "jobs"
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Create Doctor Modal
  const [createDocModalOpen, setCreateDocModalOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [docEmail, setDocEmail] = useState("");
  const [docPassword, setDocPassword] = useState("Password@123456");
  const [docPhone, setDocPhone] = useState("");
  const [docSpecId, setDocSpecId] = useState("");
  const [docLicense, setDocLicense] = useState("");
  const [docBio, setDocBio] = useState("");
  const [docFee, setDocFee] = useState(100);
  const [docSlotDuration, setDocSlotDuration] = useState(30);

  // Apply Leave Modal
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveDoctorId, setLeaveDoctorId] = useState("");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveResult, setLeaveResult] = useState<any>(null);

  // Job Running State
  const [jobRunning, setJobRunning] = useState(false);
  const [jobResult, setJobResult] = useState<any>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, docRes, specRes, notifRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/doctors"),
        fetch("/api/specializations"),
        fetch("/api/admin/notifications"),
      ]);

      const statsData = await statsRes.json();
      const docData = await docRes.json();
      const specData = await specRes.json();
      const notifData = await notifRes.json();

      if (statsData.success) {
        setStats(statsData.data.stats);
        setAuditLogs(statsData.data.recentAuditLogs || []);
      }
      if (docData.success) setDoctors(docData.data.doctors);
      if (specData.success) setSpecializations(specData.data.specializations);
      if (notifData.success) setNotifications(notifData.data.notifications);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const res = await fetch("/api/admin/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: docName,
          email: docEmail,
          password: docPassword,
          phone: docPhone || undefined,
          specializationId: docSpecId,
          licenseNumber: docLicense || undefined,
          bio: docBio || undefined,
          consultationFee: Number(docFee),
          slotDurationMinutes: Number(docSlotDuration),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to create doctor");

      setCreateDocModalOpen(false);
      setDocName("");
      setDocEmail("");
      fetchAdminData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setLeaveResult(null);

    try {
      const res = await fetch(`/api/admin/doctors/${leaveDoctorId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(leaveStartDate).toISOString(),
          endDate: new Date(leaveEndDate).toISOString(),
          reason: leaveReason || "Scheduled Leave",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to create doctor leave");

      setLeaveResult(data.data);
      fetchAdminData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleRetryNotification = async (notifId: string) => {
    try {
      const res = await fetch(`/api/admin/notifications/${notifId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (data?.success) {
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunJobs = async () => {
    setJobRunning(true);
    try {
      const res = await fetch("/api/jobs/run", { method: "POST" });
      const data = await res.json();
      setJobResult(data);
      fetchAdminData();
    } catch (e) {
      console.error(e);
    } finally {
      setJobRunning(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" />
              Clinic Administration & Governance
            </h1>
            <p className="text-sm text-slate-500">
              Manage doctor credentials, working hours, conflict resolution, notification logs, and system jobs
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              isLoading={jobRunning}
              onClick={handleRunJobs}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Run Background Jobs
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setDocSpecId(specializations[0]?.id || "");
                setCreateDocModalOpen(true);
              }}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add New Doctor
            </Button>
          </div>
        </div>

        <MedicalSafetyDisclaimer />

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
          {[
            { id: "overview", label: "Overview Metrics" },
            { id: "doctors", label: `Doctor Directory (${doctors.length})` },
            { id: "leaves", label: "Leave & Conflict Management" },
            { id: "notifications", label: `Notification Queue (${notifications.length})` },
            { id: "audit", label: `Audit Log (${auditLogs.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: Overview Metrics */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-blue-600" /> Registered Patients
                  </CardDescription>
                  <CardTitle className="text-3xl font-bold">{stats?.totalPatients || 0}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-500">Verified patient profiles</CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <Stethoscope className="w-4 h-4 text-emerald-600" /> Active Doctors
                  </CardDescription>
                  <CardTitle className="text-3xl font-bold">{stats?.totalDoctors || 0}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-500">Across {specializations.length} specializations</CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-purple-600" /> Total Appointments
                  </CardDescription>
                  <CardTitle className="text-3xl font-bold">{stats?.totalAppointments || 0}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-500">Scheduled & completed visits</CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-amber-600" /> Active Slot Holds
                  </CardDescription>
                  <CardTitle className="text-3xl font-bold">{stats?.activeSlotHolds || 0}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-500">5-min concurrency locks active</CardContent>
              </Card>
            </div>

            {jobResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Background Jobs Result:
                </div>
                <pre className="font-mono text-[11px] bg-white p-2 rounded border border-emerald-100 overflow-x-auto">
                  {JSON.stringify(jobResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Doctors Management */}
        {activeTab === "doctors" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Manage Doctors & Working Hours</h2>
              <Button size="sm" onClick={() => setCreateDocModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Doctor
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {doctors.map((doc) => (
                <Card key={doc.id} className="p-4 bg-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{doc.user.name}</span>
                        <Badge variant="default">{doc.specialization.name}</Badge>
                        <Badge variant={doc.user.isActive ? "success" : "destructive"}>
                          {doc.user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-slate-500">
                        {doc.user.email} • Phone: {doc.user.phone || "N/A"} • License: {doc.licenseNumber || "N/A"}
                      </div>
                      <div className="text-slate-600">
                        Fee: <span className="font-semibold text-emerald-700">${doc.consultationFee}</span> • Slot Duration:{" "}
                        <span className="font-semibold">{doc.slotDurationMinutes} min</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLeaveDoctorId(doc.id);
                          setLeaveModalOpen(true);
                        }}
                        className="text-xs"
                      >
                        Apply Leave
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Leave & Conflict Management */}
        {activeTab === "leaves" && (
          <div className="space-y-6">
            <Card className="p-6 bg-white space-y-4">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Doctor Leave & Conflicted Appointment Resolution
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                When an approved leave is registered for a doctor, any existing confirmed or pending appointments in that window are automatically cancelled with status <code>CANCELLED_BY_LEAVE</code>, email notifications are dispatched with a direct rebooking option, and Google Calendar events are cancelled.
              </CardDescription>

              <form onSubmit={handleApplyLeave} className="space-y-4 pt-2 border-t border-slate-100">
                {actionError && (
                  <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                    {actionError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Select Doctor</label>
                    <select
                      required
                      className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                      value={leaveDoctorId}
                      onChange={(e) => setLeaveDoctorId(e.target.value)}
                    >
                      <option value="">-- Choose Doctor --</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.user.name} ({d.specialization.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Leave Start Date/Time</label>
                    <Input
                      type="datetime-local"
                      required
                      value={leaveStartDate}
                      onChange={(e) => setLeaveStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Leave End Date/Time</label>
                    <Input
                      type="datetime-local"
                      required
                      value={leaveEndDate}
                      onChange={(e) => setLeaveEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Reason for Leave</label>
                  <Input
                    placeholder="e.g., Medical Conference, Annual Leave"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                  />
                </div>

                <Button type="submit" disabled={!leaveDoctorId || !leaveStartDate || !leaveEndDate}>
                  Apply Doctor Leave & Resolve Any Conflicts
                </Button>
              </form>

              {leaveResult && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 space-y-1.5 mt-4">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Leave Successfully Created
                  </div>
                  <div>Affected Appointments Automatically Cancelled: <strong>{leaveResult.affectedAppointmentsCount}</strong></div>
                  <div>All affected patients have been queued for email notification with reschedule options.</div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 4: Notification Logs */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Notification Delivery Audit</h2>
              <span className="text-xs text-slate-500">Showing last 100 notifications</span>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Retries</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-mono text-slate-700">{n.recipientEmail}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{n.type}</td>
                      <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">{n.subject}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant={n.status === "SENT" ? "success" : n.status === "FAILED" ? "destructive" : "secondary"}>
                          {n.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{n.retryCount} / {n.maxRetries}</td>
                      <td className="py-2.5 px-4">
                        {n.status === "FAILED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryNotification(n.id)}
                            className="text-[10px] h-7 px-2"
                          >
                            Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: Audit Log */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">System Audit Trail</h2>
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{log.action}</span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    Resource: <span className="font-mono text-slate-800">{log.resourceType} ({log.resourceId})</span>
                  </div>
                  {log.details && (
                    <pre className="font-mono text-[10px] bg-slate-50 p-1.5 rounded text-slate-600 overflow-x-auto">
                      {JSON.stringify(log.details)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Doctor Modal */}
      {createDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg bg-white p-6 space-y-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" /> Create New Doctor Profile
            </CardTitle>

            {actionError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{actionError}</div>}

            <form onSubmit={handleCreateDoctor} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Doctor Name *</label>
                  <Input required placeholder="Dr. Jane Smith" value={docName} onChange={(e) => setDocName(e.target.value)} />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Email Address *</label>
                  <Input type="email" required placeholder="dr.smith@healthcare.com" value={docEmail} onChange={(e) => setDocEmail(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Initial Password *</label>
                  <Input type="password" required value={docPassword} onChange={(e) => setDocPassword(e.target.value)} />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Specialization *</label>
                  <select
                    required
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    value={docSpecId}
                    onChange={(e) => setDocSpecId(e.target.value)}
                  >
                    {specializations.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Consultation Fee ($)</label>
                  <Input type="number" required value={docFee} onChange={(e) => setDocFee(Number(e.target.value))} />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Slot Duration (min)</label>
                  <Input type="number" required value={docSlotDuration} onChange={(e) => setDocSlotDuration(Number(e.target.value))} />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Bio / Qualifications</label>
                <Textarea rows={2} placeholder="Summary of clinical expertise..." value={docBio} onChange={(e) => setDocBio(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateDocModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Create Doctor
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
