import type {
  CustomerChart,
  CustomerRecommendation,
  CustomerSessionResult,
  SharedRecommendation,
} from '@core/models/gemstones.models';

/**
 * Response fixtures shaped exactly like the wire.
 *
 * Kept out of the spec files because several of them need the same shapes, and
 * because a fixture that drifts from the contract is worse than no fixture — the
 * tests keep passing while the app breaks. These mirror the DTOs in
 * `core/models/gemstones.models.ts`, which mirror the C# records.
 */

export const chart = (over: Partial<CustomerChart> = {}): CustomerChart => ({
  dataTier: 'Full',
  birthTimeKnown: true,
  planets: [
    {
      body: 'Sun',
      sign: 'Taurus',
      degree: 24.3,
      house: 10,
      isRetrograde: false,
      dignity: 'Neutral',
      dignityState: 'Stated',
      isChartRuler: false,
      prominence: 1,
    },
    {
      body: 'Venus',
      sign: 'Taurus',
      degree: 3.1,
      house: 9,
      isRetrograde: true,
      dignity: 'Own',
      dignityState: 'Stated',
      isChartRuler: true,
      prominence: 0.8,
    },
    {
      body: 'Mercury',
      sign: 'Gemini',
      degree: 11.9,
      house: 11,
      isRetrograde: false,
      dignity: 'Own',
      dignityState: 'StatedButHedged',
      isChartRuler: false,
      prominence: 0.6,
    },
    {
      body: 'Mars',
      sign: 'Cancer',
      degree: 2.5,
      house: 12,
      isRetrograde: false,
      // The source contradicts itself. Not a synonym for Neutral, and no
      // dignity-conditioned rule fired on it.
      dignity: 'Unknown',
      dignityState: 'StatedInconsistent',
      isChartRuler: false,
      prominence: 0.5,
    },
  ],
  angles: [
    { name: 'Ascendant', sign: 'Libra', degree: 17.2 },
    { name: 'Midheaven', sign: 'Cancer', degree: 21.8 },
  ],
  distribution: {
    elements: { fire: 2, earth: 3, air: 3, water: 2 },
    modalities: { cardinal: 4, fixed: 3, mutable: 3 },
    energy: { projective: 5, receptive: 5, dominant: null },
  },
  ruler: {
    body: 'Venus',
    rulesSign: 'Libra',
    reasonKey: 'chart.ruler.rulesAscendant',
    rulershipScheme: 'HickeyPrimary',
  },
  ...over,
});

/** The same chart as it arrives when the birth time is unknown. */
export const degradedChart = (): CustomerChart =>
  chart({
    dataTier: 'Located',
    birthTimeKnown: false,
    angles: [],
    ruler: null,
    planets: chart().planets.map((p) => ({ ...p, house: null, isChartRuler: false })),
  });

export const recommendation = (
  over: Partial<CustomerRecommendation> = {},
): CustomerRecommendation => ({
  materialSlug: 'emerald',
  canonicalNameEn: 'Emerald',
  representativeSlug: 'emerald',
  tier: 'Primary',
  score: 1.5,
  confidence: 0.62,
  confidenceBand: 'Qualified',
  independentSourceCount: 2,
  traditionKeys: ['western-magical'],
  reasons: [
    {
      reasonKey: 'reason.sign.taurus.sun',
      traditionKey: 'western-magical',
      factors: [
        {
          kind: 'Planet',
          value: 'Sun',
          sign: 'Taurus',
          house: 10,
          dignity: 'Neutral',
          prominence: 1,
        },
      ],
    },
  ],
  isCautioned: false,
  cautions: [],
  disagreement: null,
  isAvailableAsBead: false,
  ...over,
});

/** The shared projection's differently-shaped recommendation. */
export const sharedRecommendation = (
  over: Partial<SharedRecommendation> = {},
): SharedRecommendation => ({
  materialSlug: 'emerald',
  canonicalNameEn: 'Emerald',
  representativeSlug: 'emerald',
  tier: 'Primary',
  score: 1.5,
  confidence: 0.62,
  confidenceBand: 'Qualified',
  independentSourceCount: 2,
  traditionKeys: ['western-magical'],
  reasons: [
    {
      reasonKey: 'reason.sign.taurus.sun',
      traditionKey: 'western-magical',
      factors: [{ kind: 'Planet', value: 'Sun', sign: 'Taurus' }],
    },
  ],
  isCautioned: false,
  // Bare strings here, objects on the owner projection. The difference is the point.
  cautionReasonKeys: [],
  disagreement: null,
  ...over,
});

export const result = (over: Partial<CustomerSessionResult> = {}): CustomerSessionResult => ({
  rulePackVersion: 'v1',
  traditionKeys: ['western-magical'],
  tier: 'Full',
  chart: chart(),
  recommendations: [
    recommendation(),
    recommendation({ materialSlug: 'jade', canonicalNameEn: 'Jade', tier: 'Primary' }),
    recommendation({ materialSlug: 'agate', canonicalNameEn: 'Agate', tier: 'Secondary' }),
    recommendation({ materialSlug: 'onyx', canonicalNameEn: 'Onyx', tier: 'Supportive' }),
  ],
  cautions: [],
  unavailable: [],
  calendarReading: null,
  ...over,
});
