import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import type {
  CreateSessionRequest,
  CreatedSessionResponse,
  ListMaterialsQuery,
  MaterialSummaryResponse,
  PagedResponse,
  SessionResponse,
  ShareSessionResponse,
  SharedSessionResponse,
} from '@core/models/gemstones.models';

import { ApiClientBase } from './api-client.base';
import type { RequestState } from './request-state';

/**
 * Readings and the stone catalogue.
 *
 * Nothing here is admin-gated: `GET /materials/{slug}`, `/rules`, `/conflicts`
 * and `/knowledge/*` all sit behind `[AdminSurface]` and return 404 unless the
 * host enables them, so a customer client has no business calling them. Their
 * absence from this service is deliberate rather than an omission — see
 * `docs/BACKEND_GAPS.md` for what that costs (the stone detail panel).
 */
@Injectable({ providedIn: 'root' })
export class GemstonesApiService extends ApiClientBase {
  /**
   * Creates a reading from birth input.
   *
   * The one endpoint that runs an ephemeris calculation, and the one that is
   * rate limited — a 429 arrives as `RATE_LIMITED` with `retryAfterSeconds`.
   *
   * The body carries birth data, which is why this is a POST and why the caller
   * must be running in the browser. Birth data never enters a URL and never
   * transits our SSR node server; it goes browser → API directly.
   */
  createSession(request: CreateSessionRequest): Observable<RequestState<CreatedSessionResponse>> {
    return this.post<CreatedSessionResponse>('/gemstones/sessions', request);
  }

  /**
   * Reads back a stored reading, including its birth input, for its owner.
   *
   * 404 is returned for not-found, not-yours and expired alike — deliberately
   * indistinguishable, so a response cannot confirm a public id is real. The UI
   * must not try to tell them apart either; `GEM_SESSION_NOT_FOUND` gets one
   * message covering all three.
   */
  getSession(publicId: string): Observable<RequestState<SessionResponse>> {
    return this.get<SessionResponse>(`/gemstones/sessions/${publicId}`);
  }

  /** Mints a share token, or revokes it. */
  setSessionShared(
    publicId: string,
    share: boolean,
  ): Observable<RequestState<ShareSessionResponse>> {
    return this.put<ShareSessionResponse>(
      `/gemstones/sessions/${publicId}/share`,
      null,
      this.toParams({ share }),
    );
  }

  /**
   * Reads a shared reading by token.
   *
   * A different response type from `getSession`, not a subset. The birth input,
   * the chart facts, the data tier and the unavailability list are never built
   * for this projection.
   */
  getSharedSession(shareToken: string): Observable<RequestState<SharedSessionResponse>> {
    return this.get<SharedSessionResponse>(`/gemstones/shared/${shareToken}`);
  }

  /** The paged catalogue. Summary rows only — there is no customer detail endpoint. */
  listMaterials(
    query: ListMaterialsQuery = {},
  ): Observable<RequestState<PagedResponse<MaterialSummaryResponse>>> {
    return this.get<PagedResponse<MaterialSummaryResponse>>(
      '/gemstones/materials',
      this.toParams({ ...query }),
    );
  }
}
