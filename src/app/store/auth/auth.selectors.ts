import { Selector } from '@ngxs/store';
import { AuthState } from './auth.state';
import { AuthStateModel } from './auth.models';
import { UserProfile } from '@store/profile/profile.models';

export class AuthSelectors {
  @Selector([AuthState])
  static isAuthenticated(state: AuthStateModel): boolean {
    return state.isAuthenticated;
  }

  @Selector([AuthState])
  static user(state: AuthStateModel): UserProfile | null {
    return state.user;
  }

  @Selector([AuthState])
  static loading(state: AuthStateModel): boolean {
    return state.loading;
  }

  @Selector([AuthState])
  static pendingVerificationEmail(state: AuthStateModel): string | null {
    return state.pendingVerificationEmail;
  }

  @Selector([AuthState])
  static accessToken(state: AuthStateModel): string | null {
    return state.accessToken;
  }
}
