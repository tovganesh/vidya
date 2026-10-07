import {
  Gender,
  BloodGroup,
  StudentCategory,
  StudentStatus,
  GuardianRelationship,
  EnrollmentStatus,
  TeacherStatus,
  UserRole,
} from '@prisma/client';

export {
  Gender,
  BloodGroup,
  StudentCategory,
  StudentStatus,
  GuardianRelationship,
  EnrollmentStatus,
  TeacherStatus,
  UserRole,
};

export interface ClientContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface GetStudentsQuery {
  search?: string;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  status?: StudentStatus;
  gender?: Gender;
  category?: StudentCategory;
  page?: number;
  limit?: number;
}

export interface AdmitGuardianInput {
  id?: string;
  name: string;
  relationship: GuardianRelationship;
  phone: string;
  email?: string;
  occupation?: string;
  annualIncome?: string;
  isPrimaryContact?: boolean;
  isAuthorizedPickup?: boolean;
  receivesNotifications?: boolean;
}

export interface AdmitEnrollmentInput {
  academicYearId: string;
  classId: string;
  sectionId: string;
  rollNumber?: number;
  remarks?: string;
}

export interface AdmitStudentDto {
  admissionNumber: string;
  admissionDate?: string | Date;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string | Date;
  bloodGroup?: BloodGroup;
  apaarId?: string;
  aadhaarLastFour?: string;
  nationality?: string;
  religion?: string;
  category?: StudentCategory;
  permanentAddress?: Record<string, unknown>;
  currentAddress?: Record<string, unknown>;
  photoUrl?: string;
  guardians?: AdmitGuardianInput[];
  enrollment?: AdmitEnrollmentInput;
}

export interface UpdateStudentDto {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: Gender;
  dateOfBirth?: string | Date;
  bloodGroup?: BloodGroup;
  apaarId?: string;
  aadhaarLastFour?: string;
  nationality?: string;
  religion?: string;
  category?: StudentCategory;
  permanentAddress?: Record<string, unknown>;
  currentAddress?: Record<string, unknown>;
  photoUrl?: string;
  status?: StudentStatus;
}

export interface LinkGuardianDto {
  guardianId?: string;
  name?: string;
  relationship?: GuardianRelationship;
  phone?: string;
  email?: string;
  occupation?: string;
  annualIncome?: string;
  address?: Record<string, unknown>;
  isPrimaryContact?: boolean;
  isAuthorizedPickup?: boolean;
  receivesNotifications?: boolean;
}

export interface OnboardTeacherDto {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  qualification?: string;
  specialization?: string;
  joiningDate?: string | Date;
  password?: string;
}

export interface UpdateTeacherDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  qualification?: string;
  specialization?: string;
  status?: TeacherStatus;
}

export interface PromotionItem {
  studentId: string;
  status: EnrollmentStatus;
  targetRollNumber?: number;
  remarks?: string;
}

export interface BatchPromoteDto {
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
  targetClassId: string;
  targetSectionId: string;
  promotions: PromotionItem[];
}

export interface PeopleStats {
  totalStudents: number;
  enrolledStudents: number;
  totalTeachers: number;
  activeTeachers: number;
  totalGuardians: number;
  activeEnrollments: number;
  genderRatio: {
    male: number;
    female: number;
    other: number;
  };
  classDistribution: Array<{
    classId: string;
    className: string;
    studentCount: number;
  }>;
}
