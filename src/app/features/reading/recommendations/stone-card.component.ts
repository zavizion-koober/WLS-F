import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { CustomerRecommendation, SharedRecommendation } from '@core/models/gemstones.models';
import { beadImage } from '@features/designer/strand/bead-image';

import { cautionReasonKeys, requiresCautionNotice } from '../tier-grouping';

/**
 * One recommended stone.
 *
 * <b>Progressive disclosure, and the split is the backend's.</b> Each reason key
 * has a `short` and a `long`; the short sits on the card as a label with no
 * sentence-ending period, and the long — one or two sentences — is behind
 * "discover more".
 *
 * <b>A cautioned stone can never render without its warning.</b>
 */
@Component({
  selector: 'sc-stone-card',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="group relative rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 transition-all duration-300 hover:border-[#CBB26A]/70 hover:shadow-[0_8px_24px_rgba(13,43,29,0.08)] flex flex-col justify-between"
      [attr.data-slug]="stone().materialSlug"
    >
      <div>
        <header class="flex items-start gap-4">
          <!-- Bead Image Preview -->
          <div
            class="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl bg-[#F5F2EB] border border-[#E2DDD2]/80 p-1.5 flex items-center justify-center overflow-hidden shadow-2xs group-hover:border-[#CBB26A]/60 transition-colors"
          >
            @if (imagePath(); as href) {
              <img
                [src]="href"
                [alt]="stone().canonicalNameEn"
                loading="lazy"
                class="w-full h-full object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)] transition-transform duration-500 ease-out group-hover:scale-110"
              />
            } @else {
              <span
                class="w-10 h-10 rounded-full border border-dashed border-[#8D8A81]/50 flex items-center justify-center text-[#8D8A81] text-[10px]"
              >
                ✦
              </span>
            }
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <h4 class="font-display text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
                {{ stone().canonicalNameEn }}
              </h4>

              @if (isCautioned()) {
                <span
                  class="text-[10px] uppercase tracking-wider shrink-0 rounded-[3px] border border-[var(--gold)] px-2 py-0.5 text-[var(--gold-muted)] font-semibold"
                >
                  {{ 'STONECRAFT.READING.CAUTION_BADGE' | translate }}
                </span>
              }
            </div>

            <!-- The trust signals, in the backend's own terms -->
            <p class="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[var(--text-muted)]">
              <span [title]="'STONECRAFT.CONFIDENCE.NOTE' | translate">
                {{ 'STONECRAFT.CONFIDENCE.' + stone().confidenceBand.toUpperCase() | translate }}
              </span>
              <span aria-hidden="true">•</span>
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
          </div>
        </header>

        <!-- Short reasons: one line each, no period. They are labels. -->
        <ul class="mt-4 space-y-1.5">
          @for (reason of stone().reasons; track reason.reasonKey + reason.traditionKey) {
            <li class="flex gap-2 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
              <span
                class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]"
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

        <!-- The warning is NOT behind the disclosure -->
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
      </div>

      @if (stone().reasons.length > 0) {
        <div class="pt-3 mt-4 border-t border-[#E2DDD2]/60">
          <button
            type="button"
            class="btn-editorial-link"
            [attr.aria-expanded]="expanded()"
            (click)="expanded.set(!expanded())"
          >
            @if (expanded()) {
              {{ 'STONECRAFT.READING.DISCOVER_LESS' | translate }}
            } @else {
              {{ 'STONECRAFT.READING.DISCOVER_MORE' | translate }}
            }
          </button>
        </div>
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

  /**
   * Resolves artwork for this stone using representativeSlug first, falling back to materialSlug.
   */
  protected readonly imagePath = computed(() => {
    const s = this.stone();
    return beadImage(s.representativeSlug) ?? beadImage(s.materialSlug);
  });
}

