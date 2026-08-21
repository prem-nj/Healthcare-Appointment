import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MedicalSafetyDisclaimer } from "@/components/ui/medical-safety-disclaimer";
import {
  Calendar,
  Clock,
  Shield,
  Sparkles,
  Stethoscope,
  Pill,
  Bell,
  CheckCircle2,
  Lock,
  Zap,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-white py-16 sm:py-24 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100/60 px-3.5 py-1 text-xs font-semibold text-blue-800">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Intelligent Healthcare Scheduling & Follow-up
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.15]">
                Seamless Doctor Appointments & <span className="text-blue-600">Smart Follow-up</span>
              </h1>

              <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
                Experience healthcare scheduling with zero double-bookings, AI-powered pre-visit symptom summaries, automated Google Calendar sync, relational e-prescriptions, and smart medication reminders.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link href="/doctors">
                  <Button size="lg" className="shadow-md">
                    <Stethoscope className="mr-2 h-5 w-5" />
                    Book an Appointment
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    Sign In to Portal
                  </Button>
                </Link>
              </div>

              <div className="pt-4">
                <MedicalSafetyDisclaimer />
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      DR
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Dr. Sarah Jenkins</h4>
                      <p className="text-xs text-slate-500">Cardiologist • 30 min slots</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium">
                    Available Today
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Next Available Slots
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="rounded-lg border border-blue-200 bg-blue-50/50 py-2 text-center text-xs font-medium text-blue-700">
                      09:00 AM
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-white py-2 text-center text-xs font-medium text-slate-700">
                      10:00 AM
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-white py-2 text-center text-xs font-medium text-slate-700">
                      11:30 AM
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      AI Pre-visit Analysis
                    </span>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Medium Urgency
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic">
                    &ldquo;Exertional chest discomfort with cardiovascular risk factors. 3 suggested clinical inquiries generated.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Architectural Pillars */}
      <section className="py-16 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Engineered for Medical Accuracy & High Reliability
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Built from the ground up with ACID transactions, atomic concurrency locking, and safe non-blocking integrations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                  <Lock className="h-5 w-5" />
                </div>
                <CardTitle>Double-Booking Prevention</CardTitle>
                <CardDescription>
                  Database-level isolation transactions and 5-minute temporary slot hold guarantees that no two patients can claim the same slot.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                  <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle>Assistive AI Summaries</CardTitle>
                <CardDescription>
                  Structured pre-visit symptom triage and patient-friendly post-visit medication schedules with complete non-diagnostic safety guardrails.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-2">
                  <Pill className="h-5 w-5" />
                </div>
                <CardTitle>Relational Prescriptions & Reminders</CardTitle>
                <CardDescription>
                  Multi-dosage medication scheduling with automated idempotent reminders and retry mechanisms for notification delivery.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Demo Credentials Quick Jump */}
      <section className="py-12 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-slate-900 p-8 text-white shadow-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Quick Demo Access</h3>
                <p className="text-sm text-slate-300">
                  Pre-configured demo accounts for all three roles are ready for testing.
                </p>
                <div className="text-xs text-slate-400 space-y-1 font-mono pt-2">
                  <div>👤 Patient: patient@healthcare.com | Password@123456</div>
                  <div>🩺 Doctor: doctor.jenkins@healthcare.com | Password@123456</div>
                  <div>🛡️ Admin: admin@healthcare.com | Password@123456</div>
                </div>
              </div>
              <Link href="/login">
                <Button variant="default" className="bg-blue-500 hover:bg-blue-600 text-white font-medium">
                  Go to Sign In →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
