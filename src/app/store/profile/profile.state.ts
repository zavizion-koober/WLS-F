import { inject, Injectable } from '@angular/core';
import { Action, State, StateContext } from '@ngxs/store';
import { catchError, of, switchMap, tap } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { ProfileService } from './profile.service';
import { ProfileStateModel } from './profile.models';
import {
  AddAddress,
  ChangePassword,
  DeleteAccount,
  DeleteAddress,
  EditAddress,
  LoadProfile,
  UpdateProfile,
} from './profile.actions';
import { Logout } from '@store/auth/auth.actions';
import { NotificationService } from '@core/services/notification.service';

@State<ProfileStateModel>({
  name: 'profile',
  defaults: {
    profile: null,
    loading: false,
    error: null,
  },
})
@Injectable()
export class ProfileState {
  private readonly profileService = inject(ProfileService);
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  @Action(LoadProfile)
  loadProfile(ctx: StateContext<ProfileStateModel>) {
    ctx.patchState({ loading: true, error: null });
    return this.profileService.getProfile().pipe(
      tap((profile) => ctx.patchState({ profile, loading: false })),
      catchError((err) => {
        ctx.patchState({ loading: false, error: err.message });
        return of(null);
      }),
    );
  }

  @Action(UpdateProfile)
  updateProfile(ctx: StateContext<ProfileStateModel>, action: UpdateProfile) {
    ctx.patchState({ loading: true });
    return this.profileService.updateProfile(action.payload).pipe(
      switchMap(() => ctx.dispatch(new LoadProfile())),
      tap(() => {
        this.notification.success(
          this.translate.instant('PROFILE.DETAILS.SAVED', { defaultValue: 'Profile updated' }),
          this.translate.instant('MESSAGES.TITLES.SUCCESS'),
        );
      }),
      catchError((err) => {
        ctx.patchState({ loading: false });
        throw err;
      }),
    );
  }

  @Action(AddAddress)
  addAddress(ctx: StateContext<ProfileStateModel>, action: AddAddress) {
    ctx.patchState({ loading: true });
    return this.profileService.addAddress(action.payload).pipe(
      switchMap(() => ctx.dispatch(new LoadProfile())),
      tap(() => {
        this.notification.success(
          this.translate.instant('PROFILE.DETAILS.SAVED', { defaultValue: 'Address added' }),
          this.translate.instant('MESSAGES.TITLES.SUCCESS'),
        );
      }),
      catchError((err) => {
        ctx.patchState({ loading: false });
        throw err;
      }),
    );
  }

  @Action(EditAddress)
  editAddress(ctx: StateContext<ProfileStateModel>, action: EditAddress) {
    ctx.patchState({ loading: true });
    return this.profileService.editAddress(action.payload).pipe(
      switchMap(() => ctx.dispatch(new LoadProfile())),
      tap(() => {
        this.notification.success(
          this.translate.instant('PROFILE.DETAILS.SAVED', { defaultValue: 'Address updated' }),
          this.translate.instant('MESSAGES.TITLES.SUCCESS'),
        );
      }),
      catchError((err) => {
        ctx.patchState({ loading: false });
        throw err;
      }),
    );
  }

  @Action(DeleteAddress)
  deleteAddress(ctx: StateContext<ProfileStateModel>, action: DeleteAddress) {
    ctx.patchState({ loading: true });
    return this.profileService.removeAddress(action.addressId).pipe(
      switchMap(() => ctx.dispatch(new LoadProfile())),
      tap(() => {
        this.notification.success(
          this.translate.instant('PROFILE.DETAILS.SAVED', { defaultValue: 'Address removed' }),
          this.translate.instant('MESSAGES.TITLES.SUCCESS'),
        );
      }),
      catchError((err) => {
        ctx.patchState({ loading: false });
        throw err;
      }),
    );
  }

  @Action(ChangePassword)
  changePassword(ctx: StateContext<ProfileStateModel>, action: ChangePassword) {
    ctx.patchState({ loading: true });
    return this.profileService.changePassword(action.payload).pipe(
      tap(() => {
        ctx.patchState({ loading: false });
        this.notification.success(
          this.translate.instant('PROFILE.SECURITY.PASSWORD_CHANGED'),
          this.translate.instant('MESSAGES.TITLES.SUCCESS'),
        );
      }),
      catchError((err) => {
        ctx.patchState({ loading: false });
        throw err;
      }),
    );
  }

  @Action(DeleteAccount)
  deleteAccount(ctx: StateContext<ProfileStateModel>) {
    ctx.patchState({ loading: true });
    return this.profileService.deleteAccount().pipe(
      switchMap(() => ctx.dispatch(new Logout())),
      catchError((err) => {
        ctx.patchState({ loading: false });
        throw err;
      }),
    );
  }
}
