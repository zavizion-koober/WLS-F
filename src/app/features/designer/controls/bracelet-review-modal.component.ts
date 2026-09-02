import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import type { BeadGrade } from '@core/models/api-enums';
import type { StrandPosition } from '@core/models/bracelets.models';
import {
  calculateCustomBraceletPrice,
  generateBraceletName,
  type SavedBracelet,
} from '@core/models/saved-bracelet.models';
import { SavedBraceletsService } from '@core/services/saved-bracelets.service';
import { beadImage } from '../strand/bead-image';
import { PricePipe } from '@shared/pipes/price.pipe';
import { IconComponent } from '@shared/components/icon/icon.component';

export interface ReviewStoneItem {
  readonly slug: string;
  readonly name: string;
}

@Component({
  selector: 'sc-bracelet-review-modal',
  standalone: true,
  imports: [FormsModule, TranslatePipe, PricePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 bg-[#050507]/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
      (click)="close.emit()"
    >
      <div
        class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative my-8 max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <!-- Close button -->
        <button
          type="button"
          (click)="close.emit()"
          class="absolute top-5 right-5 p-1.5 text-[#5F5D56] hover:text-[#1A1A1D] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <app-icon name="close" [size]="18" />
        </button>

        <div>
          <span class="text-[10px] uppercase tracking-widest text-[#8A7029] font-semibold">
            {{ 'STONECRAFT.REVIEW_MODAL.EYEBROW' | translate }}
          </span>
          <h3 class="font-display text-2xl font-bold text-[#10523C] mt-1">
            {{ 'STONECRAFT.REVIEW_MODAL.TITLE' | translate }}
          </h3>
          <p class="text-xs text-[#5F5D56] mt-1">
            {{ 'STONECRAFT.REVIEW_MODAL.SUBTITLE' | translate }}
          </p>
        </div>

        <!-- Bracelet Name Input -->
        <div class="space-y-1.5">
          <label for="review-bracelet-name" class="block text-xs font-semibold uppercase tracking-wider text-[#1A1A1D]">
            {{ 'STONECRAFT.REVIEW_MODAL.NAME_LABEL' | translate }}
          </label>
          <input
            id="review-bracelet-name"
            type="text"
            [ngModel]="braceletName()"
            (ngModelChange)="braceletName.set($event)"
            class="w-full px-3.5 py-2.5 rounded-xl border border-[#E2DDD2] bg-[#FCFBF9] text-sm text-[#1A1A1D] font-medium focus:border-[#10523C] focus:outline-none"
            [placeholder]="'STONECRAFT.REVIEW_MODAL.NAME_PLACEHOLDER' | translate"
          />
        </div>

        <!-- Bead Strand Swatch & Specs Summary -->
        <div class="p-4 sm:p-5 rounded-xl bg-[#F4F1EA]/70 border border-[#E2DDD2] space-y-4">
          <div class="flex flex-wrap items-center gap-1.5 p-3 rounded-lg bg-[#FCFBF9] border border-[#E2DDD2]/70 max-h-28 overflow-y-auto">
            @for (pos of strand(); track $index) {
              <div
                class="w-6 h-6 rounded-full bg-[#0D2B1D] border border-[#CBB26A]/40 overflow-hidden flex items-center justify-center shrink-0"
                [title]="pos.materialSlug"
              >
                @if (imageFor(pos.materialSlug); as href) {
                  <img [src]="href" alt="" class="w-full h-full object-contain" />
                } @else {
                  <span class="text-[9px] text-[#CBB26A]">✦</span>
                }
              </div>
            }
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span class="block text-[10px] uppercase tracking-wider text-[#8D8A81]">Wrist Size</span>
              <span class="font-semibold text-[#1A1A1D]">{{ wristMm() }} mm</span>
            </div>
            <div>
              <span class="block text-[10px] uppercase tracking-wider text-[#8D8A81]">Bead Size</span>
              <span class="font-semibold text-[#1A1A1D]">{{ diameterMm() }} mm</span>
            </div>
            <div>
              <span class="block text-[10px] uppercase tracking-wider text-[#8D8A81]">Bead Count</span>
              <span class="font-semibold text-[#1A1A1D]">{{ strand().length }} beads</span>
            </div>
            <div>
              <span class="block text-[10px] uppercase tracking-wider text-[#8D8A81]">Artisanal Finish</span>
              <span class="font-semibold text-[#1A1A1D]">{{ grade() }}</span>
            </div>
          </div>
        </div>

        <!-- Selected Stones Breakdown with Astrological Associations -->
        <div class="space-y-3">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-[#1A1A1D]">
            {{ 'STONECRAFT.REVIEW_MODAL.STONES_TITLE' | translate }} ({{ stoneManifest().length }})
          </h4>

          <div class="space-y-2">
            @for (stone of stoneManifest(); track stone.slug) {
              <div class="flex items-center justify-between p-3 rounded-xl bg-[#FCFBF9] border border-[#E2DDD2]/80">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-[#F4F1EA] border border-[#E2DDD2] p-1 flex items-center justify-center shrink-0">
                    @if (stone.img; as src) {
                      <img [src]="src" [alt]="stone.name" class="w-full h-full object-contain" />
                    } @else {
                      <span class="text-[10px] text-[#8D8A81]">✦</span>
                    }
                  </div>
                  <div>
                    <h5 class="text-xs font-semibold text-[#1A1A1D]">{{ stone.name }}</h5>
                    <p class="text-[11px] text-[#5F5D56]">Associated with your birth chart</p>
                  </div>
                </div>

                <div class="text-right">
                  <span class="text-xs font-bold text-[#10523C] tabular-nums">{{ stone.count }}×</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Price Breakdown Table -->
        <div class="p-4 rounded-xl bg-[#FCFBF9] border border-[#E2DDD2] space-y-2 text-xs">
          <div class="flex items-center justify-between text-[#5F5D56]">
            <span>Base Bespoke Consecration & Cord</span>
            <span class="font-medium text-[#1A1A1D]">{{ priceBreakdown().baseCraftPrice | price }}</span>
          </div>
          <div class="flex items-center justify-between text-[#5F5D56]">
            <span>Natural Gemstone Beads ({{ priceBreakdown().beadCount }}×)</span>
            <span class="font-medium text-[#1A1A1D]">{{ priceBreakdown().beadsSubtotal | price }}</span>
          </div>
          @if (priceBreakdown().gradeExtra > 0) {
            <div class="flex items-center justify-between text-[#5F5D56]">
              <span>Premium Artisanal Cut & Polish</span>
              <span class="font-medium text-[#1A1A1D]">+{{ priceBreakdown().gradeExtra | price }}</span>
            </div>
          }
          @if (priceBreakdown().spacerExtra > 0) {
            <div class="flex items-center justify-between text-[#5F5D56]">
              <span>Consecrated Metallic Spacers</span>
              <span class="font-medium text-[#1A1A1D]">+{{ priceBreakdown().spacerExtra | price }}</span>
            </div>
          }
          <div class="pt-2 border-t border-[#E2DDD2] flex items-center justify-between font-semibold text-sm text-[#1A1A1D]">
            <span>Total</span>
            <span class="text-base font-bold text-[#10523C]">{{ priceBreakdown().totalPrice | price }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            (click)="onAddToCart()"
            class="btn-primary flex-1 text-center text-xs py-4 flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <app-icon name="bag" [size]="16" />
            <span>{{ 'STONECRAFT.REVIEW_MODAL.ADD_TO_BAG' | translate }}</span>
          </button>

          <button
            type="button"
            (click)="close.emit()"
            class="btn-secondary text-center text-xs py-3.5 px-6 cursor-pointer"
          >
            {{ 'STONECRAFT.REVIEW_MODAL.KEEP_EDITING' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class BraceletReviewModalComponent {
  public readonly strand = input.required<readonly StrandPosition[]>();
  public readonly wristMm = input.required<number>();
  public readonly diameterMm = input.required<number>();
  public readonly grade = input.required<BeadGrade>();
  public readonly spacerStyle = input<'none' | 'gold' | 'silver' | 'hematite'>('none');
  public readonly publicId = input.required<string>();
  public readonly stones = input<readonly ReviewStoneItem[]>([]);
  public readonly initialName = input<string>('');

  public readonly addToBag = output<SavedBracelet>();
  public readonly close = output<void>();

  private readonly savedBracelets = inject(SavedBraceletsService);

  public readonly braceletName = signal('');

  ngOnInit(): void {
    const existing = this.initialName();
    if (existing) {
      this.braceletName.set(existing);
    } else {
      const manifest = this.stoneManifest();
      this.braceletName.set(generateBraceletName(manifest, this.publicId()));
    }
  }

  protected readonly priceBreakdown = computed(() =>
    calculateCustomBraceletPrice(this.strand(), this.diameterMm(), this.grade(), this.spacerStyle()),
  );

  protected readonly stoneManifest = computed(() => {
    const list = this.strand();
    const countMap = new Map<string, number>();
    for (const pos of list) {
      countMap.set(pos.materialSlug, (countMap.get(pos.materialSlug) ?? 0) + 1);
    }

    const stoneList = this.stones();
    return [...countMap.entries()].map(([slug, count]) => {
      const found = stoneList.find((s) => s.slug === slug);
      return {
        slug,
        name: found?.name ?? slug,
        count,
        img: beadImage(slug),
      };
    });
  });

  protected imageFor(slug: string): string | null {
    return beadImage(slug);
  }

  public onAddToCart(): void {
    const stoneNames = new Map(this.stoneManifest().map((s) => [s.slug, s.name]));
    const saved = this.savedBracelets.saveBracelet({
      name: this.braceletName(),
      readingPublicId: this.publicId(),
      strand: this.strand(),
      wristMm: this.wristMm(),
      diameterMm: this.diameterMm(),
      grade: this.grade(),
      spacerStyle: this.spacerStyle(),
      stoneNames,
    });

    this.addToBag.emit(saved);
  }
}
