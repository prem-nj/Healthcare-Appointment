import OpenAI from "openai";
import { preVisitAISchema, postVisitAISchema } from "@/validators";

export interface PreVisitAIOutput {
  urgencyLevel: "Low" | "Medium" | "High";
  chiefComplaint: string;
  suggestedQuestions: string[];
}

export interface PostVisitAIOutput {
  patientFriendlySummary: string;
  medicationScheduleSummary?: string;
  followUpSteps: string[];
}

export class LLMService {
  private static getClient(): OpenAI | null {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey || apiKey === "your-openai-or-gemini-api-key" || apiKey.trim() === "") {
      return null;
    }
    return new OpenAI({
      apiKey,
      timeout: 10000,
      maxRetries: 2,
    });
  }

  /**
   * Generates Pre-Visit AI Summary from patient symptoms.
   * Never throws - returns fallback on failure.
   */
  static async generatePreVisitSummary(input: {
    chiefComplaint: string;
    symptoms: string;
    duration: string;
    severity: string;
    additionalNotes?: string | null;
  }): Promise<{ success: boolean; data: PreVisitAIOutput; rawResponse?: string; error?: string }> {
    const prompt = `You are a medical assistant AI. Analyse these patient symptoms to assist the consulting doctor. 
DO NOT provide a medical diagnosis. Urgency is strictly for scheduling prioritization.

Patient Chief Complaint: ${input.chiefComplaint}
Symptoms: ${input.symptoms}
Duration: ${input.duration}
Severity: ${input.severity}
${input.additionalNotes ? `Additional Notes: ${input.additionalNotes}` : ""}

Return ONLY a valid JSON object strictly matching this shape:
{
  "urgencyLevel": "Low" | "Medium" | "High",
  "chiefComplaint": "Concise summary of main issue",
  "suggestedQuestions": [
    "Question 1 for the doctor to ask",
    "Question 2 for the doctor to ask",
    "Question 3 for the doctor to ask"
  ]
}`;

    const client = this.getClient();

    if (!client) {
      // Intelligent rule-based fallback when LLM API Key is not set
      const urgency =
        input.severity.toLowerCase() === "severe" || input.symptoms.toLowerCase().includes("chest pain") || input.symptoms.toLowerCase().includes("breathing")
          ? "High"
          : input.severity.toLowerCase() === "moderate"
          ? "Medium"
          : "Low";

      const fallbackData: PreVisitAIOutput = {
        urgencyLevel: urgency,
        chiefComplaint: input.chiefComplaint,
        suggestedQuestions: [
          `When did the symptoms first begin and have they changed over the past ${input.duration}?`,
          `Are there specific triggers or activities that worsen or alleviate the ${input.chiefComplaint.toLowerCase()}?`,
          `Have you experienced any related symptoms or previous episodes like this?`,
        ],
      };

      return {
        success: true,
        data: fallbackData,
        rawResponse: JSON.stringify(fallbackData),
      };
    }

    try {
      const response = await client.chat.completions.create({
        model: process.env.LLM_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a clinical decision support AI assistant. Provide structured JSON output only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const raw = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(raw);
      const validated = preVisitAISchema.parse(parsed);

      return {
        success: true,
        data: validated,
        rawResponse: raw,
      };
    } catch (err: any) {
      console.error("LLM Pre-Visit Summary Generation Failed:", err?.message || err);

      // Safe fallback data so appointment workflow remains completely unblocked
      const fallbackData: PreVisitAIOutput = {
        urgencyLevel: input.severity === "Severe" ? "High" : input.severity === "Moderate" ? "Medium" : "Low",
        chiefComplaint: input.chiefComplaint,
        suggestedQuestions: [
          "Can you describe the progression of your symptoms in detail?",
          "Are you currently taking any medications or home remedies for relief?",
          "Does anything specific trigger or relieve your discomfort?",
        ],
      };

      return {
        success: false,
        data: fallbackData,
        error: err?.message || "LLM request failed",
      };
    }
  }

  /**
   * Generates Post-Visit Patient-Friendly Summary from doctor's consultation notes & prescription.
   * Never throws - returns fallback on failure.
   */
  static async generatePostVisitSummary(input: {
    clinicalNotes: string;
    diagnosis?: string | null;
    followUpInstructions?: string | null;
    medications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string | null;
    }>;
  }): Promise<{ success: boolean; data: PostVisitAIOutput; rawResponse?: string; error?: string }> {
    const medDetails =
      input.medications && input.medications.length > 0
        ? input.medications
            .map(
              (m) =>
                `- ${m.name} (${m.dosage}), Frequency: ${m.frequency.replace(/_/g, " ")}, Duration: ${m.duration}${
                  m.instructions ? `, Instructions: ${m.instructions}` : ""
                }`
            )
            .join("\n")
        : "None prescribed";

    const prompt = `Convert these clinical notes and prescription into a clear, empathetic, patient-friendly summary, medication schedule, and actionable follow-up steps.

Clinical Notes: ${input.clinicalNotes}
Diagnosis: ${input.diagnosis || "Not specified"}
Follow-up Instructions: ${input.followUpInstructions || "Standard follow-up"}
Medications Prescribed:
${medDetails}

Return ONLY a valid JSON object strictly matching this shape:
{
  "patientFriendlySummary": "Clear, compassionate explanation of what was discussed and the doctor's assessment in easy-to-understand language.",
  "medicationScheduleSummary": "Clear daily routine breakdown for taking prescribed medications safely.",
  "followUpSteps": [
    "Follow up step 1",
    "Follow up step 2",
    "When to seek immediate medical attention"
  ]
}`;

    const client = this.getClient();

    if (!client) {
      // High quality fallback
      const fallbackData: PostVisitAIOutput = {
        patientFriendlySummary: `During your visit, your doctor reviewed your symptoms and recorded the following assessment: ${
          input.diagnosis ? input.diagnosis : "Clinical evaluation completed"
        }. Please follow the personalized treatment plan outlined by your physician.`,
        medicationScheduleSummary:
          input.medications && input.medications.length > 0
            ? `Take your prescribed medications (${input.medications
                .map((m) => m.name)
                .join(", ")}) according to the directions provided by your doctor.`
            : "No prescription medications required for this visit.",
        followUpSteps: [
          input.followUpInstructions || "Rest and monitor your symptoms closely.",
          "Complete the entire course of any prescribed medications.",
          "Contact the clinic or seek emergency care if your symptoms worsen or new severe symptoms develop.",
        ],
      };

      return {
        success: true,
        data: fallbackData,
        rawResponse: JSON.stringify(fallbackData),
      };
    }

    try {
      const response = await client.chat.completions.create({
        model: process.env.LLM_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an empathetic medical communicator helping patients understand their doctor's instructions. Provide JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const raw = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(raw);
      const validated = postVisitAISchema.parse(parsed);

      return {
        success: true,
        data: validated,
        rawResponse: raw,
      };
    } catch (err: any) {
      console.error("LLM Post-Visit Summary Generation Failed:", err?.message || err);

      const fallbackData: PostVisitAIOutput = {
        patientFriendlySummary: `Summary of consultation: ${input.clinicalNotes}. Diagnosis: ${
          input.diagnosis || "Clinical assessment completed"
        }.`,
        medicationScheduleSummary:
          input.medications && input.medications.length > 0
            ? `Please take your prescribed medicines (${input.medications.map((m) => m.name).join(", ")}) as directed.`
            : "No medications prescribed.",
        followUpSteps: [
          input.followUpInstructions || "Follow standard care instructions.",
          "Contact the clinic if symptoms do not improve.",
        ],
      };

      return {
        success: false,
        data: fallbackData,
        error: err?.message || "LLM request failed",
      };
    }
  }
}
