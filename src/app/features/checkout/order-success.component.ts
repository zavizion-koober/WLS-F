import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, IconComponent],
  template: `
    <div class="atelier-container pt-12 pb-28">
      <div class="max-w-xl mx-auto text-center bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl p-8 sm:p-12 shadow-sm space-y-6">
        <!-- Success seal icon -->
        <div class="w-16 h-16 rounded-full bg-[#10523C]/10 text-[#10523C] flex items-center justify-center mx-auto mb-2">
          <app-icon name="check" [size]="28" />
        </div>

        <div class="space-y-2">
          <span class="text-eyebrow text-[#8A7029]">
            Order Confirmed
          </span>
          <h1 class="font-display text-3xl sm:text-4xl font-bold text-[#1A1A1D]">
            {{ 'CHECKOUT.SUCCESS.TITLE' | translate }}
          </h1>
        </div>

        <p class="text-sm text-[#5F5D56] leading-relaxed max-w-md mx-auto">
          {{ 'CHECKOUT.SUCCESS.MESSAGE' | translate }}
        </p>

        @if (orderId) {
          <div class="p-4 bg-[#F4F1EA] rounded-lg border border-[#E2DDD2] text-xs text-[#5F5D56] space-y-1">
            <span class="text-[11px] uppercase tracking-wider text-[#8D8A81]">
              {{ 'CHECKOUT.SUCCESS.ORDER_NUMBER' | translate }}
            </span>
            <p class="font-mono font-semibold text-sm text-[#1A1A1D] select-all">
              {{ orderId }}
            </p>
          </div>
        }

        <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a routerLink="/account/orders" class="btn-primary w-full sm:w-auto text-xs">
            {{ 'CHECKOUT.SUCCESS.VIEW_ORDERS' | translate }}
          </a>

          <a routerLink="/shop" class="btn-secondary w-full sm:w-auto text-xs">
            {{ 'CHECKOUT.SUCCESS.CONTINUE_SHOPPING' | translate }}
          </a>
        </div>
      </div>
    </div>
  `,
})
export class OrderSuccessComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  public orderId: string | null = null;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.orderId = params['orderId'] || null;
    });
  }
}
