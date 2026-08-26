import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, IconComponent],
  template: `
    <div class="atelier-container pt-8 pb-28">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8D8A81] mb-8">
        <a routerLink="/" class="hover:text-[#10523C] transition-colors">Home</a>
        <span>/</span>
        <span class="text-[#1A1A1D] font-medium">{{ 'NAVBAR.OUR_STORY' | translate }}</span>
      </nav>

      <!-- Editorial Hero Header -->
      <div class="max-w-3xl mb-16 space-y-4">
        <span class="text-eyebrow text-[#8A7029]">
          {{ 'ABOUT.HEADER_SUBTITLE' | translate }}
        </span>
        <h1 class="font-display text-hero font-bold text-[#1A1A1D] tracking-tight">
          {{ 'ABOUT.HEADER_TITLE' | translate }}
        </h1>
        <p class="font-display text-xl sm:text-2xl text-[#10523C] italic leading-relaxed pt-2">
          {{ 'ABOUT.NARRATIVE_HEADING' | translate }}
        </p>
      </div>

      <!-- Narrative Section with 2-column layout -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start pb-20 border-b border-[#E2DDD2]">
        <div class="lg:col-span-6 space-y-6 text-sm sm:text-base text-[#5F5D56] leading-relaxed font-body">
          <p>
            {{ 'ABOUT.NARRATIVE_P1' | translate }}
          </p>
          <p>
            {{ 'ABOUT.NARRATIVE_P2' | translate }}
          </p>
        </div>

        <div class="lg:col-span-6 bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl p-8 sm:p-10 space-y-4">
          <span class="text-[10px] uppercase tracking-[0.25em] text-[#8A7029] font-semibold">
            The Atelier Creed
          </span>
          <blockquote class="font-display text-lg text-[#1A1A1D] leading-relaxed italic">
            "The physical world is not separate from the spiritual world; it is its densest manifestation. When we shape matter with conscious intention, we shape reality."
          </blockquote>
        </div>
      </div>

      <!-- Pillars of Craftsmanship -->
      <div class="pt-20 pb-20 border-b border-[#E2DDD2]">
        <div class="text-center max-w-xl mx-auto mb-16 space-y-2">
          <span class="text-eyebrow text-[#8A7029]">
            Method & Materiality
          </span>
          <h2 class="font-display text-3xl sm:text-4xl font-bold text-[#1A1A1D]">
            The Three Tenets of Creation
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Pillar 1 -->
          <div class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-8 space-y-4 shadow-xs">
            <div class="w-12 h-12 rounded-full bg-[#10523C]/10 text-[#10523C] flex items-center justify-center">
              <app-icon name="sparkles" [size]="22" />
            </div>
            <h3 class="font-display text-lg font-bold text-[#1A1A1D]">
              {{ 'ABOUT.PILLARS.SOURCED_TITLE' | translate }}
            </h3>
            <p class="text-xs sm:text-sm text-[#5F5D56] leading-relaxed">
              {{ 'ABOUT.PILLARS.SOURCED_DESC' | translate }}
            </p>
          </div>

          <!-- Pillar 2 -->
          <div class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-8 space-y-4 shadow-xs">
            <div class="w-12 h-12 rounded-full bg-[#8A7029]/10 text-[#8A7029] flex items-center justify-center">
              <app-icon name="moon" [size]="22" />
            </div>
            <h3 class="font-display text-lg font-bold text-[#1A1A1D]">
              {{ 'ABOUT.PILLARS.LUNAR_TITLE' | translate }}
            </h3>
            <p class="text-xs sm:text-sm text-[#5F5D56] leading-relaxed">
              {{ 'ABOUT.PILLARS.LUNAR_DESC' | translate }}
            </p>
          </div>

          <!-- Pillar 3 -->
          <div class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-8 space-y-4 shadow-xs">
            <div class="w-12 h-12 rounded-full bg-[#10523C]/10 text-[#10523C] flex items-center justify-center">
              <app-icon name="shield" [size]="22" />
            </div>
            <h3 class="font-display text-lg font-bold text-[#1A1A1D]">
              {{ 'ABOUT.PILLARS.ARTIST_TITLE' | translate }}
            </h3>
            <p class="text-xs sm:text-sm text-[#5F5D56] leading-relaxed">
              {{ 'ABOUT.PILLARS.ARTIST_DESC' | translate }}
            </p>
          </div>
        </div>
      </div>

      <!-- CTA Callout -->
      <div class="pt-20 text-center max-w-2xl mx-auto space-y-6">
        <h2 class="font-display text-2xl sm:text-3xl font-bold text-[#1A1A1D]">
          {{ 'ABOUT.CTA_HEADING' | translate }}
        </h2>
        <p class="text-sm text-[#5F5D56] leading-relaxed">
          {{ 'ABOUT.CTA_DESC' | translate }}
        </p>
        <div>
          <a routerLink="/shop" class="btn-primary">
            {{ 'ABOUT.CTA_BTN' | translate }} →
          </a>
        </div>
      </div>
    </div>
  `,
})
export class AboutComponent {}
