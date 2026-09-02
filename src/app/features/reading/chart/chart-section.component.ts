import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import type { CustomerChart, CustomerPlanet } from '@core/models/gemstones.models';

/**
 * Personal astrological profile and natal chart breakdown.
 *
 * Prioritizes the core trinity (Sun, Moon, Rising) and elemental balance on the first
 * screen, alongside the complete ephemeris table and aspects with refined hierarchy.
 */
@Component({
  selector: 'sc-chart-section',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mt-10" aria-labelledby="chart-heading">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#E2DDD2]">
        <div>
          <span class="text-eyebrow text-[#8A7029]">
            {{ 'STONECRAFT.CHART.PROFILE_EYEBROW' | translate }}
          </span>
          <h2 id="chart-heading" class="font-display text-section-title text-[#10523C] mt-1">
            {{ 'STONECRAFT.CHART.TITLE' | translate }}
          </h2>
        </div>

        <div>
          <a
            href="#recommendations-heading"
            class="btn-primary text-xs py-2.5 px-4 cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>{{ 'STONECRAFT.CHART.VIEW_STONES_CTA' | translate }}</span>
            <span>↓</span>
          </a>
        </div>
      </div>

      <!-- Core Astrological Trinity: Sun, Moon, Rising & Elements -->
      <div class="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Sun Sign -->
        <div class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-5 shadow-2xs space-y-2 relative overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase tracking-widest text-[#8A7029] font-semibold">
              ☉ {{ 'STONECRAFT.CHART.SUN_TITLE' | translate }}
            </span>
            @if (sunPlanet(); as sun) {
              <span class="text-xs text-[#8D8A81]">{{ sun.degree | number: '1.0-1' }}°</span>
            }
          </div>
          @if (sunPlanet(); as sun) {
            <h3 class="font-display text-xl font-bold text-[#1A1A1D]">
              {{ 'STONECRAFT.CHART.SIGN.' + sun.sign.toUpperCase() | translate }}
            </h3>
            <p class="text-xs text-[#5F5D56] leading-relaxed">
              {{ 'STONECRAFT.CHART.SUN_DESC' | translate }}
            </p>
          }
        </div>

        <!-- Moon Sign -->
        <div class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-5 shadow-2xs space-y-2 relative overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase tracking-widest text-[#8A7029] font-semibold">
              ☽ {{ 'STONECRAFT.CHART.MOON_TITLE' | translate }}
            </span>
            @if (moonPlanet(); as moon) {
              <span class="text-xs text-[#8D8A81]">{{ moon.degree | number: '1.0-1' }}°</span>
            }
          </div>
          @if (moonPlanet(); as moon) {
            <h3 class="font-display text-xl font-bold text-[#1A1A1D]">
              {{ 'STONECRAFT.CHART.SIGN.' + moon.sign.toUpperCase() | translate }}
            </h3>
            <p class="text-xs text-[#5F5D56] leading-relaxed">
              {{ 'STONECRAFT.CHART.MOON_DESC' | translate }}
            </p>
          }
        </div>

        <!-- Rising / Ascendant -->
        <div class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-5 shadow-2xs space-y-2 relative overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase tracking-widest text-[#8A7029] font-semibold">
              ↑ {{ 'STONECRAFT.CHART.RISING_TITLE' | translate }}
            </span>
            @if (ascendant(); as asc) {
              <span class="text-xs text-[#8D8A81]">{{ asc.degree | number: '1.0-1' }}°</span>
            }
          </div>
          @if (ascendant(); as asc) {
            <h3 class="font-display text-xl font-bold text-[#1A1A1D]">
              {{ 'STONECRAFT.CHART.SIGN.' + asc.sign.toUpperCase() | translate }}
            </h3>
            <p class="text-xs text-[#5F5D56] leading-relaxed">
              {{ 'STONECRAFT.CHART.RISING_DESC' | translate }}
            </p>
          } @else {
            <h3 class="font-display text-base font-semibold text-[#8D8A81] italic">
              {{ 'STONECRAFT.CHART.TIME_UNKNOWN_SHORT' | translate }}
            </h3>
            <p class="text-xs text-[#8D8A81] leading-relaxed">
              {{ 'STONECRAFT.CHART.RISING_TIME_NEEDED' | translate }}
            </p>
          }
        </div>

        <!-- Element Balance -->
        <div class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-5 shadow-2xs space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase tracking-widest text-[#8A7029] font-semibold">
              ✦ {{ 'STONECRAFT.CHART.ELEMENTS' | translate }}
            </span>
            <span class="text-[11px] font-semibold text-[#10523C]">{{ dominantElement() }}</span>
          </div>

          <div class="space-y-1.5 text-xs">
            @for (row of elementRows(); track row.key) {
              <div class="flex items-center justify-between gap-2">
                <span class="text-[#5F5D56] text-[11px]">{{ 'STONECRAFT.CHART.ELEMENT.' + row.key | translate }}:</span>
                <div class="flex-1 max-w-[80px] bg-[#E2DDD2]/60 h-1.5 rounded-full overflow-hidden">
                  <div
                    class="bg-[#10523C] h-full rounded-full"
                    [style.width.%]="(row.count / totalElements()) * 100"
                  ></div>
                </div>
                <span class="font-medium text-[#1A1A1D] tabular-nums text-[11px]">{{ row.count }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      @if (!chart().birthTimeKnown) {
        <p
          class="mt-6 rounded-xl border border-[#E2DDD2] bg-[#F4F1EA]/60 px-5 py-4 text-xs leading-relaxed text-[#5F5D56]"
          data-testid="degraded-notice"
        >
          {{ 'STONECRAFT.CHART.NO_BIRTH_TIME' | translate }}
        </p>
      }

      <!-- Detailed Natal Chart & Ephemeris Table -->
      <div class="mt-8 p-6 sm:p-8 bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl space-y-8">
        <!-- Angles -->
        @if (chart().angles.length > 0) {
          <div class="flex flex-wrap gap-x-10 gap-y-4">
            @for (angle of chart().angles; track angle.name) {
              <div>
                <p class="text-eyebrow text-[#8D8A81]">
                  {{ 'STONECRAFT.CHART.ANGLE.' + angle.name.toUpperCase() | translate }}
                </p>
                <p class="font-display mt-1 text-base font-semibold text-[#1A1A1D]">
                  {{ 'STONECRAFT.CHART.SIGN.' + angle.sign.toUpperCase() | translate }}
                  <span class="text-[#8D8A81] text-xs font-normal">{{ angle.degree | number: '1.0-1' }}°</span>
                </p>
              </div>
            }
          </div>
        }

        <!-- Bodies Table -->
        <div class="overflow-x-auto">
          <table class="w-full min-w-[34rem] border-collapse text-sm">
            <caption class="sr-only">
              {{ 'STONECRAFT.CHART.TABLE_CAPTION' | translate }}
            </caption>
            <thead>
              <tr class="border-b border-[#E2DDD2] text-left">
                <th scope="col" class="text-eyebrow py-2 pr-4 text-[#8D8A81]">
                  {{ 'STONECRAFT.CHART.COL.BODY' | translate }}
                </th>
                <th scope="col" class="text-eyebrow py-2 pr-4 text-[#8D8A81]">
                  {{ 'STONECRAFT.CHART.COL.SIGN' | translate }}
                </th>
                @if (chart().birthTimeKnown) {
                  <th scope="col" class="text-eyebrow py-2 pr-4 text-[#8D8A81]">
                    {{ 'STONECRAFT.CHART.COL.HOUSE' | translate }}
                  </th>
                }
                <th scope="col" class="text-eyebrow py-2 text-[#8D8A81]">
                  {{ 'STONECRAFT.CHART.COL.NOTES' | translate }}
                </th>
              </tr>
            </thead>
            <tbody>
              @for (planet of chart().planets; track planet.body) {
                <tr class="border-b border-[#E2DDD2]/60">
                  <th
                    scope="row"
                    class="py-2.5 pr-4 text-left font-medium text-[#1A1A1D]"
                  >
                    {{ 'STONECRAFT.CHART.BODY.' + planet.body.toUpperCase() | translate }}
                  </th>
                  <td class="py-2.5 pr-4 text-[#1A1A1D]">
                    {{ 'STONECRAFT.CHART.SIGN.' + planet.sign.toUpperCase() | translate }}
                    <span class="text-[#8D8A81] text-xs">
                      {{ planet.degree | number: '1.0-1' }}°
                    </span>
                  </td>
                  @if (chart().birthTimeKnown) {
                    <td class="py-2.5 pr-4 text-[#5F5D56]">
                      @if (planet.house !== null) {
                        {{ planet.house }}
                      } @else {
                        <span class="text-[#8D8A81]">—</span>
                      }
                    </td>
                  }
                  <td class="py-2.5">
                    <span class="flex flex-wrap gap-1.5">
                      @if (planet.isRetrograde) {
                        <span
                          class="rounded-[3px] border border-[#E2DDD2] px-1.5 py-0.5 text-xs text-[#5F5D56]"
                        >
                          {{ 'STONECRAFT.CHART.RETROGRADE' | translate }}
                        </span>
                      }
                      @if (dignityOf(planet); as dignity) {
                        <span
                          class="rounded-[3px] border border-[#CBB26A] px-1.5 py-0.5 text-xs text-[#8A7029]"
                          [title]="'STONECRAFT.CHART.DIGNITY_STATE.' + planet.dignityState | translate"
                        >
                          {{ 'STONECRAFT.CHART.DIGNITY.' + dignity | translate }}
                          @if (planet.dignityState !== 'Stated') {
                            <span aria-hidden="true">*</span>
                          }
                        </span>
                      }
                      @if (planet.isChartRuler) {
                        <span
                          class="rounded-[3px] bg-[#10523C] px-1.5 py-0.5 text-xs text-[#FCFBF9]"
                        >
                          {{ 'STONECRAFT.CHART.CHART_RULER' | translate }}
                        </span>
                      }
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (hasHedgedDignity()) {
          <p class="mt-3 text-xs leading-relaxed text-[#8D8A81]">
            {{ 'STONECRAFT.CHART.DIGNITY_HEDGED_NOTE' | translate }}
          </p>
        }

        <!-- Chart Ruler Block -->
        @if (chart().ruler; as ruler) {
          <div
            class="mt-6 rounded-xl border border-[#E2DDD2] bg-[#F4F1EA]/50 px-5 py-4"
            data-testid="chart-ruler"
          >
            <p class="text-eyebrow text-[#8A7029]">
              {{ 'STONECRAFT.CHART.RULER_TITLE' | translate }}
            </p>
            <p class="font-display mt-1 text-base font-bold text-[#1A1A1D]">
              {{ 'STONECRAFT.CHART.BODY.' + ruler.body.toUpperCase() | translate }}
            </p>
            <p class="mt-1 text-xs leading-relaxed text-[#5F5D56]">
              {{
                'STONECRAFT.CHART.KEYS.' + ruler.reasonKey
                  | translate
                    : {
                        body: 'STONECRAFT.CHART.BODY.' + ruler.body.toUpperCase() | translate,
                        sign: 'STONECRAFT.CHART.SIGN.' + ruler.rulesSign.toUpperCase() | translate,
                      }
              }}
            </p>
            <p class="mt-1 text-[11px] text-[#8D8A81]">
              {{ 'STONECRAFT.CHART.RULERSHIP_SCHEME.' + ruler.rulershipScheme | translate }}
            </p>
          </div>
        }

        <!-- Modality & Energy distribution -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#E2DDD2]">
          <div>
            <p class="text-eyebrow text-[#8D8A81]">
              {{ 'STONECRAFT.CHART.MODALITIES' | translate }}
            </p>
            <dl class="mt-2 space-y-1 text-xs">
              @for (row of modalityRows(); track row.key) {
                <div class="flex justify-between gap-4">
                  <dt class="text-[#5F5D56]">
                    {{ 'STONECRAFT.CHART.MODALITY.' + row.key | translate }}
                  </dt>
                  <dd class="tabular-nums font-semibold text-[#1A1A1D]">{{ row.count }}</dd>
                </div>
              }
            </dl>
          </div>

          <div>
            <p class="text-eyebrow text-[#8D8A81]">
              {{ 'STONECRAFT.CHART.ENERGY' | translate }}
            </p>
            <dl class="mt-2 space-y-1 text-xs">
              <div class="flex justify-between gap-4">
                <dt class="text-[#5F5D56]">
                  {{ 'STONECRAFT.CHART.ENERGY_PROJECTIVE' | translate }}
                </dt>
                <dd class="tabular-nums font-semibold text-[#1A1A1D]">
                  {{ chart().distribution.energy.projective }}
                </dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-[#5F5D56]">
                  {{ 'STONECRAFT.CHART.ENERGY_RECEPTIVE' | translate }}
                </dt>
                <dd class="tabular-nums font-semibold text-[#1A1A1D]">
                  {{ chart().distribution.energy.receptive }}
                </dd>
              </div>
            </dl>
            <p class="mt-2 text-xs leading-relaxed text-[#5F5D56]">
              @if (chart().distribution.energy.dominant; as dominant) {
                {{ 'STONECRAFT.CHART.ENERGY_DOMINANT.' + dominant.toUpperCase() | translate }}
              } @else {
                {{ 'STONECRAFT.CHART.ENERGY_BALANCED' | translate }}
              }
            </p>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class ChartSectionComponent {
  public readonly chart = input.required<CustomerChart>();

  protected readonly sunPlanet = computed(() =>
    this.chart().planets.find((p) => p.body.toLowerCase() === 'sun'),
  );

  protected readonly moonPlanet = computed(() =>
    this.chart().planets.find((p) => p.body.toLowerCase() === 'moon'),
  );

  protected readonly ascendant = computed(() =>
    this.chart().angles.find((a) => a.name.toLowerCase() === 'ascendant'),
  );

  protected readonly elementRows = computed(() => {
    const e = this.chart().distribution.elements;
    return [
      { key: 'FIRE', count: e.fire },
      { key: 'EARTH', count: e.earth },
      { key: 'AIR', count: e.air },
      { key: 'WATER', count: e.water },
    ];
  });

  protected readonly totalElements = computed(() => {
    const e = this.chart().distribution.elements;
    return Math.max(1, e.fire + e.earth + e.air + e.water);
  });

  protected readonly dominantElement = computed(() => {
    const rows = this.elementRows();
    const max = Math.max(...rows.map((r) => r.count));
    const dominant = rows.find((r) => r.count === max);
    return dominant ? dominant.key : 'BALANCED';
  });

  protected readonly modalityRows = computed(() => {
    const m = this.chart().distribution.modalities;
    return [
      { key: 'CARDINAL', count: m.cardinal },
      { key: 'FIXED', count: m.fixed },
      { key: 'MUTABLE', count: m.mutable },
    ];
  });

  protected readonly hasHedgedDignity = computed(() =>
    this.chart().planets.some((p) => this.dignityOf(p) !== null && p.dignityState !== 'Stated'),
  );

  protected dignityOf(planet: CustomerPlanet): string | null {
    return planet.dignity === 'Neutral' || planet.dignity === 'Unknown'
      ? null
      : planet.dignity.toUpperCase();
  }
}
