import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { CustomerRecommendation, SharedRecommendation } from '@core/models/gemstones.models';

import { cautionReasonKeys, requiresCautionNotice } from '../tier-grouping';

/**
 * One recommended stone.
 *
 * <b>Progressive disclosure, and the split is the backend's.</b> Each reason key
 * has a `short` and a `long`; the short sits on the card as a label with no
 * sentence-ending period, and the long — one or two sentences — is behind
 * "discover more". That is not a UI preference, it is how the copy was written,
 * and rendering the long form on the card would turn a scannable list of fifteen
 * stones into an essay.
 *
 * <b>A cautioned stone can never render without its warning.</b> The predicate
 * and the key extraction both live in `tier-grouping`, in one place, so a card
 * cannot forget — and so that the owner projection's `cautions[{reasonKey}]` and
 * the shared projection's bare `cautionReasonKeys[]` are handled once rather
 * than at every call site.
 */
@Component({
  selector: 'sc-stone-card',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-5 py-5 transition-shadow hover:shadow-[0_4px_12px_rgba(13,43,29,0.12)]"
      [attr.data-slug]="stone().materialSlug"
    >
      <header class="flex items-start justify-between gap-4">
        <h4 class="font-display text-card-title text-[var(--text-primary)]">
          {{ stone().canonicalNameEn }}
        </h4>

        @if (isCautioned()) {
          <span
            class="text-eyebrow shrink-0 rounded-[3px] border border-[var(--gold)] px-2 py-1 text-[var(--gold-muted)]"
          >
            {{ 'STONECRAFT.READING.CAUTION_BADGE' | translate }}
          </span>
        }
      </header>

      <!-- The trust signals, in the backend's own terms -->
      <p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
        <span [title]="'STONECRAFT.CONFIDENCE.NOTE' | translate">
          {{ 'STONECRAFT.CONFIDENCE.' + stone().confidenceBand.toUpperCase() | translate }}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          @if (stone().independentSourceCount > 1) {
            {{
              'STONECRAFT.READING.SOURCES_AGREE'
                | translate: { count: stone().independentSourceCount }
            }}
          } @else {
            {{ 'STONECRAFT.READING.SOURCE_SINGLE' | translate }}
          }
        </span>
      </p>

      <!-- Short reasons: one line each, no period. They are labels. -->
      <ul class="mt-4 space-y-1.5">
        @for (reason of stone().reasons; track reason.reasonKey + reason.traditionKey) {
          <li class="flex gap-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            <span
              class="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--gold)]"
              aria-hidden="true"
            ></span>
            <span>{{ 'STONECRAFT.REASONS.' + reason.reasonKey + '.short' | translate }}</span>
          </li>
        }
      </ul>

      @if (expanded()) {
        <div class="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-4">
          @for (reason of stone().reasons; track reason.reasonKey + reason.traditionKey) {
            <div>
              <p class="text-sm leading-relaxed text-[var(--text-primary)]">
                {{ 'STONECRAFT.REASONS.' + reason.reasonKey + '.long' | translate }}
              </p>
              <p class="mt-1 text-xs text-[var(--text-muted)]">
                {{ 'STONECRAFT.TRADITION.' + reason.traditionKey | translate }}
              </p>
            </div>
          }

          @if (disagreement(); as d) {
            <p
              class="rounded-lg bg-[var(--surface-secondary)] px-4 py-3 text-sm leading-relaxed text-[var(--text-secondary)]"
            >
              {{ 'STONECRAFT.REASONS.' + d.reasonKey + '.long' | translate }}
            </p>
          }
        </div>
      }

      <!--
        The warning is NOT behind the disclosure. A cautioned stone shown with its
        caution one click away is a cautioned stone shown without its caution.
      -->
      @if (isCautioned()) {
        <div class="mt-4 border-t border-[var(--border-subtle)] pt-4" data-testid="caution-notice">
          <p class="text-eyebrow text-[var(--gold-muted)]">
            {{ 'STONECRAFT.READING.CAUTION_TITLE' | translate }}
          </p>
          <ul class="mt-2 space-y-1.5">
            @for (key of cautionKeys(); track key) {
              <li class="text-sm leading-relaxed text-[var(--text-secondary)]">
                {{ 'STONECRAFT.REASONS.' + key + '.long' | translate }}
              </li>
            }
          </ul>
        </div>
      }

      @if (stone().reasons.length > 0) {
        <button
          type="button"
          class="btn-editorial-link mt-4"
          [attr.aria-expanded]="expanded()"
          (click)="expanded.set(!expanded())"
        >
          @if (expanded()) {
            {{ 'STONECRAFT.READING.DISCOVER_LESS' | translate }}
          } @else {
            {{ 'STONECRAFT.READING.DISCOVER_MORE' | translate }}
          }
        </button>
      }
    </article>
  `,
  styles: `
    .btn-editorial-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--action-green);
      cursor: pointer;
      background: none;
      border: 0;
      padding: 0;
      transition: color 0.25s ease;
    }

    .btn-editorial-link:hover {
      color: var(--gold-muted);
    }
  `,
})
export class StoneCardComponent {
  public readonly stone = input.required<CustomerRecommendation | SharedRecommendation>();

  protected readonly expanded = signal(false);

  protected readonly isCautioned = computed(() => requiresCautionNotice(this.stone()));

  protected readonly cautionKeys = computed(() => cautionReasonKeys(this.stone()));

  protected readonly disagreement = computed(() => this.stone().disagreement);
}
