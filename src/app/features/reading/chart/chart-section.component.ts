import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import type { CustomerChart, CustomerPlanet } from '@core/models/gemstones.models';

/**
 * The chart the reading was computed from (D17).
 *
 * <b>The whole design problem here is degradation.</b> When the birth time is
 * unknown there is no Ascendant, no houses and no chart ruler — and the difference
 * between a good version of this screen and a bad one is entirely whether it says
 * so. A table with an empty House column tells a person their chart has empty
 * houses. A column that is simply not there, next to a sentence explaining that
 * houses need an exact birth time, tells them the truth.
 *
 * So `dataTier` and `birthTimeKnown` are read first and everything angular hangs
 * off them, rather than each cell defending itself against a null.
 */
@Component({
  selector: 'sc-chart-section',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mt-14" aria-labelledby="chart-heading">
      <h2 id="chart-heading" class="font-display text-section-title text-[var(--brand-green)]">
        {{ 'STONECRAFT.CHART.TITLE' | translate }}
      </h2>

      @if (!chart().birthTimeKnown) {
        <!--
          Said once, at the top, rather than repeated as an absence in every place
          something is missing.
        -->
        <p
          class="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-5 py-4 text-sm leading-relaxed text-[var(--text-secondary)]"
          data-testid="degraded-notice"
        >
          {{ 'STONECRAFT.CHART.NO_BIRTH_TIME' | translate }}
        </p>
      }

      <!-- Angles: present only on a timed chart -->
      @if (chart().angles.length > 0) {
        <div class="mt-8 flex flex-wrap gap-x-10 gap-y-4">
          @for (angle of chart().angles; track angle.name) {
            <div>
              <p class="text-eyebrow text-[var(--text-muted)]">
                {{ 'STONECRAFT.CHART.ANGLE.' + angle.name.toUpperCase() | translate }}
              </p>
              <p class="font-display mt-1 text-lg text-[var(--text-primary)]">
                {{ 'STONECRAFT.CHART.SIGN.' + angle.sign.toUpperCase() | translate }}
                <span class="text-[var(--text-muted)]">{{ angle.degree | number: '1.0-1' }}°</span>
              </p>
            </div>
          }
        </div>
      }

      <!-- Bodies -->
      <div class="mt-8 overflow-x-auto">
        <table class="w-full min-w-[34rem] border-collapse text-sm">
          <caption class="sr-only">
            {{
              'STONECRAFT.CHART.TABLE_CAPTION' | translate
            }}
          </caption>
          <thead>
            <tr class="border-b border-[var(--border-medium)] text-left">
              <th scope="col" class="text-eyebrow py-2 pr-4 text-[var(--text-muted)]">
                {{ 'STONECRAFT.CHART.COL.BODY' | translate }}
              </th>
              <th scope="col" class="text-eyebrow py-2 pr-4 text-[var(--text-muted)]">
                {{ 'STONECRAFT.CHART.COL.SIGN' | translate }}
              </th>
              @if (chart().birthTimeKnown) {
                <th scope="col" class="text-eyebrow py-2 pr-4 text-[var(--text-muted)]">
                  {{ 'STONECRAFT.CHART.COL.HOUSE' | translate }}
                </th>
              }
              <th scope="col" class="text-eyebrow py-2 text-[var(--text-muted)]">
                {{ 'STONECRAFT.CHART.COL.NOTES' | translate }}
              </th>
            </tr>
          </thead>
          <tbody>
            @for (planet of chart().planets; track planet.body) {
              <tr class="border-b border-[var(--border-subtle)]">
                <th
                  scope="row"
                  class="py-2.5 pr-4 text-left font-medium text-[var(--text-primary)]"
                >
                  {{ 'STONECRAFT.CHART.BODY.' + planet.body.toUpperCase() | translate }}
                </th>
                <td class="py-2.5 pr-4 text-[var(--text-primary)]">
                  {{ 'STONECRAFT.CHART.SIGN.' + planet.sign.toUpperCase() | translate }}
                  <span class="text-[var(--text-muted)]">
                    {{ planet.degree | number: '1.0-1' }}°
                  </span>
                </td>
                @if (chart().birthTimeKnown) {
                  <td class="py-2.5 pr-4 text-[var(--text-secondary)]">
                    @if (planet.house !== null) {
                      {{ planet.house }}
                    } @else {
                      <span class="text-[var(--text-muted)]">—</span>
                    }
                  </td>
                }
                <td class="py-2.5">
                  <span class="flex flex-wrap gap-1.5">
                    @if (planet.isRetrograde) {
                      <span
                        class="rounded-[3px] border border-[var(--border-medium)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]"
                      >
                        {{ 'STONECRAFT.CHART.RETROGRADE' | translate }}
                      </span>
                    }
                    @if (dignityOf(planet); as dignity) {
                      <span
                        class="rounded-[3px] border border-[var(--gold)] px-1.5 py-0.5 text-xs text-[var(--gold-muted)]"
                        [title]="
                          'STONECRAFT.CHART.DIGNITY_STATE.' + planet.dignityState | translate
                        "
                      >
                        {{ 'STONECRAFT.CHART.DIGNITY.' + dignity | translate }}
                        @if (planet.dignityState !== 'Stated') {
                          <span aria-hidden="true">*</span>
                        }
                      </span>
                    }
                    @if (planet.isChartRuler) {
                      <span
                        class="rounded-[3px] bg-[var(--brand-green)] px-1.5 py-0.5 text-xs text-[var(--surface-primary)]"
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
        <!--
          The asterisk means the source qualified its own claim. Explaining it is
          not pedantry: a dignity shown without its state states a hedged claim
          plainly, which is the thing hard rule 5 exists to stop.
        -->
        <p class="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
          {{ 'STONECRAFT.CHART.DIGNITY_HEDGED_NOTE' | translate }}
        </p>
      }

      <!-- Chart ruler -->
      @if (chart().ruler; as ruler) {
        <div
          class="mt-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-5 py-4"
          data-testid="chart-ruler"
        >
          <p class="text-eyebrow text-[var(--gold-muted)]">
            {{ 'STONECRAFT.CHART.RULER_TITLE' | translate }}
          </p>
          <p class="font-display mt-2 text-lg text-[var(--text-primary)]">
            {{ 'STONECRAFT.CHART.BODY.' + ruler.body.toUpperCase() | translate }}
          </p>
          <p class="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            {{
              'STONECRAFT.CHART.KEYS.' + ruler.reasonKey
                | translate
                  : {
                      body: 'STONECRAFT.CHART.BODY.' + ruler.body.toUpperCase() | translate,
                      sign: 'STONECRAFT.CHART.SIGN.' + ruler.rulesSign.toUpperCase() | translate,
                    }
            }}
          </p>
          <p class="mt-2 text-xs text-[var(--text-muted)]">
            {{ 'STONECRAFT.CHART.RULERSHIP_SCHEME.' + ruler.rulershipScheme | translate }}
          </p>
        </div>
      }

      <!-- Balance -->
      <div class="mt-8 grid gap-6 sm:grid-cols-3">
        <div>
          <p class="text-eyebrow text-[var(--text-muted)]">
            {{ 'STONECRAFT.CHART.ELEMENTS' | translate }}
          </p>
          <dl class="mt-2 space-y-1 text-sm">
            @for (row of elementRows(); track row.key) {
              <div class="flex justify-between gap-4">
                <dt class="text-[var(--text-secondary)]">
                  {{ 'STONECRAFT.CHART.ELEMENT.' + row.key | translate }}
                </dt>
                <dd class="tabular-nums text-[var(--text-primary)]">{{ row.count }}</dd>
              </div>
            }
          </dl>
        </div>

        <div>
          <p class="text-eyebrow text-[var(--text-muted)]">
            {{ 'STONECRAFT.CHART.MODALITIES' | translate }}
          </p>
          <dl class="mt-2 space-y-1 text-sm">
            @for (row of modalityRows(); track row.key) {
              <div class="flex justify-between gap-4">
                <dt class="text-[var(--text-secondary)]">
                  {{ 'STONECRAFT.CHART.MODALITY.' + row.key | translate }}
                </dt>
                <dd class="tabular-nums text-[var(--text-primary)]">{{ row.count }}</dd>
              </div>
            }
          </dl>
        </div>

        <div>
          <p class="text-eyebrow text-[var(--text-muted)]">
            {{ 'STONECRAFT.CHART.ENERGY' | translate }}
          </p>
          <dl class="mt-2 space-y-1 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-[var(--text-secondary)]">
                {{ 'STONECRAFT.CHART.ENERGY_PROJECTIVE' | translate }}
              </dt>
              <dd class="tabular-nums text-[var(--text-primary)]">
                {{ chart().distribution.energy.projective }}
              </dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-[var(--text-secondary)]">
                {{ 'STONECRAFT.CHART.ENERGY_RECEPTIVE' | translate }}
              </dt>
              <dd class="tabular-nums text-[var(--text-primary)]">
                {{ chart().distribution.energy.receptive }}
              </dd>
            </div>
          </dl>
          <p class="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            @if (chart().distribution.energy.dominant; as dominant) {
              {{ 'STONECRAFT.CHART.ENERGY_DOMINANT.' + dominant.toUpperCase() | translate }}
            } @else {
              <!-- A tie is not a dominance. The backend publishes null; so does this. -->
              {{ 'STONECRAFT.CHART.ENERGY_BALANCED' | translate }}
            }
          </p>
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

  protected readonly elementRows = computed(() => {
    const e = this.chart().distribution.elements;
    return [
      { key: 'FIRE', count: e.fire },
      { key: 'EARTH', count: e.earth },
      { key: 'AIR', count: e.air },
      { key: 'WATER', count: e.water },
    ];
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

  /**
   * The dignity worth showing, or null.
   *
   * `Neutral` is suppressed because it means "an ordinary placement" and a badge
   * saying so on eight of ten rows is noise. `Unknown` is suppressed for the
   * opposite and more important reason: it means the source contradicts itself
   * and **no dignity-conditioned rule fired**, so showing anything at all there
   * would imply a dignity the reading did not use.
   */
  protected dignityOf(planet: CustomerPlanet): string | null {
    return planet.dignity === 'Neutral' || planet.dignity === 'Unknown'
      ? null
      : planet.dignity.toUpperCase();
  }
}
