import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiErrorComponent } from '@shared/components/api-error.component';
import { ScLoadingSkeletonComponent } from '@shared/components/sc-loading-skeleton.component';
import { ScStepWizardComponent } from '@shared/components/sc-step-wizard.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { PricePipe } from '@shared/pipes/price.pipe';
import { failureOf, isSuccess } from '@core/api/request-state';
import { isRetryable } from '@core/api/api-failure';
import { BraceletsApiService } from '@core/api/bracelets-api.service';
import type { CustomerRecommendation } from '@core/models/gemstones.models';
import type { BeadGrade } from '@core/models/api-enums';
import { ReadingStore } from '@features/reading/reading.store';
import { SavedBraceletsService } from '@core/services/saved-bracelets.service';
import { NotificationService } from '@core/services/notification.service';
import { AddCustomBraceletToCart } from '@store/cart/cart.actions';
import {
  generateRecommendedPreset,
  type SavedBracelet,
} from '@core/models/saved-bracelet.models';

import { BraceletDesignStore } from './bracelet-design.store';
import { DesignControlsComponent } from './controls/design-controls.component';
import { CautionGateComponent } from './palette/caution-gate.component';
import { PalettePanelComponent } from './palette/palette-panel.component';
import { StrandViewComponent } from './strand/strand-view.component';
import { SizingGuideModalComponent } from './controls/sizing-guide-modal.component';
import { BraceletReviewModalComponent } from './controls/bracelet-review-modal.component';

/**
 * Bespoke bracelet designer and geometry configurator.
 *
 * Implements a calm, structured action hierarchy:
 * - Level 1: Primary CTA (Save Bracelet / Add to Cart)
 * - Level 2: Secondary editing tools (Auto Arrange, Reset to Recommended)
 * - Level 3: Navigation & reference (Back to Reading, My Bracelets, Size Guide)
 * - Level 4: Subtle destructive reset (Clear / Reset with 8s undo window)
 */
@Component({
  selector: 'sc-designer-page',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    PricePipe,
    IconComponent,
    ApiErrorComponent,
    CautionGateComponent,
    DesignControlsComponent,
    PalettePanelComponent,
    ScLoadingSkeletonComponent,
    StrandViewComponent,
    ScStepWizardComponent,
    SizingGuideModalComponent,
    BraceletReviewModalComponent,
  ],
  providers: [BraceletDesignStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="atelier-container px-3.5 sm:px-6 lg:px-8 py-5 md:py-10 pb-32 lg:pb-16">
      <sc-step-wizard [currentStep]="3" [publicId]="publicId()" />

      <!-- Designer Header: Navigation Separated From Editing Actions -->
      <header class="flex items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-[#E2DDD2]">
        <!-- Left: Single contextual back link -->
        <div>
          @if (fromBracelets()) {
            <a
              routerLink="/bracelets"
              class="text-xs uppercase tracking-wider font-semibold text-[#5F5D56] hover:text-[#10523C] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <app-icon name="arrow-left" [size]="12" />
              <span>{{ 'STONECRAFT.ACTIONS.BACK_TO_BRACELETS' | translate }}</span>
            </a>
          } @else {
            <a
              [routerLink]="['/reading', publicId()]"
              class="text-xs uppercase tracking-wider font-semibold text-[#5F5D56] hover:text-[#10523C] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <app-icon name="arrow-left" [size]="12" />
              <span>{{ 'STONECRAFT.ACTIONS.BACK_TO_READING' | translate }}</span>
            </a>
          }
        </div>

        <!-- Center: Clean main title -->
        <div class="text-center">
          <h1 class="font-display text-xl sm:text-2xl font-bold text-[#10523C]">
            {{ 'STONECRAFT.DESIGNER.HEADER_TITLE' | translate }}
          </h1>
        </div>

        <!-- Right: Lightweight My Bracelets link with counter -->
        <div>
          <a
            routerLink="/bracelets"
            class="text-xs uppercase tracking-wider font-semibold text-[#8A7029] hover:text-[#10523C] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>{{ 'STONECRAFT.NAV.MY_BRACELETS' | translate }}</span>
            @if (savedBracelets.count() > 0) {
              <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-[#8A7029]/20 text-[#8A7029] font-bold">
                {{ savedBracelets.count() }}
              </span>
            }
          </a>
        </div>
      </header>

      @if (reading.isLoading() && !effectiveSession()) {
        <div class="mt-10 space-y-4" aria-busy="true">
          <sc-loading-skeleton height="360px" customClass="rounded-lg max-w-xl" />
        </div>
      } @else if (reading.failure() && !effectiveSession()) {
        <div class="mt-10 max-w-xl">
          <sc-api-error [failure]="reading.failure()!" [retryable]="canRetry()" (retry)="load()" />
        </div>
      } @else if (effectiveSession(); as session) {
        <div class="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <!-- Left Column: Visualizer Canvas & Sizing Controls -->
          <div class="lg:col-span-7 space-y-6">
            <!-- Canvas & Arrangement Section -->
            <section
              class="stage bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl p-4 sm:p-8 shadow-xs relative overflow-hidden"
              aria-label="Bracelet visualizer"
            >
              <!-- Arrangement Utility Toolbar (Level 2 & Level 4 Actions) -->
              <div class="flex items-center justify-between gap-1.5 sm:gap-3 pb-3 sm:pb-4 border-b border-[#E2DDD2]/60">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold text-[#1A1A1D] uppercase tracking-wider">
                    {{ 'STONECRAFT.DESIGNER.TITLE' | translate }}
                  </span>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#10523C]/10 text-[#10523C] tabular-nums whitespace-nowrap">
                    {{ store.strand().length }} / {{ store.ropeCapacity() || 0 }}
                  </span>
                  <span class="sr-only">{{ 'STONECRAFT.DESIGNER.STRAND_LABEL' | translate }}</span>
                </div>

                <!-- Utility editing tools grouped together -->
                <div class="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    (click)="onAutoArrange()"
                    [disabled]="store.strand().length === 0"
                    class="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg border border-[#E2DDD2] bg-white hover:bg-[#F4F1EA] active:scale-95 text-[#1A1A1D] text-[11px] sm:text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    [title]="'STONECRAFT.DESIGNER.AUTO_ARRANGE_DESC' | translate"
                  >
                    <span class="text-[#8A7029]">✦</span>
                    <span class="hidden xs:inline">{{ 'STONECRAFT.DESIGNER.AUTO_ARRANGE' | translate }}</span>
                    <span class="xs:hidden">Auto</span>
                  </button>

                  <button
                    type="button"
                    (click)="applyRecommendedPreset()"
                    class="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg border border-[#E2DDD2] bg-white hover:bg-[#F4F1EA] active:scale-95 text-[#1A1A1D] text-[11px] sm:text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
                    [title]="'STONECRAFT.DESIGNER.RESET_RECOMMENDED' | translate"
                  >
                    <span>↺</span>
                    <span>{{ 'STONECRAFT.DESIGNER.RESET_RECOMMENDED' | translate }}</span>
                  </button>

                  @if (store.strand().length > 0) {
                    <button
                      type="button"
                      data-testid="clear-board"
                      (click)="clear()"
                      class="inline-flex items-center px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium text-[#8D8A81] hover:text-red-700 hover:bg-red-50 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                      [title]="'STONECRAFT.DESIGNER.CLEAR' | translate"
                    >
                      {{ 'STONECRAFT.DESIGNER.CLEAR' | translate }}
                    </button>
                  }
                </div>
              </div>

              <!-- Undo Banner -->
              @if (store.undoable(); as undo) {
                <div
                  data-testid="undo-offer"
                  role="status"
                  class="mt-4 p-3 rounded-xl bg-[#0D2B1D] text-[#FCFBF9] flex items-center justify-between gap-3 text-xs animate-fade-in shadow-md"
                >
                  <span>
                    @if (undo.reason === 'cleared') {
                      {{ 'STONECRAFT.DESIGNER.CLEARED' | translate }}
                    } @else {
                      {{ 'STONECRAFT.DESIGNER.SHORTENED' | translate: { count: undo.dropped } }}
                    }
                  </span>
                  <button
                    type="button"
                    (click)="undoClear()"
                    class="font-semibold text-[#CBB26A] hover:underline uppercase tracking-wider cursor-pointer"
                  >
                    {{ 'STONECRAFT.DESIGNER.UNDO' | translate }}
                  </button>
                </div>
              }

              @if (replacing() !== null) {
                <p class="mt-4 text-xs text-[#8A7029] font-medium" data-testid="replacing">
                  {{ 'STONECRAFT.DESIGNER.REPLACING' | translate: { position: replacing()! + 1 } }}
                </p>
              }

              <!-- The Interactive Strand SVG Canvas -->
              <div class="py-4 sm:py-6 flex items-center justify-center min-h-[300px] sm:min-h-[420px]">
                @if (store.rope(); as rope) {
                  <sc-strand-view
                    [configuration]="rope"
                    [placed]="store.placedStones()"
                    [pending]="store.isStale()"
                    (slotSelected)="store.selected.set($event)"
                    (slotActivated)="replacing.set($event)"
                    (slotRemoved)="store.removeBeadAt($event)"
                    (slotMoved)="store.moveBead($event.from, $event.to)"
                  />
                } @else {
                  <sc-loading-skeleton height="380px" customClass="rounded-xl w-full" />
                }
              </div>

              @if (solveFailure(); as failure) {
                <div class="mt-4">
                  <sc-api-error [failure]="failure" [retryable]="false" />
                </div>
              }

              <!-- Live Specs Readout -->
              @if (store.rope(); as r) {
                <div class="pt-4 border-t border-[#E2DDD2]/60 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs text-[#5F5D56]">
                  <div class="p-2 sm:p-0 rounded-lg bg-[#F4F1EA]/50 sm:bg-transparent border border-[#E2DDD2]/40 sm:border-0 text-center sm:text-left">
                    <span class="block text-[10px] uppercase tracking-wider text-[#8D8A81]">
                      {{ 'STONECRAFT.DESIGNER.WRIST' | translate }}
                    </span>
                    <span class="font-semibold text-[#1A1A1D]">{{ store.wristMm() }} mm</span>
                  </div>
                  <div class="p-2 sm:p-0 rounded-lg bg-[#F4F1EA]/50 sm:bg-transparent border border-[#E2DDD2]/40 sm:border-0 text-center sm:text-left">
                    <span class="block text-[10px] uppercase tracking-wider text-[#8D8A81]">
                      {{ 'STONECRAFT.DESIGNER.DIAMETER' | translate }}
                    </span>
                    <span class="font-semibold text-[#1A1A1D]">{{ store.diameterMm() }} mm</span>
                  </div>
                  <div class="p-2 sm:p-0 rounded-lg bg-[#F4F1EA]/50 sm:bg-transparent border border-[#E2DDD2]/40 sm:border-0 text-center sm:text-left">
                    <span class="block text-[10px] uppercase tracking-wider text-[#8D8A81]">
                      {{ 'STONECRAFT.DESIGNER.BEADS' | translate }}
                    </span>
                    <span data-testid="places-filled" class="font-semibold text-[#1A1A1D]">
                      {{ 'STONECRAFT.DESIGNER.FILLED_OF' | translate: { filled: store.strand().length, places: r.beadCount } }}
                    </span>
                  </div>
                  <div class="p-2 sm:p-0 rounded-lg bg-[#F4F1EA]/50 sm:bg-transparent border border-[#E2DDD2]/40 sm:border-0 text-center sm:text-left">
                    <span class="block text-[10px] uppercase tracking-wider text-[#8D8A81]">
                      {{ 'STONECRAFT.DESIGNER.FIT' | translate }}
                    </span>
                    <span class="font-semibold text-[#1A1A1D]">{{ fit(r.fitDeviationMm) }}</span>
                  </div>
                </div>

                <!-- Mobile Quick Trigger inside Canvas -->
                <div class="lg:hidden pt-3 border-t border-[#E2DDD2]/60 flex justify-center">
                  <button
                    type="button"
                    (click)="mobilePaletteOpen.set(true)"
                    class="w-full py-2.5 px-4 rounded-xl border border-[#10523C]/30 bg-[#10523C]/5 text-[#10523C] hover:bg-[#10523C]/10 active:scale-[0.98] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <span class="text-[#8A7029]">✦</span>
                    <span>{{ 'STONECRAFT.DESIGNER.PALETTE' | translate }}</span>
                    <span class="px-1.5 py-0.2 rounded-full bg-[#10523C] text-white text-[10px] font-bold tabular-nums">
                      {{ session.recommendations.length }}
                    </span>
                  </button>
                </div>
              }
            </section>

            <!-- Size & Material Specifications Section -->
            <section class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl p-4 sm:p-8 shadow-xs">
              <sc-design-controls
                [wristOptions]="store.wristOptions()"
                [diameterOptions]="store.availableDiameters()"
                [wristMm]="store.wristMm()"
                [diameterMm]="store.diameterMm()"
                [grade]="store.grade()"
                [sizingStatus]="store.sizing()?.status ?? ''"
                (wristChanged)="store.wristMm.set($event)"
                (diameterChanged)="store.diameterMm.set($event)"
                (gradeChanged)="setGrade($event)"
                (sizingGuideRequested)="showSizingGuide.set(true)"
              />
            </section>
          </div>

          <!-- Right Column: Dedicated Summary & Primary Action Area -->
          <div class="lg:col-span-5 space-y-6">
            <!-- Configuration Summary & Dedicated Primary CTA Card -->
            <section class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl p-6 shadow-sm space-y-5 border-l-4 border-l-[#10523C]">
              <!-- Talisman Title & Status Indicator -->
              <div class="flex items-start justify-between gap-3">
                <div>
                  <span class="text-eyebrow text-[#8A7029]">
                    {{ 'STONECRAFT.DESIGNER.YOUR_TALISMAN' | translate }}
                  </span>
                  <h3 class="font-display text-xl font-bold text-[#1A1A1D] mt-0.5">
                    {{ store.braceletName() || 'Bespoke Talisman' }}
                  </h3>
                </div>

                <!-- Small Saved State Indicator (Saved / Saving / Unsaved) -->
                <div>
                  @if (isSaving()) {
                    <span class="text-[11px] text-[#8D8A81] font-medium flex items-center gap-1">
                      <span class="animate-spin text-xs">↻</span>
                      <span>{{ 'STONECRAFT.ACTIONS.SAVING' | translate }}</span>
                    </span>
                  } @else if (isSaved()) {
                    <span class="text-[11px] text-[#10523C] font-semibold flex items-center gap-1">
                      <span>✓</span>
                      <span>{{ 'STONECRAFT.ACTIONS.SAVED' | translate }}</span>
                    </span>
                  } @else if (hasUnsavedChanges()) {
                    <span class="text-[11px] text-[#8A7029] font-medium">
                      {{ 'STONECRAFT.DESIGNER.UNSAVED_CHANGES' | translate }}
                    </span>
                  }
                </div>
              </div>

              <!-- Compact Manifest Summary (Distinct Stones & Specs) -->
              <div class="space-y-2 text-xs">
                <div class="flex items-center justify-between text-[#5F5D56]">
                  <span>{{ 'STONECRAFT.DESIGNER.SELECTED_STONES' | translate }}:</span>
                  <span class="font-medium text-[#1A1A1D]">{{ distinctStonesCount() }} distinct ({{ store.strand().length }} total)</span>
                </div>
                <div class="flex items-center justify-between text-[#5F5D56]">
                  <span>{{ 'STONECRAFT.DESIGNER.WRIST' | translate }} & {{ 'STONECRAFT.DESIGNER.DIAMETER' | translate }}:</span>
                  <span class="font-medium text-[#1A1A1D]">{{ store.wristMm() }}mm • {{ store.diameterMm() }}mm beads</span>
                </div>
              </div>

              <!-- Price Readout -->
              <div class="p-3.5 rounded-xl bg-[#F4F1EA]/60 border border-[#E2DDD2]/60 flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-[#5F5D56]">Total</span>
                <span class="font-display text-2xl font-bold text-[#10523C] tabular-nums">
                  {{ store.livePriceBreakdown().totalPrice | price }}
                </span>
              </div>

              <!-- Primary Action Area: Exactly ONE Primary CTA in Main State -->
              <div class="space-y-3 pt-1">
                @if (isSaved() && store.canSave()) {
                  <!-- When Saved & Complete: Primary CTA is Add to Cart -->
                  <button
                    type="button"
                    (click)="showReviewModal.set(true)"
                    class="btn-primary w-full text-center text-xs py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <app-icon name="bag" [size]="16" />
                    <span>{{ 'STONECRAFT.ACTIONS.ADD_TO_CART' | translate }}</span>
                  </button>
                } @else if (store.canSave()) {
                  <!-- When Complete: Primary CTA is Review & Add to Cart -->
                  <button
                    type="button"
                    (click)="showReviewModal.set(true)"
                    class="btn-primary w-full text-center text-xs py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <app-icon name="bag" [size]="16" />
                    <span>{{ 'STONECRAFT.DESIGNER.REVIEW_ORDER_CTA' | translate }}</span>
                  </button>
                } @else {
                  <!-- When Incomplete / In-Progress: Primary CTA is Save / Update Bracelet -->
                  <button
                    type="button"
                    (click)="onSaveDesign()"
                    [disabled]="store.strand().length === 0 || isSaving()"
                    class="btn-primary w-full text-center text-xs py-3.5 flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-40"
                  >
                    @if (isSaving()) {
                      <span>{{ 'STONECRAFT.ACTIONS.SAVING' | translate }}</span>
                    } @else if (store.braceletId()) {
                      <span>{{ 'STONECRAFT.ACTIONS.UPDATE_BRACELET' | translate }}</span>
                    } @else {
                      <span>{{ 'STONECRAFT.ACTIONS.SAVE_BRACELET' | translate }}</span>
                    }
                  </button>
                }

                <!-- Secondary reset link (Level 4 subtle destructive action) -->
                @if (store.strand().length > 0) {
                  <button
                    type="button"
                    (click)="clear()"
                    class="text-[11px] text-[#8D8A81] hover:text-red-700 underline text-center w-full block transition-colors cursor-pointer"
                  >
                    {{ 'STONECRAFT.DESIGNER.RESET' | translate }}
                  </button>
                }
              </div>
            </section>

            <!-- Astrological Gemstone Palette (Desktop View) -->
            <section class="hidden lg:block bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl p-6 sm:p-8 shadow-xs">
              <sc-palette-panel
                [recommendations]="session.recommendations"
                [unavailable]="session.unavailable"
                [full]="store.isFull()"
                [replacing]="replacing()"
                (stonePicked)="pick($event)"
              />
            </section>
          </div>
        </div>

        <!-- Refined Tactile Vertical Handle Tab (/-\ shape) on Left Edge (Mobile Only) -->
        <button
          type="button"
          (click)="mobilePaletteOpen.set(!mobilePaletteOpen())"
          class="lg:hidden fixed left-0 top-[45%] -translate-y-1/2 z-30 group flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-95 focus:outline-none"
          [attr.aria-expanded]="mobilePaletteOpen()"
          aria-label="Toggle gemstone palette drawer"
        >
          <!-- Curvy /-\ SVG tab with gradient fill, gold border, and ambient shadow -->
          <div class="relative flex items-center justify-center w-9 h-32 drop-shadow-[0_4px_16px_rgba(16,82,60,0.35)]">
            <svg
              class="absolute inset-0 w-full h-full"
              viewBox="0 0 38 132"
              fill="none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="witchlab-tab-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#0D2B1D" />
                  <stop offset="100%" stop-color="#145C44" />
                </linearGradient>
              </defs>
              <!-- Smooth /-\ arched shape -->
              <path
                d="M 0,0 
                   C 18,10 36,28 36,46 
                   L 36,86 
                   C 36,104 18,122 0,132 
                   Z"
                fill="url(#witchlab-tab-grad)"
                stroke="#CBB26A"
                stroke-width="1.5"
              />
            </svg>

            <!-- Elements inside the handle -->
            <div class="relative z-10 flex flex-col items-center justify-center gap-2 pl-0.5 text-[#FCFBF9]">
              <!-- Small Gold Gem Sparkle -->
              <span class="text-[10px] text-[#CBB26A] leading-none font-serif select-none">✦</span>

              <!-- Curvy Animated Chevron Indicator -->
              <svg
                class="w-4 h-4 text-[#CBB26A] transition-transform duration-300 ease-out"
                [class.rotate-180]="mobilePaletteOpen()"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>

              <!-- Distinct Stone Count Badge -->
              <span class="text-[10px] font-bold text-[#0D2B1D] bg-[#CBB26A] px-1.5 py-0.5 rounded-full tabular-nums leading-none shadow-xs">
                {{ session.recommendations.length }}
              </span>
            </div>
          </div>
        </button>

        <!-- Mobile Left-Side Expandable Stones Drawer -->
        <div
          class="lg:hidden fixed inset-0 z-40 transition-opacity duration-300"
          [class.opacity-100]="mobilePaletteOpen()"
          [class.pointer-events-auto]="mobilePaletteOpen()"
          [class.opacity-0]="!mobilePaletteOpen()"
          [class.pointer-events-none]="!mobilePaletteOpen()"
        >
          <!-- Backdrop Overlay -->
          <div
            class="absolute inset-0 bg-[#050507]/60 backdrop-blur-xs transition-opacity"
            (click)="mobilePaletteOpen.set(false)"
          ></div>

          <!-- Slide-out Drawer from Left Edge -->
          <aside
            class="absolute top-0 bottom-0 left-0 w-[88vw] max-w-sm bg-[#FCFBF9] border-r border-[#E2DDD2] shadow-2xl p-5 overflow-y-auto transform transition-transform duration-300 ease-out flex flex-col"
            [class.translate-x-0]="mobilePaletteOpen()"
            [class.-translate-x-full]="!mobilePaletteOpen()"
          >
            <!-- Drawer Header with Curvy Arrow / Close Button -->
            <div class="flex items-center justify-between pb-3 border-b border-[#E2DDD2] mb-4">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold uppercase tracking-wider text-[#10523C]">
                  {{ 'STONECRAFT.DESIGNER.PALETTE' | translate }}
                </span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-[#10523C]/10 text-[#10523C] font-semibold tabular-nums">
                  {{ session.recommendations.length }}
                </span>
              </div>

              <button
                type="button"
                (click)="mobilePaletteOpen.set(false)"
                class="px-3 py-1.5 rounded-full border border-[#E2DDD2] bg-white hover:bg-[#F4F1EA] text-[#1A1A1D] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                aria-label="Hide stones palette"
              >
                <svg class="w-3.5 h-3.5 text-[#8A7029]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                <span>{{ 'STONECRAFT.ACTIONS.HIDE' | translate }}</span>
              </button>
            </div>

            <!-- Stones Palette Content -->
            <div class="flex-1 overflow-y-auto">
              <sc-palette-panel
                [recommendations]="session.recommendations"
                [unavailable]="session.unavailable"
                [full]="store.isFull()"
                [replacing]="replacing()"
                (stonePicked)="pick($event)"
              />
            </div>
          </aside>
        </div>

        <!-- Sticky Mobile Bottom Bar: Exactly ONE Primary CTA -->
        <div class="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FCFBF9]/95 backdrop-blur-md border-t border-[#E2DDD2] p-4 shadow-xl flex items-center justify-between gap-4">
          <div>
            <span class="text-[10px] uppercase tracking-wider text-[#8D8A81] block">
              {{ store.strand().length }} beads • {{ store.wristMm() }}mm
            </span>
            <span class="font-display text-lg font-bold text-[#10523C]">
              {{ store.livePriceBreakdown().totalPrice | price }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            @if (store.canSave()) {
              <button
                type="button"
                (click)="showReviewModal.set(true)"
                class="btn-primary text-xs py-3 px-5 cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <app-icon name="bag" [size]="14" />
                <span>{{ (isSaved() ? 'STONECRAFT.ACTIONS.ADD_TO_CART' : 'STONECRAFT.DESIGNER.REVIEW_ORDER_CTA') | translate }}</span>
              </button>
            } @else {
              <button
                type="button"
                (click)="onSaveDesign()"
                [disabled]="store.strand().length === 0 || isSaving()"
                class="btn-primary text-xs py-3 px-5 cursor-pointer disabled:opacity-40 shadow-sm"
              >
                @if (isSaving()) {
                  <span>{{ 'STONECRAFT.ACTIONS.SAVING' | translate }}</span>
                } @else if (store.braceletId()) {
                  <span>{{ 'STONECRAFT.ACTIONS.UPDATE_BRACELET' | translate }}</span>
                } @else {
                  <span>{{ 'STONECRAFT.ACTIONS.SAVE_BRACELET' | translate }}</span>
                }
              </button>
            }
          </div>
        </div>

        <!-- Caution Gate Modal -->
        @if (pendingCaution(); as warned) {
          <sc-caution-gate
            [stone]="warned"
            (acknowledged)="acceptCaution(warned)"
            (dismissed)="pendingCaution.set(null)"
          />
        }

        <!-- Sizing Guide Modal -->
        @if (showSizingGuide()) {
          <sc-sizing-guide-modal (close)="showSizingGuide.set(false)" />
        }

        <!-- Review & Order Modal -->
        @if (showReviewModal()) {
          <sc-bracelet-review-modal
            [strand]="store.strand()"
            [wristMm]="store.wristMm()"
            [diameterMm]="store.diameterMm()"
            [grade]="store.grade()"
            [spacerStyle]="store.spacerStyle()"
            [publicId]="publicId()"
            [stones]="reviewStones()"
            [initialName]="store.braceletName()"
            (addToBag)="onAddToCart($event)"
            (close)="showReviewModal.set(false)"
          />
        }
      }
    </main>
  `,
})
export class DesignerPage {
  public readonly publicId = input.required<string>();

  protected readonly reading = inject(ReadingStore);
  protected readonly store = inject(BraceletDesignStore);
  protected readonly savedBracelets = inject(SavedBraceletsService);
  private readonly bracelets = inject(BraceletsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  public readonly showSizingGuide = signal(false);
  public readonly showReviewModal = signal(false);
  public readonly mobilePaletteOpen = signal(false);

  // Save states
  public readonly isSaving = signal(false);
  private readonly lastSavedSignature = signal<string | null>(null);

  private static readonly UNDO_WINDOW_MS = 8000;
  private undoTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly replacing = signal<number | null>(null);
  protected readonly pendingCaution = signal<CustomerRecommendation | null>(null);

  protected readonly savedBraceletFromQuery = computed(() => {
    const qp = this.route?.snapshot.queryParams;
    const id = qp ? qp['braceletId'] : null;
    return id ? this.savedBracelets.getById(id) : null;
  });

  protected readonly effectiveSession = computed(() => {
    const live = this.reading.result();
    if (live) return live;

    const saved = this.savedBraceletFromQuery();
    if (!saved) return null;

    const recommendations: CustomerRecommendation[] = saved.stones.map((s, idx) => ({
      materialSlug: s.slug,
      canonicalNameEn: s.name,
      representativeSlug: s.slug,
      tier: idx === 0 ? 'Primary' : 'Supportive',
      score: 1.0,
      confidence: 1.0,
      confidenceBand: 'WellAttested',
      independentSourceCount: 1,
      traditionKeys: ['western'],
      reasons: [],
      isCautioned: false,
      cautions: [],
      disagreement: null,
      isAvailableAsBead: true,
    }));

    return {
      chart: null as any,
      recommendations,
      cautions: [],
      unavailable: [],
      rulePackVersion: 'saved-local',
    };
  });

  protected readonly fromBracelets = computed(() => {
    const qp = this.route?.snapshot.queryParams;
    return qp ? qp['from'] === 'bracelets' || !!qp['braceletId'] : false;
  });

  protected readonly currentSignature = computed(() => {
    const s = this.store.strand().map((p) => `${p.materialSlug}:${p.diameterMm}:${p.grade}`).join('|');
    return `${this.store.wristMm()}-${this.store.diameterMm()}-${this.store.grade()}-${s}`;
  });

  public readonly isSaved = computed(() => {
    const last = this.lastSavedSignature();
    return last !== null && last === this.currentSignature();
  });

  public readonly hasUnsavedChanges = computed(() => {
    return this.store.strand().length > 0 && !this.isSaved();
  });

  protected readonly distinctStonesCount = computed(() => {
    return new Set(this.store.strand().map((s) => s.materialSlug)).size;
  });

  protected readonly canRetry = computed(() => {
    const failure = this.reading.failure();
    return failure !== null && isRetryable(failure);
  });

  protected readonly reviewStones = computed(() => {
    const session = this.effectiveSession();
    if (!session) return [];
    return session.recommendations.map((r) => ({
      slug: r.representativeSlug || r.materialSlug,
      name: r.canonicalNameEn,
    }));
  });

  protected readonly solveFailure = computed(() => failureOf(this.store.solved()));
  protected readonly saveFailure = computed(() => failureOf(this.store.saving()));

  constructor() {
    effect(() => {
      const id = this.publicId();
      this.reading.loadSession(id);
    });

    // Populate palette in store from reading session or synthesized saved bracelet session
    effect(() => {
      const session = this.effectiveSession();
      this.store.palette.set(
        session === null
          ? []
          : session.recommendations.map((recommendation) => ({
              recommendation,
              slug: recommendation.materialSlug,
              name: recommendation.canonicalNameEn,
            })),
      );
    });

    // The template and the sizing table, once
    this.bracelets
      .listTemplates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (isSuccess(state) && state.value.length > 0) {
          this.store.template.set(state.value[0]);
        }
      });

    this.bracelets
      .getSizing()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (isSuccess(state)) {
          this.store.sizing.set(state.value);

          const offered = this.store.availableDiameters();
          if (offered.length > 0 && !offered.includes(this.store.diameterMm())) {
            this.store.diameterMm.set(offered[Math.floor(offered.length / 2)]);
          }
        }
      });

    let defaultWristSet = false;
    // Start on midpoint wrist if no saved bracelet sets it
    effect(() => {
      const sizing = this.store.sizing();
      if (sizing === null || defaultWristSet) {
        return;
      }

      if (untracked(() => this.savedBraceletFromQuery())) {
        defaultWristSet = true;
        return;
      }

      defaultWristSet = true;
      const midpoint =
        sizing.wristMinMm +
        Math.round((sizing.wristMaxMm - sizing.wristMinMm) / 2 / sizing.wristStepMm) *
          sizing.wristStepMm;

      untracked(() => {
        this.store.wristMm.set(midpoint);
      });
    });

    let hydratedBraceletId: string | null = null;
    let hydratedPreset = false;

    // Check query params for saved bracelet and hydrate immediately
    effect(() => {
      const qp = this.route?.snapshot.queryParams;
      const braceletId = qp ? qp['braceletId'] : null;
      const preset = qp ? qp['preset'] : null;

      if (braceletId && braceletId !== hydratedBraceletId) {
        const saved = untracked(() => this.savedBracelets.getById(braceletId));
        if (saved) {
          hydratedBraceletId = braceletId;
          untracked(() => {
            this.store.loadSavedBracelet(saved);
            this.lastSavedSignature.set(this.currentSignature());
          });
          return;
        }
      }

      if (preset === 'recommended' && !hydratedPreset) {
        const session = this.effectiveSession();
        if (session) {
          hydratedPreset = true;
          untracked(() => {
            this.applyRecommendedPreset();
          });
        }
      }
    });
  }

  public clear(): void {
    this.store.reset();
    this.startUndoWindow();
  }

  private readonly offerUndoWhenTrimmed = effect(() => {
    if (this.store.undoable() !== null) {
      this.startUndoWindow();
    }
  });

  protected undoClear(): void {
    this.cancelUndoWindow();
    this.store.undoReset();
  }

  private startUndoWindow(): void {
    this.cancelUndoWindow();

    this.undoTimer = setTimeout(() => {
      this.undoTimer = null;
      this.store.forgetUndo();
    }, DesignerPage.UNDO_WINDOW_MS);

    this.destroyRef.onDestroy(() => this.cancelUndoWindow());
  }

  private cancelUndoWindow(): void {
    if (this.undoTimer !== null) {
      clearTimeout(this.undoTimer);
      this.undoTimer = null;
    }
  }

  protected load(): void {
    this.reading.loadSession(this.publicId());
  }

  protected applyRecommendedPreset(): void {
    const session = this.effectiveSession();
    if (!session || session.recommendations.length === 0) return;

    const preset = generateRecommendedPreset(
      session.recommendations,
      this.store.ropeCapacity() || 24,
      this.store.diameterMm(),
      this.store.grade(),
    );
    this.store.applyPreset(preset);
  }

  protected onAutoArrange(): void {
    this.store.autoArrange();
  }

  protected pick(stone: CustomerRecommendation): void {
    if (stone.isCautioned) {
      this.pendingCaution.set(stone);
      return;
    }
    this.place(stone.representativeSlug);
  }

  protected acceptCaution(stone: CustomerRecommendation): void {
    this.pendingCaution.set(null);
    this.place(stone.representativeSlug);
  }

  private place(slug: string): void {
    const target = this.replacing();

    if (target === null) {
      this.store.addBead(slug);
    } else {
      this.store.replaceBeadAt(target, slug);
      this.replacing.set(null);
    }
  }

  protected setGrade(grade: BeadGrade): void {
    this.store.grade.set(grade);
  }

  protected onSaveDesign(): void {
    this.isSaving.set(true);
    this.store.save(this.publicId());
    this.lastSavedSignature.set(this.currentSignature());
    this.isSaving.set(false);

    this.notification.success(
      this.translate.instant('STONECRAFT.DESIGNER.SAVED_LOCAL', { defaultValue: 'Bracelet design saved to My Bracelets' }),
    );
  }

  protected onAddToCart(saved: SavedBracelet): void {
    this.showReviewModal.set(false);
    try {
      const store = this.injector.get(Store, null);
      store?.dispatch(new AddCustomBraceletToCart(saved, true));
    } catch {
      // Isolated test environment without NGXS
    }
  }

  protected fit(deviationMm: number): string {
    return `${deviationMm >= 0 ? '+' : ''}${deviationMm.toFixed(1)} mm`;
  }
}
