import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import type {
  BeadSizingResponse,
  BraceletRevalidationResponse,
  BraceletTemplateResponse,
  ConfigureBraceletRequest,
  ConfiguredBraceletResponse,
  SolveBraceletRequest,
  SolvedBraceletResponse,
} from '@core/models/bracelets.models';

import { ApiClientBase } from './api-client.base';
import type { RequestState } from './request-state';

/**
 * Templates, sizing and configurations.
 *
 * **This described a shelf that no longer exists.** It used to say every method
 * here reached an endpoint that could not succeed — `templates` returning `[]`,
 * `configurations` returning `BEAD_CATALOG_EMPTY`, `bead_variants` empty by
 * design until a supplier catalogue arrived.
 *
 * D20 dissolved that. Bead availability is not stock and there is no inventory:
 * every bracelet is strung after the design arrives, so `bead_variants` records
 * what will be *made*, and it is generated from the material table — 896
 * variants, being the 112 active materials the catalogue calls bead material in
 * each of four diameters and two finishes. `templates` returns
 * `single-strand-elastic`. `configurations` succeeds.
 *
 * What survives of Q-8 is `sizing`, which still reports `status: PROVISIONAL`
 * because three small numbers in it are still awaiting confirmation. A client
 * must surface that: rendering a provisional table as a settled size chart
 * publishes a guess as a fact.
 *
 * There is no handoff method. `IBraceletHandoff` is deliberately unrouted (D14)
 * — a test on the backend asserts three plausible spellings all 404, so that
 * nobody answers the transport question by accident. Adding one here would be
 * answering it by accident from the other side.
 *
 * There is no price anywhere on this surface. The backend computes none.
 */
@Injectable({ providedIn: 'root' })
export class BraceletsApiService extends ApiClientBase {
  /** The shapes a bracelet can be built in. `[]` today. */
  listTemplates(): Observable<RequestState<readonly BraceletTemplateResponse[]>> {
    return this.get<readonly BraceletTemplateResponse[]>('/bracelets/templates');
  }

  /**
   * Bead diameters, wrist range and fit tolerance.
   *
   * A client must intersect `beadDiametersMm` with the chosen template's
   * `allowedDiametersMm` rather than trusting either alone, and must surface
   * `status` — rendering a provisional table as a settled size chart publishes a
   * guess as a fact.
   */
  getSizing(): Observable<RequestState<BeadSizingResponse>> {
    return this.get<BeadSizingResponse>('/bracelets/sizing');
  }

  /**
   * Solves and stores a bracelet.
   *
   * Failure codes are distinct on purpose and must stay distinct in the UI:
   * `BEAD_CATALOG_EMPTY` (nothing is stocked at all — checked before the solver
   * runs, so a catalogue problem never presents as a geometry one),
   * `BEAD_VARIANT_UNAVAILABLE` (that bead is not stocked),
   * `GEOMETRY_QUANTISATION` (no bead count lands within tolerance — a different
   * bead size would fix it, and saying so is the useful thing),
   * `GEOMETRY_OUT_OF_RANGE`, `GEOMETRY_DEGENERATE`.
   */
  configure(
    request: ConfigureBraceletRequest,
  ): Observable<RequestState<ConfiguredBraceletResponse>> {
    return this.post<ConfiguredBraceletResponse>('/bracelets/configurations', request);
  }

  /**
   * Solves geometry and stores nothing.
   *
   * The endpoint a designer calls on every change. It **reports** a bad fit
   * rather than refusing one — `isWithinTolerance` carries the verdict — because
   * a half-built bracelet is legitimately too small for any wrist and a preview
   * that hard-failed there would be unusable for the first ten seconds of every
   * session. `GEOMETRY_DEGENERATE` still fails: under three beads there is no
   * ring, which is not a ring that fits badly.
   */
  solve(request: SolveBraceletRequest): Observable<RequestState<SolvedBraceletResponse>> {
    return this.post<SolvedBraceletResponse>('/bracelets/solve', request);
  }

  /** A stored design, exactly as it was solved. Never re-solved. */
  getConfiguration(publicId: string): Observable<RequestState<ConfiguredBraceletResponse>> {
    return this.get<ConfiguredBraceletResponse>(`/bracelets/configurations/${publicId}`);
  }

  /**
   * Re-checks a stored design against the current catalogue. Call at purchase.
   *
   * `isMakeable: false` is a stop, not advice.
   */
  revalidate(publicId: string): Observable<RequestState<BraceletRevalidationResponse>> {
    return this.get<BraceletRevalidationResponse>(
      `/bracelets/configurations/${publicId}/revalidation`,
    );
  }
}
