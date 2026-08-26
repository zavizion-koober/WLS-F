# Bead artwork

**76 beads**, covering **69 of the 72 stones a reading can actually draw**. Eight from the
owner's first sheet, reviewed one by one; fifty-eight from `stonesFull.jpeg`, filtered rather
than reviewed; ten from `stonesM.jpeg`, cut to close the gap.

The three still undrawn — `amazonite`, `citrine`, `sodalite` — are **not an artwork gap**. Each
has a bead on `stonesFull.jpeg` already, under a caption the audit disputes, so they are blocked
on a decision rather than on a render. See `docs/STONESFULL_AUDIT.md` §3b.

(72 rather than 76 because four of the recommendable stones are non-representative members of a
synonym group and can never be requested: their group draws another name.)

## Two beads repaired from an occluded source

`stonesM.jpeg`'s bottom row overlaps. `jargoon` lost 18% of its left to `kyanite` and `hyacinth`
17% of its right to `yellow-topaz`. Both were re-cut from the source and the missing crescent
filled with the **same-radius median of the unoccluded annulus** — chosen over mirroring the
opposite rim precisely because mirroring transplants the specular highlight and invents one where
none was seen.

`hyacinth` repairs cleanly and measures +0.38/−0.56, in the middle of the rig, because its
occlusion is on the side away from the light. **`jargoon` does not**, and its recorded number is
an artefact of the repair as much as of the artwork. That caveat travels with the number, in
`lighting.json`, written from `tools/bead-notes.json` — see the note there for why it ships anyway.

## The 58, and why they ship when the previous pack did not

The second pack shipped every caption on the sheet, and three of the six slugs that
overlapped with the reviewed eight disagreed with them. This one ships only cells that
survive four filters:

| filter | removed |
|---|---|
| colour contradicts the caption — the hard screen failures | 7 |
| adjacent-hue doubt (`sodalite` reads teal) | 1 |
| names nothing in the catalogue, or duplicates another cell | 5 |
| a slug already shipped — **the reviewed version always wins** | 3 |
| no active rule reaches it, so no palette can ever offer it | 26 |

That last one is the quiet win: 26 cells were never worth arguing about, because under
D21 a customer can only be offered stones their own chart named.

**The residual risk, stated rather than assured.** A colour screen catches a stone drawn
in the wrong colour family. It cannot catch two stones of similar colour swapped for each
other — two greens, two pale translucents — and some of those may be in the 58. That risk
is taken deliberately: the bead ordered is chosen by slug and not by picture, so a wrong
image is a display error and not a fulfilment one; it is reversible one file at a time,
with the stone returning to an honest dashed outline and no code change; and the
alternative is not "correct" but "blank", which is worse to show a customer.

## Three files that look unused and are not

`beryl.webp`, `sard.webp` and `chrysolite.webp` are non-representative members of a
synonym group, so nothing in the live path requests them — the palette draws from
`representativeSlug` and the designer places it, so a new strand records
`aquamarine`, `carnelian` and `peridot`.

**A configuration saved before `representativeSlug` existed still points at them by
slug**, and a stored bead's picture is resolved from the slug in its own slot.
Deleting them would make an already-saved bracelet come back as dashed outlines — a
stored design changing appearance after the fact, which is what `RingRadiusMm` is
persisted to prevent. Same principle, different field.

## Cropped on the way in

The pack arrived with the bead filling **0.917** of its frame — the circular mask inset
was tightened from 1.2% to 5.5% to remove the grey rim the source sheet leaves at the
bead edge, and the result was never re-cropped to the alpha bounding box. `strand-view` maps the whole
square image onto the bead's diameter, so all 58 would have drawn **8% smaller** than the
reviewed eight, at the same slot size, on the same ring — and nothing about the files being
present and correctly named would have shown it. Each was cropped to its alpha bounding box
before shipping. `frameFill` in `lighting.json` records it and a test asserts it.

| File | Printed label on the sheet | Backend slug | Note |
|---|---|---|---|
| `onyx.webp` | ONYX | `onyx` | |
| `obsidian.webp` | OBSIDIAN | `obsidian` | |
| `hawk-s-eye.webp` | HAWK'S EYE | `hawk-s-eye` | variety of `tiger-s-eye` |
| `rhodonite.webp` | **ROSE QUARTZ** | `rhodonite` | **label on the sheet is wrong** — pink with black manganese dendrites is rhodonite |
| `nephrite.webp` | NEPHRITE | `nephrite` | |
| `rose-quartz.webp` | **JASPER** | `rose-quartz` | **label on the sheet is wrong** — translucent milky pink is rose quartz; jasper is opaque |
| `bloodstone.webp` | HELIOTROP *(sic)* | **`bloodstone`** | `heliotrope` is a second slug for the same mineral and is named by **no rule** — see note 2 |
| `carnelian.webp` | CARNELIAN | `carnelian` | synonym group `carnelian-sard` |
| `_fire-quartz.webp` | FIRE QUARTZ | **none** | trade name for hematoid quartz; not in the catalogue. Leading underscore = unmapped, do not ship |

## Two things to decide, not to guess

1. **The sheet mislabels two beads.** ROSE QUARTZ and JASPER are swapped, and the one
   printed ROSE QUARTZ is actually rhodonite. Mapped by what the image shows, not by
   what it says. Confirm before this reaches anyone.

2. **`heliotrope` and `bloodstone` are separate slugs for the same stone**, and only one of
   them can ever appear in a reading. Neither is a variety of the other and they share no
   synonym group.

   `heliotrope` is named by **0** active rules. `bloodstone` by **6** —
   `CU-PLANET-MARS-DIGNIFIED`, `-DEBILITATED`, `-CHARTRULER`, `PAV-SIGN-ARIES-SUN`,
   `CU-SIGN-ARIES-SUN`, and `PAV-PROHIBIT-ARIES` (a caution).

   So the artwork is filed under `bloodstone`, **even though the sheet says HELIOTROP and
   heliotrope is a perfectly correct name for the stone**. This is not a correction of the
   identification — it is a choice between two equivalent identifiers, decided by which one
   the engine can actually recommend. Mapping by name alone puts the picture on the material
   that never appears.

   **`heliotrope` is not a mistake, though.** It carries four Pavitt claims, all of them
   about the identity question itself, and `seed/REVIEW.md:210` records that Pavitt reports
   "much disagreement between ancient writers" over whether heliotrope is bloodstone. It has
   no rules because nothing can be asserted about a stone whose identity the corpus leaves
   open. Do not merge it away — that would delete the record of the disagreement.

   Still a catalogue question for StoneCraft-B, and still not merged from the frontend.

3. **A moonstone bead, when one exists, goes on `moonstone` — not `adularia`.** Same trap
   with a more respectable name: adularia is the adularescent variety of orthoclase, the
   stone the optical effect is named after, and it carries **0** rules where `moonstone`
   carries **6**. Unlike heliotrope it is not documented anywhere, and it exists only so the
   Georgian calendar's ადულარი resolves on two days.

## Lighting

All nine share one rig: specular highlight upper **right**, soft grey ground, same
camera. (Measured, not eyeballed: brightest 1% of each bead, centroid as a fraction
of the radius from centre, gives dx +0.40…+0.44 and dy −0.40…−0.54 across all
eight mapped beads. This line said "upper-left" until `stonesFull.jpeg` arrived and
the two sets had to be compared.)
That is why they read as one set. **Any replacement must match it or the ring stops
looking like a single piece of jewellery** — which is the whole argument for rendering
beads rather than sourcing photographs.
