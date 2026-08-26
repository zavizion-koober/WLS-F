export interface UserAddress {
  id: string;
  country: string;
  city: string;
  street: string;
  zipCode: string;
  additionalInfo?: string | null;
  isDefault: boolean;
}

export interface UserDetails {
  phoneNumber?: string | null;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  isVerified: boolean;
  authProvider?: string;
  details?: UserDetails | null;
  addresses?: UserAddress[] | null;
}

export interface IUpdateProfilePayload {
  fullName: string;
  phoneNumber?: string | null;
}

export interface IAddressPayload {
  country: string;
  city: string;
  street: string;
  zipCode: string;
  additionalInfo?: string | null;
  isDefault: boolean;
}

export interface IEditAddressPayload extends IAddressPayload {
  id: string;
}

export interface IChangePasswordPayload {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface ProfileStateModel {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}
