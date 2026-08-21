import { z } from "zod";

// User & Auth Schemas
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]).default("PATIENT"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Patient Profile Schema
export const patientProfileSchema = z.object({
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
  emergencyContact: z.string().optional(),
  address: z.string().optional(),
});

// Doctor Management Schemas
export const createDoctorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  specializationId: z.string().uuid("Invalid specialization ID"),
  licenseNumber: z.string().optional(),
  bio: z.string().optional(),
  consultationFee: z.number().positive().default(50.0),
  slotDurationMinutes: z.number().int().min(10).max(120).default(30),
  isAcceptingAppointments: z.boolean().default(true),
});

export const updateDoctorSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  specializationId: z.string().uuid().optional(),
  licenseNumber: z.string().optional(),
  bio: z.string().optional(),
  consultationFee: z.number().positive().optional(),
  slotDurationMinutes: z.number().int().min(10).max(120).optional(),
  isAcceptingAppointments: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// Specialization Schema
export const specializationSchema = z.object({
  name: z.string().min(2, "Specialization name is required"),
  description: z.string().optional(),
});

// Working Hours Schema
export const workingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:MM (e.g. 09:00)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:MM (e.g. 17:00)"),
  isActive: z.boolean().default(true),
});

export const batchWorkingHoursSchema = z.object({
  workingHours: z.array(workingHourSchema),
});

// Doctor Leave Schema
export const doctorLeaveSchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
  reason: z.string().optional(),
});

// Slot Hold Schema
export const slotHoldSchema = z.object({
  doctorId: z.string().nonempty("Doctor ID required"),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start time"),
  durationMinutes: z.number().int().positive().optional(),
});

// Symptom Submission Schema
export const symptomSubmissionSchema = z.object({
  chiefComplaint: z.string().min(3, "Chief complaint is required (min 3 chars)"),
  symptoms: z.string().min(5, "Please describe symptoms in detail (min 5 chars)"),
  duration: z.string().min(1, "Duration is required (e.g., 3 days, 2 weeks)"),
  severity: z.enum(["Mild", "Moderate", "Severe"]),
  additionalNotes: z.string().optional(),
});

// Appointment Booking Schema
export const bookAppointmentSchema = z.object({
  doctorId: z.string().nonempty("Doctor ID required"),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start time"),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end time").optional(),
  holdId: z.string().nonempty("Hold ID required").optional(),
  symptoms: symptomSubmissionSchema,
});

// Appointment Reschedule Schema
export const rescheduleAppointmentSchema = z.object({
  newStartTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid new start time"),
  reason: z.string().optional(),
});

// Appointment Cancellation Schema
export const cancelAppointmentSchema = z.object({
  reason: z.string().min(2, "Cancellation reason is required"),
});

// Consultation & Prescription Schemas
export const medicationSchema = z.object({
  name: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required (e.g., 500mg)"),
  frequency: z.enum(["once_daily", "twice_daily", "three_times_daily", "four_times_daily", "custom"]),
  customFrequency: z.string().optional(),
  duration: z.string().min(1, "Duration is required (e.g., 7 days)"),
  instructions: z.string().optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
});

export const consultationSchema = z.object({
  clinicalNotes: z.string().min(5, "Clinical notes are required"),
  diagnosis: z.string().optional(),
  followUpInstructions: z.string().optional(),
  recommendedFollowUpDate: z.string().optional(),
  prescriptionNotes: z.string().optional(),
  medications: z.array(medicationSchema).optional().default([]),
});

// LLM Structured Output Schemas
export const preVisitAISchema = z.object({
  urgencyLevel: z.enum(["Low", "Medium", "High"]),
  chiefComplaint: z.string(),
  suggestedQuestions: z.array(z.string()).min(1).max(5),
});

export const postVisitAISchema = z.object({
  patientFriendlySummary: z.string(),
  medicationScheduleSummary: z.string().optional(),
  followUpSteps: z.array(z.string()),
});
