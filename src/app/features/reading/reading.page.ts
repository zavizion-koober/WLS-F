import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { isRetryable } from '@core/api/api-failure';
import { ApiErrorComponent } from '@shared/components/api-error.component';
import { ScEmptyStateComponent } from '@shared/components/sc-empty-state.component';
import { ScLoadingSkeletonComponent } from '@shared/components/sc-loading-skeleton.component';
import { ScStepWizardComponent } from '@shared/components/sc-step-wizard.component';

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
    RouterLink,
    TranslatePipe,
    ApiErrorComponent,
    ScEmptyStateComponent,
    ScLoadingSkeletonComponent,
    ScStepWizardComponent,
    ChartSectionComponent,
    RecommendationsSectionComponent,
    CautionsSectionComponent,
    CalendarSectionComponent,
    UnavailableSectionComponent,
    SharePanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="atelier-container py-10 md:py-16 pb-24">
      <sc-step-wizard [currentStep]="2" [publicId]="publicId()" />

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
          <div class="gold-rule mt-6"></div>
        </header>

        <!-- Quick Action: Proceed directly to bracelet craft -->
        <div
          class="mt-8 p-5 sm:p-6 rounded-xl bg-gradient-to-r from-[#0D2B1D] via-[#10523C] to-[#0A1A12] text-[#FCFBF9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-[#8A7029]/30 shadow-md"
        >
          <div class="space-y-1">
            <span class="text-[10px] uppercase tracking-widest text-[#CBB26A] font-semibold flex items-center gap-1">
              <span>✦</span>
              <span>{{ 'STONECRAFT.READING.READY_TITLE' | translate }}</span>
            </span>
            <h2 class="font-display text-base sm:text-lg font-bold text-[#FCFBF9]">
              {{ 'STONECRAFT.READING.READY_HEADING' | translate }}
            </h2>
            <p class="text-xs text-[#F4F1EA]/80 max-w-xl leading-relaxed font-light">
              {{ 'STONECRAFT.READING.READY_DESC' | translate }}
            </p>
          </div>
          <a
            [routerLink]="['/designer', publicId()]"
            class="btn-gold-accent text-xs px-6 py-3 uppercase tracking-wider font-semibold whitespace-nowrap shadow-sm cursor-pointer w-full sm:w-auto text-center shrink-0"
          >
            {{ 'STONECRAFT.READING.DESIGN_CTA' | translate }} →
          </a>
        </div>

        <sc-chart-section [chart]="reading.chart" />

        <sc-recommendations-section
          [recommendations]="reading.recommendations"
          [designPublicId]="publicId()"
        />

        <sc-cautions-section [cautions]="reading.cautions" />

        @if (reading.calendarReading; as calendar) {
          <sc-calendar-section [reading]="calendar" />
        }

        <sc-unavailable-section [groups]="reading.unavailable" />

        <sc-share-panel [publicId]="publicId()" />

        <!-- Mobile Sticky CTA to Designer -->
        <div
          class="fixed bottom-0 inset-x-0 bg-[#0D2B1D]/95 backdrop-blur-md p-3.5 border-t border-[#8A7029]/40 z-30 lg:hidden shadow-2xl flex items-center justify-between gap-3"
        >
          <div class="truncate">
            <span class="text-[10px] uppercase tracking-wider text-[#CBB26A] font-semibold block truncate">
              {{ 'STONECRAFT.READING.READY_TITLE' | translate }}
            </span>
            <span class="text-xs text-[#FCFBF9] font-medium truncate block">
              {{ 'STONECRAFT.STEPS.BRACELET' | translate }}
            </span>
          </div>
          <a
            [routerLink]="['/designer', publicId()]"
            class="btn-gold-accent text-xs px-4 py-2 uppercase tracking-wider font-semibold whitespace-nowrap shrink-0 shadow-sm"
          >
            {{ 'STONECRAFT.READING.DESIGN_CTA' | translate }} →
          </a>
        </div>
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
