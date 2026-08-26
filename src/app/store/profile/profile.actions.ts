import {
  IAddressPayload,
  IChangePasswordPayload,
  IEditAddressPayload,
  IUpdateProfilePayload,
} from './profile.models';

export class LoadProfile {
  static readonly type = '[Profile] Load Profile';
}

export class UpdateProfile {
  static readonly type = '[Profile] Update Profile';
  constructor(public payload: IUpdateProfilePayload) {}
}

export class AddAddress {
  static readonly type = '[Profile] Add Address';
  constructor(public payload: IAddressPayload) {}
}

export class EditAddress {
  static readonly type = '[Profile] Edit Address';
  constructor(public payload: IEditAddressPayload) {}
}

export class DeleteAddress {
  static readonly type = '[Profile] Delete Address';
  constructor(public addressId: string) {}
}

export class ChangePassword {
  static readonly type = '[Profile] Change Password';
  constructor(public payload: IChangePasswordPayload) {}
}

export class DeleteAccount {
  static readonly type = '[Profile] Delete Account';
}
