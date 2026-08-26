import { describe, expect, it } from 'vitest';

import bundle from '../../../../public/i18n/content/en.json';

import { API_ERROR_CODES, TRANSPORT_ERROR_CODES } from './api-error';

/**
 * Every error code has copy.
 *
 * The backend raises fifteen distinct codes so that the UI can say fifteen
 * distinct things — "no beads are stocked yet" is not a fault, "a different bead
 * size would fix that" is actionable, and "this reading may have expired" is
 * neither. A code with no entry falls back to rendering its own dot-path, which
 * is how a specific answer quietly becomes a broken one.
 */
describe('error copy', () => {
  const errors = (bundle as Record<string, any>)['STONECRAFT']?.['ERRORS'] as
    Record<string, unknown> | undefined;

  it('exists', () => {
    expect(errors).toBeDefined();
  });

  it.each([...API_ERROR_CODES])('has a message for %s', (code) => {
    expect(typeof errors?.[code]).toBe('string');
    expect(errors?.[code]).not.toBe('');
  });

  it.each([...TRANSPORT_ERROR_CODES])('has a message for %s', (code) => {
    expect(typeof errors?.[code]).toBe('string');
    expect(errors?.[code]).not.toBe('');
  });

  it('has no copy for a code nothing can raise', () => {
    const known = new Set<string>([...API_ERROR_CODES, ...TRANSPORT_ERROR_CODES]);
    const orphans = Object.keys(errors ?? {}).filter((key) => !known.has(key));
    expect(orphans).toEqual([]);
  });
});
