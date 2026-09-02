import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { BeadGrade } from '@core/models/api-enums';

/**
 * Wrist, bead size and grade.
 *
 * Sizing controls with compact segmented chips and secondary sizing guide link.
 */
@Component({
  selector: 'sc-design-controls',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-5" aria-labelledby="controls-heading">
      <h2 id="controls-heading" class="sr-only">
        {{ 'STONECRAFT.DESIGNER.CONTROLS' | translate }}
      </h2>

      <div>
        <div class="flex items-center justify-between">
          <p class="text-eyebrow text-[var(--text-muted)]">
            {{ 'STONECRAFT.DESIGNER.WRIST' | translate }}
          </p>
          <button
            type="button"
            (click)="sizingGuideRequested.emit()"
            class="text-xs text-[#8A7029] hover:text-[#10523C] underline font-medium cursor-pointer transition-colors"
          >
            {{ 'STONECRAFT.SIZING_GUIDE.LINK_LABEL' | translate }}
          </button>
        </div>

        <div
          class="mt-2 flex flex-wrap gap-2"
          role="radiogroup"
          [attr.aria-label]="'STONECRAFT.DESIGNER.WRIST' | translate"
        >
          @for (mm of wristOptions(); track mm) {
            <button
              type="button"
              class="chip"
              role="radio"
              [attr.aria-checked]="mm === wristMm()"
              (click)="wristChanged.emit(mm)"
            >
              {{ mm }} mm
            </button>
          }
        </div>

        <!--
          The sizing table is provisional until the four craft values are settled,
          and rendering it as a settled size chart would publish a guess as a fact.
        -->
        @if (sizingStatus() === 'PROVISIONAL') {
          <p class="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
            {{ 'STONECRAFT.DESIGNER.PROVISIONAL_SIZING' | translate }}
          </p>
        }
      </div>

      <div>
        <p class="text-eyebrow text-[var(--text-muted)]">
          {{ 'STONECRAFT.DESIGNER.DIAMETER' | translate }}
        </p>
        <div
          class="mt-2 flex flex-wrap gap-2"
          role="radiogroup"
          [attr.aria-label]="'STONECRAFT.DESIGNER.DIAMETER' | translate"
        >
          @for (mm of diameterOptions(); track mm) {
            <button
              type="button"
              class="chip"
              role="radio"
              [attr.aria-checked]="mm === diameterMm()"
              (click)="diameterChanged.emit(mm)"
            >
              {{ mm }} mm
            </button>
          }
        </div>
      </div>

      <div>
        <p class="text-eyebrow text-[var(--text-muted)]">
          {{ 'STONECRAFT.DESIGNER.GRADE' | translate }}
        </p>
        <div
          class="mt-2 flex flex-wrap gap-2"
          role="radiogroup"
          [attr.aria-label]="'STONECRAFT.DESIGNER.GRADE' | translate"
        >
          @for (option of grades; track option) {
            <button
              type="button"
              class="chip"
              role="radio"
              [attr.aria-checked]="option === grade()"
              (click)="gradeChanged.emit(option)"
            >
              {{ 'STONECRAFT.DESIGNER.GRADE_' + option.toUpperCase() | translate }}
            </button>
          }
        </div>
        <p class="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
          {{ 'STONECRAFT.DESIGNER.GRADE_NOTE' | translate }}
        </p>
      </div>
    </section>
  `,
  styles: `
    .chip {
      border: 1px solid var(--border-medium);
      background: var(--surface-primary);
      border-radius: 99px;
      padding: 6px 14px;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    .chip:active {
      transform: scale(0.96);
    }

    .chip[aria-checked='true'] {
      background: var(--action-green);
      border-color: var(--action-green);
      color: var(--surface-primary);
      box-shadow: 0 1px 3px rgba(16, 82, 60, 0.2);
    }

    /*
      Outline rather than box-shadow: forced-colors mode suppresses box-shadow
      and preserves outline, so a shadow indicator vanishes for High Contrast
      users. See the long note in strand-view.component.ts.
    */
    .chip:focus-visible {
      outline: 1px solid var(--action-green);
      outline-offset: 1px;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class DesignControlsComponent {
  public readonly wristOptions = input.required<readonly number[]>();
  public readonly diameterOptions = input.required<readonly number[]>();
  public readonly wristMm = input.required<number>();
  public readonly diameterMm = input.required<number>();
  public readonly grade = input.required<BeadGrade>();
  public readonly sizingStatus = input<string>('');

  public readonly wristChanged = output<number>();
  public readonly diameterChanged = output<number>();
  public readonly gradeChanged = output<BeadGrade>();
  public readonly sizingGuideRequested = output<void>();

  protected readonly grades: readonly BeadGrade[] = ['Standard', 'Premium'];
}
