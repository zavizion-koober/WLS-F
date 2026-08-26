import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { ForgotPassword } from '@store/auth/auth.actions';
import { AuthSelectors } from '@store/auth/auth.selectors';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="atelier-container pt-12 pb-24">
      <div class="max-w-md mx-auto bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl p-8 sm:p-10 shadow-sm space-y-6">
        <!-- Header -->
        <div class="text-center space-y-2">
          <span class="text-eyebrow text-[#8A7029]">
            Key Recovery
          </span>
          <h1 class="font-display text-2xl sm:text-3xl font-bold text-[#1A1A1D]">
            {{ 'AUTH.RESET_PASSWORD' | translate }}
          </h1>
          <p class="text-xs text-[#5F5D56] leading-relaxed">
            {{ 'AUTH.RESET_PASSWORD_DESC' | translate }}
          </p>
        </div>

        @if (sent()) {
          <div class="p-4 bg-[#F4F1EA] rounded-xl border border-[#10523C]/30 text-center space-y-3">
            <h3 class="text-sm font-semibold text-[#10523C]">
              {{ 'AUTH.CHECK_YOUR_EMAIL' | translate }}
            </h3>
            <p class="text-xs text-[#5F5D56] leading-relaxed">
              {{ 'AUTH.RESET_EMAIL_SENT_DESC' | translate }}
            </p>
            <a routerLink="/login" class="btn-secondary text-xs py-2 px-4 inline-block mt-2">
              {{ 'AUTH.BACK_TO_LOGIN' | translate }}
            </a>
          </div>
        } @else {
          <!-- Form -->
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 pt-2">
            <div>
              <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
                {{ 'FORM.LABELS.EMAIL' | translate }}
              </label>
              <input
                type="email"
                formControlName="email"
                [placeholder]="'FORM.PLACEHOLDERS.EMAIL' | translate"
                class="atelier-input"
              />
            </div>

            <button
              type="submit"
              [disabled]="form.invalid || loading()"
              class="btn-primary w-full text-center text-xs py-3.5 mt-2"
            >
              {{ loading() ? 'Sending...' : ('AUTH.SEND_RESET_LINK' | translate) }}
            </button>
          </form>

          <div class="text-center pt-2 border-t border-[#E2DDD2]">
            <a routerLink="/login" class="text-xs text-[#5F5D56] hover:text-[#1A1A1D]">
              ← {{ 'AUTH.BACK_TO_LOGIN' | translate }}
            </a>
          </div>
        }
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  public readonly loading = this.store.selectSignal(AuthSelectors.loading);
  public readonly sent = signal(false);

  public readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  public onSubmit(): void {
    if (this.form.invalid) return;
    const email = this.form.value.email!;

    this.store.dispatch(new ForgotPassword(email)).subscribe({
      next: () => this.sent.set(true),
    });
  }
}
