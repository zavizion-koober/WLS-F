import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'sc-step-wizard',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="mb-8 w-full max-w-xl mx-auto py-2"
      [attr.aria-label]="'STONECRAFT.STEPS.NAV_LABEL' | translate"
    >
      <ol class="flex items-center justify-between gap-1 sm:gap-2">
        <!-- Step 1: Birth details -->
        <li class="flex items-center gap-2">
          @if (currentStep() > 1) {
            <a
              routerLink="/reading"
              class="group flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-[#10523C] hover:text-[#8A7029] transition-colors cursor-pointer"
            >
              <span
                class="w-6 h-6 rounded-full bg-[#10523C] text-[#FCFBF9] flex items-center justify-center text-[11px] font-bold shadow-2xs group-hover:bg-[#8A7029] transition-colors"
              >
                ✓
              </span>
              <span class="hidden xs:inline">{{ 'STONECRAFT.STEPS.BIRTH' | translate }}</span>
            </a>
          } @else {
            <div class="flex items-center gap-1.5 sm:gap-2 text-xs font-bold text-[#10523C]">
              <span
                class="w-6 h-6 rounded-full bg-[#10523C] text-[#FCFBF9] flex items-center justify-center text-[11px] font-bold shadow-2xs ring-2 ring-[#CBB26A]/50"
              >
                1
              </span>
              <span class="hidden xs:inline">{{ 'STONECRAFT.STEPS.BIRTH' | translate }}</span>
            </div>
          }
        </li>

        <!-- Divider 1 -> 2 -->
        <li class="flex-1 h-[1.5px] transition-colors" [class.bg-[#10523C]]="currentStep() > 1" [class.bg-[#E2DDD2]]="currentStep() <= 1"></li>

        <!-- Step 2: Stone palette -->
        <li class="flex items-center gap-2">
          @if (currentStep() === 2) {
            <div class="flex items-center gap-1.5 sm:gap-2 text-xs font-bold text-[#10523C]">
              <span
                class="w-6 h-6 rounded-full bg-[#10523C] text-[#FCFBF9] flex items-center justify-center text-[11px] font-bold shadow-2xs ring-2 ring-[#CBB26A]/50"
              >
                2
              </span>
              <span class="hidden xs:inline">{{ 'STONECRAFT.STEPS.PALETTE' | translate }}</span>
            </div>
          } @else if (currentStep() > 2 && publicId()) {
            <a
              [routerLink]="['/reading', publicId()]"
              class="group flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-[#10523C] hover:text-[#8A7029] transition-colors cursor-pointer"
            >
              <span
                class="w-6 h-6 rounded-full bg-[#10523C] text-[#FCFBF9] flex items-center justify-center text-[11px] font-bold shadow-2xs group-hover:bg-[#8A7029] transition-colors"
              >
                ✓
              </span>
              <span class="hidden xs:inline">{{ 'STONECRAFT.STEPS.PALETTE' | translate }}</span>
            </a>
          } @else {
            <div class="flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-[#8D8A81]">
              <span
                class="w-6 h-6 rounded-full bg-[#E2DDD2] text-[#5F5D56] flex items-center justify-center text-[11px] font-medium"
              >
                2
              </span>
              <span class="hidden xs:inline">{{ 'STONECRAFT.STEPS.PALETTE' | translate }}</span>
            </div>
          }
        </li>

        <!-- Divider 2 -> 3 -->
        <li class="flex-1 h-[1.5px] transition-colors" [class.bg-[#10523C]]="currentStep() > 2" [class.bg-[#E2DDD2]]="currentStep() <= 2"></li>

        <!-- Step 3: Bracelet craft -->
        <li class="flex items-center gap-2">
          @if (currentStep() === 3) {
            <div class="flex items-center gap-1.5 sm:gap-2 text-xs font-bold text-[#10523C]">
              <span
                class="w-6 h-6 rounded-full bg-[#10523C] text-[#FCFBF9] flex items-center justify-center text-[11px] font-bold shadow-2xs ring-2 ring-[#CBB26A]/50"
              >
                3
              </span>
              <span class="hidden xs:inline">{{ 'STONECRAFT.STEPS.BRACELET' | translate }}</span>
            </div>
          } @else if (publicId() && currentStep() >= 2) {
            <a
              [routerLink]="['/designer', publicId()]"
              class="group flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-[#8D8A81] hover:text-[#10523C] transition-colors cursor-pointer"
            >
              <span
                class="w-6 h-6 rounded-full bg-[#E2DDD2] text-[#5F5D56] group-hover:bg-[#10523C] group-hover:text-[#FCFBF9] flex items-center justify-center text-[11px] font-medium transition-colors"
              >
                3
              </span>
              <span class="hidden xs:inline">{{ 'STONECRAFT.STEPS.BRACELET' | translate }}</span>
            </a>
          } @else {
            <div class="flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-[#8D8A81]">
              <span
                class="w-6 h-6 rounded-full bg-[#E2DDD2] text-[#5F5D56] flex items-center justify-center text-[11px] font-medium"
              >
                3
              </span>
              <span class="hidden xs:inline">{{ 'STONECRAFT.STEPS.BRACELET' | translate }}</span>
            </div>
          }
        </li>
      </ol>
    </nav>
  `,
})
export class ScStepWizardComponent {
  public readonly currentStep = input.required<1 | 2 | 3>();
  public readonly publicId = input<string | null>(null);
}
