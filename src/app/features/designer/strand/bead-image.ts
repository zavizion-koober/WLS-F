/**
 * Where a bead's artwork lives.
 *
 * Placeholder renders sliced from the owner's stone sheet, 512×512 WebP with a
 * circular alpha. **Eight of nine are mapped; `_fire-quartz` is not** — it is a
 * trade name for hematoid quartz and has no slug in the catalogue, so it is not
 * shipped. There is now a second, independent reason: measured, its highlight
 * sits at dx −0.37, dy +0.79 — lower *left*, the opposite corner from every other
 * bead. It is not from this shoot, and the lighting test would reject it even if a
 * slug appeared for it.
 *
 * The green-with-red-flecks bead is filed under **`bloodstone`, not
 * `heliotrope`**. Both slugs are active in the catalogue and name the same
 * mineral, and the sheet captions it HELIOTROP — but `heliotrope` is named by no
 * rule the engine can fire, and `bloodstone` by six. Filed under the identifier
 * a bracelet can actually contain. See `docs/BACKEND_GAPS.md`; do not "correct"
 * it back to match the caption.
 *
 * <b>All eight share one lighting rig</b> — specular highlight upper **right**,
 * one camera, one ground. That is what makes a ring of eight different stones
 * read as a single piece of jewellery rather than a collage, and it is the whole
 * argument for rendering beads instead of sourcing photographs. Any replacement
 * has to match it or the ring stops looking like one object.
 *
 * This said "upper-left" until it was measured. Taking the brightest one per cent
 * of each bead and expressing its centroid as a fraction of the radius from
 * centre, all eight sit at dx +0.40…+0.44, dy −0.40…−0.54: right of centre and
 * above it, tightly clustered. The words had been wrong since they were written
 * and it had never mattered, because nobody had held a second set against them —
 * which is exactly the moment a description like this earns its keep, so it is
 * worth stating how to re-measure rather than restating the direction.
 */
/**
 * <b>Thirty-four of these files can never be requested, and all thirty-four stay.</b>
 *
 * Four are non-representative members of a synonym group — `beryl`, `sard`,
 * `chrysolite` and `olivine`.
 *
 * All three are non-representative members of a synonym group, so nothing in the
 * live path asks for them: the palette draws from `representativeSlug` and the
 * designer places it, which means a new strand records `aquamarine`, `carnelian`
 * and `peridot` instead. They look exactly like three files nobody uses.
 *
 * Thirty more were withdrawn from the catalogue by D23 — 25 as too soft or
 * fragile to string, 5 on price — so no chart can name them any more. `opal`,
 * `amber`, `jet`, `sapphire`, `diamond` and the rest are still on disk.
 *
 * <b>A configuration saved before either change still points at those slugs</b>,
 * and `strand-view` resolves a stored bead's picture from the slug in its own
 * slot. Deleting any of them would make an already-saved bracelet come back as
 * dashed outlines — a stored design changing appearance after the fact, which is
 * the exact thing `RingRadiusMm` is persisted to prevent. Same principle,
 * different field: what was saved renders as it was saved.
 *
 * That a bracelet containing a withdrawn stone can no longer be *made* is a
 * separate statement, and revalidation makes it at purchase — `isMakeable: false`
 * with `BeadDelisted`. It still has to render while it says so.
 */
const AVAILABLE = new Set([
  'agate',
  'alunite',
  'amber',
  'amethyst',
  'apache-tear',
  'aquamarine',
  'aventurine',
  'azurite',
  'beryl',
  'black-onyx',
  'bloodstone',
  'carbuncle',
  'carnelian',
  'cat-s-eye',
  'celestite',
  'chalcedony',
  'chrysocolla',
  'chrysolite',
  'chrysoprase',
  'coal',
  'coral',
  'danburite',
  'diamond',
  'emerald',
  'flint',
  'fluorite',
  'garnet',
  'hawk-s-eye',
  'hematite',
  'hyacinth',
  'jacinth',
  'jade',
  'jargoon',
  'jet',
  'kunzite',
  'kyanite',
  'lapis-lazuli',
  'lava',
  'lepidolite',
  'lodestone',
  'malachite',
  'mica',
  'moonstone',
  'mother-of-pearl',
  'nephrite',
  'obsidian',
  'olivine',
  'onyx',
  'opal',
  'pearl',
  'peridot',
  'pipestone',
  'pyrite',
  'rhodochrosite',
  'rhodonite',
  'rock-crystal',
  'rose-quartz',
  'ruby',
  'sapphire',
  'sard',
  'sardonyx',
  'selenite',
  'serpentine',
  'sphene',
  'spinel',
  'staurolite',
  'sugilite',
  'sulfur',
  'sunstone',
  'tiger-s-eye',
  'topaz',
  'tourmaline',
  'turquoise',
  'ulexite',
  'yellow-topaz',
  'zircon',
]);

/**
 * The artwork for a slug, or null when there is none.
 *
 * Null is a real answer and the caller must render it as one. The bead catalogue
 * and the artwork set are different sets that happen to overlap today: a bracelet
 * can legitimately contain a stone nobody has drawn yet, and inventing a generic
 * grey sphere for it would be a worse lie than an outline that says "not drawn".
 */
export function beadImage(materialSlug: string): string | null {
  return AVAILABLE.has(materialSlug) ? `/assets/beads/${materialSlug}.webp` : null;
}

export function hasBeadImage(materialSlug: string): boolean {
  return AVAILABLE.has(materialSlug);
}
