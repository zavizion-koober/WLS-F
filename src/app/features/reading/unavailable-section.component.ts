import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { shownToAPerson } from './tier-grouping';
import type { CustomerUnavailableGroup } from '@core/models/gemstones.models';

/**
 * What the reading could not tell you.
 *
 * <b>This is the honesty mechanism and it is not optional.</b> A reading that
 * silently omits a fifth of its rules looks identical to a complete one — the
 * person sees a confident list and has no way to know that twenty-two
 * associations needed a birth time they did not give. The backend goes to the
 * trouble of counting and grouping them for exactly this, and a screen that drops
 * the section undoes that on purpose.
 */
@Component({
  selector: 'sc-unavailable-section',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shown().length > 0) {
      <section class="mt-14" aria-labelledby="unavailable-heading">
        <h2 id="unavailable-heading" class="font-display text-card-title text-[var(--brand-green)]">
          {{ 'STONECRAFT.READING.UNAVAILABLE_TITLE' | translate }}
        </h2>

        <ul class="mt-4 space-y-2">
          @for (group of shown(); track group.reason) {
            <li class="text-sm leading-relaxed text-[var(--text-secondary)]">
              {{
                'STONECRAFT.UNAVAILABLE.' + group.reason.toUpperCase()
                  | translate: { count: group.count }
              }}
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class UnavailableSectionComponent {
  public readonly groups = input.required<readonly CustomerUnavailableGroup[]>();

  /**
   * The groups worth putting in front of a person.
   *
   * `MaterialWithdrawn` is dropped — see `shownToAPerson`. It says a rule sleeps
   * because the shop no longer sells the stone it warns about, which is true,
   * permanent and identical on every reading. This section is for what could not
   * be said about *this chart*.
   */
  protected readonly shown = computed(() => shownToAPerson(this.groups()));
}
