import type { ApiFailure } from '@core/models/api-error';

/**
 * The state of one request, as a discriminated union.
 *
 * Every API call in this app resolves to exactly one of these. A union rather
 * than three parallel signals (`data` / `loading` / `error`) because the parallel
 * form permits states that cannot happen — loading *and* errored, data *and*
 * errored — and every consumer then has to remember the precedence. Here the
 * compiler enforces it: you cannot read `.value` without having narrowed to
 * `success`, and you cannot narrow to `success` without handling `error`.
 *
 * `idle` is separate from `loading` deliberately. "Not asked yet" and "asked,
 * waiting" render differently — an empty form versus a skeleton — and a screen
 * that conflates them flashes a spinner before the user has done anything.
 */
export type RequestState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly value: T }
  | { readonly status: 'error'; readonly failure: ApiFailure };

export const idle = (): RequestState<never> => ({ status: 'idle' });

export const loading = (): RequestState<never> => ({ status: 'loading' });

export const success = <T>(value: T): RequestState<T> => ({ status: 'success', value });

export const failed = <T>(failure: ApiFailure): RequestState<T> => ({ status: 'error', failure });

export const isIdle = <T>(s: RequestState<T>): s is { status: 'idle' } => s.status === 'idle';

export const isLoading = <T>(s: RequestState<T>): s is { status: 'loading' } =>
  s.status === 'loading';

export const isSuccess = <T>(s: RequestState<T>): s is { status: 'success'; value: T } =>
  s.status === 'success';

export const isError = <T>(s: RequestState<T>): s is { status: 'error'; failure: ApiFailure } =>
  s.status === 'error';

/** The value if there is one, else null. For templates that only need the happy path. */
export const valueOf = <T>(s: RequestState<T>): T | null =>
  s.status === 'success' ? s.value : null;

/** The failure if there is one, else null. */
export const failureOf = <T>(s: RequestState<T>): ApiFailure | null =>
  s.status === 'error' ? s.failure : null;
