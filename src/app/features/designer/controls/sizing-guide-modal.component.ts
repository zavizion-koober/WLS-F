import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'sc-sizing-guide-modal',
  standalone: true,
  imports: [TranslatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 bg-[#050507]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
      (click)="close.emit()"
    >
      <div
        class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative"
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
            {{ 'STONECRAFT.SIZING_GUIDE.EYEBROW' | translate }}
          </span>
          <h3 class="font-display text-xl sm:text-2xl font-bold text-[#1A1A1D] mt-1">
            {{ 'STONECRAFT.SIZING_GUIDE.TITLE' | translate }}
          </h3>
        </div>

        <div class="space-y-4 text-xs sm:text-sm text-[#5F5D56] leading-relaxed">
          <div class="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#F4F1EA]/60 border border-[#E2DDD2]">
            <span class="w-6 h-6 rounded-full bg-[#10523C] text-[#FCFBF9] flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <div>
              <h4 class="font-semibold text-[#1A1A1D] mb-0.5">
                {{ 'STONECRAFT.SIZING_GUIDE.STEP1_TITLE' | translate }}
              </h4>
              <p>{{ 'STONECRAFT.SIZING_GUIDE.STEP1_DESC' | translate }}</p>
            </div>
          </div>

          <div class="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#F4F1EA]/60 border border-[#E2DDD2]">
            <span class="w-6 h-6 rounded-full bg-[#10523C] text-[#FCFBF9] flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <div>
              <h4 class="font-semibold text-[#1A1A1D] mb-0.5">
                {{ 'STONECRAFT.SIZING_GUIDE.STEP2_TITLE' | translate }}
              </h4>
              <p>{{ 'STONECRAFT.SIZING_GUIDE.STEP2_DESC' | translate }}</p>
            </div>
          </div>

          <div class="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#F4F1EA]/60 border border-[#E2DDD2]">
            <span class="w-6 h-6 rounded-full bg-[#10523C] text-[#FCFBF9] flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <div>
              <h4 class="font-semibold text-[#1A1A1D] mb-0.5">
                {{ 'STONECRAFT.SIZING_GUIDE.STEP3_TITLE' | translate }}
              </h4>
              <p>{{ 'STONECRAFT.SIZING_GUIDE.STEP3_DESC' | translate }}</p>
            </div>
          </div>
        </div>

        <div class="pt-2">
          <button
            type="button"
            (click)="close.emit()"
            class="btn-primary w-full text-center text-xs py-3.5 cursor-pointer"
          >
            {{ 'STONECRAFT.SIZING_GUIDE.GOT_IT' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SizingGuideModalComponent {
  public readonly close = output<void>();
}
