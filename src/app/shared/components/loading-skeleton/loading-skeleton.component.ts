import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="animate-pulse bg-[#E5DFD3]/70 rounded"
      [ngClass]="customClass()"
      [style.width]="width()"
      [style.height]="height()"
    ></div>
  `,
})
export class LoadingSkeletonComponent {
  public readonly width = input<string>('100%');
  public readonly height = input<string>('20px');
  public readonly customClass = input<string>('');
}
