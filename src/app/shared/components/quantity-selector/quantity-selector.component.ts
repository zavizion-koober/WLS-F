import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-quantity-selector',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="inline-flex items-center bg-[#FCFBF9] border border-[#E2DDD2] rounded-lg p-1">
      <button
        type="button"
        (click)="decrement()"
        [disabled]="value() <= min()"
        class="w-8 h-8 flex items-center justify-center rounded text-[#5F5D56] hover:text-[#1A1A1D] hover:bg-[#F4F1EA] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        aria-label="Decrease quantity"
      >
        <app-icon name="minus" [size]="14" />
      </button>

      <span class="w-10 text-center text-sm font-medium text-[#1A1A1D] select-none">
        {{ value() }}
      </span>

      <button
        type="button"
        (click)="increment()"
        [disabled]="value() >= max()"
        class="w-8 h-8 flex items-center justify-center rounded text-[#5F5D56] hover:text-[#1A1A1D] hover:bg-[#F4F1EA] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        aria-label="Increase quantity"
      >
        <app-icon name="plus" [size]="14" />
      </button>
    </div>
  `,
})
export class QuantitySelectorComponent {
  public readonly value = input.required<number>();
  public readonly min = input<number>(1);
  public readonly max = input<number>(99);
  public readonly valueChange = output<number>();

  public increment(): void {
    if (this.value() < this.max()) {
      this.valueChange.emit(this.value() + 1);
    }
  }

  public decrement(): void {
    if (this.value() > this.min()) {
      this.valueChange.emit(this.value() - 1);
    }
  }
}
