import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { GetProfileGQL } from 'src/generated/graphql';

import { skipAuthRefreshContext } from '@core/http/skip-auth-refresh.token';
import {
  AuthResponse,
  IAppleLoginRequest,
  IGoogleLoginRequest,
  ILoginRequest,
  IRegisterRequest,
  IResetPasswordRequest,
  IVerifyEmailRequest,
} from './auth.models';
import { UserProfile } from '@store/profile/profile.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly getProfileGQL = inject(GetProfileGQL);

  public register(body: IRegisterRequest) {
    return this.http.post('/api/v1/auth/register', body, { context: skipAuthRefreshContext() });
  }

  public login(body: ILoginRequest) {
    return this.http.post<AuthResponse>('/api/v1/auth/login', body, {
      context: skipAuthRefreshContext(),
    });
  }

  public verifyEmail(body: IVerifyEmailRequest) {
    return this.http.put<AuthResponse>('/api/v1/auth/verify-email', body, {
      context: skipAuthRefreshContext(),
    });
  }

  public resendVerification(email: string) {
    return this.http.post(
      '/api/v1/auth/resend-verification',
      { email },
      {
        context: skipAuthRefreshContext(),
      },
    );
  }

  public forgotPassword(email: string) {
    return this.http.post(
      '/api/v1/auth/forgot-password',
      { email },
      {
        context: skipAuthRefreshContext(),
      },
    );
  }

  public resetPassword(body: IResetPasswordRequest) {
    return this.http.put('/api/v1/auth/reset-password', body, { context: skipAuthRefreshContext() });
  }

  public googleLogin(body: IGoogleLoginRequest) {
    return this.http.post<AuthResponse>('/api/v1/auth/google-login', body, {
      context: skipAuthRefreshContext(),
    });
  }

  public appleLogin(body: IAppleLoginRequest) {
    return this.http.post<AuthResponse>('/api/v1/auth/apple-login', body, {
      context: skipAuthRefreshContext(),
    });
  }

  public refresh() {
    return this.http.post<AuthResponse>(
      '/api/v1/auth/refresh',
      {},
      { context: skipAuthRefreshContext() },
    );
  }

  public logout() {
    return this.http.post('/api/v1/auth/logout', {}, { context: skipAuthRefreshContext() });
  }

  public fetchProfile(): Observable<UserProfile | null> {
    return this.getProfileGQL
      .fetch({ fetchPolicy: 'network-only' })
      .pipe(map((result) => (result.data?.profile as UserProfile) ?? null));
  }
}
