/**
 * The API's error contract, and the codes it can raise.
 *
 * Failures come back as RFC7807 ProblemDetails with the stable identifier in a
 * top-level `code` extension. **Clients branch on `code`, never on `detail`** —
 * `detail` is English prose written for an operator reading a log.
 *
 * Genuine validation failures take a different shape: ValidationProblemDetails,
 * with a per-property `errors` bag and no `code`. Both are modelled here because
 * both reach the browser.
 */

/** Every `code` StoneCraft-B can emit, verified by grep over the source @ 58251cb. */
export const API_ERROR_CODES = [
  'GEM_BIRTHDATA_INVALID',
  'GEM_SESSION_NOT_FOUND',
  'GEM_TRADITION_DISABLED',
  'SESSION_NOT_FOUND',
  'MATERIAL_NOT_FOUND',
  'MATERIAL_INACTIVE',
  'MATERIAL_FORBIDDEN_ON_SAFETY',
  'META_COMPONENT_UNKNOWN',
  'BEAD_CATALOG_EMPTY',
  'BEAD_VARIANT_UNAVAILABLE',
  'BRACELET_TEMPLATE_NOT_FOUND',
  'BRACELET_CONFIGURATION_NOT_FOUND',
  'GEOMETRY_QUANTISATION',
  'GEOMETRY_OUT_OF_RANGE',
  'GEOMETRY_DEGENERATE',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/**
 * Codes the transport invents because the network did, not the backend.
 *
 * Kept in the same union so a component's `switch` over a failure is total:
 * "the request never arrived" and "the server said no" are both things a screen
 * has to say something specific about, and forcing them into separate types
 * means every consumer handles the split by hand.
 */
export const TRANSPORT_ERROR_CODES = [
  /** No response at all — offline, DNS, CORS, aborted. HttpErrorResponse.status === 0. */
  'NETWORK_UNREACHABLE',
  /** 5xx with no `code`. The backend fell over rather than refusing. */
  'SERVER_ERROR',
  /** 429. `Retry-After` is carried on the failure. */
  'RATE_LIMITED',
  /** A 400 with a per-property `errors` bag rather than a `code`. */
  'VALIDATION_FAILED',
  /** A failure the backend shaped in a way this contract does not describe. */
  'UNKNOWN',
] as const;

export type TransportErrorCode = (typeof TRANSPORT_ERROR_CODES)[number];

export type ErrorCode = ApiErrorCode | TransportErrorCode;

/** RFC7807, as this API writes it. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  /** The stable identifier. Present on every deliberate failure. */
  code?: string;
  [key: string]: unknown;
}

/**
 * A failure, normalised.
 *
 * `code` is preserved verbatim from the backend precisely so a screen can say
 * something specific. Collapsing these to "something went wrong" throws away the
 * only thing that distinguishes "no beads are stocked yet" from "that wrist size
 * cannot be strung" — which is the whole reason the codes exist.
 */
export interface ApiFailure {
  code: ErrorCode;
  /** HTTP status, or 0 when nothing arrived. */
  status: number;
  /**
   * The backend's English `detail`. For diagnostics and logs. Never rendered to
   * a customer — the UI renders copy keyed off `code`.
   */
  detail: string | null;
  /** Present only on VALIDATION_FAILED. Property name → messages. */
  validationErrors: Readonly<Record<string, readonly string[]>> | null;
  /** Seconds, from `Retry-After`. Present only on RATE_LIMITED, and only if the header was sent. */
  retryAfterSeconds: number | null;
}

const API_CODE_SET = new Set<string>(API_ERROR_CODES);

/** Narrows an arbitrary string to a known backend code. */
export function isApiErrorCode(value: string | null | undefined): value is ApiErrorCode {
  return value !== null && value !== undefined && API_CODE_SET.has(value);
}
