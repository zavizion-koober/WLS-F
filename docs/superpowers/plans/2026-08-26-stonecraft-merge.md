# StoneCraft → WLS-F Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move StoneCraft-F's reading + bracelet-designer feature into WLS-F as a first-class part of the shop app, and reach StoneCraft-B as a second backend service behind the same origin.

**Architecture:** StoneCraft-F was built to merge — same Angular version, same design tokens, same i18n convention, `sc-` selector prefix, and no npm dependency WLS-F lacks. So the frontend is a **literal file move with the paths preserved**, because ~12 of its 23 spec files locate fixtures by paths relative to their own file. The backend is **not** merged: StoneCraft-B keeps its own process, its own database (its audit decision D8) and its own MediatR pipeline; WLS-F's dev proxy and the production edge split `/api` by path prefix.

**Tech Stack:** Angular 21.2 · TypeScript 5.9 · pnpm 10.33.2 · Tailwind 4.3 · vitest 3.2 · ngx-translate 17 · .NET 10 (WLShop_B, :5210) · .NET 8 (StoneCraft-B, :5080) · PostgreSQL

**Spec:** This plan's spec is the analysis in the conversation that produced it, plus three source documents that ship with the code and must be read before touching the areas they govern:
- `~/Desktop/StoneCraft-F/README.md` — the merge contract and every stated deviation
- `~/Desktop/StoneCraft-F/docs/BACKEND_GAPS.md` — what is deliberately not built, and why
- `~/Desktop/StoneCraft-B/README.md` — endpoint surface, D14/D16 gates, Q-8/Q-12

## Global Constraints

These apply to every task. They are not style preferences; each one is enforced by a test that exists, or protects a rule that does.

1. **Birth data never enters a URL.** Routes carry `:publicId` and `:shareToken` only — both opaque. Enforced by `app.routes.spec.ts` and `core/api/birth-data-privacy.spec.ts`.
2. **Birth data never transits the SSR node server.** `reading`, `reading/:publicId`, `designer`, `designer/:publicId` are `RenderMode.Client`. Only `shared/:shareToken` is `RenderMode.Server`. `src/server.ts` must contain no `/api` proxy — the privacy spec greps it.
3. **StoneCraft HTTP calls bypass every WLS-F interceptor.** `apiInterceptor` rewrites relative URLs to `http://localhost:5210` on the server pass (violates constraint 2), `refreshInterceptor` can dispatch `Logout` on a 401, `errorInterceptor` raises a generic toast on any failed GET. All three are app-wide.
4. **No price anywhere in `src/app/features/designer`.** Enforced by `features/designer/no-price.spec.ts` over sources *and* over `STONECRAFT.DESIGNER` copy.
5. **No trigonometry in the designer.** Geometry arrives from the backend solver as millimetre offsets. Enforced by `features/designer/rope-is-geometry-only.spec.ts`.
6. **Backend enum names are verbatim C# member names.** `Primary | Secondary | Supportive | Caution`. The API registers `JsonStringEnumConverter`; renaming one in TypeScript breaks a string comparison with no compile error.
7. **File paths inside the moved tree are preserved exactly.** `src/app/core/{api,models,content}`, `src/app/features/{reading,designer}`, `src/app/shared/components`, `public/{data,assets,i18n}`. Twelve specs resolve fixtures relative to `import.meta.url` or `process.cwd()`; changing a directory breaks them silently in the sense that they fail loudly but for the wrong reason.
8. **`overflow-x: clip`, never `hidden`,** on any ancestor of the designer. `hidden` forces `overflow-y: auto`, making the element a scroll container, which silently disables every `position: sticky` descendant.
9. **Every `pnpm build` must be the production build.** It is the configuration that runs the AOT template type-checker at full strictness and enforces the bundle budgets.

## File Structure

**Moved verbatim from StoneCraft-F (paths preserved):**

| Path | Responsibility |
|---|---|
| `src/app/core/api/` | `ApiClientBase` + `GemstonesApiService` + `BraceletsApiService`, `RequestState`, failure normalisation |
| `src/app/core/models/` | DTOs mirroring StoneCraft-B contracts; the error-code contract |
| `src/app/core/content/` | Generated rulepack reason-key fixture + its coverage spec |
| `src/app/features/reading/` | Birth form, offline place lookup, natal chart, tiered recommendations, cautions, calendar, sharing |
| `src/app/features/designer/` | Bracelet designer: palette, controls, SVG strand rendering |
| `public/data/cities.json` | 33,622 places, GeoNames CC BY 4.0, lazy-loaded on the birth form only |
| `public/assets/beads/` | Bead renders + `MANIFEST.md` + `lighting.json` |

**Modified in WLS-F:**

| Path | Change |
|---|---|
| `angular.json` | add the `test` target (vitest) |
| `package.json` | add `vitest`/`jsdom` devDeps, `test` + `i18n:reasons` scripts |
| `tsconfig.spec.json` | add `"node"` to `types` |
| `src/app/app.routes.ts` | mount `stonecraftRoutes` under the root layout |
| `src/app/app.routes.server.ts` | the SSR carve-out, above the `**` catch-all |
| `src/app/core/http/api-urls.token.ts` | unchanged — WLS-F's `{rest, graphql}` is already a superset |
| `src/app/layout/root-layout/root-layout.component.ts` | `overflow-x-hidden` → `overflow-x-clip` |
| `src/styles/tailwind.css` | `overflow-x: hidden` → `clip` on `html`/`body`/root elements |
| `public/i18n/content/{en,ka,ru}.json` | add the `STONECRAFT` top-level key |
| `proxy.conf.json` | split `/api` by prefix between :5210 and :5080 |

**Created in WLS-F:**

| Path | Responsibility |
|---|---|
| `src/app/features/stonecraft.routes.ts` | StoneCraft's route table, statically imported so the privacy specs can see it |
| `src/app/shared/components/api-error.component.ts` | `sc-api-error` — renders a specific backend error code, never the backend's English `detail` |
| `src/app/shared/components/sc-empty-state.component.ts` | `sc-empty-state` |
| `src/app/shared/components/sc-loading-skeleton.component.ts` | `sc-loading-skeleton` |
| `src/app/shared/utils/cn.ts` | `clsx` + `twMerge` class merger |
| `tools/build-reason-keys.mjs` | nests flat reason-key copy under `STONECRAFT.REASONS` |
| `tools/extract-rulepack-keys.mjs` | regenerates the rulepack key fixture from StoneCraft-B's seed |
| `reason-keys.{en,ka,ru}.json` | flat, human-reviewable reason copy — the source `i18n:reasons` compiles |

**Deliberately NOT moved:**

| Path | Why |
|---|---|
| `StoneCraft-F/src/styles/tailwind.css` | Its 21 tokens are byte-identical to WLS-F's. Only its `overflow-x: clip` fix is ported. |
| `StoneCraft-F/public/fonts/` | A strict subset of WLS-F's `public/fonts/`. |
| `StoneCraft-F/src/app/app.component.ts` | WLS-F's `AppComponent` + `RootLayoutComponent` win. |
| `StoneCraft-F/src/app/app.config.ts` | WLS-F's `appConfig` wins; StoneCraft needs no provider from it. |
| `StoneCraft-F/src/app/core/configs/translate.config.ts` | WLS-F's wins; only `fallbackLang: 'en'` is ported into it. |
| `StoneCraft-F/src/app/core/http/api-urls.token.ts` | WLS-F's `{rest, graphql}` is a superset of `{rest}`. |
| `StoneCraft-F/src/server.ts` | Functionally identical to WLS-F's, and must stay proxy-free. |
| `StoneCraft-B/**` | Stays a separate service. See "Backend topology" below. |

## Backend topology — and why StoneCraft-B is not merged

The two backends are both .NET + EF Core + MediatR + PostgreSQL, which makes merging look closer than it is. Folding StoneCraft-B into `WitchLabShop.sln` would require, at minimum:

- **net8.0 → net10.0** across 4 projects; EF Core 8.0.23 → 10.0.8; Npgsql 8.0.11 → 10.0.1, with 10 migrations and a model snapshot to regenerate.
- **The MediatR pipeline collision.** WLShop_B registers six open-generic behaviors constrained only by `where TRequest : class, IRequest<TResponse>`. Registering StoneCraft's assembly into the same container makes all six wrap every StoneCraft handler — including `UnitOfWorkBehavior`, which would call `SaveChangesAsync` on *WLShop_B's* `IDataContext` for a StoneCraft command, and `IdempotencyBehavior`, which would stage rows in the wrong database. Both `ValidationBehavior<,>` implementations would also run.
- **Global MVC filters.** StoneCraft's `ResultFilter` and `RulePackVersionFilter` are registered on `AddControllers`, so they would wrap WLShop_B's controllers too.
- Two unrelated `Result<T>` kernels, two `ErrorResults` tables, two snake_case strategies (StoneCraft hand-rolls `ApplySnakeCaseNames`; WLShop_B uses `EFCore.NamingConventions`), and Serilog against WLShop_B's OpenTelemetry stack.

StoneCraft-B owns its own database with no cross-context foreign keys **by design** (audit D8). Keeping the process separate costs one extra deploy target and buys back all of the above, plus both CI pipelines and 397 backend tests staying green. Revisit only if operating two services becomes the actual pain.

---

## Task 1: Test harness

WLS-F has no test runner. StoneCraft's 23 spec files *are* the enforcement mechanism for the global constraints above — merging without a runner does not skip tests, it deletes the only thing keeping those rules true. This task comes first so every later task can be verified.

**Files:**
- Modify: `package.json`
- Modify: `angular.json`
- Modify: `tsconfig.spec.json`
- Create: `src/app/harness.spec.ts` (temporary; deleted in Task 3)

**Interfaces:**
- Consumes: nothing
- Produces: `pnpm test` runs vitest via `@angular/build:unit-test` against `tsconfig.spec.json`

- [ ] **Step 1: Add the dev dependencies**

```bash
pnpm add -D vitest@^3.2.4 jsdom@^26.1.0
```

- [ ] **Step 2: Add the `test` target to `angular.json`**

Inside `projects.WLS-F.architect`, as a sibling of `serve`:

```json
"test": {
  "builder": "@angular/build:unit-test",
  "options": {
    "buildTarget": "WLS-F:build:development",
    "tsConfig": "tsconfig.spec.json",
    "runner": "vitest",
    "watch": false
  }
}
```

- [ ] **Step 3: Add `node` to the spec tsconfig types**

`tsconfig.spec.json` — StoneCraft specs read fixtures with `node:fs`:

```json
"types": ["node", "vitest/globals"]
```

- [ ] **Step 4: Write a harness test proving the runner works**

`src/app/harness.spec.ts`:

```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('test harness', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('can read repo files, which twelve StoneCraft specs rely on', () => {
    const pkg = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    expect(JSON.parse(pkg).name).toBe('wls-f');
  });
});
```

- [ ] **Step 5: Run it**

Run: `pnpm test`
Expected: 2 passed. If `node:fs` fails to resolve, Step 3 did not take.

- [ ] **Step 6: Add the `test` script if `pnpm test` did not already route to `ng test`**

`package.json` scripts already contain `"test": "ng test"`. Confirm, do not duplicate.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml angular.json tsconfig.spec.json src/app/harness.spec.ts
git commit -m "test: add vitest runner

StoneCraft's specs enforce its non-negotiables — birth-data privacy, no
price in the designer, no trigonometry in the strand. WLS-F had no runner,
so merging without one would drop the enforcement, not just the tests."
```

---

## Task 2: Assets, i18n and the reason-key toolchain

No TypeScript changes, so the app stays buildable throughout. Done before the code so the specs that import `en.json` and read `public/` have their fixtures in place when their code arrives.

**Files:**
- Create: `public/data/cities.json`, `public/assets/beads/**`
- Modify: `public/i18n/content/{en,ka,ru}.json`
- Create: `reason-keys.{en,ka,ru}.json`, `tools/build-reason-keys.mjs`, `tools/extract-rulepack-keys.mjs`, `public/i18n/README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing
- Produces: `STONECRAFT` top-level key in all three bundles; `public/data/cities.json`; `public/assets/beads/lighting.json`; `pnpm i18n:reasons`

- [ ] **Step 1: Copy the assets**

```bash
SC=~/Desktop/StoneCraft-F
mkdir -p public/data public/assets
cp -R "$SC/public/data/." public/data/
cp -R "$SC/public/assets/beads" public/assets/
cp "$SC/public/i18n/README.md" public/i18n/README.md
cp "$SC/reason-keys."*.json .
mkdir -p tools && cp "$SC/tools/build-reason-keys.mjs" "$SC/tools/extract-rulepack-keys.mjs" tools/
```

Do **not** copy `$SC/public/fonts` — WLS-F's set is a superset.

- [ ] **Step 2: Merge the `STONECRAFT` key into all three bundles**

StoneCraft adds exactly one top-level key and WLS-F has seventeen others, so this is an addition that collides with nothing. Verified: zero key overlap.

```bash
for L in en ka ru; do
  python3 - "$L" <<'PY'
import json, sys
lang = sys.argv[1]
dst_path = f'public/i18n/content/{lang}.json'
src_path = f'{__import__("os").path.expanduser("~")}/Desktop/StoneCraft-F/public/i18n/content/{lang}.json'
with open(dst_path) as f: dst = json.load(f)
with open(src_path) as f: src = json.load(f)
overlap = set(dst) & set(src)
assert not overlap, f'{lang}: unexpected key collision {overlap}'
dst.update(src)
with open(dst_path, 'w') as f:
    json.dump(dst, f, ensure_ascii=False, indent=2)
    f.write('\n')
print(f'{lang}: merged {sorted(src)} -> {len(dst)} top-level keys')
PY
done
```

Expected: `en: merged ['STONECRAFT'] -> 18 top-level keys`, and the same for `ka` and `ru`.

- [ ] **Step 3: Add the `i18n:reasons` script**

`package.json` scripts:

```json
"i18n:reasons": "node tools/build-reason-keys.mjs"
```

- [ ] **Step 4: Verify the generator is idempotent against the merged bundle**

Run: `pnpm i18n:reasons && git diff --stat public/i18n/content/en.json`
Expected: no diff. The generator writes `STONECRAFT.REASONS` from `reason-keys.en.json`; if it rewrote the whole file it would have dropped WLS-F's seventeen keys, and this is where that shows.

- [ ] **Step 5: Confirm the shop bundle survived**

```bash
python3 -c "
import json; d=json.load(open('public/i18n/content/en.json'))
assert 'CHECKOUT' in d and 'SHOP' in d and 'STONECRAFT' in d, sorted(d)
print('ok:', len(d), 'top-level keys')"
```

- [ ] **Step 6: Commit**

```bash
git add public tools reason-keys.en.json reason-keys.ka.json reason-keys.ru.json package.json
git commit -m "feat(i18n): add STONECRAFT copy, bead art and the place dataset

STONECRAFT is one new top-level key against WLS-F's seventeen, so the
bundles merge by addition. cities.json is lazy-loaded on the birth form
only; the place lookup is offline because place of birth is one leg of a
near-identifying triple and must not reach a geocoding API."
```

---

## Task 3: The core layer, with the interceptor bypass

The single most important change in the merge. StoneCraft-F never ran alongside WLS-F's interceptors; in WLS-F they are registered app-wide on `provideHttpClient` and would wrap every StoneCraft call.

**Files:**
- Create: `src/app/core/api/{api-client.base.ts,api-failure.ts,request-state.ts,gemstones-api.service.ts,bracelets-api.service.ts}`
- Create: `src/app/core/api/{birth-data-privacy.spec.ts,gemstones-api.service.spec.ts}`
- Create: `src/app/core/models/{api-enums.ts,api-error.ts,gemstones.models.ts,bracelets.models.ts,error-copy.spec.ts}`
- Create: `src/app/core/content/{rulepack-reason-keys.ts,reason-key-coverage.spec.ts}`
- Modify: `src/app/core/api/api-client.base.ts` (the bypass)
- Delete: `src/app/harness.spec.ts`

**Interfaces:**
- Consumes: `API_URLS` from `@core/http/api-urls.token` (WLS-F's, `{rest: string; graphql: string}` — StoneCraft reads `.rest` only)
- Produces:
  - `abstract class ApiClientBase` with `protected get/post/put<T>(path, ...): Observable<RequestState<T>>`
  - `GemstonesApiService.createSession(request: CreateSessionRequest)`, `.getSession(publicId: string)`, `.setSessionShared(publicId: string, share: boolean)`, `.getSharedSession(shareToken: string)`, `.listMaterials(query?: ListMaterialsQuery)`
  - `BraceletsApiService` (templates, sizing, configurations, revalidation)
  - `RequestState<T>` = `loading() | success(value) | failed(ApiFailure)`

- [ ] **Step 1: Copy the three core directories verbatim**

```bash
SC=~/Desktop/StoneCraft-F
cp -R "$SC/src/app/core/api" "$SC/src/app/core/models" "$SC/src/app/core/content" src/app/core/
```

`src/app/core/` already holds `configs/`, `guards/`, `http/`, `interceptors/`, `services/`, `utils/` — `api/`, `models/` and `content/` are all free. No path collision.

- [ ] **Step 2: Run the tests to see the bypass is not yet in place**

Run: `pnpm test`
Expected: `error-copy`, `reason-key-coverage` and `gemstones-api.service` pass. `birth-data-privacy` passes its URL assertions but its route assertions fail — `app.routes.ts` has no StoneCraft routes yet. That is Task 7; leave it failing and note the count.

- [ ] **Step 3: Write the failing test for the interceptor bypass**

Append to `src/app/core/api/birth-data-privacy.spec.ts`, inside the top-level `describe('birth data privacy', ...)`:

```typescript
  /**
   * WLS-F registers three interceptors app-wide on `provideHttpClient`, and all
   * three are wrong for this client:
   *
   *   `apiInterceptor`     rewrites a relative url to SERVER_API_FALLBACK_BASE on
   *                        the server pass — which is birth data transiting the
   *                        SSR node server, the thing rule 2 forbids.
   *   `refreshInterceptor` treats a 401 as an expired shop session and can
   *                        dispatch Logout. A reading is anonymous; a 404 here
   *                        must not sign someone out of the shop.
   *   `errorInterceptor`   raises a generic DATA_LOAD_FAILED toast on any failed
   *                        GET. BEAD_CATALOG_EMPTY is explicitly not a fault.
   *
   * So this client builds its own HttpClient over HttpBackend and is wrapped by
   * none of them. Asserted on the source because the alternative — booting the
   * real interceptor chain — would need the NGXS store, the notification service
   * and a token in localStorage to prove one line.
   */
  describe('bypasses the app-wide interceptors', () => {
    it('builds its own HttpClient over HttpBackend', () => {
      const source = readFileSync(
        join(repoRoot, 'src', 'app', 'core', 'api', 'api-client.base.ts'),
        'utf8',
      );
      const code = stripComments(source);

      expect(code).toMatch(/HttpBackend/);
      expect(code).toMatch(/new HttpClient\(/);
      expect(code).not.toMatch(/inject\(HttpClient\)/);
    });
  });
```

- [ ] **Step 4: Run it to verify it fails**

Run: `pnpm test -- --project=WLS-F -t "builds its own HttpClient"`
Expected: FAIL — `api-client.base.ts` currently does `inject(HttpClient)`.

- [ ] **Step 5: Implement the bypass**

In `src/app/core/api/api-client.base.ts`, replace the import line and the `http` field.

Change the Angular http import to:

```typescript
import { HttpBackend, HttpClient, HttpParams } from '@angular/common/http';
```

Replace:

```typescript
  protected readonly http = inject(HttpClient);
```

with:

```typescript
  /**
   * Its own client, over the raw backend, wrapped by no interceptor.
   *
   * WLS-F registers `apiInterceptor`, `refreshInterceptor` and
   * `errorInterceptor` app-wide, and each one breaks something here:
   * `apiInterceptor` rewrites relative urls to `SERVER_API_FALLBACK_BASE` on the
   * server pass — birth data through the SSR node server, which is the one
   * thing the whole design forbids; `refreshInterceptor` reads a 401 as an
   * expired shop session and can dispatch `Logout`, but a reading is anonymous
   * and its 404 is deliberately ambiguous; `errorInterceptor` fires a generic
   * DATA_LOAD_FAILED toast on any failed GET, and `BEAD_CATALOG_EMPTY` is not a
   * fault. `HttpBackend` is the un-intercepted transport, so this is one line
   * rather than three opt-out tokens that a fourth interceptor would escape.
   *
   * Nothing is lost by skipping them: this API is not authenticated, and it
   * localises through reason keys resolved client-side rather than through
   * `Accept-Language`.
   */
  protected readonly http = new HttpClient(inject(HttpBackend));
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test -- -t "builds its own HttpClient"`
Expected: PASS

- [ ] **Step 7: Delete the harness test and build**

```bash
rm src/app/harness.spec.ts
pnpm build
```
Expected: build succeeds. The core layer has no unresolved imports.

- [ ] **Step 8: Commit**

```bash
git add src/app/core
git commit -m "feat(stonecraft): add the typed REST clients and contracts

The client builds its own HttpClient over HttpBackend rather than the
injected one. WLS-F's three interceptors are registered app-wide, and each
breaks a StoneCraft rule: apiInterceptor would pull the birth-data POST
through the SSR node server, refreshInterceptor would read an anonymous
404 as an expired shop session, errorInterceptor would toast an error over
BEAD_CATALOG_EMPTY, which is not a fault."
```

---

## Task 4: Shared components

StoneCraft's `sc-empty-state` and `sc-loading-skeleton` have selectors that collide with nothing, but their exported class names — `EmptyStateComponent`, `LoadingSkeletonComponent` — are the same as WLS-F's. Two classes with one name in one app is an auto-import footgun. The selectors and templates stay; only the class names change.

**Files:**
- Create: `src/app/shared/components/sc-empty-state.component.ts`
- Create: `src/app/shared/components/sc-loading-skeleton.component.ts`
- Create: `src/app/shared/components/api-error.component.ts`, `api-error.component.spec.ts`
- Create: `src/app/shared/utils/cn.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `ScEmptyStateComponent` — selector `sc-empty-state`, inputs `title` (required), `description`, `actionLabel`, `actionLink`
  - `ScLoadingSkeletonComponent` — selector `sc-loading-skeleton`, inputs `width` (`'100%'`), `height` (`'20px'`), `customClass` (`''`)
  - `ApiErrorComponent` — selector `sc-api-error`
  - `cn(...inputs: ClassValue[]): string`

- [ ] **Step 1: Copy the files under their new names**

```bash
SC=~/Desktop/StoneCraft-F/src/app/shared
cp "$SC/components/empty-state.component.ts"     src/app/shared/components/sc-empty-state.component.ts
cp "$SC/components/loading-skeleton.component.ts" src/app/shared/components/sc-loading-skeleton.component.ts
cp "$SC/components/api-error.component.ts" "$SC/components/api-error.component.spec.ts" src/app/shared/components/
mkdir -p src/app/shared/utils && cp "$SC/utils/cn.ts" src/app/shared/utils/cn.ts
```

WLS-F's own components live one directory deeper (`components/empty-state/empty-state.component.ts`), so the flat files sit beside them without collision.

- [ ] **Step 2: Rename the two classes**

```bash
sed -i '' 's/\bEmptyStateComponent\b/ScEmptyStateComponent/g'         src/app/shared/components/sc-empty-state.component.ts
sed -i '' 's/\bLoadingSkeletonComponent\b/ScLoadingSkeletonComponent/g' src/app/shared/components/sc-loading-skeleton.component.ts
```

- [ ] **Step 3: Record why the names differ**

Prepend to the doc comment on `ScEmptyStateComponent`:

```typescript
/**
 * `Sc`-prefixed because WLS-F exports an `EmptyStateComponent` of its own at
 * `@shared/components/empty-state/empty-state.component`. The selectors never
 * collided — theirs is `app-empty-state` — but two classes sharing one name in
 * one app is an auto-import that picks the wrong one and a template that fails
 * with a confusing message. Theirs additionally takes an `icon` naming an entry
 * in their icon registry and an `actionClick`; this one takes neither, which is
 * why it is a separate component rather than a call-site swap.
 */
```

Apply the equivalent note to `ScLoadingSkeletonComponent`, whose inputs *are* identical to WLS-F's — the note should say so, and say that the reason it is kept separate is that `designer.page.spec.ts` queries the `sc-loading-skeleton` selector.

- [ ] **Step 4: Run the tests**

Run: `pnpm test`
Expected: `api-error.component.spec.ts` passes. No regression elsewhere.

- [ ] **Step 5: Build**

Run: `pnpm build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/app/shared
git commit -m "feat(stonecraft): add sc- shared primitives

Class names carry an Sc prefix because WLS-F exports EmptyStateComponent
and LoadingSkeletonComponent of its own. Selectors never collided."
```

---

## Task 5: The reading feature

**Files:**
- Create: `src/app/features/reading/**` (19 files, 8 of them specs)

**Interfaces:**
- Consumes: `GemstonesApiService`, `RequestState` (Task 3); `ScEmptyStateComponent`, `ScLoadingSkeletonComponent`, `ApiErrorComponent` (Task 4); `STONECRAFT.*` copy (Task 2)
- Produces:
  - `BirthInputPage` (`@features/reading/birth-input.page`)
  - `ReadingPage` (`@features/reading/reading.page`)
  - `SharedReadingPage` (`@features/reading/shared-reading.page`)
  - `ReadingStore` with `reset(): void` — `features/designer/one-way-to-clear.spec.ts` greps for that exact signature

- [ ] **Step 1: Copy the feature verbatim**

```bash
cp -R ~/Desktop/StoneCraft-F/src/app/features/reading src/app/features/
```

The path must stay `src/app/features/reading` — `one-way-to-clear.spec.ts` reads `../reading/reading.store.ts` relative to the designer directory.

- [ ] **Step 2: Point the shared-component imports at the renamed classes**

```bash
cd src/app/features/reading
grep -rl "EmptyStateComponent\|LoadingSkeletonComponent" . --include="*.ts" | while read -r f; do
  sed -i '' \
    -e "s|from '@shared/components/empty-state.component'|from '@shared/components/sc-empty-state.component'|" \
    -e "s|from '@shared/components/loading-skeleton.component'|from '@shared/components/sc-loading-skeleton.component'|" \
    -e 's/\bEmptyStateComponent\b/ScEmptyStateComponent/g' \
    -e 's/\bLoadingSkeletonComponent\b/ScLoadingSkeletonComponent/g' "$f"
done
cd -
```

Then read the import lines back and confirm none now points at a path that does not exist:

```bash
grep -rn "@shared/components" src/app/features/reading --include="*.ts"
```

- [ ] **Step 3: Run the reading specs**

Run: `pnpm test`
Expected: `tier-grouping`, `birth-input.form`, `place-lookup.service`, `chart-section`, `recommendations`, `birth-input.page` pass. `place-lookup.service.spec.ts` reads `public/data/cities.json`, which Task 2 put in place.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/reading
git commit -m "feat(stonecraft): add the reading — birth input, chart, recommendations

Birth data posts browser to API and routes on the publicId that comes
back; nothing about it enters a URL. The place lookup is offline because
place of birth is one leg of a near-identifying triple."
```

---

## Task 6: The designer feature

**Files:**
- Create: `src/app/features/designer/**` (20 files, 11 of them specs)

**Interfaces:**
- Consumes: `BraceletsApiService`, `RequestState` (Task 3); the `Sc*` primitives (Task 4); `ReadingStore.reset()` (Task 5); `public/assets/beads/lighting.json` (Task 2)
- Produces: `DesignerPage` (`@features/designer/designer.page`)

- [ ] **Step 1: Copy the feature verbatim**

```bash
cp -R ~/Desktop/StoneCraft-F/src/app/features/designer src/app/features/
```

Path must stay `src/app/features/designer` — `no-price.spec.ts` resolves it as `join(process.cwd(), 'src/app/features/designer')` and `bead-image.spec.ts` walks up five levels to reach `public/assets/beads`.

- [ ] **Step 2: Point the shared-component imports at the renamed classes**

```bash
cd src/app/features/designer
grep -rl "EmptyStateComponent\|LoadingSkeletonComponent" . --include="*.ts" | while read -r f; do
  sed -i '' \
    -e "s|from '@shared/components/empty-state.component'|from '@shared/components/sc-empty-state.component'|" \
    -e "s|from '@shared/components/loading-skeleton.component'|from '@shared/components/sc-loading-skeleton.component'|" \
    -e 's/\bEmptyStateComponent\b/ScEmptyStateComponent/g' \
    -e 's/\bLoadingSkeletonComponent\b/ScLoadingSkeletonComponent/g' "$f"
done
cd -
```

- [ ] **Step 3: Run the designer specs, including the two grep-based guards**

Run: `pnpm test`
Expected: all pass, notably —
- `no-price.spec.ts` — the rename introduced no money vocabulary
- `rope-is-geometry-only.spec.ts` — no trigonometry entered the strand
- `bead-image.spec.ts` — bead art and `lighting.json` resolve
- `designer.page.spec.ts` — queries the `sc-loading-skeleton` selector, which the rename left alone

If `no-price` fails on a file the rename touched, the fix is the copy, not the regex.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/designer
git commit -m "feat(stonecraft): add the bracelet designer

Geometry is entirely the backend solver's: every bead arrives as a
millimetre offset from the ring centre, because with mixed diameters the
angular step is the solver's own closure term and a client computing it
would be a second implementation that disagrees silently. A test greps
for trigonometry."
```

---

## Task 7: Routes, the SSR carve-out, and the overflow fix

The privacy-critical task. Two spec files assert about the route table's *shape*, and mounting StoneCraft under WLS-F's root layout changes that shape — so both must be adapted to walk a nested tree without weakening what they check.

**Files:**
- Create: `src/app/features/stonecraft.routes.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/app.routes.server.ts`
- Modify: `src/app/app.routes.spec.ts` (copied in this task), `src/app/core/api/birth-data-privacy.spec.ts`
- Modify: `src/app/layout/root-layout/root-layout.component.ts`
- Modify: `src/styles/tailwind.css`

**Interfaces:**
- Consumes: `BirthInputPage`, `ReadingPage`, `SharedReadingPage` (Task 5); `DesignerPage` (Task 6)
- Produces: `stonecraftRoutes: Routes` — statically importable, so `collectPaths` can see it

- [ ] **Step 1: Create the route table**

`src/app/features/stonecraft.routes.ts`:

```typescript
import type { Routes } from '@angular/router';

/**
 * StoneCraft's routes, mounted inside WLS-F's root layout.
 *
 * **Birth data never appears in a URL.** It is posted to the API, and the
 * `publicId` in the response is what routes. A URL lands in history, in the
 * referrer header, in server access logs, in a screenshot and in a pasted link
 * — and date-plus-time-plus-place is close to a unique identifier for a living
 * person. There is no query parameter on `/reading` for a reason, and
 * `app.routes.spec.ts` asserts none appears.
 *
 * Exported as a static array rather than behind `loadChildren` on purpose: the
 * privacy specs walk the route table to prove no parameter could carry birth
 * data, and a lazily-loaded child table is invisible to them. The components
 * are still lazy — `loadComponent` per route.
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
```

- [ ] **Step 2: Mount them in `app.routes.ts`**

Add the import at the top:

```typescript
import { stonecraftRoutes } from '@features/stonecraft.routes';
```

and spread them into the root-layout route's `children`, after the `account` entry:

```typescript
      {
        path: 'account',
        loadChildren: () => import('@features/account/account.routes'),
      },
      ...stonecraftRoutes,
```

They sit inside `RootLayoutComponent` so a reading is not a dead end — the shop header, footer and cart stay reachable.

- [ ] **Step 3: Add the SSR carve-out**

`src/app/app.routes.server.ts` — the StoneCraft entries must come **before** the `**` catch-all, or the catch-all matches first and every one of them is server-rendered:

```typescript
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'product/:slug',
    renderMode: RenderMode.Server,
  },

  /**
   * StoneCraft's carve-out. **Birth data must never transit the SSR node
   * server.** The form posts browser → API directly, so server-rendering the
   * route that collects it would put a server we operate between the person and
   * the API on the one request carrying date, exact time and place — and the
   * backend's rule is that this data is never logged. There is nothing on an
   * empty form worth pre-rendering, so the hop buys nothing.
   *
   * `/reading/:publicId` and `/designer/:publicId` are client-rendered for the
   * same reason: the owner response *contains* the birth input, so rendering it
   * on our server would pull that payload through the node process on every view.
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
  /**
   * The one StoneCraft route rendered on our server, and the reason SSR is
   * useful here at all: the shared projection is an allow-list that never
   * contains birth data, chart facts, the data tier or the unavailability list
   * — they are never built, not filtered — so a shared link produces a preview
   * and discloses nothing.
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
```

- [ ] **Step 4: Copy the route spec and adapt it to the nested tree**

```bash
cp ~/Desktop/StoneCraft-F/src/app/app.routes.spec.ts src/app/app.routes.spec.ts
```

Three assertions read the route table as flat and must be taught to recurse. Add this helper below the `Blank` component:

```typescript
/**
 * StoneCraft's routes are children of WLS-F's root-layout route, so every check
 * below walks the tree rather than the top level. The parent contributes an
 * empty path, so a child's full path is unchanged by the nesting — `reading`
 * stays `reading`.
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
```

Replace the router setup so the stubbing reaches nested routes:

```typescript
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
```

Replace the parameter assertion:

```typescript
  it('declares no parameter that could carry birth data', () => {
    const parameters = collectPaths(routes)
      .flatMap((path) => path.split('/'))
      .filter((segment) => segment.startsWith(':'));

    // WLS-F's shop routes are lazy (`loadChildren`), so `product/:slug` and the
    // account tree are not visible here — which is fine: this test exists to
    // prove StoneCraft added no parameter that could carry birth data, and every
    // StoneCraft route is statically declared precisely so it stays visible.
    expect(parameters).toEqual([':publicId', ':shareToken', ':publicId']);
  });
```

Replace the "one server-rendered route" assertion — WLS-F server-renders `product/:slug` too, so the check scopes to StoneCraft's own paths:

```typescript
    it('server-renders exactly one StoneCraft route, the shared reading', () => {
      const stonecraftPaths = new Set(collectPaths(stonecraftRoutes));
      const served = serverRoutes
        .filter((route) => route.renderMode === RenderMode.Server)
        .map((route) => route.path)
        .filter((path) => stonecraftPaths.has(path));

      expect(served).toEqual(['shared/:shareToken']);
    });
```

and the coverage assertion:

```typescript
    it('covers every StoneCraft route, so nothing falls through to a default', () => {
      const declared = new Set(serverRoutes.map((route) => route.path));

      for (const path of collectPaths(stonecraftRoutes)) {
        if (path === '' || path === '**') continue;
        expect(declared.has(path), `${path} has no server render mode`).toBe(true);
      }
    });
```

Add the import for the route table under test:

```typescript
import { stonecraftRoutes } from '@features/stonecraft.routes';
```

- [ ] **Step 5: Adapt the privacy spec's route assertions**

`src/app/core/api/birth-data-privacy.spec.ts` already has a recursive `collectPaths` at the bottom of the file, so its three route tests work against the nested tree unchanged — **verify this rather than assume it**, because they depend on the root-layout parent contributing an empty path.

Run: `pnpm test -- -t "birth data privacy"`
Expected: all pass, including `routes the reading on publicId only`.

- [ ] **Step 6: Fix the overflow that would break the designer**

`RootLayoutComponent` is now an ancestor of the designer and sets `overflow-x-hidden` on both its wrapper and its `<main>`. `overflow-x: hidden` forces `overflow-y` to `auto`, which makes the element a scroll container; `position: sticky` inside it then resolves against a scrollport that never moves, so every sticky descendant silently stops sticking. `clip` suppresses horizontal overflow the same way and creates no scroll container.

In `src/app/layout/root-layout/root-layout.component.ts`, replace both occurrences of `overflow-x-hidden` with `overflow-x-clip`.

In `src/styles/tailwind.css`, replace `overflow-x: hidden;` with `overflow-x: clip;` on the `html`, `body` and `app-root, app-root-layout` rules, and record why:

```css
  /*
    `clip`, not `hidden`, and the difference is not cosmetic.
    `overflow-x: hidden` forces `overflow-y` to `auto`, which makes this element
    a scroll container. It never actually scrolls — its height is its content —
    but `position: sticky` inside it then resolves against a scrollport that
    never moves, so every sticky descendant silently stops sticking. That is how
    the designer's mobile stage came to scroll off the top of the screen while
    its computed style still said `position: sticky; top: 0`.
    `clip` suppresses horizontal overflow exactly the same way and creates no
    scroll container, so sticky keeps working.
  */
```

- [ ] **Step 7: Run the whole suite and build**

Run: `pnpm test`
Expected: all 23 spec files pass, `birth-data-privacy` and `app.routes` included.

Run: `pnpm build`
Expected: success, and no bundle-budget error — the initial budget is 2.5 MB and `cities.json` is a lazy fetch, not a bundle import.

- [ ] **Step 8: Commit**

```bash
git add src/app/features/stonecraft.routes.ts src/app/app.routes.ts src/app/app.routes.server.ts \
        src/app/app.routes.spec.ts src/app/core/api/birth-data-privacy.spec.ts \
        src/app/layout/root-layout/root-layout.component.ts src/styles/tailwind.css
git commit -m "feat(stonecraft): mount the routes with the SSR carve-out intact

Birth data never enters a URL and never transits the SSR node server. The
routes are declared statically rather than behind loadChildren so the
privacy specs can still see them, and both specs now walk the nested tree.

overflow-x on the root layout goes hidden -> clip: hidden forces overflow-y
to auto, making the element a scroll container, which silently disables
every position:sticky descendant — including the designer's stage."
```

---

## Task 8: Backend wiring and end-to-end verification

**Files:**
- Modify: `proxy.conf.json`
- Create: `docs/STONECRAFT.md`

**Interfaces:**
- Consumes: everything above
- Produces: `/api/gemstones/*`, `/api/bracelets/*` reaching StoneCraft-B on :5080; everything else on :5210

- [ ] **Step 1: Split the proxy by prefix**

Angular's dev-server proxy matches in declaration order, so the specific prefixes must come first. WLShop_B serves everything under `/api/v{version}/`, StoneCraft-B under `/api/{gemstones,bracelets,knowledge,meta}` — the two namespaces do not overlap, so the split is unambiguous.

`proxy.conf.json` — add these four entries **above** the existing `/api` entry:

```json
  "/api/gemstones": { "target": "http://localhost:5080", "secure": false, "changeOrigin": true, "logLevel": "debug" },
  "/api/bracelets": { "target": "http://localhost:5080", "secure": false, "changeOrigin": true, "logLevel": "debug" },
  "/api/knowledge": { "target": "http://localhost:5080", "secure": false, "changeOrigin": true, "logLevel": "debug" },
  "/api/meta":      { "target": "http://localhost:5080", "secure": false, "changeOrigin": true, "logLevel": "debug" },
```

`/api/knowledge` and `/api/meta` are behind StoneCraft-B's `[AdminSurface]` gate and 404 unless the host enables them. They are routed anyway so that enabling the gate is a backend config change and not also a frontend one.

- [ ] **Step 2: Bring StoneCraft-B up**

```bash
createdb stonecraft 2>/dev/null || true
cd ~/Desktop/StoneCraft-B
export ConnectionStrings__StoneCraft="Host=localhost;Port=5432;Database=stonecraft;Username=$(whoami);Password="
Database__MigrateOnStartup=true Seed__RunOnStartup=true dotnet run --project src/StoneCraft.Api
```

Migrating and seeding are explicit steps, not something the app does at boot — two replicas starting together should not both write 2541 rows. Seeding is idempotent: it upserts on natural keys and skips any file whose checksum already matches `seed_manifest`.

- [ ] **Step 3: Verify the backend is answering**

```bash
curl -s http://localhost:5080/health
curl -s "http://localhost:5080/api/gemstones/materials?page=0&pageSize=3" | head -c 400
```
Expected: `Healthy`, then a page of `MaterialSummaryResponse` rows.

If the ephemeris data is missing, `POST /api/gemstones/sessions` fails on the first chart by design — `EphemerisManifest` verifies checksums and fails loudly. See `~/Desktop/StoneCraft-B/docs/EPHEMERIS.md`.

- [ ] **Step 4: Verify the split through the Angular proxy**

With `pnpm start` running:

```bash
curl -s "http://localhost:4300/api/gemstones/materials?page=0&pageSize=1" | head -c 200
curl -s -X POST http://localhost:4300/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ products(take:1){ totalCount } }"}'
```
Expected: the first hits StoneCraft-B, the second hits WLShop_B. Both succeed.

- [ ] **Step 5: Verify the SSR carve-out is real, not just declared**

```bash
curl -s http://localhost:4300/reading   | grep -c "ng-server-context"
curl -s http://localhost:4300/shared/x  | grep -c "ng-server-context"
```
Expected: `0` for `/reading` (client-rendered — the shell arrives without a server-rendered body) and `1` for `/shared/x`. This is the one check that proves constraint 2 holds at runtime rather than in a spec.

- [ ] **Step 6: Write the integration note**

`docs/STONECRAFT.md` — record, for whoever runs this next: the two-service topology and why StoneCraft-B is not merged; the proxy split; that StoneCraft-B's JWT bearer is **not wired** (the package is referenced nowhere in `src/`, so `IsAuthenticated` is always false and every reading is anonymous — linking a reading to a WitchLab account is code to write, not config to set); and the three open questions that block commerce — Q-8 (bead catalogue: `bead_variants` is empty, so `POST /bracelets/configurations` answers `BEAD_CATALOG_EMPTY`), Q-12 (the handoff contract — `IBraceletHandoff` is implemented and tested but deliberately unrouted, and a backend test asserts three plausible spellings all 404), and pricing (StoneCraft computes none, by design).

- [ ] **Step 7: Commit**

```bash
git add proxy.conf.json docs/STONECRAFT.md
git commit -m "feat(stonecraft): route the gemstone API to StoneCraft-B

Two services behind one origin. StoneCraft-B keeps its own process, its
own database (audit D8) and its own MediatR pipeline: WLShop_B registers
six unconstrained open-generic behaviors, and merging the assemblies would
run UnitOfWorkBehavior against the wrong DbContext for every StoneCraft
command."
```

---

## Self-review

**Spec coverage.** Every deviation StoneCraft-F's README lists is accounted for: `sc` prefix (kept, Task 4/7), REST alongside GraphQL (Task 3, both clients coexist), signals alongside NGXS (no change needed — WLS-F already runs both), tokens as a mirror (Task 7, deleted except the `clip` fix), i18n as one added key (Task 2), fonts as a subset (Task 2, not copied). The two rules its tests enforce are Tasks 3 and 7. The four `BACKEND_GAPS.md` items that block work — stone detail, bead catalogue, handoff route, stone images — are documented in Task 8 Step 6 and none is closable from the frontend.

**Two things this plan deliberately does not do.** It does not close Q-8 or Q-12; both are decisions, not code. And it does not merge StoneCraft-B — see "Backend topology" for the five specific costs.

**Known risk.** Task 7 Step 4 rewrites assertions in a spec whose whole purpose is enforcement. The adaptation must keep the rule and change only the traversal. If an assertion cannot be made to pass without weakening it, stop and re-read `app.routes.spec.ts`'s doc comments — they state the rule the assertion encodes.
