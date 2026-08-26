import type {
  BirthDataTier,
  ConfidenceBand,
  Dignity,
  DoctrineState,
  RecommendationTier,
  RulershipScheme,
  SafetyClass,
  UnavailabilityReason,
} from './api-enums';

/* ============================================================================
 * Reading contracts — StoneCraft.Application.Features.Gemstones.Sessions
 *
 * Mirrors of the backend records, field for field, in the backend's names
 * camelCased by System.Text.Json's default policy. Nothing here is invented and
 * nothing is renamed: a field that reads awkwardly in English is still the
 * field, and a mismatched property name deserialises to `undefined` in silence.
 * ========================================================================= */

/**
 * What a person tells us about their birth.
 *
 * The most sensitive thing this system holds. Date plus exact time plus place is
 * close to a unique identifier for a living person, which is why this type is
 * only ever a *request* body — it is posted from the browser straight to the
 * API, never put in a URL, and never routed through our own SSR node server.
 *
 * `localTime` is optional with no default, and the frontend must preserve that.
 * Substituting noon for an unknown time buys a confident, wrong reading; the
 * backend suppresses houses and angles instead and says so in `unavailable[]`.
 */
export interface BirthInput {
  /** ISO date, `YYYY-MM-DD`. The backend parses a `DateOnly`; nothing before 1800. */
  localDate: string;
  /** `HH:mm` or `HH:mm:ss`. Null means unknown. Never defaulted. */
  localTime: string | null;
  latitude: number;
  longitude: number;
  elevation: number;
  /** IANA zone id. Null derives it from the coordinates. */
  timeZoneId: string | null;
  /** Fallback offset in hours, used only when no zone resolves. */
  utcOffsetHours: number | null;
}

/** POST /api/gemstones/sessions body. */
export interface CreateSessionRequest {
  birthInput: BirthInput;
  /** Null requests the enabled traditions. A disabled one asked for by name is rejected. */
  traditions?: readonly string[] | null;
}

/**
 * One chart factor at the precision the owner's reading needs.
 *
 * `house` is null and `dignity` may be `Unknown` — both are absent facts, not
 * missing data, and must render as absences rather than as zero or "Neutral".
 */
export interface CustomerFactor {
  /** e.g. `Planet`, `Sign`, `House`. */
  kind: string;
  /** The body or value the factor names, e.g. `Venus`. */
  value: string;
  sign: string | null;
  house: number | null;
  dignity: Dignity | null;
  /** 0–1 weight of this factor. */
  prominence: number;
}

/** A reason: a content key plus the chart facts that fired it. Never prose. */
export interface CustomerReason {
  /** Looked up as `STONECRAFT.REASONS.<reasonKey>.short|.long`. */
  reasonKey: string;
  /**
   * Which tradition claims it. Not decoration: stripped of the author's name by
   * D16, this is the only thing left that keeps the sentence a claim about a
   * tradition rather than a claim about the world. It must never be dropped.
   */
  traditionKey: string;
  factors: readonly CustomerFactor[];
}

/** A warning, as a content key. The prohibition without the sentence stating it. */
export interface CustomerCaution {
  reasonKey: string;
}

/** Two traditions disagree about this stone. Named by tradition, never by book. */
export interface CustomerDisagreement {
  reasonKey: string;
  recommendedByTraditions: readonly string[];
  cautionedByTraditions: readonly string[];
}

/** One recommended stone, with its reasoning and no bibliography. */
export interface CustomerRecommendation {
  materialSlug: string;
  canonicalNameEn: string;
  /**
   * The slug to key artwork on. Equals `materialSlug` unless this stone is one
   * name of several for the same thing.
   *
   * **Never use `materialSlug` to pick a picture.** That names the row that
   * carried the evidence and it changes with the chart — a synonym group is
   * folded into one recommendation and the survivor is chosen by score, so the
   * same card, under the same name, arrives as `olivine` on one reading and
   * `chrysolite` on another. Keyed off that, a stone called Peridot would be
   * drawn in a different green from one reading to the next, with the label
   * unchanged to explain it. This names the row that *stands for* the stone.
   */
  representativeSlug: string;
  tier: RecommendationTier;
  score: number;
  confidence: number;
  confidenceBand: ConfidenceBand;
  /** How many independent traditions agree. A real trust signal that names nobody. */
  independentSourceCount: number;
  traditionKeys: readonly string[];
  reasons: readonly CustomerReason[];
  /** The corpus both recommends and warns against this stone. */
  isCautioned: boolean;
  /** The warnings, so a cautioned stone can never be shown without them. */
  cautions: readonly CustomerCaution[];
  disagreement: CustomerDisagreement | null;
  isAvailableAsBead: boolean;
}

/**
 * What could not be evaluated, grouped by why.
 *
 * The honesty mechanism. A reading that silently omits a fifth of its rules
 * looks identical to a complete one, so this must be rendered, not swallowed.
 */
export interface CustomerUnavailableGroup {
  reason: UnavailabilityReason;
  count: number;
  reasonKey: string;
}

/**
 * @param materialSlug Null when the calendar names a stone the catalogue cannot
 * resolve. Null is the honest answer and is published as such.
 * @param day Which calendar day this stone came from — on a disputed date the
 * reading returns the union of both days.
 */
export interface CustomerCalendarStone {
  materialSlug: string | null;
  canonicalNameEn: string | null;
  day: number;
}

export interface CustomerCalendarReading {
  traditionKey: string;
  zodiacAsStated: string;
  stones: readonly CustomerCalendarStone[];
  isDataDisputed: boolean;
  disputeKey: string | null;
}

/* --------------------------------------------------------------------------
 * The chart — D17, owner responses only
 *
 * `CustomerChart` is on `CustomerSessionResult`, which reaches exactly two
 * responses: the POST that creates a reading and the ownership-checked GET that
 * reads it back. It is NOT on `SharedSessionResponse`, and that asymmetry is the
 * design rather than an oversight: a degree-precision chart inverts back to a
 * birth time within minutes and a location within about a degree, so to a
 * stranger holding a share link the chart *is* the birth data in another
 * encoding. On the owner endpoint the birth input sits beside it in the same
 * body, so the chart reveals strictly less than its neighbour.
 * ----------------------------------------------------------------------- */

/** One body, at the precision the engine used. */
export interface CustomerPlanet {
  /** e.g. `Venus`. The engine's own name — not a symbol and not a localised label. */
  body: string;
  sign: string;
  /** 0–30 within the sign. */
  degree: number;
  /**
   * Null when the birth time is unknown, and never defaulted to 1. A house a rule
   * could not read must not become one a screen renders.
   */
  house: number | null;
  isRetrograde: boolean;
  /**
   * May be `Unknown`, which is not a synonym for `Neutral`: the source contradicts
   * itself about this placement and no dignity-conditioned rule fired. Rendering
   * it as "neutral" turns "we cannot tell" into "nothing notable".
   */
  dignity: Dignity;
  /** How firmly the source stated that dignity. Shown alongside it, never without it. */
  dignityState: DoctrineState;
  isChartRuler: boolean;
  /** 0–1. The same weight the scorer used, so "why did Venus matter more" has an answer. */
  prominence: number;
}

/** Ascendant or Midheaven. The array is empty when the birth time is unknown. */
export interface CustomerAngle {
  name: string;
  sign: string;
  degree: number;
}

export interface CustomerElementBalance {
  fire: number;
  earth: number;
  air: number;
  water: number;
}

export interface CustomerModalityBalance {
  cardinal: number;
  fixed: number;
  mutable: number;
}

/**
 * Cunningham's projective/receptive axis.
 *
 * `dominant` is null when the two are equal — a tie is not a dominance, and the
 * backend publishes the null rather than picking a side. The UI must do the same.
 */
export interface CustomerEnergyBalance {
  projective: number;
  receptive: number;
  dominant: string | null;
}

export interface CustomerDistribution {
  elements: CustomerElementBalance;
  modalities: CustomerModalityBalance;
  energy: CustomerEnergyBalance;
}

/**
 * The chart ruler and why it rules.
 *
 * `reasonKey` is a content key like everything else the backend names — here
 * `chart.ruler.rulesAscendant`, deliberately outside the `reason.*` namespace
 * that belongs to the rulepack. Look it up under `STONECRAFT.CHART.RULER`, not
 * under `STONECRAFT.REASONS`.
 */
export interface CustomerChartRuler {
  body: string;
  /** The Ascendant sign it rules. This is the *why*. */
  rulesSign: string;
  reasonKey: string;
  /**
   * Which rulership tradition resolved it. Not decoration: a Scorpio Ascendant is
   * ruled by Mars under `Traditional` and by Pluto under `Modern`, so the answer
   * is only true relative to the scheme, and naming it keeps the claim a claim
   * about a tradition.
   */
  rulershipScheme: RulershipScheme;
}

/**
 * The natal chart the reading was computed from.
 *
 * Aspects are absent deliberately: the engine computes them and no rule reads
 * them, so showing them would tell a person something influenced their
 * recommendations when nothing did. House cusps are absent too — each planet
 * carries its own house, which is the fact the rules key on.
 */
export interface CustomerChart {
  /**
   * How complete the birth data was. **Read this before rendering anything
   * angular.** Below `Full` there is no Ascendant, no houses and no chart ruler,
   * and the screen has to say why rather than render blanks — a blank house tells
   * a person their chart has empty houses.
   */
  dataTier: BirthDataTier;
  birthTimeKnown: boolean;
  planets: readonly CustomerPlanet[];
  /** Empty when the birth time is unknown. Absent, never defaulted. */
  angles: readonly CustomerAngle[];
  distribution: CustomerDistribution;
  /** Null when the birth time is unknown. No Ascendant, no ruler, no substitution. */
  ruler: CustomerChartRuler | null;
}

/**
 * A reading as the customer sees it: the reasoning, without the books.
 */
export interface CustomerSessionResult {
  rulePackVersion: string;
  traditionKeys: readonly string[];
  tier: BirthDataTier;
  /** The chart it was computed from (D17). Owner responses only. */
  chart: CustomerChart;
  recommendations: readonly CustomerRecommendation[];
  cautions: readonly CustomerRecommendation[];
  unavailable: readonly CustomerUnavailableGroup[];
  calendarReading: CustomerCalendarReading | null;
}

/** POST /api/gemstones/sessions → 200. */
export interface CreatedSessionResponse {
  publicId: string;
  /** Lets an anonymous caller find its own session again. */
  anonymousSessionId: string | null;
  expiresAtUtc: string | null;
  result: CustomerSessionResult;
}

/** GET /api/gemstones/sessions/{publicId} → 200. Owner view: includes the birth input. */
export interface SessionResponse {
  publicId: string;
  shareToken: string | null;
  createdAtUtc: string;
  expiresAtUtc: string | null;
  isOwnedByUser: boolean;
  birthInput: BirthInput;
  result: CustomerSessionResult;
}

/** PUT /api/gemstones/sessions/{publicId}/share?share={bool} → 200. */
export interface ShareSessionResponse {
  publicId: string;
  shareToken: string | null;
}

/** A chart factor at sign resolution. Degrees, houses and angles are absent. */
export interface SharedFactor {
  kind: string;
  value: string;
  sign: string | null;
}

export interface SharedReason {
  reasonKey: string;
  traditionKey: string;
  factors: readonly SharedFactor[];
}

/**
 * A recommendation in the shared projection.
 *
 * Shaped differently from `CustomerRecommendation` on purpose — cautions arrive
 * as bare `cautionReasonKeys: string[]`, not as objects, and `isAvailableAsBead`
 * is absent. Modelling both with one interface would require optional fields
 * that hide which projection a value came from, so they stay separate.
 */
export interface SharedRecommendation {
  materialSlug: string;
  canonicalNameEn: string;
  /** The slug to key artwork on. See `CustomerRecommendation.representativeSlug`. */
  representativeSlug: string;
  tier: RecommendationTier;
  score: number;
  confidence: number;
  confidenceBand: ConfidenceBand;
  independentSourceCount: number;
  traditionKeys: readonly string[];
  reasons: readonly SharedReason[];
  isCautioned: boolean;
  cautionReasonKeys: readonly string[];
  disagreement: CustomerDisagreement | null;
}

export interface SharedCalendarStone {
  materialSlug: string | null;
  canonicalNameEn: string | null;
  day: number;
}

export interface SharedCalendarReading {
  traditionKey: string;
  zodiacAsStated: string;
  stones: readonly SharedCalendarStone[];
  isDataDisputed: boolean;
  disputeKey: string | null;
}

/**
 * GET /api/gemstones/shared/{shareToken} → 200.
 *
 * The birth input, the chart facts, the data tier and the unavailability list
 * are absent — not filtered, never built. This is an allow-list projection on
 * the backend and reading it as "the owner response minus a few fields" is the
 * misreading it was designed to prevent.
 */
export interface SharedSessionResponse {
  shareToken: string;
  rulePackVersion: string;
  traditionKeys: readonly string[];
  recommendations: readonly SharedRecommendation[];
  cautions: readonly SharedRecommendation[];
  calendarReading: SharedCalendarReading | null;
}

/* --------------------------------------------------------------------------
 * Catalogue — GET /api/gemstones/materials
 * ----------------------------------------------------------------------- */

/**
 * Summary only. There is no description, no colour and no properties here, and
 * there is no customer endpoint that has them — `materials/{slug}` is admin
 * gated. A stone detail panel cannot be built from this.
 */
export interface MaterialSummaryResponse {
  slug: string;
  canonicalNameEn: string;
  kind: string;
  safetyClass: SafetyClass;
  isActive: boolean;
  mineralSpecies: string | null;
  historicalNameUnresolved: boolean;
  varietyOfSlug: string | null;
  synonymGroupKey: string | null;
  claimCount: number;
}

/** StoneCraft.Application.Common.PagedResponse<T>. */
export interface PagedResponse<T> {
  items: readonly T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
}

/** Query parameters for the paged catalogue. Every one is optional. */
export interface ListMaterialsQuery {
  tradition?: string;
  planet?: string;
  element?: string;
  energy?: string;
  safetyClass?: SafetyClass;
  isActive?: boolean;
  /**
   * No bead catalogue exists yet, so `true` matches nothing and `false` matches
   * everything. That is a real answer, not an ignored parameter.
   */
  hasBeadVariants?: boolean;
  page?: number;
  pageSize?: number;
}
