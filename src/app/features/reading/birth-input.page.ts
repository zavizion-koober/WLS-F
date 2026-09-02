import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { isError, isLoading, isSuccess } from '@core/api/request-state';
import { LastReadingService } from '@core/services/last-reading.service';
import { ApiErrorComponent } from '@shared/components/api-error.component';
import { ScStepWizardComponent } from '@shared/components/sc-step-wizard.component';

import {
  emptyBirthForm,
  toBirthInput,
  validateBirthForm,
  type BirthFormValue,
} from './birth/birth-input.form';
import { PlaceLookupService, type Place } from './birth/place-lookup.service';
import { ReadingStore } from './reading.store';

/**
 * The birth input form.
 *
 * <b>Client-rendered, and the birth data goes browser → API directly.</b> There
 * is no server-side pass on this route and no `/api` proxy on our node server, so
 * date, exact time and place never transit anything we operate on their way to
 * the backend. On success this navigates to `/reading/:publicId` — the id is
 * opaque and carries nothing, and nothing the person typed is ever put in a URL.
 */
@Component({
  selector: 'sc-birth-input-page',
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink, TranslatePipe, ApiErrorComponent, ScStepWizardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="atelier-container max-w-2xl py-10 md:py-16">
      <sc-step-wizard [currentStep]="1" [publicId]="resumeId()" />

      @if (resumeId(); as prevId) {
        <div
          class="mb-8 p-4 sm:p-5 rounded-xl bg-[#FCFBF9] border border-[#CBB26A]/60 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div class="space-y-1">
            <span class="text-[10px] uppercase tracking-widest text-[#8A7029] font-semibold flex items-center gap-1.5">
              <span>✦</span>
              <span>{{ 'STONECRAFT.BIRTH.RESUME_TITLE' | translate }}</span>
            </span>
            <p class="text-xs text-[#5F5D56] leading-relaxed">
              {{ 'STONECRAFT.BIRTH.RESUME_DESC' | translate }}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <a
              [routerLink]="['/designer', prevId]"
              class="btn-primary text-xs py-2 px-4 text-center w-full sm:w-auto"
            >
              {{ 'STONECRAFT.BIRTH.RESUME_CTA' | translate }} →
            </a>
          </div>
        </div>
      }

      <p class="text-eyebrow text-[var(--gold-muted)]">
        {{ 'STONECRAFT.NAV.READING' | translate }}
      </p>
      <h1 class="font-display text-page-title mt-3 text-[var(--brand-green)]">
        {{ 'STONECRAFT.BIRTH.TITLE' | translate }}
      </h1>
      <p class="mt-4 max-w-xl leading-relaxed text-[var(--text-secondary)]">
        {{ 'STONECRAFT.BIRTH.LEAD' | translate }}
      </p>

      <div class="gold-rule mt-8"></div>

      <form class="mt-10 space-y-8" (ngSubmit)="submit()" novalidate>
        <!-- Date -->
        <div>
          <label for="birth-date" class="text-eyebrow block text-[var(--text-secondary)]">
            {{ 'STONECRAFT.BIRTH.DATE_LABEL' | translate }}
          </label>
          <input
            id="birth-date"
            type="date"
            name="localDate"
            class="atelier-input mt-2"
            [class.error]="errors().date && touched()"
            [ngModel]="form().localDate"
            (ngModelChange)="patch({ localDate: $event })"
            [attr.min]="earliest"
            [attr.aria-invalid]="!!errors().date && touched()"
            [attr.aria-describedby]="errors().date && touched() ? 'birth-date-error' : null"
          />
          @if (errors().date; as code) {
            @if (touched()) {
              <p id="birth-date-error" class="mt-2 text-sm text-[#c53030]">
                {{ 'STONECRAFT.BIRTH.ERRORS.' + code | translate }}
              </p>
            }
          }
        </div>

        <!-- Time -->
        <div>
          <label for="birth-time" class="text-eyebrow block text-[var(--text-secondary)]">
            {{ 'STONECRAFT.BIRTH.TIME_LABEL' | translate }}
          </label>
          <input
            id="birth-time"
            type="time"
            name="localTime"
            class="atelier-input mt-2"
            [class.error]="errors().time && touched()"
            [disabled]="form().timeUnknown"
            [ngModel]="form().localTime"
            (ngModelChange)="patch({ localTime: $event })"
            [attr.aria-invalid]="!!errors().time && touched()"
          />

          <label class="mt-3 flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="timeUnknown"
              class="mt-0.5 accent-[var(--action-green)]"
              [ngModel]="form().timeUnknown"
              (ngModelChange)="patch({ timeUnknown: $event })"
            />
            <span class="text-[var(--text-primary)]">
              {{ 'STONECRAFT.BIRTH.TIME_UNKNOWN' | translate }}
            </span>
          </label>

          @if (form().timeUnknown) {
            <p
              class="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 py-3 text-sm leading-relaxed text-[var(--text-secondary)]"
            >
              {{ 'STONECRAFT.BIRTH.TIME_UNKNOWN_NOTE' | translate }}
            </p>
          } @else if (errors().time && touched()) {
            <p class="mt-2 text-sm text-[#c53030]">
              {{ 'STONECRAFT.BIRTH.ERRORS.' + errors().time | translate }}
            </p>
          }
        </div>

        <!-- Place -->
        <div>
          <label for="birth-place" class="text-eyebrow block text-[var(--text-secondary)]">
            {{ 'STONECRAFT.BIRTH.PLACE_LABEL' | translate }}
          </label>

          @if (form().place; as chosen) {
            <div
              class="atelier-input mt-2 flex items-center justify-between gap-3"
              data-testid="chosen-place"
            >
              <span class="truncate">{{ chosen.label }}, {{ chosen.country }}</span>
              <button
                type="button"
                class="text-eyebrow shrink-0 cursor-pointer text-[var(--action-green)]"
                (click)="clearPlace()"
              >
                {{ 'STONECRAFT.BIRTH.PLACE_CHANGE' | translate }}
              </button>
            </div>
          } @else {
            <input
              id="birth-place"
              type="text"
              name="placeQuery"
              autocomplete="off"
              class="atelier-input mt-2"
              [class.error]="errors().place && touched()"
              [placeholder]="placeholderKey() | translate"
              [ngModel]="placeQuery()"
              (ngModelChange)="placeQuery.set($event)"
              role="combobox"
              [attr.aria-expanded]="matches().length > 0"
              aria-controls="place-matches"
            />

            @if (matches().length > 0) {
              <ul
                id="place-matches"
                role="listbox"
                class="mt-2 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
              >
                @for (match of matches(); track match.key) {
                  <li role="option" [attr.aria-selected]="false">
                    <button
                      type="button"
                      class="w-full cursor-pointer px-4 py-2.5 text-left text-sm hover:bg-[var(--surface-secondary)]"
                      (click)="choose(match.place)"
                    >
                      <span class="text-[var(--text-primary)]">{{ match.place.label }}</span>
                      <span class="text-[var(--text-muted)]">, {{ match.place.country }}</span>
                      <!--
                        Around a thousand places share a name with another in the
                        same country, and two of them can be fifty kilometres
                        apart. Two identical rows give a person nothing to choose
                        on, so ambiguous ones — and only those — carry their
                        coordinates.
                      -->
                      @if (match.ambiguous) {
                        <span class="ml-2 text-xs text-[var(--text-muted)] tabular-nums">
                          {{ match.place.latitude | number: '1.2-2' }},
                          {{ match.place.longitude | number: '1.2-2' }}
                        </span>
                      }
                    </button>
                  </li>
                }
              </ul>
            }

            @if (places.state() === 'failed') {
              <p class="mt-2 text-sm text-[#c53030]">
                {{ 'STONECRAFT.BIRTH.PLACE_LIST_FAILED' | translate }}
              </p>
            }

            <!--
              The escape hatch, and a real one. The list is large but it is not
              every settlement on earth; someone born in a small village needs a
              way through that does not involve pretending they were born in the
              nearest city.
            -->
            <details class="mt-3">
              <summary
                class="text-eyebrow cursor-pointer text-[var(--action-green)] hover:text-[var(--gold-muted)]"
              >
                {{ 'STONECRAFT.BIRTH.PLACE_MANUAL' | translate }}
              </summary>
              <p class="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {{ 'STONECRAFT.BIRTH.PLACE_MANUAL_NOTE' | translate }}
              </p>
              <div class="mt-3 grid grid-cols-2 gap-3">
                <input
                  type="text"
                  inputmode="decimal"
                  name="latitude"
                  class="atelier-input"
                  [placeholder]="'STONECRAFT.BIRTH.LATITUDE' | translate"
                  [ngModel]="form().latitude"
                  (ngModelChange)="patch({ latitude: $event })"
                />
                <input
                  type="text"
                  inputmode="decimal"
                  name="longitude"
                  class="atelier-input"
                  [placeholder]="'STONECRAFT.BIRTH.LONGITUDE' | translate"
                  [ngModel]="form().longitude"
                  (ngModelChange)="patch({ longitude: $event })"
                />
              </div>
            </details>
          }

          @if (errors().place && touched()) {
            <p class="mt-2 text-sm text-[#c53030]">
              {{ 'STONECRAFT.BIRTH.ERRORS.' + errors().place | translate }}
            </p>
          }
        </div>

        @if (failure(); as f) {
          <sc-api-error [failure]="f" (retry)="submit()" />
        }

        <div class="flex items-center gap-4 pt-2">
          <button type="submit" class="btn-primary" [disabled]="busy()">
            @if (busy()) {
              {{ 'STONECRAFT.STATE.LOADING' | translate }}
            } @else {
              {{ 'STONECRAFT.BIRTH.SUBMIT' | translate }}
            }
          </button>
        </div>

        <p class="text-xs leading-relaxed text-[var(--text-muted)]">
          {{ 'STONECRAFT.BIRTH.PRIVACY_NOTE' | translate }}
        </p>

        <!--
          CC BY 4.0 requires attribution, and the licence term is satisfied where
          the data is used, not in a file nobody opens. Read from the artefact
          itself so it cannot drift from the data it describes.
        -->
        @if (places.attribution(); as credit) {
          <p
            class="text-xs leading-relaxed text-[var(--text-muted)]"
            data-testid="place-attribution"
          >
            {{ 'STONECRAFT.BIRTH.PLACE_CREDIT' | translate }}
            <a [href]="credit['url']" target="_blank" rel="noopener noreferrer" class="underline"
              >GeoNames</a
            >,
            <a
              [href]="credit['licenceUrl']"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
              >{{ credit['licence'] }}</a
            >.
          </p>
        }
      </form>
    </main>
  `,
})
export class BirthInputPage {
  private readonly store = inject(ReadingStore);
  protected readonly places = inject(PlaceLookupService);
  private readonly router = inject(Router);
  private readonly lastReading = inject(LastReadingService);

  /**
   * The reading this device already has, if any.
   */
  protected readonly resumeId = this.lastReading.publicId;

  protected readonly earliest = '1800-01-01';

  protected readonly form = signal<BirthFormValue>(emptyBirthForm());
  protected readonly placeQuery = signal('');

  /** Errors are computed always but only shown after a submit attempt. */
  protected readonly touched = signal(false);

  protected readonly errors = computed(() => validateBirthForm(this.form(), new Date()));

  /**
   * Search results, each flagged when another result shares its label and
   * country — those get their coordinates shown so the row means something.
   */
  protected readonly matches = computed(() => {
    const found = this.places.search(this.placeQuery());

    const counts = new Map<string, number>();
    for (const place of found) {
      const name = `${place.label}|${place.country}`;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    return found.map((place, index) => ({
      place,
      key: `${place.label}|${place.country}|${index}`,
      ambiguous: (counts.get(`${place.label}|${place.country}`) ?? 0) > 1,
    }));
  });

  protected readonly placeholderKey = computed(() =>
    this.places.state() === 'loading'
      ? 'STONECRAFT.STATE.LOADING'
      : 'STONECRAFT.BIRTH.PLACE_PLACEHOLDER',
  );

  protected readonly busy = computed(() => isLoading(this.store.create()));

  protected readonly failure = computed(() => {
    const state = this.store.create();
    return isError(state) ? state.failure : null;
  });

  constructor() {
    // A fresh form must not sit under a stale reading: reopening this page after
    // a previous submission has to clear it, or `result()` still answers.
    this.store.reset();

    // ~1.1 MB, fetched here rather than bundled, so it costs nothing on any
    // other route. Started on init rather than on first keystroke: the request
    // is same-origin and carries no query, and waiting for a keystroke means the
    // first two characters someone types match nothing.
    void this.places.load();

    effect(() => {
      const state = this.store.create();
      if (isSuccess(state)) {
        // Route on the returned publicId. Nothing typed above goes in the URL.
        void this.router.navigate(['/reading', state.value.publicId]);

        // Then remember it, so closing the tab does not strand the reading —
        // the id only, see LastReadingService. Deliberately after the navigate
        // and inside a catch: keeping a bookmark is a convenience, and a guard
        // that refused an id must never be able to strand someone on the form
        // holding a reading that was successfully created.
        try {
          this.lastReading.remember(state.value.publicId);
        } catch (error) {
          console.error(error);
        }
      }
    });
  }

  protected patch(change: Partial<BirthFormValue>): void {
    this.form.update((current) => ({ ...current, ...change }));
  }

  protected choose(place: Place): void {
    this.patch({ place, latitude: '', longitude: '' });
    this.placeQuery.set('');
  }

  protected clearPlace(): void {
    this.patch({ place: null });
  }

  protected submit(): void {
    this.touched.set(true);

    if (Object.keys(this.errors()).length > 0) {
      return;
    }

    this.store.createSession({ birthInput: toBirthInput(this.form()) });
  }
}
