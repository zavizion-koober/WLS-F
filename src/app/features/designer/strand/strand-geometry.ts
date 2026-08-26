import type { ConfiguredBeadSlot, SolvedStrand } from '@core/models/bracelets.models';

/**
 * Turning the solved bracelet into SVG user units.
 *
 * <b>There is no trigonometry here, and that is the point (§37).</b> Every angle
 * on the ring came from the solver's closure condition,
 * `Σ 2·asin((dᵢ + dᵢ₊₁) / (4R)) = 2π`, and arrives as a millimetre offset on each
 * slot. All this does is scale millimetres to user units and move the origin to
 * the middle of the viewBox. If a `Math.sin` ever appears in this file or in a
 * component, the geometry has been reimplemented in the client and the two can
 * disagree — silently, as a ring that does not quite close.
 */

/** A bead, positioned and sized in SVG user units. */
export interface PlacedBead {
  readonly slot: ConfiguredBeadSlot;
  /** Centre, in user units, already offset to the middle of the viewBox. */
  readonly cx: number;
  readonly cy: number;
  /** Rendered diameter, in user units. */
  readonly size: number;
}

export interface StrandLayout {
  /** Square viewBox side, in user units. */
  readonly extent: number;
  readonly centre: number;
  /** Radius of the path the bead centres sit on, in user units. */
  readonly ringRadius: number;
  readonly beads: readonly PlacedBead[];
}

/**
 * The drawing surface, in user units.
 *
 * Arbitrary — the SVG scales to its container — but fixed, so a bracelet drawn at
 * one wrist size and one drawn at another share a coordinate system and the ring
 * visibly grows between them rather than being renormalised to fill the frame.
 */
const EXTENT = 1000;

/**
 * How much of the surface the largest bracelet may occupy.
 *
 * The margin holds the outer half of the biggest bead plus the focus ring a
 * keyboard user gets on it, which is drawn outside the bead.
 */
const USABLE = 0.86;

/**
 * The largest ring the layout is scaled against, in millimetres.
 *
 * Fixed rather than derived from the bracelet being drawn, so changing wrist size
 * makes the ring change size on screen — which is the feedback the control exists
 * to give. A 210 mm wrist at 12 mm beads is the largest ring the provisional
 * sizing table can produce; its radius is about 37 mm, and the outer edge of a
 * 12 mm bead puts the drawing at 43 mm.
 */
const MAX_OUTER_RADIUS_MM = 43;

export function layoutStrand(configuration: SolvedStrand): StrandLayout {
  const centre = EXTENT / 2;
  const scale = ((EXTENT / 2) * USABLE) / MAX_OUTER_RADIUS_MM;

  return {
    extent: EXTENT,
    centre,
    ringRadius: configuration.ringRadiusMm * scale,
    beads: configuration.slots.map((slot) => ({
      slot,
      // Scale and translate. Nothing else.
      cx: centre + slot.centreXMm * scale,
      cy: centre + slot.centreYMm * scale,
      size: slot.diameterMm * scale,
    })),
  };
}

/**
 * A stone the person chose, ready to be drawn into a place on the rope.
 *
 * Carries its display name because the rope cannot: the rope's slots all name
 * the probe material its geometry was asked about. The name comes from the
 * palette, which is where the person read it.
 */
export interface PlacedStone {
  readonly slug: string;
  readonly name: string;
  readonly diameterMm: number;
}

/** One place on the rope, and whatever is in it. */
export interface Socket {
  readonly bead: PlacedBead;
  readonly position: number;
  readonly stone: PlacedStone | null;
}
