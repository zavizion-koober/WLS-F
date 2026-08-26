import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '@layout/header/header.component';
import { FooterComponent } from '@layout/footer/footer.component';
import { CartDrawerComponent } from '@layout/cart-drawer/cart-drawer.component';
import { SearchModalComponent } from '@layout/search-modal/search-modal.component';
import { ToastNotificationsComponent } from '@shared/components/toast-notifications/toast-notifications.component';

@Component({
  selector: 'app-root-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    CartDrawerComponent,
    SearchModalComponent,
    ToastNotificationsComponent,
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-[#F4F1EA] text-[#1A1A1D] selection:bg-[#CBB26A] selection:text-[#0D2B1D] overflow-x-clip max-w-full w-full">
      <!-- Global Shop Header -->
      <app-header />

      <!-- Main Router Content -->
      <main class="flex-1 w-full max-w-full overflow-x-clip">
        <router-outlet />
      </main>

      <!-- Global Shop Footer -->
      <app-footer />

      <!-- Slide-over Cart Drawer -->
      <app-cart-drawer />

      <!-- Global Search Modal -->
      <app-search-modal />

      <!-- Global Notifications Toast -->
      <app-toast-notifications />
    </div>
  `,
})
export class RootLayoutComponent {}
