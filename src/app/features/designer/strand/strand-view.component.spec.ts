import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TranslateModule, TranslateService, type TranslationObject } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ConfiguredBeadSlot, ConfiguredBraceletResponse } from '@core/models/bracelets.models';

import bundle from '../../../../../public/i18n/content/en.json';

import type { PlacedBead, PlacedStone } from './strand-geometry';
import { StrandViewComponent } from './strand-view.component';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..');

const slot = (over: Partial<ConfiguredBeadSlot>): ConfiguredBeadSlot => ({
  position: 0,
  sku: 'PROV-ONYX-08-STD',
  materialSlug: 'onyx',
  canonicalNameEn: 'Onyx',
  diameterMm: 8,
  grade: 'Standard',
  lock: 'None',
  sourceMaterialSlug: null,
  centreXMm: 0,
  centreYMm: -10,
  ...over,
});

const configuration = (
  over: Partial<ConfiguredBraceletResponse> = {},
): ConfiguredBraceletResponse => ({
  publicId: 'cfg-1',
  templateSlug: 'classic',
  wristCircumferenceMm: 170,
  beadCount: 4,
  innerCircumferenceMm: 120.4,
  ringRadiusMm: 10,
  fitDeviationMm: 1.5,
  solverVersion: 'solver-1',
  rulePackVersion: 'v1',
  calcVersion: null,
  slots: [
    slot({ position: 0, centreXMm: 0, centreYMm: -10 }),
    slot({
      position: 1,
      materialSlug: 'nephrite',
      canonicalNameEn: 'Nephrite',
      centreXMm: 10,
      centreYMm: 0,
    }),
    slot({
      position: 2,
      materialSlug: 'nephrite',
      canonicalNameEn: 'Nephrite',
      centreXMm: 0,
      centreYMm: 10,
    }),
    slot({ position: 3, centreXMm: -10, centreYMm: 0 }),
  ],
  ...over,
});

@Component({
  standalone: true,
  imports: [StrandViewComponent],
  template: `<sc-strand-view [configuration]="configuration()" [placed]="placed()" />`,
})
class Host {
  readonly configuration = signal<ConfiguredBraceletResponse>(configuration());

  /**
   * A full rope by default, so the existing suite keeps its meaning.
   *
   * Derived from the fixture's own slots rather than written twice — but through
   * `placed`, which is the path the component actually reads. A test that set
   * only `configuration` would draw an empty rope and pass nothing.
   */
  readonly placed = signal<readonly PlacedStone[]>(
    configuration().slots.map((slot) => ({
      slug: slot.materialSlug,
      name: slot.canonicalNameEn,
      diameterMm: slot.diameterMm,
    })),
  );
}

describe('sc-strand-view', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Host, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', bundle as unknown as TranslationObject);
    translate.use('en');
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  const query = (s: string) => fixture.nativeElement.querySelector(s) as HTMLElement;
  const queryAll = (s: string) => [...fixture.nativeElement.querySelectorAll(s)] as HTMLElement[];
  const text = () => fixture.nativeElement.textContent as string;
  const svg = () => query('svg');

  describe('the ring', () => {
    it('renders one element per bead', () => {
      expect(queryAll('[role="option"]')).toHaveLength(4);
    });

    it('places beads at the coordinates the backend sent, scaled', () => {
      const images = queryAll('image');
      expect(images).toHaveLength(4);

      const centreOf = (el: HTMLElement) => ({
        x: Number(el.getAttribute('x')) + Number(el.getAttribute('width')) / 2,
        y: Number(el.getAttribute('y')) + Number(el.getAttribute('height')) / 2,
      });

      const top = centreOf(images[0]);
      const right = centreOf(images[1]);
      const bottom = centreOf(images[2]);

      // Top above bottom, right to the right of both — the square the fixture describes.
      expect(top.y).toBeLessThan(bottom.y);
      expect(right.x).toBeGreaterThan(top.x);
      expect(top.x).toBeCloseTo(bottom.x, 6);
    });

    it('draws the string as a hairline at the solved radius', () => {
      // Inside the view-transform group since zoom was added, not a direct child
      // of the svg. The group is what carries zoom, rotation and pan; the layout
      // underneath it is unchanged.
      const ring = query('svg > g > circle');
      expect(ring.getAttribute('stroke-width')).toBe('1');
      expect(Number(ring.getAttribute('r'))).toBeGreaterThan(0);
      expect(ring.getAttribute('aria-hidden')).toBe('true');
    });

    it('renders an outline, not a fake sphere, for a stone with no artwork', () => {
      // The bead catalogue and the artwork set are different sets. A generic grey
      // sphere would claim to be a picture of a stone nobody has drawn.
      fixture.componentInstance.configuration.set(
        configuration({
          // `adularia` carries no rule and no claim — it exists only so the
          // calendar resolves — so it can never reach a palette and will never
          // be drawn. A stone merely awaiting artwork would break this test the
          // week its bead arrived, which is what happened to malachite and then
          // to aventurine.
          slots: [slot({ position: 0, materialSlug: 'adularia', canonicalNameEn: 'Adularia' })],
          beadCount: 1,
        }),
      );
      // The artwork is looked up from the stone the person placed, not from the
      // rope's slot, so the placed list is what has to name it.
      fixture.componentInstance.placed.set([{ slug: 'adularia', name: 'Adularia', diameterMm: 8 }]);
      fixture.detectChanges();

      expect(queryAll('image')).toHaveLength(0);
      expect(query('[data-testid="undrawn"]').getAttribute('stroke-dasharray')).toBe('4 3');
    });
  });

  describe('the ring is not the only way to read it', () => {
    it('is a listbox of options, in strand order', () => {
      expect(svg().getAttribute('role')).toBe('listbox');

      const labels = queryAll('[role="option"]').map((el) => el.getAttribute('aria-label'));
      expect(labels[0]).toContain('1 / 4');
      expect(labels[1]).toContain('2 / 4');
      expect(labels[1]).toContain('Nephrite');
    });

    it('names the position before the stone', () => {
      // "bead 2 of 4" is what orients someone arrowing round a ring they cannot
      // see. A stone name alone leaves them counting.
      const label = queryAll('[role="option"]')[1].getAttribute('aria-label')!;
      expect(label.indexOf('2 / 4')).toBeLessThan(label.indexOf('Nephrite'));
    });

    it('states the configuration as text, visibly', () => {
      // Not visually hidden: someone who can see the ring may still want the
      // numbers before committing to it.
      expect(text()).toContain('4 beads, 2 stones');
      expect(text()).toContain('120.4 mm');
      expect(text()).toContain('170 mm');
    });

    it('tallies each stone with how many beads it has', () => {
      expect(text()).toContain('Onyx');
      expect(text()).toContain('Nephrite');
      expect(text()).toContain('2 beads');
    });

    it('signs the fit, because loose and tight are different problems', () => {
      expect(text()).toContain('+1.5 mm');

      fixture.componentInstance.configuration.set(configuration({ fitDeviationMm: -2.4 }));
      fixture.detectChanges();
      expect(text()).toContain('-2.4 mm');
    });

    it('is reachable by keyboard', () => {
      expect(svg().getAttribute('tabindex')).toBe('0');
    });
  });

  describe('keyboard navigation', () => {
    const press = (key: string) => {
      svg().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
    };

    const selected = () =>
      queryAll('[role="option"]').findIndex((el) => el.getAttribute('aria-selected') === 'true');

    it('selects the first bead on the first arrow', () => {
      press('ArrowRight');
      expect(selected()).toBe(0);
      expect(svg().getAttribute('aria-activedescendant')).toBe('sc-bead-0');
    });

    it('walks the strand', () => {
      press('ArrowRight');
      press('ArrowRight');
      expect(selected()).toBe(1);
    });

    it('wraps, because a bracelet is a closed ring', () => {
      // Stopping at the last bead would be a claim about the bracelet that is not
      // true.
      press('End');
      expect(selected()).toBe(3);
      press('ArrowRight');
      expect(selected()).toBe(0);

      press('ArrowLeft');
      expect(selected()).toBe(3);
    });

    it('goes to the ends with Home and End', () => {
      press('End');
      expect(selected()).toBe(3);
      press('Home');
      expect(selected()).toBe(0);
    });

    it('ignores keys it does not handle', () => {
      press('ArrowRight');
      press('a');
      expect(selected()).toBe(0);
    });
  });

  /**
   * Moving a bead, which is a different act from moving the selection.
   *
   * The host renders a fixed configuration, so the strand does not actually
   * reorder here — the parent owns the design. What these check is the half the
   * component is responsible for: which move it asks for, and where the
   * selection ends up afterwards.
   */
  describe('moving a bead', () => {
    const press = (key: string, modifiers: Partial<KeyboardEventInit> = {}) => {
      svg().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers }));
      fixture.detectChanges();
    };

    const selected = () =>
      queryAll('[role="option"]').findIndex((el) => el.getAttribute('aria-selected') === 'true');

    let moves: { from: number; to: number }[];

    beforeEach(() => {
      moves = [];
      const view = fixture.debugElement.children[0].componentInstance as StrandViewComponent;
      view.slotMoved.subscribe((move) => moves.push(move));
      press('ArrowRight'); // select bead 0
    });

    it('Ctrl+Arrow asks the parent to move the bead, not the selection', () => {
      press('ArrowRight', { ctrlKey: true });

      expect(moves).toEqual([{ from: 0, to: 1 }]);
    });

    it('accepts Cmd+Arrow too, because this is a Mac shop', () => {
      press('ArrowRight', { metaKey: true });

      expect(moves).toEqual([{ from: 0, to: 1 }]);
    });

    /**
     * <b>The selection follows the bead.</b>
     *
     * Without this the control silently undoes itself: the first Ctrl+Right
     * moves the bead from 0 to 1, the selection stays on index 0 — now a
     * different stone — and the second Ctrl+Right walks that one into slot 1,
     * putting the strand back where it started. Two presses, no movement.
     */
    it('leaves the selection on the bead that moved', () => {
      press('ArrowRight', { ctrlKey: true });

      expect(selected()).toBe(1);
      expect(svg().getAttribute('aria-activedescendant')).toBe('sc-bead-1');
    });

    it('two presses in the same direction walk two slots, not none', () => {
      press('ArrowRight', { ctrlKey: true });
      press('ArrowRight', { ctrlKey: true });

      expect(moves).toEqual([
        { from: 0, to: 1 },
        { from: 1, to: 2 },
      ]);
    });

    it('moves the other way with Ctrl+Left, wrapping round the ring', () => {
      press('ArrowLeft', { ctrlKey: true });

      expect(moves).toEqual([{ from: 0, to: 3 }]);
      expect(selected()).toBe(3);
    });

    it('does nothing until a bead is selected', () => {
      press('Escape');
      fixture.componentInstance.configuration.set(configuration());
      fixture.detectChanges();

      const fresh = fixture.debugElement.children[0].componentInstance as StrandViewComponent;
      const later: unknown[] = [];
      fresh.slotMoved.subscribe((m) => later.push(m));

      expect(later).toEqual([]);
    });
  });

  /**
   * Dragging a bead to a new place.
   *
   * <b>The gesture layer only.</b> `moveBead` on the store is unchanged and is
   * not exercised here; what these check is which move the gesture asks for, how
   * many times, and when.
   *
   * jsdom has no layout, so `getBoundingClientRect` is stubbed to a known square
   * — every pointer coordinate below is then a real position in the same user
   * units the layout uses, and the nearest-centre rule is being tested rather
   * than a coincidence of zeroes.
   */
  describe('dragging a bead', () => {
    let moves: { from: number; to: number }[];

    /** The fixture ring: four beads at top, right, bottom, left of a 1000 unit box. */
    const AT = {
      top: { x: 500, y: 100 },
      right: { x: 900, y: 500 },
      bottom: { x: 500, y: 900 },
      left: { x: 100, y: 500 },
    };

    const beadGroup = (position: number) => query(`#sc-bead-${position}`);

    /*
      jsdom implements no `PointerEvent`, so one is assembled from a MouseEvent
      with a `pointerId` on it. The listener is registered by event NAME, so the
      component receives it exactly as a browser would deliver the real thing —
      and `setPointerCapture`, which jsdom also lacks, is called optionally in
      the component for the same reason.
    */
    const pointer = (type: string, at: { x: number; y: number }, id = 1) => {
      const event = new MouseEvent(type, {
        clientX: at.x,
        clientY: at.y,
        bubbles: true,
      });

      Object.defineProperty(event, 'pointerId', { value: id });

      return event;
    };

    beforeEach(() => {
      moves = [];
      const view = fixture.debugElement.children[0].componentInstance as StrandViewComponent;
      view.slotMoved.subscribe((move) => moves.push(move));

      // A 1000x1000 box at the origin makes client pixels and user units equal.
      svg().getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 1000, height: 1000 }) as DOMRect;
    });

    const drag = (from: number, path: { x: number; y: number }[]) => {
      const g = beadGroup(from);
      g.dispatchEvent(pointer('pointerdown', path[0]));
      for (const point of path.slice(1)) {
        g.dispatchEvent(pointer('pointermove', point));
      }
      g.dispatchEvent(pointer('pointerup', path[path.length - 1]));
      fixture.detectChanges();
    };

    /**
     * Below the threshold the gesture is still a click.
     *
     * Without one, every selection becomes an accidental reorder — and on touch
     * that is constant, because a finger never lands and lifts on the same pixel.
     */
    it('a two-pixel wobble selects and does not reorder', () => {
      drag(0, [AT.top, { x: AT.top.x + 2, y: AT.top.y + 1 }]);

      // The click that follows must still select. Asserting only that nothing
      // moved is not enough — a two-pixel wobble lands on the same bead anyway,
      // so removing the threshold entirely would still emit no move and the test
      // would pass while the feature was broken. What the threshold protects is
      // that the gesture is STILL A CLICK.
      beadGroup(0).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(beadGroup(0).getAttribute('aria-selected')).toBe('true');
      expect(moves).toEqual([]);
    });

    it('a wobble across a boundary still selects rather than reordering', () => {
      // Three pixels toward the next bead: under the threshold, so nothing moves
      // even though the pointer is on its way somewhere.
      drag(0, [AT.top, { x: AT.top.x + 3, y: AT.top.y }]);

      beadGroup(0).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(beadGroup(0).getAttribute('aria-selected')).toBe('true');
      expect(moves).toEqual([]);
    });

    it('a drag across two slots asks for exactly one move', () => {
      drag(0, [AT.top, { x: 700, y: 200 }, AT.bottom]);

      expect(moves).toEqual([{ from: 0, to: 2 }]);
    });

    /** The nearest centre by distance, not an index derived from an angle. */
    it('lands on the bead nearest the pointer', () => {
      drag(0, [AT.top, { x: 700, y: 300 }, { x: 880, y: 520 }]);

      expect(moves).toEqual([{ from: 0, to: 1 }]);
    });

    it('dropping a bead back where it started asks for nothing', () => {
      drag(1, [AT.right, { x: 880, y: 480 }, AT.right]);

      expect(moves).toEqual([]);
    });

    it('marks the slot it would land on while the drag is in flight', () => {
      const g = beadGroup(0);
      g.dispatchEvent(pointer('pointerdown', AT.top));
      g.dispatchEvent(pointer('pointermove', AT.bottom));
      fixture.detectChanges();

      // The drop target wears the selection ring, and nothing has moved yet.
      expect(beadGroup(2).querySelector('.bead-ring')).not.toBeNull();
      expect(moves).toEqual([]);
    });

    it('Escape mid-drag abandons it', () => {
      const g = beadGroup(0);
      g.dispatchEvent(pointer('pointerdown', AT.top));
      g.dispatchEvent(pointer('pointermove', AT.bottom));
      svg().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      g.dispatchEvent(pointer('pointerup', AT.bottom));
      fixture.detectChanges();

      expect(moves).toEqual([]);
    });

    /**
     * The OS sends `pointercancel` when a call arrives mid-gesture. Without
     * handling it the bead is left stranded under the finger.
     */
    it('pointercancel mid-drag abandons it', () => {
      const g = beadGroup(0);
      g.dispatchEvent(pointer('pointerdown', AT.top));
      g.dispatchEvent(pointer('pointermove', AT.bottom));
      g.dispatchEvent(pointer('pointercancel', AT.bottom));
      g.dispatchEvent(pointer('pointerup', AT.bottom));
      fixture.detectChanges();

      expect(moves).toEqual([]);
    });

    it('ignores a second pointer that did not start the drag', () => {
      const g = beadGroup(0);
      g.dispatchEvent(pointer('pointerdown', AT.top, 1));
      g.dispatchEvent(pointer('pointermove', AT.bottom, 2));
      g.dispatchEvent(pointer('pointerup', AT.bottom, 2));
      fixture.detectChanges();

      expect(moves).toEqual([]);
    });

    /**
     * One move per gesture, and therefore one solve.
     *
     * The store debounces and re-solves on every strand change, so an emit per
     * `pointermove` would put hundreds of calls through `/solve` for one drag —
     * and the rate limit would be right to stop it.
     */
    it('asks for nothing at all until the drop', () => {
      const g = beadGroup(0);
      g.dispatchEvent(pointer('pointerdown', AT.top));

      for (let step = 0; step < 40; step++) {
        g.dispatchEvent(pointer('pointermove', { x: 500 + step * 10, y: 100 + step * 20 }));
      }

      expect(moves, 'a move was requested mid-gesture').toEqual([]);

      g.dispatchEvent(pointer('pointerup', AT.bottom));
      fixture.detectChanges();

      expect(moves).toHaveLength(1);
    });

    /**
     * The suppression must not outlive its own gesture.
     *
     * A drop suppresses the click that follows it. If no click follows — the
     * pointer comes up outside the element, the browser cancels it — a sticky
     * flag would eat the next legitimate selection instead, one gesture later
     * and with nothing to connect it to the drag. Found by driving it: a real
     * drag followed by a real tap left the tap doing nothing.
     */
    it('a drag with no click after it does not eat the next selection', () => {
      const g = beadGroup(0);

      // A completed drag, and no click afterwards.
      g.dispatchEvent(pointer('pointerdown', AT.top));
      g.dispatchEvent(pointer('pointermove', AT.bottom));
      g.dispatchEvent(pointer('pointerup', AT.bottom));
      fixture.detectChanges();

      // A separate, ordinary tap.
      const next = beadGroup(1);
      next.dispatchEvent(pointer('pointerdown', AT.right));
      next.dispatchEvent(pointer('pointerup', AT.right));
      next.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(next.getAttribute('aria-selected')).toBe('true');
    });

    it('a completed drop does not also select whatever it landed on', () => {
      drag(0, [AT.top, AT.bottom]);

      // The click that follows pointerup must not re-select. Selection follows
      // the bead, and it went to slot 2.
      beadGroup(2).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(moves).toHaveLength(1);
    });
  });

  /**
   * What a screen reader is told after a move.
   *
   * The keyboard path had no announcement at all before drag was written:
   * Ctrl+Right changed the strand and said nothing, so the only way to find out
   * what had happened was to arrow round the ring and count. Both paths announce
   * now, and both are checked, because the keyboard one is the primary path and
   * is the easier of the two to leave behind.
   */
  describe('announcing a move', () => {
    const announcement = () => query('[data-testid="move-announcement"]');

    const press = (key: string, modifiers: Partial<KeyboardEventInit> = {}) => {
      svg().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers }));
      fixture.detectChanges();
    };

    it('says nothing before anything has moved', () => {
      expect(announcement().textContent?.trim()).toBe('');
    });

    it('is polite, not assertive — a reorder is not an interruption', () => {
      expect(announcement().getAttribute('aria-live')).toBe('polite');
    });

    it('names the stone, where it went, and how many there are', () => {
      press('ArrowRight');
      press('ArrowRight', { ctrlKey: true });

      const said = announcement().textContent ?? '';

      expect(said).toContain('Onyx');
      expect(said).toContain('2');
      expect(said).toContain('4');
    });

    it('renders no raw key when it speaks', () => {
      press('ArrowRight');
      press('ArrowRight', { ctrlKey: true });

      expect(announcement().textContent).not.toContain('STONECRAFT.');
    });
  });

  /**
   * Zoom and rotation are how someone is looking at a bracelet, not what it is.
   */
  describe('the view', () => {
    const svgEl = () => query('svg');
    const group = () => query('svg > g');
    const readout = () => query('[data-testid="zoom-readout"]');

    const wheel = (init: Partial<WheelEventInit> & { ctrlKey?: boolean; metaKey?: boolean }) => {
      const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });
      svgEl().dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };

    const press = (key: string) => {
      svgEl().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
    };

    const click = (testid: string) => {
      (query(`[data-testid="${testid}"]`) as HTMLButtonElement).click();
      fixture.detectChanges();
    };

    beforeEach(() => {
      svgEl().getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 1000, height: 1000 }) as DOMRect;
    });

    it('starts at 100%, which is the view the bracelet was drawn at', () => {
      expect(readout().textContent?.trim()).toBe('100%');
      expect(group().getAttribute('transform')).toContain('scale(1)');
    });

    it('steps by 25% and the readout matches the transform', () => {
      click('zoom-in');

      expect(readout().textContent?.trim()).toBe('125%');
      expect(group().getAttribute('transform')).toContain('scale(1.25)');
    });

    it('clamps at 400%', () => {
      for (let i = 0; i < 20; i++) {
        click('zoom-in');
      }

      expect(readout().textContent?.trim()).toBe('400%');
    });

    it('clamps at 50%', () => {
      for (let i = 0; i < 20; i++) {
        click('zoom-out');
      }

      expect(readout().textContent?.trim()).toBe('50%');
    });

    /**
     * The trap the brief names: a bead's target shrinks with the view unless the
     * radius is compensated, and on a phone at 50% it becomes untappable.
     */
    it('keeps a bead the same size to a finger at every zoom', () => {
      const onScreenRadius = () => {
        const r = Number(query('[data-testid="hit-target"]').getAttribute('r'));
        const zoom = Number(/scale\(([\d.]+)\)/.exec(group().getAttribute('transform')!)![1]);

        // 1000 user units across a 1000 px stage, so user units are pixels at 100%.
        return r * zoom;
      };

      const atDefault = onScreenRadius();

      for (let i = 0; i < 20; i++) {
        click('zoom-out');
      }

      expect(readout().textContent?.trim()).toBe('50%');
      expect(onScreenRadius()).toBeCloseTo(atDefault, 6);

      // On this 1000 px stage the default already clears a 44 px target, and
      // zooming out does not take it back below. On a 360 px column it does not
      // clear it even at 100% — a real gap, older than this control, recorded in
      // the expansion doc rather than asserted away here.
      expect(onScreenRadius() * 2).toBeGreaterThanOrEqual(44);

      // Above 100% the target grows, and is not compensated back down.
      click('reset-view');
      click('zoom-in');
      expect(onScreenRadius()).toBeGreaterThan(atDefault);
    });

    it('zooms with ctrl or cmd and scroll', () => {
      wheel({ deltaY: -100, ctrlKey: true });
      expect(readout().textContent?.trim()).not.toBe('100%');

      click('reset-view');
      wheel({ deltaY: -100, metaKey: true });
      expect(readout().textContent?.trim()).not.toBe('100%');
    });

    /**
     * <b>A plain scroll belongs to the page.</b>
     *
     * It used to pan the board. There is no pan any more — the ring is pinned to
     * the centre — so taking the scroll would mean swallowing a gesture and
     * doing nothing with it, which reads as a broken page rather than a
     * deliberate one.
     */
    it('leaves a plain scroll to the page', () => {
      click('reset-view');
      const before = group().getAttribute('transform');

      const event = wheel({ deltaY: 100, deltaX: 60 });

      expect(event.defaultPrevented).toBe(false);
      expect(group().getAttribute('transform')).toBe(before);
      expect(readout().textContent?.trim()).toBe('100%');
    });

    it('claims the gesture only when it is a zoom', () => {
      expect(wheel({ deltaY: 100, ctrlKey: true }).defaultPrevented).toBe(true);
    });

    /**
     * <b>The bracelet cannot be carried off the middle of its board.</b>
     *
     * The transform is a scale and a rotation about the centre and nothing else.
     * A translation term is exactly what a pan would be, so its absence is the
     * property worth asserting rather than the behaviour of any one gesture —
     * this holds however the view was reached.
     */
    it('never moves the ring off the centre, whatever the gesture', () => {
      const centred =
        /^translate\(500 500\) scale\([\d.]+\) matrix\([^)]*\) translate\(-500 -500\)$/;

      wheel({ deltaY: -200, ctrlKey: true, clientX: 900, clientY: 500 });
      expect(group().getAttribute('transform')).toMatch(centred);

      wheel({ deltaY: 400, deltaX: 400 });
      expect(group().getAttribute('transform')).toMatch(centred);

      press('+');
      press('+');
      expect(group().getAttribute('transform')).toMatch(centred);
    });

    /**
     * <b>The slider is the zoom control; the buttons are its ends.</b>
     */
    it('zooms from the slider', () => {
      const slider = query('[data-testid="zoom-slider"]') as HTMLInputElement;

      slider.value = '250';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();

      expect(readout().textContent?.trim()).toBe('250%');
      expect(group().getAttribute('transform')).toContain('scale(2.5)');
    });

    /**
     * A slider whose ends disagree with the clamp is a control that appears to go
     * somewhere it does not.
     */
    it('spans exactly the range the zoom is clamped to', () => {
      const slider = query('[data-testid="zoom-slider"]') as HTMLInputElement;

      expect(slider.min).toBe('50');
      expect(slider.max).toBe('400');

      // And the clamp agrees at both ends.
      slider.value = '400';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      expect(query('[data-testid="zoom-in"]').hasAttribute('disabled')).toBe(true);

      slider.value = '50';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      expect(query('[data-testid="zoom-out"]').hasAttribute('disabled')).toBe(true);
    });

    /**
     * <b>The thumb must never disagree with the readout.</b>
     *
     * A real browser snaps a range input's thumb to the nearest step, so with
     * step="25" a pinch to 390% put the thumb on 400 while the readout said 390
     * — a control showing a value it is not holding.
     *
     * <b>jsdom does not implement that snapping</b>, so the behavioural test
     * below cannot see the bug: setting step back to 25 leaves it passing, which
     * mutation testing showed. The attribute is therefore asserted directly, and
     * the behaviour it prevents was confirmed by hand in Chrome. Written this way
     * rather than deleted because the attribute is the whole fix, and a future
     * "tidy-up" that gives the slider a step is exactly what needs catching.
     */
    /**
     * <b>The buttons are a stepper, not an adder.</b>
     *
     * A pinch leaves the zoom anywhere. If + added 25% to that, every press after
     * a pinch would stay off the grid — 158, 183, 208 — and the buttons would
     * never land on a round number again.
     */
    it('steps to the next 25% stop rather than 25% from wherever it was', () => {
      // A pinch to somewhere awkward.
      wheel({ deltaY: -137, ctrlKey: true });
      const landed = Number(readout().textContent!.replace('%', ''));
      expect(landed % 25).not.toBe(0);

      click('zoom-in');
      const up = Number(readout().textContent!.replace('%', ''));
      expect(up % 25).toBe(0);
      expect(up).toBeGreaterThan(landed);
      expect(up - landed).toBeLessThanOrEqual(25);

      click('zoom-out');
      expect(Number(readout().textContent!.replace('%', ''))).toBe(up - 25);
    });

    it('is continuous, so the thumb cannot round away from the value', () => {
      const slider = query('[data-testid="zoom-slider"]') as HTMLInputElement;

      expect(slider.getAttribute('step')).toBe('any');
    });

    it('follows the zoom exactly, wherever the zoom came from', () => {
      const slider = () => query('[data-testid="zoom-slider"]') as HTMLInputElement;
      const shown = () => readout().textContent!.replace('%', '').trim();

      press('+');
      expect(slider().value).toBe('125');
      expect(slider().value).toBe(shown());

      // A pinch lands wherever it lands — off any 25% stop.
      wheel({ deltaY: -37, ctrlKey: true });
      expect(shown()).not.toMatch(/^(?:50|75|100|125|150|175|200)$/);
      expect(slider().value).toBe(shown());
    });

    /**
     * <b>The controls sit on the board, which is also the rotate surface.</b>
     *
     * They overlay the stage but are a sibling of the svg rather than a child, so
     * a press on one is not also a pointerdown on the stage. This asserts the
     * property; it does not assert any particular mechanism, which matters
     * because an earlier draft stopped propagation here and that line could not
     * fail — there was nothing for it to stop. If the panel is ever moved inside
     * the svg, this is the test that will say so.
     */
    it('does not turn the ring when a control is pressed', () => {
      click('reset-view');
      const before = group().getAttribute('transform');

      const controls = query('.view-controls');
      const down = new MouseEvent('pointerdown', { clientX: 500, clientY: 900, bubbles: true });
      Object.defineProperty(down, 'pointerId', { value: 77 });
      controls.dispatchEvent(down);

      svgEl().dispatchEvent(
        Object.assign(
          new MouseEvent('pointermove', { clientX: 900, clientY: 500, bubbles: true }),
          {},
        ),
      );
      fixture.detectChanges();

      expect(group().getAttribute('transform')).toBe(before);
    });

    it('has a keyboard equivalent, because magnification is an accessibility feature', () => {
      press('+');
      expect(readout().textContent?.trim()).toBe('125%');

      press('-');
      expect(readout().textContent?.trim()).toBe('100%');

      press('+');
      press('0');
      expect(readout().textContent?.trim()).toBe('100%');
      expect(query('[data-testid="reset-view"]').hasAttribute('disabled')).toBe(true);
    });

    it('reset returns the view and nothing else', () => {
      const strandBefore = fixture.componentInstance.configuration().slots;

      click('zoom-in');
      wheel({ deltaY: -40, ctrlKey: true });
      click('reset-view');

      expect(group().getAttribute('transform')).toContain('scale(1)');
      expect(group().getAttribute('transform')).toContain('matrix(1 0 0 1 0 0)');
      expect(fixture.componentInstance.configuration().slots).toBe(strandBefore);
    });
  });

  /**
   * The controls a person reaches for when the beads are hard to hit must not
   * themselves be hard to hit. jsdom has no layout, so this reads the rule out
   * of the stylesheet rather than measuring a rendered box — which is also the
   * form that survives the component being embedded somewhere narrower.
   */
  it('sizes its own controls to the same 44 px target as the beads', () => {
    const source = readFileSync(
      join(repoRoot, 'src/app/features/designer/strand/strand-view.component.ts'),
      'utf8',
    );

    const chip = /\.view-controls \.chip \{[^}]*\}/.exec(source)?.[0] ?? '';

    expect(chip).toMatch(/min-inline-size:\s*44px/);
    expect(chip).toMatch(/min-block-size:\s*44px/);

    // The slider is a control on the same board and obeys the same rule.
    const slider = /\.zoom-slider \{[^}]*\}/.exec(source)?.[0] ?? '';

    expect(slider).toMatch(/block-size:\s*44px/);
  });

  /**
   * <b>Glass is only legible while something is frosting it.</b>
   *
   * The view controls are a deliberately translucent surface — 55% — that reads
   * as a panel because `backdrop-filter` blurs what is behind them. Every case
   * that takes the blur away turns the same declaration into a see-through strip
   * with buttons floating loose on the bracelet, so each one has to put an opaque
   * surface back:
   *
   * - no `backdrop-filter` support (Firefox had none until 103);
   * - `prefers-reduced-transparency`, a system accessibility setting;
   * - `forced-colors`, where the filter is ignored outright.
   *
   * Read out of the stylesheet, because jsdom implements none of the three and
   * there is nothing to observe. The same shape as the focus-indicator guard, and
   * for the same reason: the failure is silent and it is invisible to whoever
   * wrote it, because their browser supports the effect.
   */
  it('keeps the glass panel readable wherever the blur is unavailable', () => {
    const source = readFileSync(
      join(repoRoot, 'src/app/features/designer/strand/strand-view.component.ts'),
      'utf8',
    );

    const panel = /\.view-controls \{[^}]*\}/.exec(source)?.[0] ?? '';

    // It really is glass, and Safari is not left out of it.
    expect(panel).toMatch(/backdrop-filter:\s*blur/);
    expect(panel).toMatch(/-webkit-backdrop-filter:\s*blur/);

    for (const guard of [
      /@supports not \(\(backdrop-filter[^{]*\{\s*\.view-controls \{[^}]*background:/,
      /@media \(prefers-reduced-transparency: reduce\)\s*\{\s*\.view-controls \{[^}]*background:/,
      /@media \(forced-colors: active\)\s*\{\s*\.view-controls \{[^}]*background:/,
    ]) {
      expect(source, `missing a fallback surface: ${guard}`).toMatch(guard);
    }
  });

  /**
   * <b>A click must not draw a box round the board.</b>
   *
   * The stage carries tabindex=0 so the keyboard can reach the ring, and Chrome
   * does not treat a mouse click on a tabindexed svg as focus-visible the way it
   * does a form control — so the UA's plain :focus outline applied, 5px of accent
   * blue round the whole board, on every click.
   *
   * Read out of the stylesheet: jsdom implements neither the UA outline nor the
   * focus-visible heuristic, so there is nothing here to observe behaviourally.
   * Both halves are asserted, because silencing :focus without restoring an
   * indicator for :focus-visible would leave a keyboard user with no way to tell
   * which control is listening — on the one control in this feature that has an
   * entire keyboard suite.
   */
  it('shows no focus ring for a pointer, and one for the keyboard', () => {
    const source = readFileSync(
      join(repoRoot, 'src/app/features/designer/strand/strand-view.component.ts'),
      'utf8',
    );

    const focus = /\.strand-svg:focus \{[^}]*\}/.exec(source)?.[0] ?? '';
    const focusVisible = /\.strand-svg:focus-visible \{[^}]*\}/.exec(source)?.[0] ?? '';

    expect(focus).toMatch(/outline:\s*none/);

    // And the keyboard still gets an indicator — an outline, not a box-shadow,
    // because forced-colors mode keeps the one and throws away the other.
    // `focus-indicators.spec.ts` holds that rule for the whole feature.
    expect(focusVisible).toMatch(/outline:\s*1px solid/);
  });

  /**
   * <b>Nothing on the board is text to be selected.</b>
   *
   * A rotate drag across the SVG otherwise smears the browser's selection
   * highlight over the ring, and a second click turns the whole figure blue.
   * Read out of the stylesheet because jsdom has no selection model to observe.
   */
  it('does not let the board be selected', () => {
    const source = readFileSync(
      join(repoRoot, 'src/app/features/designer/strand/strand-view.component.ts'),
      'utf8',
    );

    const stage = /\.strand-stage \{[^}]*\}/.exec(source)?.[0] ?? '';

    expect(stage).toMatch(/user-select:\s*none/);
    expect(stage).toMatch(/-webkit-user-select:\s*none/);
  });

  /**
   * <b>A stone keeps the size it was placed at.</b>
   *
   * The bead-size control picks the size of the NEXT stone. Reaching backwards
   * and resizing the ones already chosen is the bug this fixes: pick 6 mm, place
   * two, switch to 10 mm, and the two you already placed must still be 6 mm.
   *
   * The rope is solved with the placed stones on it, so a place and its stone
   * agree — but they agree because the request said so, not because anything in
   * the renderer makes them. These fixtures deliberately disagree, which is the
   * only way to prove which of the two is being read.
   */
  describe('mixed bead sizes', () => {
    const beadWidth = (index: number) =>
      Number(queryAll('[role="option"] image')[index]?.getAttribute('width'));

    it('draws each stone at its own diameter, not the rope place it sits in', () => {
      // A rope of 8 mm places...
      fixture.componentInstance.configuration.set(configuration());
      // ...holding a 6 mm stone and a 12 mm one.
      fixture.componentInstance.placed.set([
        { slug: 'onyx', name: 'Onyx', diameterMm: 6 },
        { slug: 'nephrite', name: 'Nephrite', diameterMm: 12 },
      ]);
      fixture.detectChanges();

      // The place is 8 mm; the stones are drawn at three quarters and one and a
      // half of it.
      const place = 8;
      expect(beadWidth(0) / beadWidth(1)).toBeCloseTo(6 / 12, 6);
      expect(beadWidth(0) * (place / 6)).toBeCloseTo(beadWidth(1) * (place / 12), 6);
    });

    it('says the stone size in the label, not the place size', () => {
      fixture.componentInstance.placed.set([{ slug: 'onyx', name: 'Onyx', diameterMm: 6 }]);
      fixture.detectChanges();

      expect(query('[role="option"]').getAttribute('aria-label')).toContain('6 mm');
    });

    /**
     * The 44 px floor is about how big the target is on screen, so it has to
     * follow the size actually drawn — a 6 mm stone in a 12 mm place needs the
     * smaller circle's compensation, not the larger one's.
     */
    it('sizes the hit target from the stone, not the place', () => {
      fixture.componentInstance.placed.set([
        { slug: 'onyx', name: 'Onyx', diameterMm: 6 },
        { slug: 'nephrite', name: 'Nephrite', diameterMm: 12 },
      ]);
      fixture.detectChanges();

      const targets = queryAll('[data-testid="hit-target"]').map((el) =>
        Number(el.getAttribute('r')),
      );

      expect(targets[0]).toBeLessThan(targets[1]);
    });

    it('draws an empty place at the place size, having no stone to ask', () => {
      fixture.componentInstance.placed.set([{ slug: 'onyx', name: 'Onyx', diameterMm: 6 }]);
      fixture.detectChanges();

      const empties = queryAll('[data-testid="empty-place"]').map((el) =>
        Number(el.getAttribute('r')),
      );

      // Three places left, all at the rope's own 8 mm.
      expect(empties).toHaveLength(3);
      expect(new Set(empties).size).toBe(1);
    });
  });

  /**
   * <b>What gets saved does not depend on how it was being looked at.</b>
   *
   * Byte-identical, not merely equivalent: the design is serialised and compared
   * as text at the default view and again at 250% and a third of a turn. Zoom and
   * rotation are the view's own state and belong to nobody else, and the way that
   * stops being true is a well-meaning `...view()` spread into a save payload.
   */
  describe('the design under a changed view', () => {
    it('serialises to the same bytes at 100%/0° and at 250%/a third turn', () => {
      const svgEl = query('svg');
      svgEl.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 1000, height: 1000 }) as DOMRect;

      const readout = () => query('[data-testid="zoom-readout"]');
      const click = (testid: string) => {
        query(`[data-testid="${testid}"]`).click();
        fixture.detectChanges();
      };

      const serialise = () => JSON.stringify(fixture.componentInstance.configuration());

      const atDefault = serialise();

      // 100% → 250% in the control's own steps.
      for (let i = 0; i < 6; i++) {
        click('zoom-in');
      }

      expect(readout().textContent?.trim()).toBe('250%');

      // And a turn that is not a whole number of bead pitches.
      const pointer = (type: string, x: number, y: number) => {
        const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
        Object.defineProperty(event, 'pointerId', { value: 3 });
        return event;
      };
      svgEl.dispatchEvent(pointer('pointerdown', 500, 120));
      svgEl.dispatchEvent(pointer('pointermove', 880, 380));
      svgEl.dispatchEvent(pointer('pointerup', 880, 380));
      fixture.detectChanges();

      // The view did move — otherwise this test proves nothing.
      expect(query('svg > g').getAttribute('transform')).not.toContain('scale(1)');

      expect(serialise()).toBe(atDefault);
    });
  });

  /**
   * <b>Rotation is a no-op on the physical object.</b>
   *
   * A bracelet is a closed cycle with no clasp, so `[A,B,C,D]` and `[B,C,D,A]`
   * are the same bracelet — the cord length is permutation-invariant and the
   * solved radius depends on the cyclic order, which a rotation preserves. Spin
   * it and the solver would return byte-identical geometry, which is exactly why
   * asking it is waste and why the angle belongs to the view.
   */
  describe('rotating', () => {
    const svgEl = () => query('svg');

    const pointer = (type: string, x: number, y: number, id = 9) => {
      const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
      Object.defineProperty(event, 'pointerId', { value: id });
      return event;
    };

    const spin = () => {
      svgEl().dispatchEvent(pointer('pointerdown', 500, 200));
      svgEl().dispatchEvent(pointer('pointermove', 700, 300));
      svgEl().dispatchEvent(pointer('pointermove', 800, 500));
      svgEl().dispatchEvent(pointer('pointerup', 800, 500));
      fixture.detectChanges();
    };

    beforeEach(() => {
      svgEl().getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 1000, height: 1000 }) as DOMRect;
    });

    it('a drag on empty stage turns the ring', () => {
      const before = query('svg > g').getAttribute('transform');

      spin();

      expect(query('svg > g').getAttribute('transform')).not.toBe(before);
    });

    /** Identity, not equality: the array itself must be the one it was. */
    it('does not touch the strand', () => {
      const before = fixture.componentInstance.configuration().slots;

      spin();

      expect(fixture.componentInstance.configuration().slots).toBe(before);
    });

    it('asks for no move, so nothing downstream re-solves', () => {
      const moves: unknown[] = [];
      const view = fixture.debugElement.children[0].componentInstance as StrandViewComponent;
      view.slotMoved.subscribe((m) => moves.push(m));

      spin();

      expect(moves).toEqual([]);
    });

    /**
     * The reading order is the same at every angle, which is why rotation needs
     * no keyboard equivalent and a screen-reader user is missing nothing.
     */
    it('leaves the reading order and the labels exactly as they were', () => {
      const labels = () => queryAll('[role="option"]').map((el) => el.getAttribute('aria-label'));

      const before = labels();

      spin();

      expect(labels()).toEqual(before);
    });

    it('a drag that starts on a bead still reorders and does not spin', () => {
      const moves: { from: number; to: number }[] = [];
      const view = fixture.debugElement.children[0].componentInstance as StrandViewComponent;
      view.slotMoved.subscribe((m) => moves.push(m));

      const before = query('svg > g').getAttribute('transform');
      const bead = query('#sc-bead-0');

      bead.dispatchEvent(pointer('pointerdown', 500, 100, 1));
      bead.dispatchEvent(pointer('pointermove', 500, 900, 1));
      bead.dispatchEvent(pointer('pointerup', 500, 900, 1));
      fixture.detectChanges();

      expect(moves).toHaveLength(1);
      expect(query('svg > g').getAttribute('transform')).toBe(before);
    });
  });

  /**
   * <b>Dragging a bead once the view has moved.</b>
   *
   * The beads are drawn inside the group that carries pan, zoom and rotation, so
   * everything a drag computes has to be brought back into the layout's own
   * coordinates first. Miss that and the code still works perfectly at the
   * default view — where the two spaces coincide — and breaks the moment anyone
   * turns the ring: the stone sets off at an angle to the pointer, and the drop
   * target is the bead nearest to where the pointer would have been before the
   * rotation.
   *
   * These tests are written against a moved view for that reason. At 100% and 0°
   * they cannot fail.
   */
  describe('dragging after the view has been moved', () => {
    const svgEl = () => query('svg');
    const view = () => fixture.debugElement.children[0].componentInstance as StrandViewComponent;

    const pointer = (type: string, x: number, y: number, id = 4) => {
      const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
      Object.defineProperty(event, 'pointerId', { value: id });
      return event;
    };

    /** The drawn offset of the dragged bead, in user units. */
    const drawnOffset = (position: number) => {
      const transform = (
        view() as unknown as { dragTransform(p: number): string | null }
      ).dragTransform(position);
      const match = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(transform ?? '');

      return match === null ? null : { x: Number(match[1]), y: Number(match[2]) };
    };

    /** Puts a user-unit offset through the view transform, back to the screen. */
    const onScreen = (offset: { x: number; y: number }) => {
      const state = view() as unknown as {
        rotation(): { cos: number; sin: number };
        zoom(): number;
      };
      const { cos, sin } = state.rotation();
      const zoom = state.zoom();

      return {
        x: zoom * (offset.x * cos - offset.y * sin),
        y: zoom * (offset.x * sin + offset.y * cos),
      };
    };

    beforeEach(() => {
      svgEl().getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 1000, height: 1000 }) as DOMRect;

      // Half a turn: drag the empty stage from the top of the ring to the bottom.
      svgEl().dispatchEvent(pointer('pointerdown', 500, 20, 8));
      svgEl().dispatchEvent(pointer('pointermove', 980, 500, 8));
      svgEl().dispatchEvent(pointer('pointermove', 500, 980, 8));
      svgEl().dispatchEvent(pointer('pointerup', 500, 980, 8));
      fixture.detectChanges();
    });

    it('is actually rotated, so the rest of this means something', () => {
      const { cos } = (view() as unknown as { rotation(): { cos: number } }).rotation();

      expect(cos).toBeCloseTo(-1, 6);
    });

    it('the stone follows the pointer instead of setting off at an angle', () => {
      const bead = query('#sc-bead-0');

      bead.dispatchEvent(pointer('pointerdown', 500, 300));
      bead.dispatchEvent(pointer('pointermove', 620, 340));
      fixture.detectChanges();

      const offset = drawnOffset(0);
      expect(offset).not.toBeNull();

      // The pointer moved +120, +40 on screen; the bead must too.
      const drawn = onScreen(offset!);

      expect(drawn.x).toBeCloseTo(120, 4);
      expect(drawn.y).toBeCloseTo(40, 4);
    });

    it('drops on the bead the pointer is actually over', () => {
      const moves: { from: number; to: number }[] = [];
      view().slotMoved.subscribe((m) => moves.push(m));

      // Where bead 2 is drawn on screen, after the half-turn.
      const beads = (
        view() as unknown as { layout(): { beads: PlacedBead[]; centre: number } }
      ).layout();
      const target = beads.beads[2];
      const screen = onScreen({ x: target.cx - beads.centre, y: target.cy - beads.centre });
      const at = { x: beads.centre + screen.x, y: beads.centre + screen.y };

      const bead = query('#sc-bead-0');
      bead.dispatchEvent(pointer('pointerdown', 500, 300));
      bead.dispatchEvent(pointer('pointermove', at.x, at.y));
      bead.dispatchEvent(pointer('pointerup', at.x, at.y));
      fixture.detectChanges();

      expect(moves).toEqual([{ from: 0, to: 2 }]);
    });

    it('does the same when zoomed as well as turned', () => {
      query('[data-testid="zoom-in"]').click();
      query('[data-testid="zoom-in"]').click();
      fixture.detectChanges();

      const bead = query('#sc-bead-0');
      bead.dispatchEvent(pointer('pointerdown', 500, 300));
      bead.dispatchEvent(pointer('pointermove', 560, 380));
      fixture.detectChanges();

      const drawn = onScreen(drawnOffset(0)!);

      expect(drawn.x).toBeCloseTo(60, 4);
      expect(drawn.y).toBeCloseTo(80, 4);
    });
  });

  /**
   * The keyboard suite does not care how the board is being looked at.
   */
  describe('the keyboard at a non-default view', () => {
    const svgEl = () => query('svg');

    const press = (key: string, modifiers: Partial<KeyboardEventInit> = {}) => {
      svgEl().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers }));
      fixture.detectChanges();
    };

    const selected = () =>
      queryAll('[role="option"]').findIndex((el) => el.getAttribute('aria-selected') === 'true');

    beforeEach(() => {
      svgEl().getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 1000, height: 1000 }) as DOMRect;

      // Zoomed in and turned, which is where a transform bug shows up.
      press('+');
      press('+');
      svgEl().dispatchEvent(
        Object.assign(
          new MouseEvent('pointerdown', { clientX: 500, clientY: 150, bubbles: true }),
          {},
        ),
      );
    });

    it('walks the strand and wraps, exactly as at 100%', () => {
      press('ArrowRight');
      expect(selected()).toBe(0);

      press('End');
      expect(selected()).toBe(3);

      press('ArrowRight');
      expect(selected()).toBe(0);
    });

    it('moves a bead by the same indices the person sees', () => {
      const moves: { from: number; to: number }[] = [];
      const view = fixture.debugElement.children[0].componentInstance as StrandViewComponent;
      view.slotMoved.subscribe((m) => moves.push(m));

      press('ArrowRight');
      press('ArrowRight', { ctrlKey: true });

      expect(moves).toEqual([{ from: 0, to: 1 }]);
    });

    it('keeps aria-activedescendant pointing at the same bead', () => {
      press('ArrowRight');

      expect(svgEl().getAttribute('aria-activedescendant')).toBe('sc-bead-0');
    });
  });

  /**
   * <b>touch-action: none, checked statically.</b>
   *
   * It cannot be verified in jsdom, which has no gesture handling to claim the
   * pointer in the first place — so this reads the stylesheet, the same shape as
   * the bead-lighting measurement. Without the declaration a drag on a phone
   * does nothing at all, silently, and every test here still passes.
   */
  describe('the drag surface', () => {
    const source = readFileSync(
      join(repoRoot, 'src', 'app', 'features', 'designer', 'strand', 'strand-view.component.ts'),
      'utf8',
    );

    it('declares touch-action: none on the hit circles', () => {
      expect(source).toMatch(/hit-target'\]\s*\{\s*touch-action:\s*none;/);
    });
  });

  it('renders no raw translation keys', () => {
    expect(text()).not.toContain('STONECRAFT.');
  });
});
