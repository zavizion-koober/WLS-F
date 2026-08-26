import { HttpErrorResponse } from '@angular/common/http';

import {
  isApiErrorCode,
  type ApiFailure,
  type ErrorCode,
  type ProblemDetails,
} from '@core/models/api-error';

/**
 * The one place an `HttpErrorResponse` becomes an `ApiFailure`.
 *
 * Every API service funnels through here so the mapping from wire shape to code
 * exists once. The rule it implements: **the backend's `code` wins whenever
 * there is one.** Status is only consulted to classify failures the backend did
 * not deliberately raise.
 */
export function toApiFailure(error: unknown): ApiFailure {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      code: 'UNKNOWN',
      status: 0,
      detail: error instanceof Error ? error.message : null,
      validationErrors: null,
      retryAfterSeconds: null,
    };
  }

  // status 0 means no response arrived: offline, DNS failure, CORS, or aborted.
  // Distinct from a 5xx, which means the request reached a server that failed.
  if (error.status === 0) {
    return {
      code: 'NETWORK_UNREACHABLE',
      status: 0,
      detail: error.message ?? null,
      validationErrors: null,
      retryAfterSeconds: null,
    };
  }

  const body = readProblemDetails(error.error);
  const detail = typeof body?.['detail'] === 'string' ? (body['detail'] as string) : null;

  // ValidationProblemDetails: a per-property bag and no `code`. Checked before
  // the code branch because a validation 400 has no code to find.
  const validationErrors = readValidationErrors(body);
  if (validationErrors !== null) {
    return {
      code: 'VALIDATION_FAILED',
      status: error.status,
      detail,
      validationErrors,
      retryAfterSeconds: null,
    };
  }

  const rawCode = typeof body?.['code'] === 'string' ? (body['code'] as string) : null;
  if (isApiErrorCode(rawCode)) {
    return {
      code: rawCode,
      status: error.status,
      detail,
      validationErrors: null,
      retryAfterSeconds: readRetryAfter(error),
    };
  }

  return {
    code: classifyByStatus(error.status),
    status: error.status,
    detail,
    validationErrors: null,
    retryAfterSeconds: readRetryAfter(error),
  };
}

/**
 * A failure the backend deliberately raised, as opposed to one the transport
 * invented. Screens use this to decide between "say the specific thing" and
 * "offer a retry".
 */
export function isBackendRefusal(failure: ApiFailure): boolean {
  return isApiErrorCode(failure.code);
}

/** Whether retrying the identical request could plausibly succeed. */
export function isRetryable(failure: ApiFailure): boolean {
  return (
    failure.code === 'NETWORK_UNREACHABLE' ||
    failure.code === 'SERVER_ERROR' ||
    failure.code === 'RATE_LIMITED'
  );
}

function classifyByStatus(status: number): ErrorCode {
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN';
}

/**
 * `HttpErrorResponse.error` is `any` and genuinely varies: a parsed object when
 * the server sent JSON, a string when it sent text or when parsing failed.
 */
function readProblemDetails(raw: unknown): ProblemDetails | null {
  if (raw !== null && typeof raw === 'object') {
    return raw as ProblemDetails;
  }

  if (typeof raw === 'string' && raw.length > 0) {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed !== null && typeof parsed === 'object' ? (parsed as ProblemDetails) : null;
    } catch {
      return null;
    }
  }

  return null;
}

function readValidationErrors(
  body: ProblemDetails | null,
): Record<string, readonly string[]> | null {
  const errors = body?.['errors'];
  if (errors === null || errors === undefined || typeof errors !== 'object') {
    return null;
  }

  const out: Record<string, readonly string[]> = {};
  for (const [property, messages] of Object.entries(errors as Record<string, unknown>)) {
    if (Array.isArray(messages)) {
      out[property] = messages.filter((m): m is string => typeof m === 'string');
    }
  }

  return Object.keys(out).length > 0 ? out : null;
}

/**
 * `Retry-After` is either a delay in seconds or an HTTP date. This API sends
 * seconds; the date form is parsed anyway rather than dropped, because a header
 * that arrives in the other shape should not silently become "no idea".
 */
function readRetryAfter(error: HttpErrorResponse): number | null {
  const header = error.headers?.get('Retry-After');
  if (header === null || header === undefined || header.length === 0) {
    return null;
  }

  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds);
  }

  const at = Date.parse(header);
  if (Number.isNaN(at)) {
    return null;
  }

  return Math.max(0, Math.round((at - Date.now()) / 1000));
}
