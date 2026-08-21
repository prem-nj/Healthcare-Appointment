"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MedicalSafetyDisclaimer } from "@/components/ui/medical-safety-disclaimer";
import { UrgencyBadge } from "@/components/ui/urgency-badge";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  CalendarCheck,
  Mail,
  User,
} from "lucide-react";
import { format, addDays } from "date-fns";

export default function BookAppointmentPage({
  params,
}: {
  params: Promise<{ doctorId: string }>;
}) {
  const { doctorId } = use(params);
  const router = useRouter();

  const [doctor, setDoctor] = useState<any>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(true);

  // Step flow: 1 = Slot Selection, 2 = Symptoms, 3 = Review, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [selectedDate, setSelectedDate] = useState<string>(
    format(addDays(new Date(), 1), "yyyy-MM-dd")
  );
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);

  // Symptoms
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState<"Mild" | "Moderate" | "Severe">("Moderate");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<any>(null);

  // Load Doctor Details
  useEffect(() => {
    fetch(`/api/doctors/${doctorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) setDoctor(data.data.doctor);
      })
      .catch(console.error)
      .finally(() => setLoadingDoctor(false));
  }, [doctorId]);

  // Load Slots whenever date changes
  useEffect(() => {
    if (!doctorId || !selectedDate) return;
    setLoadingSlots(true);
    fetch(`/api/doctors/${doctorId}/availability?date=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setSlots(data.data.slots);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingSlots(false));
  }, [doctorId, selectedDate]);

  // Handle Slot Selection with Hold
  const handleSelectSlot = async (slot: any) => {
    if (!slot.isAvailable) return;
    setSelectedSlot(slot);
    setBookingError(null);

    try {
      const res = await fetch("/api/appointments/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId,
          startTime: slot.startTime,
          durationMinutes: doctor?.slotDurationMinutes || 30,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?redirect=/book/${doctorId}`);
          return;
        }
        throw new Error(data?.error?.message || "Slot is no longer available");
      }

      setHoldId(data.data.hold.id);
      setHoldExpiresAt(new Date(data.data.hold.expiresAt));
    } catch (err: any) {
      setBookingError(err?.message || "Failed to hold slot");
      setSelectedSlot(null);
    }
  };

  // Submit Final Booking
  const handleConfirmBooking = async () => {
    setBookingLoading(true);
    setBookingError(null);

    try {
      const payload = {
        doctorId,
        startTime: selectedSlot.startTime,
        holdId: holdId || undefined,
        symptoms: {
          chiefComplaint,
          symptoms,
          duration,
          severity,
          additionalNotes: additionalNotes || undefined,
        },
      };

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?redirect=/book/${doctorId}`);
          return;
        }
        throw new Error(data?.error?.message || "Booking failed");
      }

      setConfirmedAppointment(data.data.appointment);
      setStep(4);
    } catch (err: any) {
      setBookingError(err?.message || "Failed to complete appointment booking");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loadingDoctor) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold text-slate-900">Doctor not found</h2>
        <Link href="/doctors">
          <Button variant="outline">Back to Doctors Directory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/doctors"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Doctors
          </Link>
          <div className="text-xs font-medium text-slate-500">
            Step {step} of {step === 4 ? 4 : 3}
          </div>
        </div>

        {/* Doctor Banner Card */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                {doctor.user.name.replace("Dr. ", "").charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{doctor.user.name}</h1>
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
                  <Badge variant="default">{doctor.specialization.name}</Badge>
                  <span>•</span>
                  <span>{doctor.slotDurationMinutes} min duration</span>
                  <span>•</span>
                  <span className="font-semibold text-emerald-700">${doctor.consultationFee.toFixed(2)}</span>
                </div>
              </div>
            </div>
            {holdExpiresAt && step < 4 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Slot held for 5 minutes</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* STEP 1: Select Date & Available Slot */}
        {step === 1 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                1. Select Appointment Date & Slot
              </CardTitle>
              <CardDescription>
                Choose an available time slot. Slots are refreshed in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {bookingError && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  {bookingError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Appointment Date</label>
                <Input
                  type="date"
                  min={format(new Date(), "yyyy-MM-dd")}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="max-w-xs"
                />
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Available Consultation Slots</span>
                  {loadingSlots && <span className="text-blue-600 animate-pulse text-[11px]">Loading slots...</span>}
                </div>

                {loadingSlots ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <div key={n} className="h-11 rounded-lg bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                    No available appointment slots found for this date. The doctor may be off-duty or on approved leave.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime;
                      return (
                        <button
                          key={slot.startTime}
                          disabled={!slot.isAvailable}
                          onClick={() => handleSelectSlot(slot)}
                          className={`rounded-lg border p-3 text-center text-xs font-medium transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30"
                              : slot.isAvailable
                              ? "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer"
                              : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60 line-through"
                          }`}
                        >
                          <div className="font-semibold">{slot.timeString}</div>
                          {!slot.isAvailable && (
                            <div className="text-[10px] no-underline pt-0.5">{slot.reason || "Unavailable"}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500">
                {selectedSlot ? `Selected: ${selectedSlot.timeString}` : "Please select an available slot"}
              </span>
              <Button
                disabled={!selectedSlot}
                onClick={() => setStep(2)}
                className="flex items-center gap-1"
              >
                Continue to Symptoms <ArrowRight className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 2: Symptoms Submission Form */}
        {step === 2 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                2. Symptom Information (Pre-Visit Intake)
              </CardTitle>
              <CardDescription>
                Provide details about what you are experiencing. This generates an AI assistive summary for the consulting physician.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MedicalSafetyDisclaimer />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Chief Complaint <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g., Severe migraine with light sensitivity, Persistent dry cough"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Duration of Symptoms <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g., 3 days, 2 weeks, ongoing"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Severity Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                    value={severity}
                    onChange={(e: any) => setSeverity(e.target.value)}
                  >
                    <option value="Mild">Mild (Noticeable but does not disrupt daily routine)</option>
                    <option value="Moderate">Moderate (Interferes with some daily activities)</option>
                    <option value="Severe">Severe (Significantly debilitating)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Detailed Symptoms & Progression <span className="text-red-500">*</span>
                </label>
                <Textarea
                  required
                  rows={3}
                  placeholder="Describe your symptoms in detail (triggers, location, what eases or worsens them)..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Additional Medical Context (Optional)
                </label>
                <Textarea
                  rows={2}
                  placeholder="Relevant past medical history, family history, or medications already taken..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                disabled={!chiefComplaint || !symptoms || !duration}
                onClick={() => setStep(3)}
              >
                Review & Confirm <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 3: Review & Final Confirmation */}
        {step === 3 && (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                3. Review Appointment Details
              </CardTitle>
              <CardDescription>
                Confirm your booking details. An atomic database transaction locks your slot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {bookingError && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  {bookingError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs">
                  <div className="font-semibold text-slate-900 text-sm">Consultation Information</div>
                  <div className="text-slate-600">Doctor: <span className="font-medium text-slate-900">{doctor.user.name}</span></div>
                  <div className="text-slate-600">Specialty: <span className="font-medium text-slate-900">{doctor.specialization.name}</span></div>
                  <div className="text-slate-600">Date: <span className="font-medium text-slate-900">{selectedDate}</span></div>
                  <div className="text-slate-600">Time: <span className="font-medium text-slate-900">{selectedSlot?.timeString}</span></div>
                  <div className="text-slate-600">Fee: <span className="font-semibold text-emerald-700">${doctor.consultationFee.toFixed(2)}</span></div>
                </div>

                <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs">
                  <div className="font-semibold text-slate-900 text-sm">Symptom Summary</div>
                  <div className="text-slate-600">Chief Complaint: <span className="font-medium text-slate-900">{chiefComplaint}</span></div>
                  <div className="text-slate-600">Duration: <span className="font-medium text-slate-900">{duration}</span></div>
                  <div className="text-slate-600">Severity: <span className="font-medium text-slate-900">{severity}</span></div>
                  <div className="text-slate-600 line-clamp-2">Symptoms: <span className="font-medium text-slate-900">{symptoms}</span></div>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3.5 text-xs text-blue-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-blue-600" />
                  Automated Confirmations & Calendar Sync
                </div>
                <p>
                  Upon clicking confirm, you and the doctor will receive an instant email notification.
                  If your Google Calendar is connected, the event will automatically sync.
                </p>
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Edit Symptoms
              </Button>
              <Button
                isLoading={bookingLoading}
                onClick={handleConfirmBooking}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Confirm Appointment Booking
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 4: Success Screen */}
        {step === 4 && (
          <Card className="shadow-lg border-emerald-200 bg-white">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                <CalendarCheck className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">
                Appointment Successfully Booked!
              </CardTitle>
              <CardDescription>
                Your appointment has been confirmed with {doctor.user.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="rounded-xl bg-slate-50 p-6 border border-slate-200 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span className="text-slate-500">Status</span>
                  <Badge variant="success">CONFIRMED</Badge>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span className="text-slate-500">Doctor</span>
                  <span className="font-semibold text-slate-900">{doctor.user.name} ({doctor.specialization.name})</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span className="text-slate-500">Date & Time</span>
                  <span className="font-semibold text-slate-900">{selectedDate} at {selectedSlot?.timeString}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Chief Complaint</span>
                  <span className="font-medium text-slate-900">{chiefComplaint}</span>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50/80 p-4 border border-blue-200 text-xs text-blue-900 space-y-2">
                <div className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  AI Pre-Visit Triage in Progress
                </div>
                <p>
                  Our background clinical assistant is generating an assistive summary and suggested questions for your doctor. You can view the full status in your patient dashboard.
                </p>
              </div>

              <MedicalSafetyDisclaimer />
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/dashboard" className="w-full sm:w-1/2">
                <Button className="w-full">
                  Go to Patient Dashboard
                </Button>
              </Link>
              <Link href="/doctors" className="w-full sm:w-1/2">
                <Button variant="outline" className="w-full">
                  Book Another Appointment
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
