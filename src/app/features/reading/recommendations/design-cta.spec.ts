import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import type { CustomerRecommendation, SharedRecommendation } from '@core/models/gemstones.models';

import { recommendation } from '../reading-fixtures';

import { RecommendationsSectionComponent } from './recommendations-section.component';

type AnyRec = CustomerRecommendation | SharedRecommendation;

const OWNER_ID = 'fdc0bbe0-2986-4e19-a327-41c1f79f5a11';

@Component({
  standalone: true,
  imports: [RecommendationsSectionComponent],
  template: `<sc-recommendations-section
    [recommendations]="items()"
    [designPublicId]="publicId()"
  />`,
})
class Host {
  readonly items = signal<readonly AnyRec[]>([]);
  readonly publicId = signal<string | null>(null);
}

/**
 * The route from a reading into the designer.
 *
 * Before this existed there was no link to `/designer/:publicId` anywhere in the
 * app — the screen was reachable only by typing the URL, which is the same as
 * not having shipped it. The designer is where a reading becomes something
 * someone can own, so the reading is where the door belongs.
 *
 * <b>Only when there is a palette to design from.</b> D21: a designer with no
 * chart has no palette, and there is nothing honest to draw — not an empty state
 * and not a fallback listing the whole catalogue. A reading that ranked nothing
 * must not offer a door into a screen that cannot open.
 */
describe('the route into the designer', () => {
  let host: Host;
  let element: HTMLElement;
  let fixture: ComponentFixture<Host>;

  const render = (items: readonly AnyRec[], publicId: string | null) => {
    host.items.set(items);
    host.publicId.set(publicId);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
  });

  const cta = () => element.querySelector<HTMLAnchorElement>('[data-testid="design-cta"]');

  it('offers the designer when the chart named stones', () => {
    render([recommendation()], OWNER_ID);

    expect(cta()).not.toBeNull();
    expect(cta()!.getAttribute('href')).toBe(`/designer/${OWNER_ID}`);
  });

  it('offers nothing when the engine ranked nothing, because there is no palette', () => {
    render([], OWNER_ID);

    expect(cta()).toBeNull();
  });

  /**
   * A shared reading is read through a `shareToken`, not the owner's `publicId`.
   * The token cannot open a designer, and echoing an id that could is precisely
   * what the shared projection is built never to do — so the section is given no
   * id there and draws no door.
   */
  it('offers nothing without an owner id, which is the shared reading', () => {
    render([recommendation()], null);

    expect(cta()).toBeNull();
  });

  it('names no price, because none is computed anywhere', () => {
    render([recommendation()], OWNER_ID);

    expect(cta()!.textContent ?? '').not.toMatch(/\p{Sc}|\b(price|cost|total|from)\b/iu);
  });
});
