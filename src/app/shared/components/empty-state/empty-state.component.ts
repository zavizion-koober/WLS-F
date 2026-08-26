import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent, IconName } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="flex flex-col items-center justify-center text-center py-16 px-4">
      <div class="w-16 h-16 rounded-full bg-[#FCFBF9] border border-[#E2DDD2] flex items-center justify-center text-[#8A7029] mb-6 shadow-xs">
        <app-icon [name]="icon()" [size]="28" />
      </div>

      <h3 class="text-xl sm:text-2xl font-display font-medium text-[#1A1A1D] mb-2">
        {{ title() }}
      </h3>

      @if (description()) {
        <p class="text-sm text-[#5F5D56] max-w-md leading-relaxed mb-8">
          {{ description() }}
        </p>
      }

      @if (actionLabel()) {
        @if (actionLink()) {
          <a [routerLink]="actionLink()" class="btn-primary">
            {{ actionLabel() }}
          </a>
        } @else {
          <button type="button" (click)="onAction()" class="btn-primary cursor-pointer">
            {{ actionLabel() }}
          </button>
        }
      }
    </div>
  `,
})
export class EmptyStateComponent {
  public readonly icon = input<IconName>('sparkles');
  public readonly title = input.required<string>();
  public readonly description = input<string>('');
  public readonly actionLabel = input<string | null>(null);
  public readonly actionLink = input<string | null>(null);
  public readonly actionClick = input<(() => void) | null>(null);
  public readonly action = output<void>();

  public onAction(): void {
    this.action.emit();
    const fn = this.actionClick();
    if (fn) fn();
  }
}
