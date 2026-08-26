import { Selector } from '@ngxs/store';
import { ProfileState } from './profile.state';
import { ProfileStateModel, UserAddress, UserProfile } from './profile.models';

export class ProfileSelectors {
  @Selector([ProfileState])
  static profile(state: ProfileStateModel): UserProfile | null {
    return state.profile;
  }

  @Selector([ProfileState])
  static addresses(state: ProfileStateModel): UserAddress[] {
    return state.profile?.addresses ?? [];
  }

  @Selector([ProfileState])
  static defaultAddress(state: ProfileStateModel): UserAddress | null {
    const list = state.profile?.addresses ?? [];
    return list.find((a) => a.isDefault) ?? list[0] ?? null;
  }

  @Selector([ProfileState])
  static loading(state: ProfileStateModel): boolean {
    return state.loading;
  }
}
