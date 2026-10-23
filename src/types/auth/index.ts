export type UserRole = 'member' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  timeZone?: string; // IANA zone from the browser; used to format email times
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface UserResponse {
  user: User;
}

// Backend-only: the logged-in user as loaded by requireAuth.
export interface AuthUser extends User {
  timeZone: string;
}
