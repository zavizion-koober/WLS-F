import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AppInitService } from '@core/services/app-init.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    @if (appInit.isBooting()) {
      <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F4F1EA] text-[#1A1A1D]">
        <div class="text-center space-y-3">
          <span class="font-logo text-3xl font-bold tracking-tight text-[#1A1A1D] animate-pulse">
            WITCHLAB
          </span>
          <p class="text-[10px] uppercase tracking-[0.25em] text-[#8A7029] font-medium">
            Preparing Sacred Space...
          </p>
        </div>
      </div>
    }
    <router-outlet />
  `,
})
export class AppComponent {
  public readonly appInit = inject(AppInitService);
}
