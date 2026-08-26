import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Matches `app-loading-skeleton` exactly — `width`, `height`, `customClass`,
 * same defaults, same pulse.
 *
 * `Sc`-prefixed because this app already exports a `LoadingSkeletonComponent` at
 * `@shared/components/loading-skeleton/loading-skeleton.component`. Two classes
 * sharing one name in one app is an auto-import that silently picks the wrong
 * one, so the prefix is not decoration.
 *
 * Since the inputs are identical, this file could be deleted and every call site
 * pointed at theirs. It is kept because `features/designer/designer.page.spec.ts`
 * asserts on the `sc-loading-skeleton` selector when it checks that the stage
 * stops showing a skeleton — swapping the component would mean editing an
 * enforcement spec to accommodate a cosmetic change, which is the wrong trade.
 */
@Component({
  selector: 'sc-loading-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="animate-pulse rounded bg-[#E5DFD3]/70"
      [class]="customClass()"
      [style.width]="width()"
      [style.height]="height()"
      aria-hidden="true"
    ></div>
  `,
})
export class ScLoadingSkeletonComponent {
  public readonly width = input<string>('100%');
  public readonly height = input<string>('20px');
  public readonly customClass = input<string>('');
}
