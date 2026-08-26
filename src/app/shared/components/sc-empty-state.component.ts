import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Matches `app-empty-state` — same inputs, same optional action, same layout and
 * the same gold-on-cream medallion.
 *
 * `Sc`-prefixed because this app already exports an `EmptyStateComponent` at
 * `@shared/components/empty-state/empty-state.component`. The selectors never
 * collided — theirs is `app-empty-state` — but two classes sharing one name in
 * one app is an auto-import that silently picks the wrong one.
 *
 * Kept as a separate component rather than swapped for theirs because the two
 * differ at the edges: theirs takes an `icon` naming an entry in its own icon
 * component's `IconName` union, and an `actionClick` callback. That union is
 * theirs and copying it here would fork it, so the medallion is rendered from a
 * projected `<ng-content>` instead. A caller that passes nothing gets the plain
 * circle, which is the common case.
 */
@Component({
  selector: 'sc-empty-state',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div
        class="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--gold-muted)] shadow-xs"
      >
        <ng-content />
      </div>

      <h3 class="font-display mb-2 text-xl font-medium text-[var(--text-primary)] sm:text-2xl">
        {{ title() }}
      </h3>

      @if (description()) {
        <p class="mb-8 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
          {{ description() }}
        </p>
      }

      @if (actionLabel()) {
        @if (actionLink()) {
          <a [routerLink]="actionLink()" class="btn-primary">{{ actionLabel() }}</a>
        } @else {
          <button type="button" class="btn-primary cursor-pointer" (click)="action.emit()">
            {{ actionLabel() }}
          </button>
        }
      }
    </div>
  `,
})
export class ScEmptyStateComponent {
  public readonly title = input.required<string>();
  public readonly description = input<string>('');
  public readonly actionLabel = input<string | null>(null);
  public readonly actionLink = input<string | null>(null);
  public readonly action = output<void>();
}
