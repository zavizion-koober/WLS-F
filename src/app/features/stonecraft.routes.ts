import type { Routes } from '@angular/router';

/**
 * StoneCraft's routes, mounted inside WLS-F's root layout.
 *
 * **Birth data never appears in a URL.** It is posted to the API, and the
 * `publicId` in the response is what routes.
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
     * produce a preview and should not need JavaScript to say what it is.
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
     * The designer. `publicId` is the reading's, opaque and carrying nothing.
     */
    path: 'designer/:publicId',
    loadComponent: () => import('@features/designer/designer.page').then((m) => m.DesignerPage),
  },
  {
    /**
     * My saved bespoke bracelets collection. Client-rendered.
     */
    path: 'bracelets',
    pathMatch: 'full',
    loadComponent: () =>
      import('@features/bracelets/my-bracelets.page').then((m) => m.MyBraceletsPageComponent),
  },
];
