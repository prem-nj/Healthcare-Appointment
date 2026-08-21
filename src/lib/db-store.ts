import bcrypt from "bcryptjs";
import { addDays, addHours, startOfTomorrow } from "date-fns";

// In-Memory Database Store for Instant Zero-Config Execution
class MemoryDatabase {
  users: any[] = [];
  patientProfiles: any[] = [];
  doctorProfiles: any[] = [];
  specializations: any[] = [];
  doctorWorkingHours: any[] = [];
  doctorLeaves: any[] = [];
  appointments: any[] = [];
  slotHolds: any[] = [];
  symptomSubmissions: any[] = [];
  preVisitSummaries: any[] = [];
  consultations: any[] = [];
  prescriptions: any[] = [];
  medications: any[] = [];
  medicationReminders: any[] = [];
  postVisitSummaries: any[] = [];
  notifications: any[] = [];
  googleCalendarConnections: any[] = [];
  auditLogs: any[] = [];

  private initialized = false;

  constructor() {
    this.seedDefaults();
  }

  seedDefaults() {
    if (this.initialized) return;
    this.initialized = true;

    const hash = "$2a$10$rN8vI94YI1Q9M9I6u8.1UuH64lS8g5E5q4xP3iA1J8H8G7F6E5D4C"; // Password@123456

    // 1. Admin
    const adminUser = {
      id: "usr-admin-01",
      name: "Clinic Administrator",
      email: "admin@healthcare.com",
      passwordHash: hash,
      phone: "+1 (555) 019-2831",
      role: "ADMIN",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(adminUser);

    // 2. Specializations
    const specs = [
      { id: "spec-01", name: "Cardiology", description: "Heart & cardiovascular care" },
      { id: "spec-02", name: "Dermatology", description: "Skin, hair, and cosmetic medical care" },
      { id: "spec-03", name: "Neurology", description: "Neurological and nervous system disorders" },
      { id: "spec-04", name: "General Medicine", description: "Primary preventive and acute healthcare" },
      { id: "spec-05", name: "Pediatrics", description: "Comprehensive child health" },
    ];
    this.specializations.push(...specs);

    // 3. Doctors
    const doctorsConfig = [
      {
        id: "usr-doc-01",
        profileId: "doc-prof-01",
        name: "Dr. Sarah Jenkins",
        email: "doctor.jenkins@healthcare.com",
        phone: "+1 (555) 101-0001",
        specializationId: "spec-01",
        licenseNumber: "MED-CARD-88392",
        bio: "Board-certified Cardiologist specializing in preventive cardiology, hypertension, and coronary artery disease management.",
        consultationFee: 120.0,
        slotDurationMinutes: 30,
      },
      {
        id: "usr-doc-02",
        profileId: "doc-prof-02",
        name: "Dr. Marcus Chen",
        email: "doctor.chen@healthcare.com",
        phone: "+1 (555) 101-0002",
        specializationId: "spec-02",
        licenseNumber: "MED-DERM-44910",
        bio: "Expert Dermatologist focusing on advanced skin health, acne therapies, allergic contact dermatitis, and melanoma screening.",
        consultationFee: 95.0,
        slotDurationMinutes: 30,
      },
      {
        id: "usr-doc-03",
        profileId: "doc-prof-03",
        name: "Dr. Emily Rodriguez",
        email: "doctor.rodriguez@healthcare.com",
        phone: "+1 (555) 101-0003",
        specializationId: "spec-03",
        licenseNumber: "MED-NEUR-77215",
        bio: "Clinical Neurologist specializing in migraine treatment, sleep disorders, peripheral neuropathy, and neurological exams.",
        consultationFee: 150.0,
        slotDurationMinutes: 45,
      },
      {
        id: "usr-doc-04",
        profileId: "doc-prof-04",
        name: "Dr. James Wilson",
        email: "doctor.wilson@healthcare.com",
        phone: "+1 (555) 101-0004",
        specializationId: "spec-04",
        licenseNumber: "MED-GENM-11234",
        bio: "Experienced Primary Care Physician providing holistic health assessments and acute symptom management.",
        consultationFee: 75.0,
        slotDurationMinutes: 30,
      },
    ];

    for (const d of doctorsConfig) {
      this.users.push({
        id: d.id,
        name: d.name,
        email: d.email,
        passwordHash: hash,
        phone: d.phone,
        role: "DOCTOR",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      this.doctorProfiles.push({
        id: d.profileId,
        userId: d.id,
        specializationId: d.specializationId,
        licenseNumber: d.licenseNumber,
        bio: d.bio,
        consultationFee: d.consultationFee,
        slotDurationMinutes: d.slotDurationMinutes,
        isAcceptingAppointments: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mon-Fri (1-5) 09:00 - 17:00
      for (let day = 1; day <= 5; day++) {
        this.doctorWorkingHours.push({
          id: `wh-${d.profileId}-${day}`,
          doctorId: d.profileId,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
          isActive: true,
        });
      }
    }

    // 4. Leave for Dr. Marcus Chen next week
    this.doctorLeaves.push({
      id: "leave-01",
      doctorId: "doc-prof-02",
      startDate: addDays(new Date(), 7),
      endDate: addDays(new Date(), 9),
      reason: "Attending Dermatology Conference",
      status: "APPROVED",
    });

    // 5. Patient
    const patientUser = {
      id: "usr-pat-01",
      name: "John Doe",
      email: "patient@healthcare.com",
      passwordHash: hash,
      phone: "+1 (555) 998-1234",
      role: "PATIENT",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(patientUser);

    const patientProfile = {
      id: "pat-prof-01",
      userId: patientUser.id,
      dateOfBirth: new Date("1990-05-15"),
      gender: "Male",
      bloodGroup: "O+",
      allergies: "Penicillin, Seasonal Pollen",
      emergencyContact: "Jane Doe (+1 555-998-5678)",
      address: "123 Health Ave, Boston, MA",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.patientProfiles.push(patientProfile);

    // 6. Sample Confirmed Appointment Tomorrow
    const tomorrow = startOfTomorrow();
    const apptStart = addHours(tomorrow, 10);
    const apptEnd = addHours(tomorrow, 10.5);

    const sampleAppt = {
      id: "appt-sample-01",
      patientId: patientProfile.id,
      doctorId: "doc-prof-01",
      startTime: apptStart,
      endTime: apptEnd,
      status: "CONFIRMED",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.appointments.push(sampleAppt);

    this.symptomSubmissions.push({
      id: "sym-01",
      appointmentId: sampleAppt.id,
      chiefComplaint: "Occasional chest tightness and shortness of breath during exercise",
      symptoms: "Mild discomfort in central chest when climbing stairs, resolving within 5 minutes of rest.",
      duration: "2 weeks",
      severity: "Moderate",
      additionalNotes: "Family history of early coronary artery disease.",
      createdAt: new Date(),
    });

    this.preVisitSummaries.push({
      id: "pvs-01",
      appointmentId: sampleAppt.id,
      urgencyLevel: "Medium",
      chiefComplaint: "Exertional chest discomfort with cardiovascular risk factors",
      suggestedQuestions: [
        "Has the frequency or exertion threshold for the chest tightness changed over the last two weeks?",
        "Do you experience any palpitations, lightheadedness, or diaphoresis during these episodes?",
        "Are you taking any cardiovascular or blood pressure medications currently?",
      ],
      status: "SUCCESS",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

// Global singleton memory database
declare global {
  // eslint-disable-next-line no-var
  var __memoryDbInstance: MemoryDatabase | undefined;
}

export function getMemoryDb(): MemoryDatabase {
  if (!global.__memoryDbInstance) {
    global.__memoryDbInstance = new MemoryDatabase();
  }
  return global.__memoryDbInstance;
}

export function createMockPrismaClient() {
  const db = getMemoryDb();

  return {
    user: {
      async findUnique(args: any) {
        const email = args?.where?.email?.toLowerCase();
        const id = args?.where?.id;
        const u = db.users.find((user) => (email && user.email.toLowerCase() === email) || (id && user.id === id));
        if (!u) return null;

        const res: any = { ...u };
        if (args?.include?.patientProfile) {
          res.patientProfile = db.patientProfiles.find((p) => p.userId === u.id) || null;
        }
        if (args?.include?.doctorProfile) {
          const doc = db.doctorProfiles.find((d) => d.userId === u.id) || null;
          if (doc) {
            const spec = db.specializations.find((s) => s.id === doc.specializationId);
            const wh = db.doctorWorkingHours.filter((w) => w.doctorId === doc.id);
            res.doctorProfile = { ...doc, specialization: spec, workingHours: wh };
          } else {
            res.doctorProfile = null;
          }
        }
        if (args?.include?.googleCalendarConnection) {
          res.googleCalendarConnection = db.googleCalendarConnections.find((c) => c.userId === u.id) || null;
        }
        return res;
      },
      async findMany(args: any) {
        return db.users;
      },
      async create(args: any) {
        const newUser = {
          id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          ...args.data,
          email: args.data.email.toLowerCase(),
          isActive: args.data.isActive !== undefined ? args.data.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        db.users.push(newUser);
        return newUser;
      },
      async update(args: any) {
        const idx = db.users.findIndex((u) => u.id === args.where.id);
        if (idx !== -1) {
          db.users[idx] = { ...db.users[idx], ...args.data, updatedAt: new Date() };
          return db.users[idx];
        }
        return null;
      },
      async count() {
        return db.users.length;
      },
      async deleteMany() {
        db.users = [];
      },
    },

    patientProfile: {
      async findUnique(args: any) {
        const p = db.patientProfiles.find((prof) => prof.id === args.where.id || prof.userId === args.where.userId);
        if (!p) return null;
        const res = { ...p };
        if (args?.include?.user) {
          res.user = db.users.find((u) => u.id === p.userId);
        }
        return res;
      },
      async create(args: any) {
        const newProf = {
          id: `pat-prof-${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        db.patientProfiles.push(newProf);
        return newProf;
      },
      async upsert(args: any) {
        const existing = db.patientProfiles.find((p) => p.userId === args.where.userId);
        if (existing) {
          Object.assign(existing, args.update, { updatedAt: new Date() });
          return existing;
        }
        const created = { id: `pat-prof-${Date.now()}`, ...args.create, createdAt: new Date(), updatedAt: new Date() };
        db.patientProfiles.push(created);
        return created;
      },
      async count() {
        return db.patientProfiles.length;
      },
      async deleteMany() {
        db.patientProfiles = [];
      },
    },

    doctorProfile: {
      async findUnique(args: any) {
        const d = db.doctorProfiles.find((doc) => doc.id === args.where.id || doc.userId === args.where.userId);
        if (!d) return null;
        const res: any = { ...d };
        if (args?.include?.user) {
          res.user = db.users.find((u) => u.id === d.userId);
        }
        if (args?.include?.specialization) {
          res.specialization = db.specializations.find((s) => s.id === d.specializationId);
        }
        if (args?.include?.workingHours) {
          res.workingHours = db.doctorWorkingHours.filter((w) => w.doctorId === d.id);
        }
        if (args?.include?.leaves) {
          res.leaves = db.doctorLeaves.filter((l) => l.doctorId === d.id);
        }
        return res;
      },
      async findMany(args: any) {
        let list = db.doctorProfiles.map((doc) => {
          const user = db.users.find((u) => u.id === doc.userId);
          const specialization = db.specializations.find((s) => s.id === doc.specializationId);
          const workingHours = db.doctorWorkingHours.filter((w) => w.doctorId === doc.id);
          const leaves = db.doctorLeaves.filter((l) => l.doctorId === doc.id);
          const apptsCount = db.appointments.filter((a) => a.doctorId === doc.id).length;
          return {
            ...doc,
            user,
            specialization,
            workingHours,
            leaves,
            _count: { appointments: apptsCount },
          };
        });

        if (args?.where?.specializationId) {
          list = list.filter((d) => d.specializationId === args.where.specializationId);
        }
        if (args?.where?.OR) {
          // Search filter
          const q = args.where.OR[0]?.user?.name?.contains?.toLowerCase() || "";
          if (q) {
            list = list.filter(
              (d) =>
                d.user?.name?.toLowerCase().includes(q) ||
                d.bio?.toLowerCase().includes(q) ||
                d.specialization?.name?.toLowerCase().includes(q)
            );
          }
        }
        return list;
      },
      async create(args: any) {
        const newDoc = {
          id: `doc-prof-${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        db.doctorProfiles.push(newDoc);
        return newDoc;
      },
      async update(args: any) {
        const d = db.doctorProfiles.find((doc) => doc.id === args.where.id);
        if (d) {
          Object.assign(d, args.data, { updatedAt: new Date() });
          const user = db.users.find((u) => u.id === d.userId);
          const specialization = db.specializations.find((s) => s.id === d.specializationId);
          return { ...d, user, specialization };
        }
        return null;
      },
      async count() {
        return db.doctorProfiles.length;
      },
      async deleteMany() {
        db.doctorProfiles = [];
      },
    },

    specialization: {
      async findMany(args: any) {
        return db.specializations.map((s) => ({
          ...s,
          _count: {
            doctors: db.doctorProfiles.filter((d) => d.specializationId === s.id).length,
          },
        }));
      },
      async create(args: any) {
        const spec = {
          id: `spec-${Date.now()}`,
          ...args.data,
        };
        db.specializations.push(spec);
        return spec;
      },
      async deleteMany() {
        db.specializations = [];
      },
    },

    doctorWorkingHour: {
      async findMany(args: any) {
        return db.doctorWorkingHours.filter((w) => (args?.where?.doctorId ? w.doctorId === args.where.doctorId : true));
      },
      async create(args: any) {
        const wh = { id: `wh-${Date.now()}-${Math.random()}`, ...args.data };
        db.doctorWorkingHours.push(wh);
        return wh;
      },
      async upsert(args: any) {
        const existing = db.doctorWorkingHours.find(
          (w) => w.doctorId === args.where.doctorId_dayOfWeek.doctorId && w.dayOfWeek === args.where.doctorId_dayOfWeek.dayOfWeek
        );
        if (existing) {
          Object.assign(existing, args.update);
          return existing;
        }
        const created = { id: `wh-${Date.now()}-${Math.random()}`, ...args.create };
        db.doctorWorkingHours.push(created);
        return created;
      },
      async deleteMany() {
        db.doctorWorkingHours = [];
      },
    },

    doctorLeave: {
      async findUnique(args: any) {
        return db.doctorLeaves.find((l) => l.id === args.where.id) || null;
      },
      async findMany(args: any) {
        return db.doctorLeaves;
      },
      async create(args: any) {
        const leave = {
          id: `leave-${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        db.doctorLeaves.push(leave);
        return leave;
      },
      async update(args: any) {
        const l = db.doctorLeaves.find((leave) => leave.id === args.where.id);
        if (l) Object.assign(l, args.data, { updatedAt: new Date() });
        return l;
      },
      async deleteMany() {
        db.doctorLeaves = [];
      },
    },

    appointment: {
      async findUnique(args: any) {
        const a = db.appointments.find((appt) => appt.id === args.where.id);
        if (!a) return null;

        const res: any = { ...a };
        if (args?.include?.doctor) {
          const doc = db.doctorProfiles.find((d) => d.id === a.doctorId);
          const user = doc ? db.users.find((u) => u.id === doc.userId) : null;
          const specialization = doc ? db.specializations.find((s) => s.id === doc.specializationId) : null;
          const workingHours = doc ? db.doctorWorkingHours.filter((w) => w.doctorId === doc.id) : [];
          const leaves = doc ? db.doctorLeaves.filter((l) => l.doctorId === doc.id) : [];
          res.doctor = { ...doc, user, specialization, workingHours, leaves };
        }
        if (args?.include?.patient) {
          const pat = db.patientProfiles.find((p) => p.id === a.patientId);
          const user = pat ? db.users.find((u) => u.id === pat.userId) : null;
          res.patient = { ...pat, user };
        }
        if (args?.include?.symptomSubmission) {
          res.symptomSubmission = db.symptomSubmissions.find((s) => s.appointmentId === a.id) || null;
        }
        if (args?.include?.preVisitSummary) {
          res.preVisitSummary = db.preVisitSummaries.find((s) => s.appointmentId === a.id) || null;
        }
        if (args?.include?.consultation) {
          res.consultation = db.consultations.find((c) => c.appointmentId === a.id) || null;
        }
        if (args?.include?.prescription) {
          const presc = db.prescriptions.find((p) => p.appointmentId === a.id) || null;
          if (presc) {
            const meds = db.medications.filter((m) => m.prescriptionId === presc.id);
            res.prescription = { ...presc, medications: meds };
          } else {
            res.prescription = null;
          }
        }
        if (args?.include?.postVisitSummary) {
          res.postVisitSummary = db.postVisitSummaries.find((s) => s.appointmentId === a.id) || null;
        }
        return res;
      },
      async findFirst(args: any) {
        const matches = db.appointments.filter((a) => {
          if (args.where?.doctorId && a.doctorId !== args.where.doctorId) return false;
          if (args.where?.id?.not && a.id === args.where.id.not) return false;
          if (args.where?.status?.in && !args.where.status.in.includes(a.status)) return false;
          if (args.where?.startTime?.lt && args.where?.endTime?.gt) {
            // Overlap check
            const start = new Date(a.startTime);
            const end = new Date(a.endTime);
            if (!(start < args.where.startTime.lt && end > args.where.endTime.gt)) {
              return false;
            }
          }
          return true;
        });
        return matches[0] || null;
      },
      async findMany(args: any) {
        let list = db.appointments.map((a) => {
          const doc = db.doctorProfiles.find((d) => d.id === a.doctorId);
          const docUser = doc ? db.users.find((u) => u.id === doc.userId) : null;
          const specialization = doc ? db.specializations.find((s) => s.id === doc.specializationId) : null;

          const pat = db.patientProfiles.find((p) => p.id === a.patientId);
          const patUser = pat ? db.users.find((u) => u.id === pat.userId) : null;

          const symptom = db.symptomSubmissions.find((s) => s.appointmentId === a.id) || null;
          const preVisit = db.preVisitSummaries.find((s) => s.appointmentId === a.id) || null;
          const consultation = db.consultations.find((c) => c.appointmentId === a.id) || null;
          const prescription = db.prescriptions.find((p) => p.appointmentId === a.id) || null;
          const postVisit = db.postVisitSummaries.find((s) => s.appointmentId === a.id) || null;

          return {
            ...a,
            doctor: { ...doc, user: docUser, specialization },
            patient: { ...pat, user: patUser },
            symptomSubmission: symptom,
            preVisitSummary: preVisit,
            consultation,
            prescription: prescription
              ? { ...prescription, medications: db.medications.filter((m) => m.prescriptionId === prescription.id) }
              : null,
            postVisitSummary: postVisit,
          };
        });

        if (args?.where?.patientId) {
          list = list.filter((a) => a.patientId === args.where.patientId);
        }
        if (args?.where?.doctorId) {
          list = list.filter((a) => a.doctorId === args.where.doctorId);
        }
        if (args?.where?.status) {
          if (typeof args.where.status === "string") {
            list = list.filter((a) => a.status === args.where.status);
          } else if (args.where.status.in) {
            list = list.filter((a) => args.where.status.in.includes(a.status));
          }
        }
        return list;
      },
      async create(args: any) {
        const appt = {
          id: `appt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        db.appointments.push(appt);
        return appt;
      },
      async update(args: any) {
        const a = db.appointments.find((appt) => appt.id === args.where.id);
        if (a) {
          Object.assign(a, args.data, { updatedAt: new Date() });
          return a;
        }
        return null;
      },
      async count(args: any) {
        return db.appointments.length;
      },
      async groupBy(args: any) {
        const map: Record<string, number> = {};
        for (const a of db.appointments) {
          map[a.status] = (map[a.status] || 0) + 1;
        }
        return Object.entries(map).map(([status, count]) => ({ status, _count: { id: count } }));
      },
      async deleteMany() {
        db.appointments = [];
      },
    },

    slotHold: {
      async findFirst(args: any) {
        const now = new Date();
        return (
          db.slotHolds.find((h) => {
            if (h.isReleased) return false;
            if (h.expiresAt <= now) return false;
            if (args.where?.doctorId && h.doctorId !== args.where.doctorId) return false;
            if (args.where?.patientId?.not && h.patientId === args.where.patientId.not) return false;
            return true;
          }) || null
        );
      },
      async findMany(args: any) {
        const now = new Date();
        return db.slotHolds.filter((h) => !h.isReleased && h.expiresAt > now);
      },
      async create(args: any) {
        const hold = {
          id: `hold-${Date.now()}`,
          ...args.data,
          isReleased: false,
          createdAt: new Date(),
        };
        db.slotHolds.push(hold);
        return hold;
      },
      async updateMany(args: any) {
        const matches = db.slotHolds.filter((h) => {
          if (args.where?.expiresAt?.lt && h.expiresAt >= args.where.expiresAt.lt) return false;
          if (args.where?.doctorId && h.doctorId !== args.where.doctorId) return false;
          if (args.where?.patientId && h.patientId !== args.where.patientId) return false;
          return true;
        });
        matches.forEach((h) => Object.assign(h, args.data));
        return { count: matches.length };
      },
      async count(args: any) {
        const now = new Date();
        return db.slotHolds.filter((h) => !h.isReleased && h.expiresAt > now).length;
      },
      async deleteMany() {
        db.slotHolds = [];
      },
    },

    symptomSubmission: {
      async create(args: any) {
        const sym = {
          id: `sym-${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
        };
        db.symptomSubmissions.push(sym);
        return sym;
      },
      async deleteMany() {
        db.symptomSubmissions = [];
      },
    },

    preVisitSummary: {
      async create(args: any) {
        const s = {
          id: `pvs-${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        db.preVisitSummaries.push(s);
        return s;
      },
      async upsert(args: any) {
        const existing = db.preVisitSummaries.find((s) => s.appointmentId === args.where.appointmentId);
        if (existing) {
          Object.assign(existing, args.update, { updatedAt: new Date() });
          return existing;
        }
        const created = { id: `pvs-${Date.now()}`, ...args.create, createdAt: new Date(), updatedAt: new Date() };
        db.preVisitSummaries.push(created);
        return created;
      },
      async deleteMany() {
        db.preVisitSummaries = [];
      },
    },

    consultation: {
      async upsert(args: any) {
        const existing = db.consultations.find((c) => c.appointmentId === args.where.appointmentId);
        if (existing) {
          Object.assign(existing, args.update, { updatedAt: new Date() });
          return existing;
        }
        const created = { id: `cons-${Date.now()}`, ...args.create, createdAt: new Date(), updatedAt: new Date() };
        db.consultations.push(created);
        return created;
      },
      async deleteMany() {
        db.consultations = [];
      },
    },

    prescription: {
      async findUnique(args: any) {
        return db.prescriptions.find((p) => p.appointmentId === args.where.appointmentId) || null;
      },
      async findMany(args: any) {
        return db.prescriptions.map((p) => ({
          ...p,
          doctor: {
            ...db.doctorProfiles.find((d) => d.id === p.doctorId),
            user: db.users.find((u) => u.id === p.doctorId),
            specialization: db.specializations[0],
          },
          appointment: db.appointments.find((a) => a.id === p.appointmentId),
          medications: db.medications
            .filter((m) => m.prescriptionId === p.id)
            .map((m) => ({
              ...m,
              reminders: db.medicationReminders.filter((r) => r.medicationId === m.id),
            })),
        }));
      },
      async upsert(args: any) {
        const existing = db.prescriptions.find((p) => p.appointmentId === args.where.appointmentId);
        if (existing) {
          Object.assign(existing, args.update, { updatedAt: new Date() });
          return existing;
        }
        const created = { id: `presc-${Date.now()}`, ...args.create, createdAt: new Date(), updatedAt: new Date() };
        db.prescriptions.push(created);
        return created;
      },
      async deleteMany() {
        db.prescriptions = [];
      },
    },

    medication: {
      async findMany(args: any) {
        return db.medications.filter((m) => (args?.where?.prescriptionId ? m.prescriptionId === args.where.prescriptionId : true));
      },
      async create(args: any) {
        const med = {
          id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          ...args.data,
          createdAt: new Date(),
        };
        db.medications.push(med);
        return med;
      },
      async deleteMany(args: any) {
        if (args?.where?.prescriptionId) {
          db.medications = db.medications.filter((m) => m.prescriptionId !== args.where.prescriptionId);
        } else {
          db.medications = [];
        }
      },
    },

    medicationReminder: {
      async findMany(args: any) {
        return db.medicationReminders.map((r) => {
          const med = db.medications.find((m) => m.id === r.medicationId) || { name: "Medication", dosage: "Standard" };
          const pat = db.patientProfiles.find((p) => p.id === r.patientId);
          const patUser = pat ? db.users.find((u) => u.id === pat.userId) : null;
          return {
            ...r,
            medication: { ...med, prescription: db.prescriptions.find((p) => p.id === med.prescriptionId) },
            patient: { ...pat, user: patUser },
          };
        });
      },
      async upsert(args: any) {
        const existing = db.medicationReminders.find((r) => r.idempotencyKey === args.where.idempotencyKey);
        if (existing) return existing;
        const created = { id: `rem-${Date.now()}-${Math.random()}`, ...args.create, createdAt: new Date(), updatedAt: new Date() };
        db.medicationReminders.push(created);
        return created;
      },
      async update(args: any) {
        const r = db.medicationReminders.find((rem) => rem.id === args.where.id);
        if (r) Object.assign(r, args.data, { updatedAt: new Date() });
        return r;
      },
      async deleteMany() {
        db.medicationReminders = [];
      },
    },

    postVisitSummary: {
      async upsert(args: any) {
        const existing = db.postVisitSummaries.find((s) => s.appointmentId === args.where.appointmentId);
        if (existing) {
          Object.assign(existing, args.update, { updatedAt: new Date() });
          return existing;
        }
        const created = { id: `pvs-post-${Date.now()}`, ...args.create, createdAt: new Date(), updatedAt: new Date() };
        db.postVisitSummaries.push(created);
        return created;
      },
      async deleteMany() {
        db.postVisitSummaries = [];
      },
    },

    notification: {
      async findUnique(args: any) {
        return db.notifications.find((n) => n.id === args.where.id || n.idempotencyKey === args.where.idempotencyKey) || null;
      },
      async findMany(args: any) {
        return db.notifications;
      },
      async create(args: any) {
        const notif = {
          id: `notif-${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        db.notifications.push(notif);
        return notif;
      },
      async update(args: any) {
        const n = db.notifications.find((notif) => notif.id === args.where.id);
        if (n) Object.assign(n, args.data, { updatedAt: new Date() });
        return n;
      },
      async groupBy(args: any) {
        const map: Record<string, number> = {};
        for (const n of db.notifications) {
          map[n.status] = (map[n.status] || 0) + 1;
        }
        return Object.entries(map).map(([status, count]) => ({ status, _count: { id: count } }));
      },
      async deleteMany() {
        db.notifications = [];
      },
    },

    googleCalendarConnection: {
      async findUnique(args: any) {
        return db.googleCalendarConnections.find((c) => c.userId === args.where.userId) || null;
      },
      async upsert(args: any) {
        const existing = db.googleCalendarConnections.find((c) => c.userId === args.where.userId);
        if (existing) {
          Object.assign(existing, args.update, { updatedAt: new Date() });
          return existing;
        }
        const created = { id: `gcal-${Date.now()}`, ...args.create, createdAt: new Date(), updatedAt: new Date() };
        db.googleCalendarConnections.push(created);
        return created;
      },
      async deleteMany(args: any) {
        db.googleCalendarConnections = db.googleCalendarConnections.filter((c) => c.userId !== args.where.userId);
      },
    },

    auditLog: {
      async findMany(args: any) {
        return db.auditLogs.map((log) => ({
          ...log,
          user: db.users.find((u) => u.id === log.userId),
        }));
      },
      async create(args: any) {
        const log = {
          id: `audit-${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
        };
        db.auditLogs.push(log);
        return log;
      },
      async deleteMany() {
        db.auditLogs = [];
      },
    },

    async $transaction(fn: any) {
      if (typeof fn === "function") {
        return await fn(this);
      }
      return Promise.all(fn);
    },

    async $disconnect() {},
  };
}
