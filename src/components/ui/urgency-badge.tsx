import React from "react";
import { Badge } from "./badge";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

export function UrgencyBadge({ level }: { level: string | undefined | null }) {
  const norm = (level || "LOW").toUpperCase();

  if (norm === "HIGH") {
    return (
      <Badge variant="destructive" className="flex items-center gap-1 font-semibold">
        <AlertTriangle className="w-3 h-3" />
        High Urgency
      </Badge>
    );
  }

  if (norm === "MEDIUM") {
    return (
      <Badge variant="warning" className="flex items-center gap-1 font-semibold">
        <Clock className="w-3 h-3" />
        Medium Urgency
      </Badge>
    );
  }

  return (
    <Badge variant="success" className="flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />
      Low Urgency
    </Badge>
  );
}
