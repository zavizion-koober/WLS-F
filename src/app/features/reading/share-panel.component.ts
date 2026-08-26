import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { isLoading } from '@core/api/request-state';
import { ApiErrorComponent } from '@shared/components/api-error.component';

import { ReadingStore } from './reading.store';

/**
 * Sharing.
 *
 * The link points at `/shared/:shareToken`, which is a **different projection**,
 * not this page with fields hidden: no birth input, no chart, no data tier, no
 * unavailability list. The note under the button says so, because a person about
 * to send a link to a friend is entitled to know what the friend will see, and
 * "it shows the stones and the reasoning, never your birth details" is a promise
 * the backend actually keeps.
 */
@Component({
  selector: 'sc-share-panel',
  standalone: true,
  imports: [TranslatePipe, ApiErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="mt-14 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-5 py-5"
      aria-labelledby="share-heading"
    >
      <h2 id="share-heading" class="font-display text-card-title text-[var(--brand-green)]">
        {{ 'STONECRAFT.READING.SHARE' | translate }}
      </h2>
      <p class="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
        {{ 'STONECRAFT.READING.SHARE_NOTE' | translate }}
      </p>

      @if (shareUrl(); as url) {
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            readonly
            class="atelier-input flex-1 min-w-[16rem]"
            [value]="url"
            [attr.aria-label]="'STONECRAFT.READING.SHARE_LINK' | translate"
            (focus)="selectAll($event)"
          />
          <button type="button" class="btn-secondary" (click)="copy(url)">
            @if (copied()) {
              {{ 'STONECRAFT.READING.SHARE_COPIED' | translate }}
            } @else {
              {{ 'STONECRAFT.READING.SHARE_COPY' | translate }}
            }
          </button>
        </div>

        <button type="button" class="btn-secondary mt-3" [disabled]="busy()" (click)="stop()">
          {{ 'STONECRAFT.READING.SHARE_STOP' | translate }}
        </button>
      } @else {
        <button type="button" class="btn-primary mt-4" [disabled]="busy()" (click)="start()">
          @if (busy()) {
            {{ 'STONECRAFT.STATE.LOADING' | translate }}
          } @else {
            {{ 'STONECRAFT.READING.SHARE_START' | translate }}
          }
        </button>
      }

      @if (failure(); as f) {
        <div class="mt-4">
          <sc-api-error [failure]="f" (retry)="start()" />
        </div>
      }
    </section>
  `,
})
export class SharePanelComponent {
  public readonly publicId = input.required<string>();

  private readonly store = inject(ReadingStore);
  private readonly document = inject(DOCUMENT);

  protected readonly copied = signal(false);

  protected readonly busy = computed(() => isLoading(this.store.sharing()));

  protected readonly failure = computed(() => {
    const state = this.store.sharing();
    return state.status === 'error' ? state.failure : null;
  });

  protected readonly shareUrl = computed(() => {
    const token = this.store.shareToken();
    if (token === null) {
      return null;
    }

    // Built from the live origin rather than a configured base so a preview
    // deployment produces a link to itself.
    const origin = this.document.defaultView?.location.origin ?? '';
    return `${origin}/shared/${token}`;
  });

  protected start(): void {
    this.store.setShared(this.publicId(), true);
  }

  protected stop(): void {
    this.copied.set(false);
    this.store.setShared(this.publicId(), false);
  }

  protected selectAll(event: Event): void {
    (event.target as HTMLInputElement).select();
  }

  protected async copy(url: string): Promise<void> {
    try {
      await this.document.defaultView?.navigator.clipboard.writeText(url);
      this.copied.set(true);
    } catch {
      // Clipboard access can be refused, and there is nothing to recover: the
      // link is on screen in a focusable, selectable input, which is why it is
      // rendered as one rather than as text behind a copy button.
      this.copied.set(false);
    }
  }
}
