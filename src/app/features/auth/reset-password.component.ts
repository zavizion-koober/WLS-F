import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { ResetPassword } from '@store/auth/auth.actions';
import { AuthSelectors } from '@store/auth/auth.selectors';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="atelier-container pt-12 pb-24">
      <div class="max-w-md mx-auto bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl p-8 sm:p-10 shadow-sm space-y-6">
        <!-- Header -->
        <div class="text-center space-y-2">
          <span class="text-eyebrow text-[#8A7029]">
            Reconsecration
          </span>
          <h1 class="font-display text-2xl sm:text-3xl font-bold text-[#1A1A1D]">
            {{ 'AUTH.CREATE_NEW_PASSWORD' | translate }}
          </h1>
          <p class="text-xs text-[#5F5D56] leading-relaxed">
            {{ 'AUTH.CREATE_NEW_PASSWORD_DESC' | translate }}
          </p>
        </div>

        <!-- Form -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 pt-2">
          @if (!tokenFromUrl) {
            <div>
              <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
                Reset Token
              </label>
              <input
                type="text"
                formControlName="token"
                placeholder="Paste token from email"
                class="atelier-input font-mono text-xs"
              />
            </div>
          }

          <div>
            <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
              {{ 'FORM.LABELS.PASSWORD' | translate }}
            </label>
            <input
              type="password"
              formControlName="newPassword"
              [placeholder]="'AUTH.NEW_PASSWORD_PLACEHOLDER' | translate"
              class="atelier-input"
            />
          </div>

          <div>
            <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
              {{ 'FORM.LABELS.CONFIRM_PASSWORD' | translate }}
            </label>
            <input
              type="password"
              formControlName="confirmPassword"
              [placeholder]="'FORM.PLACEHOLDERS.CONFIRM_PASSWORD' | translate"
              class="atelier-input"
            />
          </div>

          <button
            type="submit"
            [disabled]="form.invalid || loading()"
            class="btn-primary w-full text-center text-xs py-3.5 mt-2"
          >
            {{ loading() ? 'Updating...' : ('AUTH.UPDATE_PASSWORD' | translate) }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);

  public readonly loading = this.store.selectSignal(AuthSelectors.loading);
  public tokenFromUrl = '';

  public readonly form = this.fb.group(
    {
      token: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.matchValidator },
  );

  private matchValidator(g: any) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.tokenFromUrl = params['token'] || '';
      if (this.tokenFromUrl) {
        this.form.patchValue({ token: this.tokenFromUrl });
      }
    });
  }

  public onSubmit(): void {
    if (this.form.invalid) return;
    const { token, newPassword, confirmPassword } = this.form.value;

    this.store.dispatch(
      new ResetPassword({
        token: token!,
        newPassword: newPassword!,
        confirmPassword: confirmPassword!,
      }),
    );
  }
}
