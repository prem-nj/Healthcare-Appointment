import React from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";

export function MedicalSafetyDisclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2.5 ${className}`}
      role="note"
      aria-label="Medical safety notice"
    >
      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold">Clinical Review Notice: </span>
        <span>
          AI-generated summaries and suggested questions are assistive tools for scheduling and clinical review only.
          They do <strong>not</strong> constitute a medical diagnosis or treatment directive.
        </span>
      </div>
    </div>
  );
}
