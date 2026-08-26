import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { GetProfileGQL } from 'src/generated/graphql';

import {
  IAddressPayload,
  IChangePasswordPayload,
  IEditAddressPayload,
  IUpdateProfilePayload,
  UserProfile,
} from './profile.models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly getProfileGQL = inject(GetProfileGQL);

  public getProfile(): Observable<UserProfile | null> {
    return this.getProfileGQL
      .fetch({ fetchPolicy: 'network-only' })
      .pipe(map((result) => (result.data?.profile as UserProfile) ?? null));
  }

  public updateProfile(payload: IUpdateProfilePayload): Observable<void> {
    return this.http.put<void>('/api/v1/users/me', payload);
  }

  public addAddress(payload: IAddressPayload): Observable<void> {
    return this.http.post<void>('/api/v1/users/me/create-address', payload);
  }

  public editAddress(payload: IEditAddressPayload): Observable<void> {
    return this.http.put<void>('/api/v1/users/me/edit-address', payload);
  }

  public removeAddress(addressId: string): Observable<void> {
    return this.http.delete<void>('/api/v1/users/me/delete-address', { params: { addressId } });
  }

  public changePassword(payload: IChangePasswordPayload): Observable<void> {
    return this.http.put<void>('/api/v1/users/me/password', payload);
  }

  public deleteAccount(): Observable<void> {
    return this.http.delete<void>('/api/v1/users/me');
  }
}
