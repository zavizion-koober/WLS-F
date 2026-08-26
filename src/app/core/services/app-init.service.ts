import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom, Observable, ReplaySubject } from 'rxjs';
import { Store } from '@ngxs/store';
import { LoadSession } from '@store/auth/auth.actions';

@Injectable({ providedIn: 'root' })
export class AppInitService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly store = inject(Store);

  private readonly booting = signal(true);
  public readonly isBooting = this.booting.asReadonly();

  private readonly ready = new ReplaySubject<void>(1);
  public readonly ready$: Observable<void> = this.ready.asObservable();

  public async bootstrap(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      try {
        await firstValueFrom(this.store.dispatch(new LoadSession()));
      } catch {
        // Unauthenticated or failed profile fetch — route guards decide access.
      } finally {
        this.booting.set(false);
        this.ready.next();
        this.ready.complete();
      }
    } else {
      this.booting.set(false);
      this.ready.next();
      this.ready.complete();
    }
  }
}
