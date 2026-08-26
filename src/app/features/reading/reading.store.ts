import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GemstonesApiService } from '@core/api/gemstones-api.service';
import { failureOf, isSuccess, type RequestState } from '@core/api/request-state';
import type {
  CreateSessionRequest,
  CreatedSessionResponse,
  SessionResponse,
  SharedSessionResponse,
} from '@core/models/gemstones.models';

/**
 * The reading's state, as signals. One service per feature (D9, §4).
 *
 * No NGXS. This state never leaves the reading feature: a birth submission, a
 * loaded session, and a share token. If something later turns out to need to be
 * app-global it moves into WLS-F's store on merge, with the benefit of knowing
 * what actually needs sharing — which is the opposite of the position you are in
 * when you add a store first.
 *
 * `providedIn: 'root'` rather than provided on the route, deliberately: the
 * birth-input page creates a session and then navigates to `/reading/:publicId`,
 * and a route-scoped service is destroyed by that navigation. Root scope is what
 * lets the created reading survive the hop without a second fetch — the POST
 * already returned the whole thing, and re-fetching it would be asking the
 * ephemeris-backed endpoint for something we are holding.
 */
@Injectable({ providedIn: 'root' })
export class ReadingStore {
  private readonly api = inject(GemstonesApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly createState = signal<RequestState<CreatedSessionResponse>>({ status: 'idle' });
  private readonly sessionState = signal<RequestState<SessionResponse>>({ status: 'idle' });
  private readonly sharedState = signal<RequestState<SharedSessionResponse>>({ status: 'idle' });
  private readonly shareState = signal<RequestState<{ shareToken: string | null }>>({
    status: 'idle',
  });

  /** The publicId of the reading created in this browser session, if any. */
  private readonly createdId = signal<string | null>(null);

  /** The last birth request, kept in memory only so a retry does not re-ask the person. */
  private lastRequest: CreateSessionRequest | null = null;

  readonly create = this.createState.asReadonly();
  readonly session = this.sessionState.asReadonly();
  readonly shared = this.sharedState.asReadonly();
  readonly sharing = this.shareState.asReadonly();

  /**
   * The reading to render on `/reading/:publicId`.
   *
   * Prefers the response the POST already returned, so arriving from the form
   * renders immediately and does not re-run an ephemeris calculation. Falls back
   * to the fetched session when the page is opened cold — a reload, a bookmark,
   * a second tab.
   */
  readonly result = computed(() => {
    const created = this.createState();
    if (isSuccess(created)) {
      return created.value.result;
    }

    const session = this.sessionState();
    return isSuccess(session) ? session.value.result : null;
  });

  /** The share token, from whichever call last established one. */
  readonly shareToken = computed<string | null>(() => {
    const share = this.shareState();
    if (isSuccess(share)) {
      return share.value.shareToken;
    }

    const session = this.sessionState();
    return isSuccess(session) ? session.value.shareToken : null;
  });

  /** The failure to show, if the reading could not be produced at all. */
  readonly failure = computed(() => {
    if (isSuccess(this.createState()) || isSuccess(this.sessionState())) {
      return null;
    }
    return failureOf(this.createState()) ?? failureOf(this.sessionState());
  });

  readonly isLoading = computed(
    () => this.createState().status === 'loading' || this.sessionState().status === 'loading',
  );

  /**
   * Posts birth data and holds the reading that comes back.
   *
   * The request goes browser → API directly. Nothing about it is put in a URL,
   * in `localStorage`, or in any other place that outlives the tab — `lastRequest`
   * exists so a failed submission can be retried without making the person type
   * their birth details again, and it dies with the page.
   */
  createSession(request: CreateSessionRequest): void {
    this.lastRequest = request;
    this.createState.set({ status: 'loading' });
    this.sessionState.set({ status: 'idle' });
    this.shareState.set({ status: 'idle' });

    this.api
      .createSession(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.createState.set(state);
        if (isSuccess(state)) {
          this.createdId.set(state.value.publicId);
        }
      });
  }

  /** Retries the last submission. No-op when there is nothing to retry. */
  retryCreate(): boolean {
    if (this.lastRequest === null) {
      return false;
    }
    this.createSession(this.lastRequest);
    return true;
  }

  /**
   * Loads a stored reading by public id.
   *
   * Skips the request when the POST in this same browser session already returned
   * that exact reading. Not an optimisation for its own sake: this endpoint is the
   * expensive one, and asking it to re-send something we are holding is the kind of
   * request that looks free until it is rate limited.
   */
  loadSession(publicId: string): void {
    if (this.createdId() === publicId && isSuccess(this.createState())) {
      return;
    }

    this.createState.set({ status: 'idle' });
    this.sessionState.set({ status: 'loading' });

    this.api
      .getSession(publicId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.sessionState.set(state));
  }

  /** Loads a shared reading by token. A different response type, not a subset. */
  loadShared(shareToken: string): void {
    this.sharedState.set({ status: 'loading' });

    this.api
      .getSharedSession(shareToken)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.sharedState.set(state));
  }

  /** Mints a share token, or revokes it. */
  setShared(publicId: string, share: boolean): void {
    this.shareState.set({ status: 'loading' });

    this.api
      .setSessionShared(publicId, share)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.shareState.set(state));
  }

  /** Clears everything. Called when the form is reopened, so a stale reading cannot show. */
  reset(): void {
    this.lastRequest = null;
    this.createdId.set(null);
    this.createState.set({ status: 'idle' });
    this.sessionState.set({ status: 'idle' });
    this.sharedState.set({ status: 'idle' });
    this.shareState.set({ status: 'idle' });
  }
}
