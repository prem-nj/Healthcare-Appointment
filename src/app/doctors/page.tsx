"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MedicalSafetyDisclaimer } from "@/components/ui/medical-safety-disclaimer";
import {
  Search,
  Filter,
  Stethoscope,
  Calendar,
  Clock,
  DollarSign,
  ShieldCheck,
  ChevronRight,
  User,
} from "lucide-react";

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/doctors", window.location.origin);
      if (searchQuery) url.searchParams.set("q", searchQuery);
      if (selectedSpecialization) url.searchParams.set("specializationId", selectedSpecialization);

      const [docRes, specRes] = await Promise.all([
        fetch(url.toString()),
        fetch("/api/specializations"),
      ]);

      const docData = await docRes.json();
      const specData = await specRes.json();

      if (docData.success) setDoctors(docData.data.doctors);
      if (specData.success) setSpecializations(specData.data.specializations);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSpecialization]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Header */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Find a Doctor & Book Online
              </h1>
              <p className="text-sm text-slate-500">
                Browse our qualified healthcare specialists and schedule real-time consultation slots
              </p>
            </div>
          </div>
          <MedicalSafetyDisclaimer />
        </div>

        {/* Filters and Search */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by doctor name, specialty, or condition..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" className="md:w-32">
              Search
            </Button>
          </form>

          {/* Specialization Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="font-semibold text-slate-500 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Filter by Specialty:
            </span>
            <button
              onClick={() => setSelectedSpecialization("")}
              className={`rounded-full px-3 py-1 font-medium transition-colors shrink-0 cursor-pointer ${
                selectedSpecialization === ""
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Specialties
            </button>
            {specializations.map((spec) => (
              <button
                key={spec.id}
                onClick={() => setSelectedSpecialization(spec.id)}
                className={`rounded-full px-3 py-1 font-medium transition-colors shrink-0 cursor-pointer ${
                  selectedSpecialization === spec.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {spec.name} ({spec._count?.doctors || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Doctor Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-64 rounded-xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
            <Stethoscope className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="text-base font-semibold text-slate-900">No doctors match your criteria</h3>
            <p className="text-xs text-slate-500">Try adjusting your search terms or specialization filters.</p>
            <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setSelectedSpecialization(""); }}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doc) => (
              <Card key={doc.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                        {doc.user.name.replace("Dr. ", "").charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{doc.user.name}</CardTitle>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Badge variant="default">{doc.specialization.name}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-3 text-xs leading-relaxed">
                    {doc.bio || "Dedicated healthcare professional providing comprehensive medical consultations."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5" /> Slot Duration:
                    </span>
                    <span className="font-semibold text-slate-800">{doc.slotDurationMinutes} minutes</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-500">
                      <DollarSign className="w-3.5 h-3.5" /> Consultation Fee:
                    </span>
                    <span className="font-semibold text-emerald-700">${doc.consultationFee.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-500">
                      <ShieldCheck className="w-3.5 h-3.5" /> License:
                    </span>
                    <span className="font-mono text-slate-600">{doc.licenseNumber || "Verified"}</span>
                  </div>
                </CardContent>

                <CardFooter className="pt-2">
                  <Link href={`/book/${doc.id}`} className="w-full">
                    <Button className="w-full text-xs">
                      Select Date & Book Slot
                      <ChevronRight className="ml-1 w-4 h-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
