import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * The Spartan / CVA class merger, as WLS-F's component pattern uses it.
 *
 * `clsx` flattens conditionals; `twMerge` resolves Tailwind conflicts so a
 * caller's `px-6` beats a variant's `px-4` instead of both landing on the
 * element and the cascade deciding by source order.
 *
 * WLS-F's tsconfig already maps `@spartan/utils` to a generated ui library that
 * has not been generated yet. When it is, this file is deleted and that import
 * takes over — one line, not a refactor.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
