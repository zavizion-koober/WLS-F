# Translation bundles

Same location and same convention as WLS-F: `public/i18n/content/{en,ka,ru}.json`,
SCREAMING_SNAKE top-level keys, loaded by the same `HttpTranslateLoader`.

## One top-level key

WLS-F has seventeen top-level keys — `NAVBAR`, `AUTH`, `ERRORS`, `ZODIAC` and the
rest. StoneCraft-F adds exactly one: **`STONECRAFT`**. Everything this project
needs lives under it, including its own `ERRORS`.

That is the merge, made small. StoneCraft-F's bundle contributes one key and
collides with nothing, so merging the two files is an addition rather than a
reconciliation. Copying WLS-F's seventeen keys in here would have been worse in
both directions: the duplicated shop copy is deleted on merge anyway, and until
then any edit WLS-F makes to `ERRORS` silently diverges from our copy of it.

## The reason keys

`STONECRAFT.REASONS` is **generated**. Do not hand-edit it.

The source is `reason-keys.<lang>.json` at the repository root, authored flat —
one line per key — because that is the shape a person can review for consistency
of register. ngx-translate reads a dot as a path separator, so the flat form has
to be nested before it can be looked up. `pnpm i18n:reasons` does that transform
and writes the result into these bundles.

Lookup is `STONECRAFT.REASONS.<reasonKey>.short` and `.long`, where `<reasonKey>`
is the key the backend returned verbatim, e.g.

    STONECRAFT.REASONS.reason.sign.taurus.sun.short

`short` sits on the card. `long` is behind progressive disclosure.

A test fails the build if the active rulepack can emit a key with no entry.

## ka.json and ru.json are empty, and that is deliberate

Both are `{}`. `defaultLang` is `en`, so every lookup falls back to English until
someone writes them.

These need a **fluent author, not a translation pass.** The esoteric register is
where machine translation goes wrong, and these fifty-seven sentences are
carefully built: every one frames its claim as belonging to a tradition rather
than as a fact about the world, and not one names a book or an author. Both
properties are load-bearing — lose either and the copy stops being honest, which
is a correctness problem, not a style problem.

An empty file that visibly falls back to English is a legible gap. A file full of
machine-translated esoterica is an invisible one.

To add a language: write `reason-keys.ka.json` with the same key set, run
`pnpm i18n:reasons`, and fill in `STONECRAFT` alongside it.

One of the fifty-seven belongs to a **dormant** rule.
`reason.prohibition.venusAfflicted` is Pavitt's caution against opal, and opal was
withdrawn from the catalogue at D23, so the rule sleeps and the key cannot currently
reach a customer. **Translate it anyway.** Restoring the stone restores the warning,
and asking a fluent author to come back for one sentence later is worse than asking
for fifty-seven now.

### Pluralisation is part of that same task

ngx-translate v17 interpolates but does not pluralise, and this project carries no
ICU message compiler. Where a count reaches the screen — `STONECRAFT.DESIGNER`'s
`BEAD_COUNT` and `STONE_COUNT` — the two forms are chosen in the template:

    entry.count === 1 ? '…BEAD_COUNT.ONE' : '…BEAD_COUNT.OTHER'

**That is correct for English and wrong for Russian**, which needs three forms, and
it is written that way deliberately rather than by omission. Choosing a plural
strategy — an ICU compiler, `Intl.PluralRules`, or something else — is a decision
made once for the whole application, and it wants the translator in the room. Doing
it locally now, against a bundle where `ka` and `ru` hold nothing at all, would
produce a shape that has to be undone the moment either language is written.

So it is not a separate backlog item. **The English two-form choice comes out when
the other two languages go in**, and whoever writes `reason-keys.ka.json` is the
person who should decide what replaces it. Until then "1 bead" is right in the only
language the bundle has.
