import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { BeadGrade } from '@core/models/api-enums';

/**
 * Wrist, bead size and grade.
 *
 * <b>No price, in any shape</b> — not per bead, not a total, not a disabled
 * control that would hold one, not a gap where one would go. The backend
 * computes none and this module never will.
 *
 * Grade therefore has to earn its copy: it means finish and consistency of the
 * cut, and the content key says so, because a two-option control with no stated
 * difference reads as a price tier whether or not one exists.
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
        <p class="text-eyebrow text-[var(--text-muted)]">
          {{ 'STONECRAFT.DESIGNER.WRIST' | translate }}
        </p>
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
      padding: 5px 13px;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .chip[aria-checked='true'] {
      background: var(--action-green);
      border-color: var(--action-green);
      color: var(--surface-primary);
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

  protected readonly grades: readonly BeadGrade[] = ['Standard', 'Premium'];
}
