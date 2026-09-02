import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { CustomerCalendarReading, SharedCalendarReading } from '@core/models/gemstones.models';
import { beadImage } from '@features/designer/strand/bead-image';

/**
 * The calendar stone.
 *
 * Two things this has to get right, both of them about honesty rather than layout.
 *
 * <b>A disputed date returns the union of both days.</b> The stones carry a `day`
 * precisely so the reader can tell which reading each belongs to; dropping it and
 * showing six stones in a row would present a disagreement as a longer list.
 *
 * <b>A null `materialSlug` means the calendar names a stone the catalogue cannot
 * resolve.</b>
 */
@Component({
  selector: 'sc-calendar-section',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mt-14" aria-labelledby="calendar-heading">
      <h2 id="calendar-heading" class="font-display text-section-title text-[var(--brand-green)]">
        {{ 'STONECRAFT.READING.CALENDAR_TITLE' | translate }}
      </h2>

      @if (reading().isDataDisputed) {
        <p
          class="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-5 py-4 text-sm leading-relaxed text-[var(--text-secondary)]"
          data-testid="calendar-dispute"
        >
          @if (reading().disputeKey; as key) {
            {{ 'STONECRAFT.REASONS.' + key + '.long' | translate }}
          } @else {
            {{ 'STONECRAFT.READING.CALENDAR_DISPUTED' | translate }}
          }
        </p>
      }

      @for (group of byDay(); track group.day) {
        <div class="mt-6">
          @if (byDay().length > 1) {
            <p class="text-eyebrow text-[var(--text-muted)]">
              {{ 'STONECRAFT.READING.CALENDAR_DAY' | translate: { day: group.day } }}
            </p>
          }

          <ul class="mt-3 flex flex-wrap gap-3">
            @for (stone of group.stones; track $index) {
              <li
                class="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 py-2.5 text-sm shadow-2xs hover:border-[#CBB26A]/60 transition-colors"
              >
                @if (stone.materialSlug && stoneImage(stone.materialSlug); as href) {
                  <div class="w-8 h-8 rounded-lg bg-[#F5F2EB] p-0.5 border border-[#E2DDD2] flex items-center justify-center shrink-0">
                    <img [src]="href" [alt]="stone.canonicalNameEn || ''" class="w-full h-full object-contain filter drop-shadow-xs" />
                  </div>
                }
                @if (stone.canonicalNameEn) {
                  <span class="text-[var(--text-primary)] font-medium">{{ stone.canonicalNameEn }}</span>
                } @else {
                  <span class="text-[var(--text-muted)]">
                    {{ 'STONECRAFT.READING.CALENDAR_UNRESOLVED' | translate }}
                  </span>
                }
              </li>
            }
          </ul>
        </div>
      }

      <p class="mt-4 text-xs text-[var(--text-muted)]">
        {{ 'STONECRAFT.TRADITION.' + reading().traditionKey | translate }}
      </p>
    </section>
  `,
})
export class CalendarSectionComponent {
  public readonly reading = input.required<CustomerCalendarReading | SharedCalendarReading>();

  protected stoneImage(slug: string): string | null {
    return beadImage(slug);
  }

  /**
   * Groups by calendar day, in the order the days first appear.
   *
   * One group on an ordinary date, two on a disputed one.
   */
  protected readonly byDay = computed(() => {
    const groups = new Map<number, { day: number; stones: { materialSlug: string | null; canonicalNameEn: string | null }[] }>();

    for (const stone of this.reading().stones) {
      const existing = groups.get(stone.day);
      if (existing) {
        existing.stones.push(stone);
      } else {
        groups.set(stone.day, { day: stone.day, stones: [stone] });
      }
    }

    return [...groups.values()];
  });
}
