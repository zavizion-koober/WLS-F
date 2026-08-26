# StoneCraft in WLS-F

The astrological gemstone reading and the bracelet designer, merged from
[StoneCraft-F](https://github.com/zavizion-koober/StoneCraft-F). This file is for
whoever runs or extends it next: what the topology is, which rules are enforced
by tests rather than by review, and what is deliberately unfinished.

## Topology — two backends, one origin

| Service | Port | Serves | Repo |
|---|---|---|---|
| WLShop_B | `:5210` | `/api/v{n}/…`, `/graphql` | `mghebro/WLShop_B` (.NET 10) |
| StoneCraft-B | `:5080` | `/api/{gemstones,bracelets,knowledge,meta}` | `zavizion-koober/StoneCraft-B` (.NET 8) |

`proxy.conf.json` splits `/api` by prefix; the dev-server proxy matches in
declaration order, so the four StoneCraft prefixes are declared **above** the
generic `/api` entry. Production needs the same split at the edge. The two
namespaces do not overlap — everything WLShop_B serves is version-prefixed — so
the split is unambiguous.

Running StoneCraft-B locally:

```bash
createdb stonecraft
cd ~/Desktop/StoneCraft-B
ConnectionStrings__StoneCraft="Host=localhost;Port=5432;Database=stonecraft;Username=$(whoami)" \
Database__MigrateOnStartup=true Seed__RunOnStartup=true \
dotnet run --project src/StoneCraft.Api
```

Migrating and seeding are explicit steps, not something the app does at boot —
two replicas starting together should not both write 2541 rows. Seeding is
idempotent: it upserts on natural keys and skips any file whose checksum already
matches the `seed_manifest` table.

### Why StoneCraft-B is not merged into WitchLabShop.sln

Both are .NET + EF Core + MediatR + PostgreSQL, which makes them look closer than
they are. Folding StoneCraft-B in would require:

- **net8.0 → net10.0** across four projects; EF Core 8.0.23 → 10.0.8; Npgsql
  8.0.11 → 10.0.1, with ten migrations and a model snapshot to regenerate.
- **Resolving the MediatR pipeline collision.** WLShop_B registers six
  open-generic behaviors constrained only by `where TRequest : class,
  IRequest<TResponse>`. Registering StoneCraft's assembly into the same container
  makes all six wrap every StoneCraft handler — including `UnitOfWorkBehavior`,
  which would call `SaveChangesAsync` on *WLShop_B's* `IDataContext` for a
  StoneCraft command, and `IdempotencyBehavior`, which would stage rows in the
  wrong database.
- **Un-globalising two MVC filters.** StoneCraft's `ResultFilter` and
  `RulePackVersionFilter` are registered on `AddControllers`, so they would wrap
  WLShop_B's controllers too.
- Reconciling two `Result<T>` kernels, two `ErrorResults` tables, two snake_case
  strategies (StoneCraft hand-rolls `ApplySnakeCaseNames`; WLShop_B uses
  `EFCore.NamingConventions`), and Serilog against the OpenTelemetry stack.

StoneCraft-B owns its own database with no cross-context foreign keys **by
design** (its audit decision D8). Two processes cost one extra deploy target and
buy back all of the above. Revisit if operating two services becomes the real
pain — nothing here forecloses it.

## The rules, and where they are enforced

These are not style preferences. Each is a test that will fail.

| Rule | Enforced by |
|---|---|
| Birth data never enters a URL | `app.routes.spec.ts`, `core/api/birth-data-privacy.spec.ts` |
| Birth data never transits the SSR node server | `app.routes.server.ts` + both specs above |
| StoneCraft HTTP bypasses every app-wide interceptor | `birth-data-privacy.spec.ts` |
| No price anywhere in the designer | `features/designer/no-price.spec.ts` |
| No trigonometry in the designer | `features/designer/rope-is-geometry-only.spec.ts` |
| Every backend error code has specific copy | `core/models/error-copy.spec.ts` |
| Every rulepack reason key has copy | `core/content/reason-key-coverage.spec.ts` |
| Focus indicators survive forced-colors mode | `features/designer/focus-indicators.spec.ts` |

Run them with `pnpm test`.

### The interceptor bypass

`ApiClientBase` builds its own `HttpClient` over `HttpBackend` rather than
injecting the app's. WLS-F registers `apiInterceptor`, `refreshInterceptor` and
`errorInterceptor` app-wide on `provideHttpClient`, and each breaks a StoneCraft
rule: `apiInterceptor` rewrites relative URLs to `SERVER_API_FALLBACK_BASE` on
the server pass — birth data through the SSR node server; `refreshInterceptor`
reads a 401 as an expired shop session and can dispatch `Logout`, but a reading
is anonymous and its 404 is deliberately ambiguous; `errorInterceptor` raises a
generic `DATA_LOAD_FAILED` toast on any failed GET, and `BEAD_CATALOG_EMPTY` is
explicitly not a fault.

**If you add a fourth interceptor, it will not apply to StoneCraft calls.** That
is the intent. If one ever must, it belongs inside `ApiClientBase`.

### `overflow-x: clip`, never `hidden`

`overflow-x: hidden` forces `overflow-y` to `auto`, making the element a scroll
container; `position: sticky` inside it then resolves against a scrollport that
never moves, so every sticky descendant silently stops sticking. `html`, `body`,
`app-root`, `app-root-layout` and the root layout's wrapper and `<main>` all use
`clip`. Changing one back breaks the designer's stage with no error.

## What is deliberately unfinished

None of these is a defect. Each is a decision nobody has made yet.

**StoneCraft-B has no JWT wiring.** `Microsoft.AspNetCore.Authentication.JwtBearer`
is in `Directory.Packages.props` and referenced nowhere in `src/`. There is no
`AddAuthentication` and no `UseAuthentication`, so `context.User.Identity
.IsAuthenticated` is always false and **every reading is anonymous, permanently**
— tied to an `sc_anon` HttpOnly cookie. `HttpCurrentUserAccessor` already reads
`ClaimTypes.NameIdentifier` / `sub`, so linking a reading to a WitchLab account
is small — but it is code to write, not a key to set.

**Q-8, the bead catalogue.** `bead_variants` is empty; no supplier catalogue
exists and nothing invented one. `GET /bracelets/templates` returns `[]`,
`GET /bracelets/sizing` announces `status: PROVISIONAL` and `openQuestion: Q-8`
on the wire, and `POST /bracelets/configurations` returns `400
BEAD_CATALOG_EMPTY`. The designer asks the real endpoint, so it stops saying "not
yet" on its own the day this changes.

**Q-12, the handoff contract.** This is the actual commerce integration.
`IBraceletHandoff` exists, has one implementation and is tested — but it is
**not routed**, and a backend test asserts three plausible route spellings all
return 404, specifically so nobody answers the transport question by accident.
Needs a decision: who consumes a finished configuration, over what transport,
push or pull.

**Pricing.** StoneCraft computes none, by design — it handles no money and a test
fails its build if a price appears in its schema. WLShop_B has to price a
bracelet from its configuration, once Q-12 says how one gets there.

**No customer stone-detail endpoint.** `GET /api/gemstones/materials/{slug}` is
behind `[AdminSurface]` and 404s unless the host enables it, because it inlines
claims, verbatim quotes, locators and source names. The public list returns
summaries only. A stone detail panel needs a new endpoint returning physical
facts only — and should be shaped by the screen that consumes it.

## Copy

`STONECRAFT` is one top-level key in `public/i18n/content/en.json`. `ka.json` and
`ru.json` carry none of it — they need a fluent author rather than a translation
pass — so `translateConfig` sets `fallbackLang: 'en'`; without it those two
languages would render raw key paths.

`STONECRAFT.REASONS` is **generated**. Edit `reason-keys.en.json` (flat, because
that is the shape a person can review) and run `pnpm i18n:reasons`.
`tools/extract-rulepack-keys.mjs` regenerates the coverage fixture from
StoneCraft-B's seed:

```bash
node tools/extract-rulepack-keys.mjs ~/Desktop/StoneCraft-B
```
