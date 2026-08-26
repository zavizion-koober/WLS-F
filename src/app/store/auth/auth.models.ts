import { UserProfile } from '@store/profile/profile.models';

export interface ILoginRequest {
  email: string;
  password?: string;
}

export interface IRegisterRequest {
  fullName: string;
  email: string;
  password?: string;
  confirmPassword?: string;
}

export interface IVerifyEmailRequest {
  email: string;
  code: string;
}

export interface IResetPasswordRequest {
  token: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface IGoogleLoginRequest {
  idToken: string;
}

export interface IAppleLoginRequest {
  code: string;
  idToken: string;
}

export interface AuthResponse {
  accessToken: string;
  verified: boolean;
}

export interface AuthStateModel {
  user: UserProfile | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  pendingVerificationEmail: string | null;
  loading: boolean;
}
