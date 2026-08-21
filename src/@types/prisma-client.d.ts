// src/@types/prisma-client.d.ts
declare module "@prisma/client" {
  export class PrismaClient {
    [key: string]: any;
    constructor(...args: any[]);
  }

  export const Role: {
    PATIENT: "PATIENT";
    DOCTOR: "DOCTOR";
    ADMIN: "ADMIN";
  };
  export type Role = keyof typeof Role;

  export const AppointmentStatus: {
    PENDING: "PENDING";
    HELD: "HELD";
    CONFIRMED: "CONFIRMED";
    CANCELLED: "CANCELLED";
    CANCELLED_BY_DOCTOR: "CANCELLED_BY_DOCTOR";
    CANCELLED_BY_LEAVE: "CANCELLED_BY_LEAVE";
    COMPLETED: "COMPLETED";
    NO_SHOW: "NO_SHOW";
    RESCHEDULED: "RESCHEDULED";
  };
  export type AppointmentStatus = keyof typeof AppointmentStatus;

  export const LeaveStatus: {
    APPROVED: "APPROVED";
    CANCELLED: "CANCELLED";
  };
  export type LeaveStatus = keyof typeof LeaveStatus;

  export const AIProcessingStatus: {
    PENDING: "PENDING";
    SUCCESS: "SUCCESS";
    FAILED: "FAILED";
  };
  export type AIProcessingStatus = keyof typeof AIProcessingStatus;

  export const NotificationType: {
    APPOINTMENT_CONFIRMATION: "APPOINTMENT_CONFIRMATION";
    APPOINTMENT_REMINDER: "APPOINTMENT_REMINDER";
    APPOINTMENT_CANCELLED: "APPOINTMENT_CANCELLED";
    APPOINTMENT_CANCELLED_BY_LEAVE: "APPOINTMENT_CANCELLED_BY_LEAVE";
    APPOINTMENT_RESCHEDULED: "APPOINTMENT_RESCHEDULED";
    MEDICATION_REMINDER: "MEDICATION_REMINDER";
    SYSTEM_ALERT: "SYSTEM_ALERT";
  };
  export type NotificationType = keyof typeof NotificationType;

  export const NotificationStatus: {
    PENDING: "PENDING";
    SENDING: "SENDING";
    SENT: "SENT";
    FAILED: "FAILED";
  };
  export type NotificationStatus = keyof typeof NotificationStatus;
}
