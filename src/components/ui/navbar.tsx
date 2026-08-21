"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import {
  Activity,
  Calendar,
  User,
  Shield,
  Stethoscope,
  Pill,
  LogOut,
  Menu,
  X,
} from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data?.data?.user) {
          setCurrentUser(data.data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Activity className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
              MediCare Connect
            </span>
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              Healthcare & Follow-up
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-6">
          <Link
            href="/doctors"
            className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1.5"
          >
            <Stethoscope className="w-4 h-4" />
            Find Doctors
          </Link>

          {currentUser && (
            <>
              {currentUser.role === "PATIENT" && (
                <>
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                  >
                    <Calendar className="w-4 h-4" />
                    My Appointments
                  </Link>
                  <Link
                    href="/medications"
                    className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                  >
                    <Pill className="w-4 h-4" />
                    Medications & Reminders
                  </Link>
                </>
              )}

              {currentUser.role === "DOCTOR" && (
                <Link
                  href="/doctor-portal"
                  className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                >
                  <Stethoscope className="w-4 h-4" />
                  Doctor Schedule & Consultations
                </Link>
              )}

              {currentUser.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                >
                  <Shield className="w-4 h-4" />
                  Admin Console
                </Link>
              )}
            </>
          )}
        </div>

        {/* User Auth Buttons */}
        <div className="hidden md:flex md:items-center md:gap-3">
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-100" />
          ) : currentUser ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-200 text-xs">
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-medium text-slate-800">{currentUser.name}</span>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 uppercase">
                  {currentUser.role}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-1 text-xs">
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-slate-600 hover:text-slate-900"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-4 md:hidden space-y-3">
          <Link
            href="/doctors"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-slate-700"
          >
            Find Doctors
          </Link>
          {currentUser?.role === "PATIENT" && (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-slate-700"
              >
                My Appointments
              </Link>
              <Link
                href="/medications"
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-slate-700"
              >
                Medications
              </Link>
            </>
          )}
          {currentUser?.role === "DOCTOR" && (
            <Link
              href="/doctor-portal"
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-slate-700"
            >
              Doctor Schedule
            </Link>
          )}
          {currentUser?.role === "ADMIN" && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-slate-700"
            >
              Admin Console
            </Link>
          )}

          <div className="pt-2 border-t border-slate-100">
            {currentUser ? (
              <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
                Sign Out ({currentUser.name})
              </Button>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className="w-1/2">
                  <Button variant="outline" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" className="w-1/2">
                  <Button size="sm" className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
