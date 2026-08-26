import type {
  BeadGrade,
  BraceletChangeKind,
  RecommendationTier,
  SafetyClass,
  SlotLock,
} from './api-enums';

/* ============================================================================
 * Bracelet contracts — StoneCraft.Application.Features.Bracelets
 *
 * Typed now, used later. The designer is not built (no bead catalogue, Q-8), but
 * the types are cheap and typing them from the real controllers today is how the
 * designer avoids being written against a mock and then rewritten.
 *
 * There is no price on this surface, in any shape. The backend computes none.
 * ========================================================================= */

/** GET /api/bracelets/templates → 200. Returns `[]` today: no templates seeded. */
export interface BraceletTemplateResponse {
  publicId: string;
  slug: string;
  /** A content key, like everything else the backend names. Never a display string. */
  nameKey: string;
  /**
   * May be narrower than the sizing table's list. A client must intersect the
   * two rather than trusting either alone.
   */
  allowedDiametersMm: readonly number[];
  minBeadCount: number;
  maxBeadCount: number;
  /** When set, every bracelet from this template must carry the reading's stones of that tier. */
  lockedStoneTier: RecommendationTier | null;
}

/**
 * GET /api/bracelets/sizing → 200.
 *
 * Every value is provisional pending a supplier catalogue, and `status` /
 * `openQuestion` say so on the wire. Rendering these as a settled size chart
 * would publish a guess as a fact.
 */
export interface BeadSizingResponse {
  beadDiametersMm: readonly number[];
  wristMinMm: number;
  wristMaxMm: number;
  wristStepMm: number;
  elasticEaseMm: number;
  fitToleranceMm: number;
  grades: readonly BeadGrade[];
  /** `PROVISIONAL` today. */
  status: string;
  /** `Q-8` today. */
  openQuestion: string;
}

/**
 * One position in an explicitly ordered strand.
 *
 * No `minimumCount`: a position is one bead, and the count is the length of the
 * list. That is what "the client owns the order" means — the API models a
 * *demand* (`BeadSelection`) and a designer models a *strand*.
 *
 * **`strand` and `beads` are mutually exclusive.** Sending both is rejected with
 * `STRAND_AND_PALETTE_BOTH_SUPPLIED` rather than merged, because two sources of
 * truth for what a bracelet contains produce a bracelet that is neither.
 */
export interface StrandPosition {
  materialSlug: string;
  diameterMm: number;
  grade: BeadGrade;
}

export interface BeadSelection {
  materialSlug: string;
  diameterMm: number;
  grade: BeadGrade;
  minimumCount?: number;
}

/**
 * POST /api/bracelets/configurations body.
 *
 * Bead count is absent deliberately: it is derived from wrist size and bead
 * diameter, never accepted, so a request cannot assert a bracelet that will not
 * string.
 */
export interface ConfigureBraceletRequest {
  templateSlug: string;
  wristCircumferenceMm: number;
  beads: readonly BeadSelection[];
  recommendationSessionId?: string | null;
  /** The ordered cycle, when the client owns the arrangement. Excludes `beads`. */
  strand?: readonly StrandPosition[];
}

/** `POST /bracelets/solve` body. Same shape, minus the session — nothing is stored. */
export interface SolveBraceletRequest {
  templateSlug: string;
  wristCircumferenceMm: number;
  beads: readonly BeadSelection[];
  strand?: readonly StrandPosition[];
}

/**
 * Geometry only. Nothing was written.
 *
 * No `publicId`, and no `rulePackVersion`/`calcVersion` — those describe a
 * *stored* design's provenance, and a nullable id on a preview invites somebody
 * to treat it as a saved one.
 */
export interface SolvedBraceletResponse {
  templateSlug: string;
  wristCircumferenceMm: number;
  beadCount: number;
  innerCircumferenceMm: number;
  ringRadiusMm: number;
  fitDeviationMm: number;
  /**
   * Whether `POST /configurations` would accept this.
   *
   * **Reported, not enforced.** A person builds a bracelet one bead at a time, so
   * the first three beads are always far too small for any wrist. The save
   * endpoint is where this becomes a refusal.
   */
  isWithinTolerance: boolean;
  slots: readonly ConfiguredBeadSlot[];
  solverVersion: string;
}

/**
 * What the renderer actually reads.
 *
 * Narrowed so a solved preview and a saved configuration both satisfy it
 * structurally — the ring does not care which endpoint produced the geometry,
 * and typing it against either concrete response would make it care.
 */
export interface SolvedStrand {
  readonly beadCount: number;
  readonly wristCircumferenceMm: number;
  readonly innerCircumferenceMm: number;
  readonly ringRadiusMm: number;
  readonly fitDeviationMm: number;
  readonly slots: readonly ConfiguredBeadSlot[];
}

export interface ConfiguredBeadSlot {
  position: number;
  sku: string;
  materialSlug: string;
  canonicalNameEn: string;
  diameterMm: number;
  grade: BeadGrade;
  lock: SlotLock;
  sourceMaterialSlug: string | null;
  /**
   * Where this bead's centre sits relative to the ring centre, in millimetres,
   * x to the right and **y downward** — screen orientation, so a renderer neither
   * flips nor rotates.
   *
   * **Do not compute these.** With mixed diameters the angular step between beads
   * is not uniform: it is `2·asin((dᵢ + dᵢ₊₁) / (4R))`, the solver's own closure
   * term. Dividing a circle into equal parts draws a ring that does not match the
   * bracelet, and computing the real step would be a second implementation of the
   * solver — one that disagrees silently, as a ring that does not quite close.
   */
  centreXMm: number;
  centreYMm: number;
}

/** POST /api/bracelets/configurations → 200. Returns 400 BEAD_CATALOG_EMPTY today. */
export interface ConfiguredBraceletResponse {
  publicId: string;
  templateSlug: string;
  wristCircumferenceMm: number;
  beadCount: number;
  innerCircumferenceMm: number;
  /**
   * Radius of the circle the bead *centres* sit on, millimetres.
   *
   * Not derivable from `innerCircumferenceMm`: that measures the enclosed circle,
   * `2π(R − d_max/2)`, which is a different circle. It comes from the solver
   * bisecting the closure condition, and it is frozen with the configuration so a
   * stored bracelet draws identically after the solver is tuned.
   */
  ringRadiusMm: number;
  fitDeviationMm: number;
  slots: readonly ConfiguredBeadSlot[];
  /** Pins which solver produced this geometry. A stored design is never re-solved. */
  solverVersion: string;
  rulePackVersion: string | null;
  calcVersion: string | null;
}

export interface BraceletMaterialChange {
  materialSlug: string;
  position: number;
  sku: string;
  kind: BraceletChangeKind;
  reasonKey: string;
  currentSafetyClass: SafetyClass | null;
}

/**
 * GET /api/bracelets/configurations/{publicId}/revalidation → 200.
 *
 * `isMakeable: false` is a stop, not advice.
 */
export interface BraceletRevalidationResponse {
  configurationPublicId: string;
  isMakeable: boolean;
  blocking: readonly BraceletMaterialChange[];
  advisory: readonly BraceletMaterialChange[];
  checkedAgainstRulePackVersion: string;
}
