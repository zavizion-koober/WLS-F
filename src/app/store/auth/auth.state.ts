import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Action, State, StateContext } from '@ngxs/store';
import { catchError, from, of, switchMap, tap } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { env } from '@environments/environment';
import { AuthService } from './auth.service';
import { AuthStateModel } from './auth.models';
import {
  AppleLogin,
  ForgotPassword,
  GoogleLogin,
  LoadSession,
  Login,
  Logout,
  Register,
  ResendVerification,
  ResetPassword,
  SetPendingVerificationEmail,
  VerifyEmail,
} from './auth.actions';
import { LoadCart, MergeGuestCart } from '@store/cart/cart.actions';
import { NotificationService } from '@core/services/notification.service';

@State<AuthStateModel>({
  name: 'auth',
  defaults: {
    user: null,
    isAuthenticated: false,
    accessToken: null,
    pendingVerificationEmail: null,
    loading: false,
  },
})
@Injectable()
export class AuthState {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  @Action(Login)
  login(ctx: StateContext<AuthStateModel>, action: Login) {
    ctx.patchState({ loading: true });
    return this.auth.login(action.payload).pipe(
      tap((res) => {
        if (!res.verified) {
          ctx.patchState({
            pendingVerificationEmail: action.payload.email,
            loading: false,
          });
          this.router.navigate(['/verify-email']);
          this.notification.warning(
            this.translate.instant('MESSAGES.AUTH.EMAIL_NOT_VERIFIED'),
            this.translate.instant('MESSAGES.TITLES.WARNING'),
          );
          return;
        }

        this.persistToken(res.accessToken);
        ctx.patchState({
          accessToken: res.accessToken,
          isAuthenticated: true,
          pendingVerificationEmail: null,
        });
      }),
      switchMap((res) => {
        if (!res.verified) return of(null);
        return this.auth.fetchProfile().pipe(
          tap((user) => {
            ctx.patchState({ user, loading: false });
            ctx.dispatch(new MergeGuestCart());
            this.notification.success(
              this.translate.instant('MESSAGES.AUTH.LOGIN_SUCCESS'),
              this.translate.instant('MESSAGES.TITLES.SUCCESS'),
            );
            this.router.navigate(['/']);
          }),
          catchError(() => {
            ctx.patchState({ loading: false });
            return of(null);
          }),
        );
      }),
      catchError((err) => {
        ctx.patchState({ loading: false });
        throw err;
      }),
    );
  }

  @Action(GoogleLogin)
  googleLogin(ctx: StateContext<AuthStateModel>, action: GoogleLogin) {
    ctx.patchState({ loading: true });
    return this.auth.googleLogin(action.payload).pipe(
      tap((res) => {
        this.persistToken(res.accessToken);
        ctx.patchState({
          accessToken: res.accessToken,
          isAuthenticated: true,
        });
      }),
      switchMap(() =>
        this.auth.fetchProfile().pipe(
          tap((user) => {
            ctx.patchState({ user, loading: false });
            ctx.dispatch(new MergeGuestCart());
            this.notification.success(
              this.translate.instant('MESSAGES.AUTH.LOGIN_SUCCESS'),
              this.translate.instant('MESSAGES.TITLES.SUCCESS'),
            );
            this.router.navigate(['/']);
          }),
        ),
      ),
      catchError((err) => {
        ctx.patchState({ loading: false });
        throw err;
      }),
    );
  }

  @Action(AppleLogin)
  appleLogin(ctx: StateContext<AuthStateModel>, action: AppleLogin) {
    ctx.patchState({ loading: true });
    return this.auth.appleLogin(action.payload).pipe(
      tap((res) => {
        this.persistToken(res.accessToken);
        ctx.patchState({
          accessToken: res.accessToken,
          isAuthenticated: true,
        });
      }),
      switchMap(() =>
        this.auth.fetchProfile().pipe(
          tap((user) => {
            ctx.patchState({ user, loading: false });
            ctx.dispatch(new MergeGuestCart());
            this.notification.success(
              this.translate.instant('MESSAGES.AUTH.LOGIN_SUCCESS'),
              this.translate.instant('MESSAGES.TITLES.SUCCESS'),
            );
            this.router.navigate(['/']);
          }),
        ),
      ),
      catchError((err) => {
        ctx.patchState({ loading: false });
        throw err;
      }),
    );
  }

  @Action(Register)
  register(ctx: StateContext<AuthStateModel>, action: Register) {
    ctx.patchState({ loading: true });
    return this.auth.register(action.payload).pipe(
      tap(() => {
        ctx.patchState({
          pendingVerificationEmail: action.payload.email,
          loading: false,
        });
        this.notification.success(
          this.translate.instant('MESSAGES.AUTH.REGISTER_SUCCESS'),
          this.translate.instant('MESSAGES.TITLES.SUCCESS'),
        );
        this.router.navigate(['/verify-email']);
      }),
      catchError((err) => {
        ctx.patchState({ loading: false });
        throw err;
      }),
    );
  }

  @Action(VerifyEmail)
  verifyEmail(ctx: StateContext<AuthStateModel>, action: VerifyEmail) {
    ctx.patchState({ loading: true });
    return this.auth.verifyEmail(action.payload).pipe(
      tap((res) => {
        this.persistToken(res.accessToken);
        ctx.patchState({
          accessToken: res.accessToken,
          isAuthenticated: true,
          pendingVerificationEmail: null,
        });
      }),
      switchMap(() =>
        this.auth.fetchProfile().pipe(
          tap((user) => {
            ctx.patchState({ user, loading: false });
            ctx.dispatch(new MergeGuestCart());
            this.notification.success(
              this.translate.instant('MESSAGES.AUTH.EMAIL_VERIFIED'),
              this.translate.instant('MESSAGES.TITLES.SUCCESS'),
            );
            this.router.navigate(['/']);
          }),
        ),
      ),
      catchError((err) => {
        ctx.patchState({ loading: false });
        throw err;
      }),
    );
  }

  @Action(ResendVerification)
  resendVerification(ctx: StateContext<AuthStateModel>, action: ResendVerification) {
    return this.auth.resendVerification(action.email).pipe(
      tap(() => {
        this.notification.success(
          this.translate.instant('MESSAGES.AUTH.VERIFICATION_RESENT'),
          this.translate.instant('MESSAGES.TITLES.SUCCESS'),
        );
      }),
    );
  }

  @Action(ForgotPassword)
  forgotPassword(ctx: StateContext<AuthStateModel>, action: ForgotPassword) {
    ctx.patchState({ loading: true });
    return this.auth.forgotPassword(action.email).pipe(
      tap(() => {
        ctx.patchState({ loading: false });
        this.notification.success(
          this.translate.instant('MESSAGES.AUTH.PASSWORD_RESET_SENT'),
          this.translate.instant('MESSAGES.TITLES.SUCCESS'),
        );
      }),
      catchError((err) => {
        ctx.patchState({ loading: false });
        throw err;
      }),
    );
  }

  @Action(ResetPassword)
  resetPassword(ctx: StateContext<AuthStateModel>, action: ResetPassword) {
    ctx.patchState({ loading: true });
    return this.auth.resetPassword(action.payload).pipe(
      tap(() => {
        ctx.patchState({ loading: false });
        this.notification.success(
          this.translate.instant('MESSAGES.AUTH.PASSWORD_RESET_SUCCESS'),
          this.translate.instant('MESSAGES.TITLES.SUCCESS'),
        );
        this.router.navigate(['/login']);
      }),
      catchError((err) => {
        ctx.patchState({ loading: false });
        throw err;
      }),
    );
  }

  @Action(Logout)
  logout(ctx: StateContext<AuthStateModel>) {
    this.removeToken();
    ctx.patchState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
    });
    return this.auth.logout().pipe(
      tap(() => {
        ctx.dispatch(new LoadCart());
        this.router.navigate(['/']);
      }),
      catchError(() => {
        ctx.dispatch(new LoadCart());
        this.router.navigate(['/']);
        return of(null);
      }),
    );
  }

  @Action(LoadSession)
  loadSession(ctx: StateContext<AuthStateModel>) {
    const token = this.readToken();
    if (!token) {
      ctx.patchState({ isAuthenticated: false, user: null });
      return ctx.dispatch(new LoadCart());
    }

    ctx.patchState({ accessToken: token, isAuthenticated: true });
    return this.auth.fetchProfile().pipe(
      tap((user) => {
        if (user) {
          ctx.patchState({ user, isAuthenticated: true });
          ctx.dispatch(new LoadCart());
        } else {
          this.removeToken();
          ctx.patchState({ user: null, isAuthenticated: false, accessToken: null });
          ctx.dispatch(new LoadCart());
        }
      }),
      catchError(() => {
        this.removeToken();
        ctx.patchState({ user: null, isAuthenticated: false, accessToken: null });
        return ctx.dispatch(new LoadCart());
      }),
    );
  }

  @Action(SetPendingVerificationEmail)
  setPendingVerificationEmail(
    ctx: StateContext<AuthStateModel>,
    action: SetPendingVerificationEmail,
  ) {
    ctx.patchState({ pendingVerificationEmail: action.email });
  }

  private persistToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(env.TOKEN.ACCESS_TOKEN, token);
    }
  }

  private removeToken(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(env.TOKEN.ACCESS_TOKEN);
    }
  }

  private readToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(env.TOKEN.ACCESS_TOKEN);
    }
    return null;
  }
}
