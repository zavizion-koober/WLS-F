import {
  IAppleLoginRequest,
  IGoogleLoginRequest,
  ILoginRequest,
  IRegisterRequest,
  IResetPasswordRequest,
  IVerifyEmailRequest,
} from './auth.models';

export class Login {
  static readonly type = '[Auth] Login';
  constructor(public payload: ILoginRequest) {}
}

export class Register {
  static readonly type = '[Auth] Register';
  constructor(public payload: IRegisterRequest) {}
}

export class GoogleLogin {
  static readonly type = '[Auth] Google Login';
  constructor(public payload: IGoogleLoginRequest) {}
}

export class AppleLogin {
  static readonly type = '[Auth] Apple Login';
  constructor(public payload: IAppleLoginRequest) {}
}

export class VerifyEmail {
  static readonly type = '[Auth] Verify Email';
  constructor(public payload: IVerifyEmailRequest) {}
}

export class ResendVerification {
  static readonly type = '[Auth] Resend Verification';
  constructor(public email: string) {}
}

export class ForgotPassword {
  static readonly type = '[Auth] Forgot Password';
  constructor(public email: string) {}
}

export class ResetPassword {
  static readonly type = '[Auth] Reset Password';
  constructor(public payload: IResetPasswordRequest) {}
}

export class Logout {
  static readonly type = '[Auth] Logout';
}

export class LoadSession {
  static readonly type = '[Auth] Load Session';
}

export class SetPendingVerificationEmail {
  static readonly type = '[Auth] Set Pending Verification Email';
  constructor(public email: string | null) {}
}
