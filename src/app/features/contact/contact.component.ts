import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, IconComponent],
  template: `
    <div class="atelier-container pt-8 pb-28 max-w-4xl">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8D8A81] mb-8">
        <a routerLink="/" class="hover:text-[#10523C] transition-colors">Home</a>
        <span>/</span>
        <span class="text-[#1A1A1D] font-medium">{{ 'NAVBAR.CONTACT' | translate }}</span>
      </nav>

      <!-- Page Header -->
      <div class="mb-12 space-y-3">
        <span class="text-eyebrow text-[#8A7029]">
          Direct Correspondence
        </span>
        <h1 class="font-display text-page-title font-bold text-[#1A1A1D]">
          The WitchLab Atelier
        </h1>
        <p class="text-sm text-[#5F5D56] leading-relaxed max-w-2xl">
          For custom ritual inquiries, bespoke talisman consultation, or orders verification, reach our atelier directly.
        </p>
      </div>

      <!-- Information Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Physical Studio -->
        <div class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl p-8 space-y-4 shadow-xs">
          <div class="w-12 h-12 rounded-full bg-[#10523C]/10 text-[#10523C] flex items-center justify-center">
            <app-icon name="sparkles" [size]="22" />
          </div>

          <h3 class="font-display text-lg font-bold text-[#1A1A1D]">
            Physical Studio & Atelier
          </h3>

          <div class="space-y-1 text-xs text-[#5F5D56] leading-relaxed font-body">
            <p class="font-semibold text-sm text-[#1A1A1D]">WitchLab Botanical Studio</p>
            <p>Tbilisi, Georgia</p>
            <p class="text-[#8A7029] font-medium pt-2">Hours: Mon – Fri (11:00 – 19:00 GET)</p>
          </div>
        </div>

        <!-- Electronic Correspondence -->
        <div class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl p-8 space-y-4 shadow-xs">
          <div class="w-12 h-12 rounded-full bg-[#8A7029]/10 text-[#8A7029] flex items-center justify-center">
            <app-icon name="shield" [size]="22" />
          </div>

          <h3 class="font-display text-lg font-bold text-[#1A1A1D]">
            Electronic Correspondence
          </h3>

          <div class="space-y-3 text-xs text-[#5F5D56] leading-relaxed font-body">
            <div>
              <span class="block text-[11px] uppercase tracking-wider text-[#8D8A81]">Atelier Inquiries:</span>
              <a href="mailto:contact&#64;witchlab.ge" class="font-semibold text-sm text-[#10523C] hover:underline">
                contact&#64;witchlab.ge
              </a>
            </div>

            <div>
              <span class="block text-[11px] uppercase tracking-wider text-[#8D8A81]">Direct Telephone:</span>
              <a href="tel:+995322000000" class="font-semibold text-sm text-[#10523C] hover:underline">
                +995 (32) 200-0000
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Additional Guidance -->
      <div class="mt-12 p-8 bg-[#F4F1EA] border border-[#E2DDD2] rounded-2xl space-y-4">
        <h4 class="text-xs uppercase tracking-widest text-[#8A7029] font-bold">
          Consultation & Custom Spellwork
        </h4>
        <p class="text-xs sm:text-sm text-[#5F5D56] leading-relaxed">
          Due to the small-batch nature of our botanical distillations and lunar casting cycles, custom commission requests require a minimum 3-week lead time. Please send all astrological chart details and intended transformation goals via email.
        </p>
      </div>
    </div>
  `,
})
export class ContactComponent {}
