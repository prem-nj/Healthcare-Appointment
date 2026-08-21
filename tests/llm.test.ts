import { describe, it, expect } from "vitest";
import { LLMService } from "@/services/llm.service";
import { preVisitAISchema, postVisitAISchema } from "@/validators";

describe("Assistive LLM Integration & Non-Blocking Fallback Suite", () => {
  it("should generate pre-visit summary matching structured Zod schema", async () => {
    const result = await LLMService.generatePreVisitSummary({
      chiefComplaint: "Acute migraine with visual aura",
      symptoms: "Throbbing pain in left temporal region, photophobia, nausea",
      duration: "6 hours",
      severity: "Severe",
      additionalNotes: "Took ibuprofen with minimal relief",
    });

    expect(result.data).toBeDefined();
    expect(["Low", "Medium", "High"]).toContain(result.data.urgencyLevel);
    expect(result.data.chiefComplaint).toBeDefined();
    expect(result.data.suggestedQuestions.length).toBeGreaterThanOrEqual(1);

    // Validate with Zod
    const validated = preVisitAISchema.safeParse(result.data);
    expect(validated.success).toBe(true);
  });

  it("should generate patient-friendly post-visit summary matching structured Zod schema", async () => {
    const result = await LLMService.generatePostVisitSummary({
      clinicalNotes: "Patient presented with acute tension-type headache. Neurological exam normal. Vital signs stable.",
      diagnosis: "Tension-type headache",
      followUpInstructions: "Maintain adequate hydration, practice neck stretching exercises, and return if headache persists beyond 1 week.",
      medications: [
        {
          name: "Acetaminophen",
          dosage: "500mg",
          frequency: "twice_daily",
          duration: "3 days",
          instructions: "Take with food",
        },
      ],
    });

    expect(result.data).toBeDefined();
    expect(result.data.patientFriendlySummary).toBeDefined();
    expect(result.data.followUpSteps.length).toBeGreaterThanOrEqual(1);

    const validated = postVisitAISchema.safeParse(result.data);
    expect(validated.success).toBe(true);
  });

  it("should never throw when inputs are empty or atypical (safe resilience)", async () => {
    const result = await LLMService.generatePreVisitSummary({
      chiefComplaint: "Checkup",
      symptoms: "Routine annual checkup",
      duration: "N/A",
      severity: "Mild",
    });

    expect(result.data.urgencyLevel).toBe("Low");
    expect(result.data.suggestedQuestions.length).toBeGreaterThan(0);
  });
});
