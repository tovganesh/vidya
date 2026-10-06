export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type UserRole =
  | 'SUPER_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'PRINCIPAL'
  | 'VICE_PRINCIPAL'
  | 'TEACHER'
  | 'ACCOUNTANT'
  | 'LIBRARIAN'
  | 'TRANSPORT_MANAGER'
  | 'HR_MANAGER'
  | 'PARENT'
  | 'STUDENT';
