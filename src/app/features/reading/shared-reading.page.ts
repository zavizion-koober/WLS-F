import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { isRetryable } from '@core/api/api-failure';
import { isLoading, valueOf } from '@core/api/request-state';
import { ApiErrorComponent } from '@shared/components/api-error.component';
import { ScEmptyStateComponent } from '@shared/components/sc-empty-state.component';
import { ScLoadingSkeletonComponent } from '@shared/components/sc-loading-skeleton.component';

import { CalendarSectionComponent } from './calendar-section.component';
import { CautionsSectionComponent } from './recommendations/cautions-section.component';
import { RecommendationsSectionComponent } from './recommendations/recommendations-section.component';
import { ReadingStore } from './reading.store';

/**
 * A shared reading.
 *
 * <b>Server-rendered, and the only route that is.</b> A link someone sends to a
 * friend should produce a preview and should not need JavaScript to say what it
 * is — and the shared projection is an allow-list that never contains birth data,
 * so rendering it on our server discloses nothing.
 *
 * <b>It shows less than the owner's page, and not by hiding things.</b>
 * `SharedSessionResponse` is a different type: there is no chart, no data tier
 * and no unavailability list, because the backend never builds them for this
 * projection. Reusing the owner's page with `@if`s would have been the natural
 * mistake, and the reason the two are separate components is that the missing
 * sections should be missing at compile time rather than at runtime.
 */
@Component({
  selector: 'sc-shared-reading-page',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    ApiErrorComponent,
    ScEmptyStateComponent,
    ScLoadingSkeletonComponent,
    RecommendationsSectionComponent,
    CautionsSectionComponent,
    CalendarSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="atelier-container py-14 md:py-20">
      @if (busy()) {
        <div class="space-y-4" aria-busy="true">
          <sc-loading-skeleton height="42px" customClass="max-w-sm" />
          <div class="grid gap-4 pt-8 md:grid-cols-2">
            @for (i of [1, 2, 3, 4]; track i) {
              <sc-loading-skeleton height="160px" customClass="rounded-lg" />
            }
          </div>
        </div>
      } @else if (failure(); as f) {
        <div class="max-w-xl">
          <sc-api-error [failure]="f" [retryable]="canRetry()" (retry)="load()" />
          <div class="mt-6">
            <sc-empty-state
              [title]="'STONECRAFT.SHARED.GONE_TITLE' | translate"
              [description]="'STONECRAFT.SHARED.GONE' | translate"
              [actionLabel]="'STONECRAFT.STATE.BACK_TO_READING' | translate"
              actionLink="/reading"
            />
          </div>
        </div>
      } @else if (reading(); as shared) {
        <header>
          <p class="text-eyebrow text-[var(--gold-muted)]">
            {{ 'STONECRAFT.SHARED.EYEBROW' | translate }}
          </p>
          <h1 class="font-display text-page-title mt-3 text-[var(--brand-green)]">
            {{ 'STONECRAFT.SHARED.TITLE' | translate }}
          </h1>
          <p class="mt-4 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
            {{ 'STONECRAFT.SHARED.LEAD' | translate }}
          </p>
          <div class="gold-rule mt-8"></div>
        </header>

        <sc-recommendations-section [recommendations]="shared.recommendations" />

        <sc-cautions-section [cautions]="shared.cautions" />

        @if (shared.calendarReading; as calendar) {
          <sc-calendar-section [reading]="calendar" />
        }

        <div class="mt-16 border-t border-[var(--border-subtle)] pt-8">
          <p class="text-sm leading-relaxed text-[var(--text-secondary)]">
            {{ 'STONECRAFT.SHARED.CTA' | translate }}
          </p>
          <a routerLink="/reading" class="btn-primary mt-4">
            {{ 'STONECRAFT.STATE.BACK_TO_READING' | translate }}
          </a>
        </div>
      }
    </main>
  `,
})
export class SharedReadingPage {
  public readonly shareToken = input.required<string>();

  private readonly store = inject(ReadingStore);

  protected readonly busy = computed(() => isLoading(this.store.shared()));

  protected readonly reading = computed(() => valueOf(this.store.shared()));

  protected readonly failure = computed(() => {
    const state = this.store.shared();
    return state.status === 'error' ? state.failure : null;
  });

  protected readonly canRetry = computed(() => {
    const f = this.failure();
    return f !== null && isRetryable(f);
  });

  constructor() {
    effect(() => this.load());
  }

  protected load(): void {
    this.store.loadShared(this.shareToken());
  }
}
