import { PrismaClient, Role, AppointmentStatus, LeaveStatus, AIProcessingStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import { addDays, addHours, startOfTomorrow } from "date-fns";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/healthcare_appointments?schema=public";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Clean existing records safely
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.medicationReminder.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.postVisitSummary.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.preVisitSummary.deleteMany();
  await prisma.symptomSubmission.deleteMany();
  await prisma.slotHold.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorLeave.deleteMany();
  await prisma.doctorWorkingHour.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.specialization.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password@123456", 10);

  // 2. Create Admin
  const admin = await prisma.user.create({
    data: {
      email: "admin@healthcare.com",
      passwordHash,
      name: "Clinic Administrator",
      phone: "+1 (555) 019-2831",
      role: Role.ADMIN,
    },
  });
  console.log(`Created Admin: ${admin.email}`);

  // 3. Create Specializations
  const specs = await Promise.all([
    prisma.specialization.create({
      data: {
        name: "Cardiology",
        description: "Diagnosis and treatment of heart and cardiovascular disorders.",
      },
    }),
    prisma.specialization.create({
      data: {
        name: "Dermatology",
        description: "Care for skin, hair, nails, and related cosmetic/medical conditions.",
      },
    }),
    prisma.specialization.create({
      data: {
        name: "Neurology",
        description: "Specialized care for neurological and nervous system disorders.",
      },
    }),
    prisma.specialization.create({
      data: {
        name: "General Medicine",
        description: "Primary healthcare, preventive medicine, and acute care.",
      },
    }),
    prisma.specialization.create({
      data: {
        name: "Pediatrics",
        description: "Comprehensive medical care for infants, children, and adolescents.",
      },
    }),
  ]);
  console.log(`Created ${specs.length} Specializations`);

  // 4. Create Doctors
  const doctorData = [
    {
      name: "Dr. Sarah Jenkins",
      email: "doctor.jenkins@healthcare.com",
      phone: "+1 (555) 101-0001",
      specializationId: specs[0].id, // Cardiology
      licenseNumber: "MED-CARD-88392",
      bio: "Board-certified Cardiologist with over 14 years of clinical experience specializing in preventive cardiology and hypertension management.",
      consultationFee: 120.0,
      slotDurationMinutes: 30,
    },
    {
      name: "Dr. Marcus Chen",
      email: "doctor.chen@healthcare.com",
      phone: "+1 (555) 101-0002",
      specializationId: specs[1].id, // Dermatology
      licenseNumber: "MED-DERM-44910",
      bio: "Expert Dermatologist focusing on advanced skin health, acne therapies, allergic contact dermatitis, and early melanoma screening.",
      consultationFee: 95.0,
      slotDurationMinutes: 30,
    },
    {
      name: "Dr. Emily Rodriguez",
      email: "doctor.rodriguez@healthcare.com",
      phone: "+1 (555) 101-0003",
      specializationId: specs[2].id, // Neurology
      licenseNumber: "MED-NEUR-77215",
      bio: "Clinical Neurologist specializing in migraine treatment, sleep disorders, peripheral neuropathy, and comprehensive neurological evaluations.",
      consultationFee: 150.0,
      slotDurationMinutes: 45,
    },
    {
      name: "Dr. James Wilson",
      email: "doctor.wilson@healthcare.com",
      phone: "+1 (555) 101-0004",
      specializationId: specs[3].id, // General Medicine
      licenseNumber: "MED-GENM-11234",
      bio: "Experienced Primary Care Physician providing holistic health assessments, chronic condition monitoring, and acute symptom resolution.",
      consultationFee: 75.0,
      slotDurationMinutes: 30,
    },
  ];

  const doctors = [];
  for (const doc of doctorData) {
    const user = await prisma.user.create({
      data: {
        name: doc.name,
        email: doc.email,
        passwordHash,
        phone: doc.phone,
        role: Role.DOCTOR,
      },
    });

    const profile = await prisma.doctorProfile.create({
      data: {
        userId: user.id,
        specializationId: doc.specializationId,
        licenseNumber: doc.licenseNumber,
        bio: doc.bio,
        consultationFee: doc.consultationFee,
        slotDurationMinutes: doc.slotDurationMinutes,
        isAcceptingAppointments: true,
      },
    });

    // Create Working Hours Mon (1) to Fri (5) 09:00 - 17:00
    for (let day = 1; day <= 5; day++) {
      await prisma.doctorWorkingHour.create({
        data: {
          doctorId: profile.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
          isActive: true,
        },
      });
    }

    doctors.push({ user, profile });
    console.log(`Created Doctor: ${doc.name} (${doc.email})`);
  }

  // 5. Example Doctor Leave for Dr. Marcus Chen next week
  const leaveStart = addDays(new Date(), 7);
  const leaveEnd = addDays(new Date(), 9);
  await prisma.doctorLeave.create({
    data: {
      doctorId: doctors[1].profile.id,
      startDate: leaveStart,
      endDate: leaveEnd,
      reason: "Attending Annual International Dermatology Conference",
      status: LeaveStatus.APPROVED,
    },
  });
  console.log(`Created sample leave for Dr. Marcus Chen`);

  // 6. Create Patient
  const patientUser = await prisma.user.create({
    data: {
      email: "patient@healthcare.com",
      passwordHash,
      name: "John Doe",
      phone: "+1 (555) 998-1234",
      role: Role.PATIENT,
    },
  });

  const patientProfile = await prisma.patientProfile.create({
    data: {
      userId: patientUser.id,
      dateOfBirth: new Date("1990-05-15"),
      gender: "Male",
      bloodGroup: "O+",
      allergies: "Penicillin, Seasonal Pollen",
      emergencyContact: "Jane Doe (+1 555-998-5678)",
      address: "123 Health Ave, Suite 400, Boston, MA",
    },
  });
  console.log(`Created Patient: ${patientUser.name} (${patientUser.email})`);

  // 7. Create Sample Appointments
  const tomorrow = startOfTomorrow();
  const apptStart = addHours(tomorrow, 10); // 10:00 AM UTC
  const apptEnd = addHours(tomorrow, 10.5);  // 10:30 AM UTC

  const sampleAppt = await prisma.appointment.create({
    data: {
      patientId: patientProfile.id,
      doctorId: doctors[0].profile.id, // Dr. Sarah Jenkins
      startTime: apptStart,
      endTime: apptEnd,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  // Add Symptoms
  await prisma.symptomSubmission.create({
    data: {
      appointmentId: sampleAppt.id,
      chiefComplaint: "Occasional chest tightness and shortness of breath during light exercise",
      symptoms: "Mild discomfort in the central chest area when climbing stairs, resolving within 5 minutes of rest. No radiating pain to left arm or jaw.",
      duration: "2 weeks",
      severity: "Moderate",
      additionalNotes: "Family history of early coronary artery disease (father had MI at 52).",
    },
  });

  // Add Pre-visit AI Summary
  await prisma.preVisitSummary.create({
    data: {
      appointmentId: sampleAppt.id,
      urgencyLevel: "Medium",
      chiefComplaint: "Exertional chest tightness with cardiovascular risk factors",
      suggestedQuestions: [
        "Has the frequency or exertion threshold for the chest tightness changed over the last two weeks?",
        "Do you experience any palpitations, lightheadedness, or diaphoresis during these episodes?",
        "Are you taking any cardiovascular or blood pressure medications currently?",
      ],
      status: AIProcessingStatus.SUCCESS,
    },
  });

  console.log(`Created sample appointment with pre-visit summary`);

  console.log("\n✅ Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
