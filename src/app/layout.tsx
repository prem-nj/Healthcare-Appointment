import type { Metadata } from "next";
import { Navbar } from "@/components/ui/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediCare Connect | Healthcare Appointment & Follow-up Manager",
  description: "Enterprise healthcare appointment scheduling with AI-powered pre-visit triage, automated calendar synchronization, and smart medication reminders.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>© {new Date().getFullYear()} MediCare Connect. All clinical algorithms for assistive review only.</div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>HIPAA Compliance</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
