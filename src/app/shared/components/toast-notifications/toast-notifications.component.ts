import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationItem, NotificationService, NotificationType } from '@core/services/notification.service';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-toast-notifications',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div
      class="fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-50 flex flex-col gap-3 max-w-[370px] sm:max-w-md w-[calc(100%-2.5rem)] sm:w-full pointer-events-none select-none"
      aria-live="polite"
    >
      @for (item of notificationService.notifications(); track item.id) {
        <div
          class="pointer-events-auto relative overflow-hidden rounded-xl bg-[#FCFBF9] border border-[#E2DDD2] shadow-[0_20px_45px_-12px_rgba(26,26,29,0.18)] p-4 sm:p-4.5 flex items-start justify-between gap-3.5 animate-toast-in transition-all duration-300"
          [ngClass]="{
            'border-l-4 border-l-[#10523C]': item.type === 'success',
            'border-l-4 border-l-[#991B1B]': item.type === 'error',
            'border-l-4 border-l-[#8A7029]': item.type === 'warning',
            'border-l-4 border-l-[#1A1A1D]': item.type === 'info'
          }"
        >
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <!-- Botanical Talisman Seal Badge -->
            @if (item.type === 'success') {
              <div class="w-8 h-8 rounded-full bg-[#10523C]/10 border border-[#10523C]/20 text-[#10523C] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <app-icon name="check" [size]="16" />
              </div>
            } @else if (item.type === 'error') {
              <div class="w-8 h-8 rounded-full bg-[#991B1B]/10 border border-[#991B1B]/20 text-[#991B1B] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <app-icon name="close" [size]="15" />
              </div>
            } @else if (item.type === 'warning') {
              <div class="w-8 h-8 rounded-full bg-[#8A7029]/10 border border-[#8A7029]/20 text-[#8A7029] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <app-icon name="sparkles" [size]="16" />
              </div>
            } @else {
              <div class="w-8 h-8 rounded-full bg-[#1A1A1D]/10 border border-[#1A1A1D]/20 text-[#1A1A1D] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <app-icon name="info" [size]="16" />
              </div>
            }

            <!-- Message & Eyebrow Content -->
            <div class="space-y-1 min-w-0 flex-1 pr-1">
              <div class="flex items-center gap-1.5">
                <h4
                  class="text-[10.5px] sm:text-[11px] uppercase tracking-[0.18em] font-bold font-body"
                  [ngClass]="{
                    'text-[#10523C]': item.type === 'success',
                    'text-[#991B1B]': item.type === 'error',
                    'text-[#8A7029]': item.type === 'warning',
                    'text-[#1A1A1D]': item.type === 'info'
                  }"
                >
                  {{ item.title || getDefaultTitle(item.type) }}
                </h4>
              </div>

              <p class="text-xs sm:text-sm text-[#1A1A1D] font-normal leading-relaxed font-body break-words">
                {{ item.message }}
              </p>
            </div>
          </div>

          <!-- Dismiss Button -->
          <button
            type="button"
            (click)="notificationService.dismiss(item.id)"
            class="text-[#8D8A81] hover:text-[#1A1A1D] hover:bg-[#E2DDD2]/60 p-1.5 rounded-full transition-all cursor-pointer shrink-0 -mr-1 -mt-1 active:scale-95"
            aria-label="Close notification"
          >
            <app-icon name="close" [size]="14" />
          </button>

          <!-- Bottom Animated Countdown Progress Bar -->
          @if (item.duration && item.duration > 0) {
            <div
              class="absolute bottom-0 left-0 right-0 h-[2.5px] origin-left animate-toast-progress"
              [style.animation-duration.ms]="item.duration"
              [ngClass]="{
                'bg-[#10523C]': item.type === 'success',
                'bg-[#991B1B]': item.type === 'error',
                'bg-[#8A7029]': item.type === 'warning',
                'bg-[#1A1A1D]': item.type === 'info'
              }"
            ></div>
          }
        </div>
      }
    </div>
  `,
})
export class ToastNotificationsComponent {
  public readonly notificationService = inject(NotificationService);

  public getDefaultTitle(type: NotificationType): string {
    switch (type) {
      case 'success':
        return '✦ CONSECRATION';
      case 'error':
        return '✦ NOTICE';
      case 'warning':
        return '✦ ATELIER ADVICE';
      case 'info':
      default:
        return '✦ ATELIER NOTE';
    }
  }
}


