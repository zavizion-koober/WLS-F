import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { isRetryable } from '@core/api/api-failure';
import { ApiErrorComponent } from '@shared/components/api-error.component';
import { ScEmptyStateComponent } from '@shared/components/sc-empty-state.component';
import { ScLoadingSkeletonComponent } from '@shared/components/sc-loading-skeleton.component';

import { CalendarSectionComponent } from './calendar-section.component';
import { ChartSectionComponent } from './chart/chart-section.component';
import { CautionsSectionComponent } from './recommendations/cautions-section.component';
import { RecommendationsSectionComponent } from './recommendations/recommendations-section.component';
import { ReadingStore } from './reading.store';
import { SharePanelComponent } from './share-panel.component';
import { UnavailableSectionComponent } from './unavailable-section.component';

/**
 * A reading, as its owner sees it.
 *
 * Client-rendered: the owner response contains the birth input, and
 * server-rendering this route would pull that payload through our node server on
 * every view for no gain.
 *
 * <b>Every state is here because none of them is unusual.</b> An expired session
 * is the normal fate of an anonymous reading; a network failure is the normal
 * fate of a phone in a lift. The interesting decision is which of them offer a
 * retry — a 404 on a session will 404 identically forever, and a retry button
 * that cannot work is a worse answer than no button.
 */
@Component({
  selector: 'sc-reading-page',
  standalone: true,
  imports: [
    TranslatePipe,
    ApiErrorComponent,
    ScEmptyStateComponent,
    ScLoadingSkeletonComponent,
    ChartSectionComponent,
    RecommendationsSectionComponent,
    CautionsSectionComponent,
    CalendarSectionComponent,
    UnavailableSectionComponent,
    SharePanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="atelier-container py-14 md:py-20">
      @if (store.isLoading()) {
        <div class="space-y-4" data-testid="reading-loading" aria-busy="true">
          <sc-loading-skeleton height="42px" customClass="max-w-sm" />
          <sc-loading-skeleton height="18px" customClass="max-w-md" />
          <div class="grid gap-4 pt-8 md:grid-cols-2">
            @for (i of [1, 2, 3, 4]; track i) {
              <sc-loading-skeleton height="160px" customClass="rounded-lg" />
            }
          </div>
        </div>
      } @else if (failure(); as f) {
        <div class="max-w-xl" data-testid="reading-error">
          <h1 class="font-display text-page-title text-[var(--brand-green)]">
            {{ 'STONECRAFT.READING.TITLE' | translate }}
          </h1>
          <div class="mt-6">
            <sc-api-error [failure]="f" [retryable]="canRetry()" (retry)="retry()" />
          </div>
          @if (isGone()) {
            <!--
              404 covers not-found, not-yours and expired, deliberately
              indistinguishable so a response cannot confirm an id is real. So the
              only honest thing to offer is a new reading.
            -->
            <div class="mt-6">
              <sc-empty-state
                [title]="'STONECRAFT.READING.GONE_TITLE' | translate"
                [description]="'STONECRAFT.READING.GONE' | translate"
                [actionLabel]="'STONECRAFT.STATE.BACK_TO_READING' | translate"
                actionLink="/reading"
              />
            </div>
          }
        </div>
      } @else if (result(); as reading) {
        <header>
          <p class="text-eyebrow text-[var(--gold-muted)]">
            {{ 'STONECRAFT.NAV.READING' | translate }}
          </p>
          <h1 class="font-display text-page-title mt-3 text-[var(--brand-green)]">
            {{ 'STONECRAFT.READING.TITLE' | translate }}
          </h1>
          <p class="mt-3 text-xs text-[var(--text-muted)]">
            {{ 'STONECRAFT.READING.RULEPACK' | translate: { version: reading.rulePackVersion } }}
          </p>
          <div class="gold-rule mt-8"></div>
        </header>

        <sc-chart-section [chart]="reading.chart" />

        <sc-recommendations-section [recommendations]="reading.recommendations" />

        <sc-cautions-section [cautions]="reading.cautions" />

        @if (reading.calendarReading; as calendar) {
          <sc-calendar-section [reading]="calendar" />
        }

        <sc-unavailable-section [groups]="reading.unavailable" />

        <sc-share-panel [publicId]="publicId()" />
      }
    </main>
  `,
})
export class ReadingPage {
  /**
   * Bound from the route. Opaque, and the only reading identifier that ever
   * appears in a URL.
   */
  public readonly publicId = input.required<string>();

  protected readonly store = inject(ReadingStore);

  protected readonly result = this.store.result;
  protected readonly failure = this.store.failure;

  protected readonly canRetry = computed(() => {
    const f = this.failure();
    return f !== null && isRetryable(f);
  });

  /** Not-found, not-yours or expired — one answer for all three, by design. */
  protected readonly isGone = computed(() => {
    const code = this.failure()?.code;
    return code === 'GEM_SESSION_NOT_FOUND' || code === 'SESSION_NOT_FOUND';
  });

  constructor() {
    effect(() => this.store.loadSession(this.publicId()));
  }

  protected retry(): void {
    if (!this.store.retryCreate()) {
      this.store.loadSession(this.publicId());
    }
  }
}
