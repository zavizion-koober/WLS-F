import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { StrandPosition } from '@core/models/bracelets.models';

import { MINIMUM_RING_BEADS } from '../bracelet-design.store';

import { beadImage } from './bead-image';

/**
 * The beads laid flat, whenever there is no ring to draw.
 *
 * <b>Three is the fewest that closes.</b> `SolveRadius` answers
 * `GEOMETRY_DEGENERATE` below it, correctly — two beads are a line segment. So
 * this draws what the thing physically is at that point: an open strand, with a
 * line saying a bracelet needs three.
 *
 * Drawing a two-bead "ring" would require the client to invent a radius, which
 * is the one thing this feature forbids. There is no geometry here at all — the
 * beads are laid out by flexbox.
 *
 * <b>It also covers the moment before the first ring exists.</b> On the third
 * bead the strand can close but nothing has solved it yet, and the page shows
 * this rather than a loading skeleton — the beads a person just placed are
 * better company for that moment than a grey box. The count line is suppressed
 * at three and above, because "a bracelet needs at least three beads" is not
 * what to say to somebody who has just placed the third.
 */
@Component({
  selector: 'sc-open-strand',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="strand-stage flex-col gap-6">
      @if (positions().length === 0) {
        <p class="max-w-xs text-center text-sm leading-relaxed text-[var(--text-muted)]">
          {{ 'STONECRAFT.DESIGNER.EMPTY_STRAND' | translate }}
        </p>
      } @else {
        <ul class="flex items-center gap-1" role="list">
          @for (position of positions(); track $index) {
            <li>
              <button
                type="button"
                class="block h-16 w-16 rounded-full border border-[var(--border-subtle)] p-0"
                [attr.aria-label]="label(position, $index)"
                (click)="slotRemoved.emit($index)"
              >
                @if (image(position.materialSlug); as href) {
                  <img [src]="href" alt="" class="h-full w-full" />
                } @else {
                  <span
                    class="block h-full w-full rounded-full border border-dashed border-[var(--border-dark)]"
                  ></span>
                }
              </button>
            </li>
          }
        </ul>

        @if (positions().length < minimumBeads) {
          <p class="max-w-xs text-center text-sm leading-relaxed text-[var(--text-secondary)]">
            {{ 'STONECRAFT.DESIGNER.NEEDS_THREE' | translate: { count: positions().length } }}
          </p>
        }
      }
    </div>
  `,
  styles: `
    .strand-stage {
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
      width: 100%;
      max-width: 520px;
      margin-inline: auto;
      border-radius: 8px;
      background: radial-gradient(
        circle at 50% 42%,
        #fff 0%,
        var(--surface-primary) 55%,
        var(--surface-secondary) 100%
      );
    }
  `,
})
export class OpenStrandComponent {
  public readonly positions = input.required<readonly StrandPosition[]>();

  protected readonly minimumBeads = MINIMUM_RING_BEADS;

  public readonly slotRemoved = output<number>();

  protected image(slug: string): string | null {
    return beadImage(slug);
  }

  protected label(position: StrandPosition, index: number): string {
    return `${index + 1}: ${position.materialSlug}, ${position.diameterMm} mm`;
  }
}
