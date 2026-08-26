import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { CustomerRecommendation } from '@core/models/gemstones.models';
import { cautionReasonKeys } from '@features/reading/tier-grouping';

/**
 * One deliberate acknowledgement before a cautioned stone goes on a bracelet.
 *
 * <b>Cautioned-but-recommended stones are in the palette</b> (D21). The corpus
 * both recommends and warns about them, and excluding them would be the frontend
 * overruling the corpus — the caution is counsel sitting beside a recommendation,
 * not a veto.
 *
 * So the warning is shown in full, in the words the tradition used, and the
 * person says yes to it. Not a confirm dialog for its own sake: the click is the
 * record that the warning was in front of them.
 *
 * <b>There is no path through this UI that puts a cautioned stone on a strand
 * without its warning visible.</b> If one is found, that is a bug of the first
 * rank.
 */
@Component({
  selector: 'sc-caution-gate',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-lg border border-[var(--gold)] bg-[var(--surface-secondary)] px-5 py-4"
      role="alertdialog"
      aria-modal="false"
      [attr.aria-label]="'STONECRAFT.READING.CAUTION_TITLE' | translate"
      data-testid="caution-gate"
    >
      <p class="text-eyebrow text-[var(--gold-muted)]">
        {{ 'STONECRAFT.READING.CAUTION_TITLE' | translate }}
      </p>

      <p class="font-display mt-2 text-lg text-[var(--text-primary)]">
        {{ stone().canonicalNameEn }}
      </p>

      <ul class="mt-3 space-y-2">
        @for (key of keys(); track key) {
          <li class="text-sm leading-relaxed text-[var(--text-secondary)]">
            {{ 'STONECRAFT.REASONS.' + key + '.long' | translate }}
          </li>
        }
      </ul>

      <div class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="btn-primary" (click)="acknowledged.emit()">
          {{ 'STONECRAFT.DESIGNER.CAUTION_ACCEPT' | translate }}
        </button>
        <button type="button" class="btn-secondary" (click)="dismissed.emit()">
          {{ 'STONECRAFT.DESIGNER.CAUTION_DECLINE' | translate }}
        </button>
      </div>
    </div>
  `,
})
export class CautionGateComponent {
  public readonly stone = input.required<CustomerRecommendation>();

  public readonly acknowledged = output<void>();
  public readonly dismissed = output<void>();

  protected readonly keys = computed(() => cautionReasonKeys(this.stone()));
}
