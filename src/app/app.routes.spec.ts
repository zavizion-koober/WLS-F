import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RenderMode } from '@angular/ssr';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { stonecraftRoutes } from '@features/stonecraft.routes';

import { routes } from './app.routes';
import { serverRoutes } from './app.routes.server';

@Component({ standalone: true, template: '' })
class Blank {}

/**
 * StoneCraft's routes are children of the root-layout route, so every check
 * below walks the tree rather than the top level. The parent contributes an
 * empty path, so nesting leaves a child's full path unchanged — `reading` is
 * still `reading`.
 *
 * The shop's own routes are lazy (`loadChildren`) and so are invisible here.
 * That is fine and is not a hole: this file exists to prove *StoneCraft* added
 * no parameter that could carry birth data, and every StoneCraft route is
 * declared statically precisely so it cannot hide from this walk.
 */
function collectPaths(
  config: readonly { path?: string; children?: readonly any[] }[],
  prefix = '',
): string[] {
  return config.flatMap((route) => {
    const path = [prefix, route.path ?? ''].filter(Boolean).join('/');
    return [path, ...(route.children ? collectPaths(route.children, path) : [])];
  });
}

/**
 * The route table, checked for the two rules it exists to keep.
 */
describe('routes', () => {
  let router: Router;
  let location: Location;

  beforeEach(() => {
    // Lazy components are replaced so this exercises matching and redirects
    // without pulling the feature bundles into a routing test. Recursive,
    // because StoneCraft's routes are children of the root-layout route; the
    // shop's own `loadChildren` branches are emptied rather than resolved, so
    // this stays a test of StoneCraft's route table and not of the whole app.
    const stub = (config: readonly any[]): any[] =>
      config.map((route) => ({
        ...route,
        ...('loadComponent' in route ? { loadComponent: undefined, component: Blank } : {}),
        ...(route.children ? { children: stub(route.children) } : {}),
        ...(route.loadChildren ? { loadChildren: undefined, children: [] } : {}),
      }));

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(stub(routes))],
    });

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  /**
   * D21: a designer with no chart has no palette. Not an empty state, and not a
   * fallback listing the whole catalogue — there is nothing honest to draw, so
   * the route sends the person to the one screen that can produce a palette.
   */
  it('sends a bare /designer back to the reading', async () => {
    await router.navigateByUrl('/designer');

    expect(location.path()).toBe('/reading');
  });

  it('keeps /designer/:publicId, which is the real designer', async () => {
    await router.navigateByUrl('/designer/abc-123');

    expect(location.path()).toBe('/designer/abc-123');
  });

  /**
   * Standalone, StoneCraft sent an unrecognised URL to `/reading`, because the
   * reading was the only thing the app was. Inside the shop the entry point is
   * the storefront, so the catch-all lands there instead. The rule the original
   * assertion protected — an unrecognised URL is never a dead end — is what is
   * checked here; only the destination changed, and it changed because the app
   * around it did.
   */
  it('sends anything unrecognised to the storefront rather than a dead end', async () => {
    await router.navigateByUrl('/designer/abc/extra/parts');

    expect(location.path()).toBe('');
  });

  /**
   * <b>Birth data never appears in a URL.</b> It is posted to the API and the
   * `publicId` in the response is what routes. A URL lands in history, in the
   * referrer header, in access logs, in a screenshot and in a pasted link, and
   * date-plus-time-plus-place is close to a unique identifier for a person.
   */
  it('declares no parameter that could carry birth data', () => {
    const parameters = collectPaths(routes)
      .flatMap((path) => path.split('/'))
      .filter((segment) => segment.startsWith(':'));

    expect(parameters).toEqual([':publicId', ':shareToken', ':publicId']);
  });

  /**
   * <b>Birth data must never transit the SSR node server.</b> Every route that
   * loads or collects it is client-rendered; only the shared projection — an
   * allow-list that contains no birth data — may be rendered on our server.
   */
  describe('the SSR carve-out', () => {
    const modeOf = (path: string) => serverRoutes.find((route) => route.path === path)?.renderMode;

    it.each(['reading', 'reading/:publicId', 'designer', 'designer/:publicId'])(
      '%s is client-rendered',
      (path) => {
        expect(modeOf(path)).toBe(RenderMode.Client);
      },
    );

    /**
     * The shared reading is the only *application* route rendered on our server.
     * The catch-all is server-rendered too, and that is safe: the empty path
     * 302s to `/reading` before Angular sees it, and every other route that
     * touches birth data is named above and client-rendered — so nothing
     * carrying birth data can reach the catch-all.
     */
    it('server-renders exactly one StoneCraft route, the shared reading', () => {
      // Scoped to StoneCraft's own paths: the shop server-renders `product/:slug`
      // and the catch-all, and neither is this file's business. What must stay
      // true is that of StoneCraft's five routes exactly one — the allow-list
      // projection — is rendered on our server.
      const stonecraftPaths = new Set(collectPaths(stonecraftRoutes));
      const served = serverRoutes
        .filter((route) => route.renderMode === RenderMode.Server)
        .map((route) => route.path)
        .filter((path) => stonecraftPaths.has(path));

      expect(served).toEqual(['shared/:shareToken']);
    });

    it('covers every StoneCraft route, so nothing falls through to a default', () => {
      const declared = new Set(serverRoutes.map((route) => route.path));

      for (const path of collectPaths(stonecraftRoutes)) {
        if (path === '' || path === '**') continue;
        expect(declared.has(path), `${path} has no server render mode`).toBe(true);
      }
    });

    /**
     * The carve-out only works if it is reached. `serverRoutes` is matched in
     * order, so a `**` sitting above these entries would server-render every one
     * of them while the declarations below it still read as correct.
     */
    it('declares the catch-all last, so the carve-out is reachable', () => {
      expect(serverRoutes.at(-1)?.path).toBe('**');
      expect(serverRoutes.filter((route) => route.path === '**')).toHaveLength(1);
    });
  });
});
