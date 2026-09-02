import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'product/:slug',
    renderMode: RenderMode.Server,
  },

  /*
    StoneCraft's carve-out, and it must stay above the `**` catch-all below —
    the first matching entry wins, so a catch-all placed first would server-render
    every route here.

    **Birth data must never transit the SSR node server.** The form posts
    browser → API directly. Server-rendering the route that collects it would put
    a server we operate between the person and the API on the one request that
    carries date, exact time and place — and the backend's rule is that this data
    is never logged. There is nothing on an empty form worth pre-rendering, so
    the extra hop widens that surface for no benefit.

    `/reading/:publicId` and `/designer/:publicId` are client-rendered for the
    same family of reasons: the owner response *contains* the birth input, so
    server-rendering would pull that payload through our node process on every
    view.
  */
  {
    path: 'reading',
    renderMode: RenderMode.Client,
  },
  {
    path: 'reading/:publicId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'designer',
    renderMode: RenderMode.Client,
  },
  {
    path: 'designer/:publicId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'bracelets',
    renderMode: RenderMode.Client,
  },

  /*
    The one StoneCraft route rendered on our server, and the reason SSR is worth
    having here at all: the shared projection is an allow-list that never
    contains birth data, chart facts, the data tier or the unavailability list —
    they are never built, not filtered — so a shared link produces a preview and
    discloses nothing.
  */
  {
    path: 'shared/:shareToken',
    renderMode: RenderMode.Server,
  },

  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
