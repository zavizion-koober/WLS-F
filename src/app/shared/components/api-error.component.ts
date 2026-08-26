import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { isRetryable } from '@core/api/api-failure';
import type { ApiFailure } from '@core/models/api-error';

/**
 * Renders a failure by its code.
 *
 * The whole reason this exists as a component: `STONECRAFT.ERRORS.<code>` has an
 * entry for every code the backend can raise, and the backend raises distinct
 * codes so the UI can say distinct things. `BEAD_CATALOG_EMPTY` means "nothing
 * is stocked yet", `GEOMETRY_QUANTISATION` means "try a different bead size" —
 * one is not a fault and the other is actionable. Collapsing either into
 * "something went wrong" discards the only thing that made the distinction
 * available, and it is the kind of thing that happens once and then everywhere.
 *
 * `failure.detail` is never rendered. It is the backend's English prose, written
 * for an operator reading a log, and it can quote request content.
 */
@Component({
  selector: 'sc-api-error',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-lg border border-[var(--border-medium)] bg-[var(--surface-secondary)] px-5 py-4"
      role="alert"
    >
      <p class="text-sm leading-relaxed text-[var(--text-primary)]">
        {{ messageKey() | translate }}
      </p>

      @if (failure().validationErrors; as errors) {
        <ul class="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
          @for (entry of validationMessages(); track entry) {
            <li>{{ entry }}</li>
          }
        </ul>
      }

      @if (canRetry()) {
        <button type="button" class="btn-secondary mt-4" (click)="retry.emit()">
          {{ 'STONECRAFT.STATE.RETRY' | translate }}
        </button>
      }
    </div>
  `,
})
export class ApiErrorComponent {
  public readonly failure = input.required<ApiFailure>();

  /** Suppresses the retry button on a screen that has nothing to retry. */
  public readonly retryable = input<boolean>(true);

  public readonly retry = output<void>();

  protected readonly messageKey = computed(() => `STONECRAFT.ERRORS.${this.failure().code}`);

  protected readonly canRetry = computed(() => this.retryable() && isRetryable(this.failure()));

  /**
   * FluentValidation's own messages, flattened. Shown as-is: they name the field
   * and the constraint, and a person correcting a form needs both. This is the
   * one place the backend's English reaches a customer, and it does so because
   * the alternative is a form that says "some of those details need correcting"
   * without saying which.
   */
  protected readonly validationMessages = computed(() =>
    Object.values(this.failure().validationErrors ?? {}).flatMap((messages) => [...messages]),
  );
}
