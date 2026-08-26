import type { Routes } from '@angular/router';

/**
 * StoneCraft's routes, mounted inside WLS-F's root layout.
 *
 * **Birth data never appears in a URL.** It is posted to the API, and the
 * `publicId` in the response is what routes. A URL is the single leakiest thing
 * in a browser — it lands in history, in the referrer header, in server access
 * logs, in a screenshot, in a pasted link — and date-plus-time-plus-place is
 * close to a unique identifier for a living person. There is no query parameter
 * on `/reading` for a reason, and `app.routes.spec.ts` asserts none appears.
 *
 * Exported as a static array rather than hidden behind `loadChildren` on
 * purpose: the two privacy specs walk the route table to prove no parameter
 * could carry birth data, and a lazily-loaded child table is invisible to them.
 * The components are still lazy — `loadComponent` per route.
 */
export const stonecraftRoutes: Routes = [
  {
    /** The birth input form. Client-rendered; see app.routes.server.ts. */
    path: 'reading',
    pathMatch: 'full',
    loadComponent: () => import('@features/reading/birth-input.page').then((m) => m.BirthInputPage),
  },
  {
    /** A reading the owner is looking at. `publicId` is opaque and carries nothing. */
    path: 'reading/:publicId',
    loadComponent: () => import('@features/reading/reading.page').then((m) => m.ReadingPage),
  },
  {
    /**
     * A shared reading. Server-rendered: a link someone sends to a friend should
     * produce a preview and should not need JavaScript to say what it is. The
     * shared projection contains no birth data, so rendering it on our server
     * discloses nothing.
     */
    path: 'shared/:shareToken',
    loadComponent: () =>
      import('@features/reading/shared-reading.page').then((m) => m.SharedReadingPage),
  },
  {
    /**
     * A designer with no chart has no palette (D21), so there is nothing to show
     * here — not an empty state, and not a fallback listing the whole catalogue.
     */
    path: 'designer',
    pathMatch: 'full',
    redirectTo: 'reading',
  },
  {
    /**
     * The designer. `publicId` is the reading's, opaque and carrying nothing —
     * the same identifier `/reading/:publicId` uses, and for the same reason.
     */
    path: 'designer/:publicId',
    loadComponent: () => import('@features/designer/designer.page').then((m) => m.DesignerPage),
  },
];
