# Assistive Clinical LLM Prompt Specifications & Safety Architecture

This document defines the structured prompts, validation pipelines, and non-blocking failure fallbacks for the AI-assisted clinical workflows in **MediCare Connect**.

---

## 1. Medical Safety & Clinical Boundary Principles

> [!IMPORTANT]
> **Strict Non-Diagnostic Principle:**
> The AI algorithms within this platform are assistive administrative tools designed solely to aid clinical scheduling and summarize patient input for doctor review. The AI does NOT provide a medical diagnosis, prescribe drugs, or alter clinical judgments. The consulting physician remains legally and clinically responsible for all diagnoses and treatment directives.

All UI presentations of AI output are paired with the explicit Medical Safety Disclaimer:
> *"AI-generated summary — for clinical review. This is not a diagnosis. Urgency levels reflect scheduling prioritization only."*

---

## 2. Pre-Visit Symptom Analysis Prompt

### Goal
Analyze the patient's submitted chief complaint, detailed symptoms, duration, and severity to provide:
1. An operational urgency triage tier (`Low`, `Medium`, `High`) for scheduling prioritization.
2. A synthesized clinical focus / chief complaint summary.
3. Three targeted, open-ended clinical questions for the consulting physician to ask.

### Prompt Template
```text
You are a clinical decision support AI assistant. Analyse these patient symptoms to assist the consulting doctor.
DO NOT provide a medical diagnosis. Urgency is strictly for scheduling prioritization.

Patient Chief Complaint: {{chiefComplaint}}
Symptoms: {{symptoms}}
Duration: {{duration}}
Severity: {{severity}}
{{#if additionalNotes}}
Additional Notes: {{additionalNotes}}
{{/if}}

Return ONLY a valid JSON object strictly matching this shape:
{
  "urgencyLevel": "Low" | "Medium" | "High",
  "chiefComplaint": "Concise summary of main issue",
  "suggestedQuestions": [
    "Question 1 for the doctor to ask",
    "Question 2 for the doctor to ask",
    "Question 3 for the doctor to ask"
  ]
}
```

### Expected Structured JSON Output
```json
{
  "urgencyLevel": "Medium",
  "chiefComplaint": "Exertional chest tightness with cardiovascular risk factors",
  "suggestedQuestions": [
    "Has the frequency or exertion threshold for the chest tightness changed over the last two weeks?",
    "Do you experience any palpitations, lightheadedness, or diaphoresis during these episodes?",
    "Are you taking any cardiovascular or blood pressure medications currently?"
  ]
}
```

### Zod Validation Schema
```typescript
export const preVisitAISchema = z.object({
  urgencyLevel: z.enum(["Low", "Medium", "High"]),
  chiefComplaint: z.string(),
  suggestedQuestions: z.array(z.string()).min(1).max(5),
});
```

---

## 3. Post-Visit Patient-Friendly Summary Prompt

### Goal
Transform the doctor's clinical notes, diagnosis, and prescription medications into an empathetic, easy-to-read patient summary, clear daily medication routine, and actionable follow-up instructions.

### Prompt Template
```text
Convert these clinical notes and prescription into a clear, empathetic, patient-friendly summary, medication schedule, and actionable follow-up steps.

Clinical Notes: {{clinicalNotes}}
Diagnosis: {{diagnosis}}
Follow-up Instructions: {{followUpInstructions}}
Medications Prescribed:
{{#each medications}}
- {{name}} ({{dosage}}), Frequency: {{frequency}}, Duration: {{duration}}, Instructions: {{instructions}}
{{/each}}

Return ONLY a valid JSON object strictly matching this shape:
{
  "patientFriendlySummary": "Clear, compassionate explanation of what was discussed and the doctor's assessment in easy-to-understand language.",
  "medicationScheduleSummary": "Clear daily routine breakdown for taking prescribed medications safely.",
  "followUpSteps": [
    "Follow up step 1",
    "Follow up step 2",
    "When to seek immediate medical attention"
  ]
}
```

### Expected Structured JSON Output
```json
{
  "patientFriendlySummary": "During your consultation, Dr. Jenkins reviewed your symptoms and confirmed an assessment of tension headache aggravated by eye strain. Your vital signs were completely normal.",
  "medicationScheduleSummary": "Take Acetaminophen 500mg twice daily with meals for up to 3 days if headache pain occurs.",
  "followUpSteps": [
    "Take 10-minute screen breaks every hour to reduce eye fatigue.",
    "Stay hydrated with at least 2 liters of water daily.",
    "Seek immediate medical attention if headache becomes sudden, explosive, or accompanied by numbness."
  ]
}
```

---

## 4. Resilience & Non-Blocking Fallback Architecture

1. **Async Separation:** All LLM invocations occur after the core ACID database transaction completes.
2. **Deterministic Fallback:** If `LLM_API_KEY` is not provided, or on network timeouts / API rate limits, the system triggers a rule-based fallback generator that parses symptoms and creates structured mock outputs.
3. **Audit & Status Tracking:** Failures record `status = FAILED` and `errorMessage` in the `PreVisitSummary` or `PostVisitSummary` table, and expose a one-click manual retry endpoint `/api/appointments/[id]/retry-ai` for clinicians.
