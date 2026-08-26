import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  type ElementRef,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import type { SolvedStrand } from '@core/models/bracelets.models';

import { beadImage } from './bead-image';
import { layoutStrand, type PlacedBead, type PlacedStone, type Socket } from './strand-geometry';

/**
 * The bracelet: beads on the ring the solver produced.
 *
 * ── SVG, AND WHY ────────────────────────────────────────────────────────────
 *
 * Not canvas and not WebGL. <b>The ring must not be the only way to read the
 * configuration</b>, and in SVG every bead is already a real element: focusable,
 * labellable, in the accessibility tree, and in document order. A canvas
 * bracelet needs a parallel accessible representation built and kept in sync by
 * hand, which is a second source of truth for what the bracelet contains.
 *
 * So the ring here is a `listbox` of `option`s, arrow-key navigable, each bead
 * naming its stone and its position. Below it, and not visually hidden, is the
 * same configuration as text — because someone who can see the ring perfectly
 * well may still want to know it is 26 beads of four stones before they commit
 * to it.
 *
 * ── NO GEOMETRY ─────────────────────────────────────────────────────────────
 *
 * Every position comes from `slots[].centreXMm/centreYMm`, solved server-side.
 * This component scales and translates; `strand-geometry.ts` does that and
 * nothing else. There is no `Math.sin` in this feature, and a test asserts it.
 *
 * ── QUIET ───────────────────────────────────────────────────────────────────
 *
 * The beads are rendered spheres with real lighting; they carry the richness. So
 * the surround is a hairline ring path, outlined sockets, WLS-F tokens and
 * nothing new. Motion is insertion and selection only, and yields to
 * `prefers-reduced-motion`.
 */
@Component({
  selector: 'sc-strand-view',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="m-0">
      <div class="strand-stage">
        <svg
          #stage
          class="strand-svg"
          [attr.viewBox]="'0 0 ' + layout().extent + ' ' + layout().extent"
          [attr.width]="layout().extent"
          [attr.height]="layout().extent"
          role="listbox"
          [attr.aria-label]="'STONECRAFT.DESIGNER.STRAND_LABEL' | translate"
          [attr.aria-activedescendant]="activeId()"
          tabindex="0"
          [class.is-pending]="pending()"
          [class.is-spinning]="isSpinning()"
          (keydown)="onKeydown($event)"
          (wheel)="onWheel($event)"
          (pointerdown)="onStagePointerDown($event)"
          (pointermove)="onStagePointerMove($event)"
          (pointerup)="endSpin($event)"
          (pointercancel)="endSpin($event)"
        >
          <!--
            ONE group carries the whole view transform.

            Not the viewBox. layoutStrand already maps millimetres to user units,
            and a second scale living in the viewBox would put two conversions in
            the same coordinate system for somebody to conflate later. This is a
            transform on top of a layout that never changes.

            translate(c c) scale(z) rotate(deg) translate(-c -c) — both about
            the centre, and no translation term at all: the ring is pinned to the
            middle of the board and cannot be carried off it.
          -->
          <g [attr.transform]="viewTransform()">
            <!--
            The string. A hairline, because it is the thing the beads hang on and
            not a thing in its own right.
          -->
            <circle
              [attr.cx]="layout().centre"
              [attr.cy]="layout().centre"
              [attr.r]="layout().ringRadius"
              fill="none"
              stroke="var(--border-medium)"
              stroke-width="1"
              aria-hidden="true"
            />

            <!--
              EMPTY PLACES FIRST, in their own pass.

              An empty place is not an option in the listbox and not a drag
              target: there is nothing in it to select, name or move. Drawing them
              in a separate loop rather than branching inside the interactive
              group is what keeps them out of the accessibility tree entirely,
              rather than present-but-hidden.

              pointer-events: none, so a drag that starts on bare rope turns the
              ring — the same gesture as bare stage.
            -->
            @for (socket of sockets(); track socket.position) {
              @if (socket.stone === null) {
                <circle
                  data-testid="empty-place"
                  class="empty-place"
                  [attr.cx]="socket.bead.cx"
                  [attr.cy]="socket.bead.cy"
                  [attr.r]="socket.bead.size / 2"
                  aria-hidden="true"
                />
              }
            }

            @for (socket of filled(); track socket.position) {
              <g
                [attr.id]="beadId(socket.position)"
                role="option"
                [attr.aria-selected]="socket.position === selected()"
                [attr.aria-label]="beadLabel(socket)"
                class="bead"
                [class.is-selected]="socket.position === selected()"
                [class.is-dragging]="socket.position === dragFrom()"
                [style.transform]="dragTransform(socket.position)"
                (click)="select(socket.position)"
                (dblclick)="slotActivated.emit(socket.position)"
                (pointerdown)="onPointerDown($event, socket.position)"
                (pointermove)="onPointerMove($event)"
                (pointerup)="onPointerUp($event)"
                (pointercancel)="cancelDrag()"
              >
                <!--
                An invisible hit circle, larger than the bead. At 26 beads on a
                360 px ring each bead is about 30 px across, well under a
                comfortable touch target; this carries the pointer events so a
                thumb does not have to be precise.
              -->
                <circle
                  data-testid="hit-target"
                  [attr.cx]="socket.bead.cx"
                  [attr.cy]="socket.bead.cy"
                  [attr.r]="hitRadius(socket)"
                  fill="transparent"
                />
                @if (image(socket); as href) {
                  <image
                    [attr.href]="href"
                    [attr.x]="socket.bead.cx - drawnSize(socket) / 2"
                    [attr.y]="socket.bead.cy - drawnSize(socket) / 2"
                    [attr.width]="drawnSize(socket)"
                    [attr.height]="drawnSize(socket)"
                  />
                } @else {
                  <!--
                  A stone nobody has drawn yet. An outline says so; a generic grey
                  sphere would claim to be a picture of it. Solid, unlike an empty
                  place, because there IS a stone here.
                -->
                  <circle
                    data-testid="undrawn"
                    [attr.cx]="socket.bead.cx"
                    [attr.cy]="socket.bead.cy"
                    [attr.r]="drawnSize(socket) / 2"
                    fill="var(--surface-secondary)"
                    stroke="var(--border-dark)"
                    stroke-width="1"
                    stroke-dasharray="4 3"
                  />
                }

                <!--
                The selection ring sits outside the bead so it never covers the
                artwork, and it is a ring rather than a fill so a dark stone and a
                pale one show it equally.
              -->
                @if (socket.position === selected() || socket.position === dropTarget()) {
                  <circle
                    [attr.cx]="socket.bead.cx"
                    [attr.cy]="socket.bead.cy"
                    [attr.r]="drawnSize(socket) / 2 + 5"
                    fill="none"
                    stroke="var(--action-green)"
                    stroke-width="2"
                    class="bead-ring"
                  />
                }
              </g>
            }
          </g>
        </svg>

        <!--
          View controls, on the board rather than under it.

          They act on this component's own view state and on nothing else, which
          is why they are here and not in the page's control panel beside wrist
          and bead size — those change the bracelet. Sitting them on the board
          puts them where the thing they act on is, and costs the board none of
          its height.

          They overlay the rotate surface but are a SIBLING of the svg, not a
          child of it, so a press on a control is not also a pointerdown on the
          stage and cannot start a rotation. That is structural rather than
          handled — an earlier draft stopped propagation here and mutation
          testing showed the guard could not fail, because there was nothing for
          it to stop. The test that remains asserts the property; the line that
          pretended to cause it is gone.
        -->
        <div
          class="view-controls"
          role="group"
          [attr.aria-label]="'STONECRAFT.DESIGNER.VIEW' | translate"
        >
          <button
            type="button"
            class="chip"
            data-testid="zoom-out"
            [disabled]="!canZoomOut()"
            [attr.aria-label]="'STONECRAFT.DESIGNER.ZOOM_OUT' | translate"
            (click)="zoomOut()"
          >
            −
          </button>

          <!--
            A slider, because zoom is a magnitude.

            Two buttons make a person click six times to cross the range and give
            no sense of where in it they are. A slider shows the position and the
            extent at once, and carries its own keyboard handling — arrows, Home
            and End — for free and correctly, which is why the range input is used
            rather than a div dressed as one.

            CONTINUOUS, not stepped in 25s like the buttons. A range input snaps
            its thumb to the nearest step, so a pinch to 390% left the thumb
            sitting on 400 while the readout said 390 — a control lying about the
            value it is showing. The 25% steps belong to the things that step:
            the two buttons and the keyboard shortcuts.
          -->
          <input
            type="range"
            class="zoom-slider"
            data-testid="zoom-slider"
            [attr.min]="minZoomPercent"
            [attr.max]="maxZoomPercent"
            step="any"
            [value]="zoomPercent()"
            [attr.aria-label]="'STONECRAFT.DESIGNER.ZOOM' | translate"
            [attr.aria-valuetext]="zoomPercent() + '%'"
            (input)="onZoomSlider($event)"
          />

          <button
            type="button"
            class="chip"
            data-testid="zoom-in"
            [disabled]="!canZoomIn()"
            [attr.aria-label]="'STONECRAFT.DESIGNER.ZOOM_IN' | translate"
            (click)="zoomIn()"
          >
            +
          </button>

          <output class="zoom-readout" data-testid="zoom-readout">{{ zoomPercent() }}%</output>

          <button
            type="button"
            class="chip chip-text"
            data-testid="reset-view"
            [disabled]="isDefaultView()"
            (click)="resetView()"
          >
            {{ 'STONECRAFT.DESIGNER.RESET_VIEW' | translate }}
          </button>
        </div>
      </div>

      <!--
        The text equivalent. Deliberately visible: §32 asks that the ring not be
        the only way to read the configuration, and a visually-hidden block would
        satisfy the letter of that while leaving a sighted person who wants the
        numbers with nothing.
      -->
      <!--
        What a screen reader is told after a move, by drag OR by Ctrl+Arrow.

        The keyboard path had no announcement at all: Ctrl+Right changed the
        strand and said nothing, so the only way to learn what had happened was
        to arrow round the ring and count. Drag makes that gap twice as visible,
        so it is closed here for both paths.

        Polite rather than assertive: a reorder is the result of something the
        person just did, not an interruption.
      -->
      <p class="sr-only" aria-live="polite" data-testid="move-announcement">
        {{ announcement() }}
      </p>

      <figcaption class="mt-6">
        <!--
          <b>Two forms, chosen here, deliberately.</b> ngx-translate v17
          interpolates but does not pluralise and we carry no ICU compiler. This
          is correct for English and wrong for Russian, which needs three — but
          ru.json and ka.json hold nothing at all, so the strategy to adopt is one
          decision for the whole application, made with the translator present.
          It comes out when those languages go in; it is not a separate task. See
          public/i18n/README.md.
        -->
        <p class="text-sm leading-relaxed text-[var(--text-primary)]">
          {{
            'STONECRAFT.DESIGNER.SUMMARY'
              | translate
                : {
                    beads:
                      (placedCount() === 1
                        ? 'STONECRAFT.DESIGNER.BEAD_COUNT.ONE'
                        : 'STONECRAFT.DESIGNER.BEAD_COUNT.OTHER'
                      ) | translate: { count: placedCount() },
                    stones:
                      (stoneCount() === 1
                        ? 'STONECRAFT.DESIGNER.STONE_COUNT.ONE'
                        : 'STONECRAFT.DESIGNER.STONE_COUNT.OTHER'
                      ) | translate: { count: stoneCount() },
                  }
          }}
        </p>

        <dl class="readout mt-3">
          <dt>{{ 'STONECRAFT.DESIGNER.WRIST' | translate }}</dt>
          <dd>{{ configuration().wristCircumferenceMm }} mm</dd>

          <dt>{{ 'STONECRAFT.DESIGNER.INNER' | translate }}</dt>
          <dd>{{ configuration().innerCircumferenceMm | number: '1.1-1' }} mm</dd>

          <dt>{{ 'STONECRAFT.DESIGNER.FIT' | translate }}</dt>
          <dd>{{ fit() }}</dd>
        </dl>

        <ol class="mt-4 space-y-1 text-sm text-[var(--text-secondary)]">
          @for (entry of tally(); track entry.slug) {
            <li>
              {{ entry.name }} —
              {{
                (entry.count === 1
                  ? 'STONECRAFT.DESIGNER.BEAD_COUNT.ONE'
                  : 'STONECRAFT.DESIGNER.BEAD_COUNT.OTHER'
                ) | translate: { count: entry.count }
              }}
            </li>
          }
        </ol>
      </figcaption>
    </figure>
  `,
  styles: `
    .strand-stage {
      display: flex;
      align-items: center;
      justify-content: center;

      /* The controls sit on the board, so the board is their containing block. */
      position: relative;

      /*
        Nothing on the board is text to be selected.

        A rotate drag across an SVG otherwise leaves the browser's selection
        highlight smeared over the ring, and on a second click the whole figure
        goes blue. There is no text here for anyone to want, so refusing the
        selection costs nothing — the readable text equivalent below the board is
        outside this rule and stays selectable, which is the part a person would
        actually copy.
      */
      user-select: none;
      -webkit-user-select: none;
      /*
        An explicit aspect ratio. An SVG with only a viewBox collapses to zero
        height inside a flex container — which is exactly how the prototype's ring
        came out blank.
      */
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

    .strand-svg {
      width: 100%;
      height: 100%;
      display: block;
      border-radius: 8px;
    }

    .strand-svg.is-pending {
      opacity: 0.55;
      transition: opacity 0.15s ease;
    }

    /*
      Clicking the board must not draw a box round it.

      The stage is tabindex=0 so the keyboard can reach the ring, and Chrome does
      NOT treat a mouse click on a tabindexed <svg> as focus-visible the way it
      does for a form control — measured: matches(':focus') true,
      matches(':focus-visible') false. So the UA's plain :focus outline won,
      5px of accent blue round the whole board, on every click. Styling only
      :focus-visible never had a chance to apply.

      Both rules are needed and they are not the same rule:
        :focus         — silences the UA outline for a pointer, which is where
                         the complaint came from.
        :focus-visible — puts the indicator back for the keyboard, which is the
                         only way to know which control is listening.
      Deleting the second to "simplify" leaves a keyboard user with no focus
      indicator at all on the one control that has a whole keyboard suite.

      THE @supports IS NOT DECORATION. Removing the UA outline is unconditional
      but restoring it is not: an engine that does not understand :focus-visible
      throws the second rule away as an invalid selector and keeps the first, so
      that browser has no focus indicator ever, keyboard included. Gating the
      removal means such a browser keeps its own ugly-but-present outline.

      The rule: only remove a default where you can prove you can put one back.
    */
    @supports selector(:focus-visible) {
      .strand-svg:focus {
        outline: none;
      }
    }

    /*
      OUTLINE, NOT BOX-SHADOW, and this is an accessibility requirement rather
      than a preference.

      forced-colors: active — Windows High Contrast — suppresses box-shadow
      entirely and preserves outline, recolouring it to a system colour. An
      indicator built out of a box-shadow therefore disappears completely for the
      people who depend on focus indicators most, which is a WCAG 2.4.7 failure.
      Modern browsers follow border-radius with an outline, so this looks the same
      as the shadow it replaced.
    */
    .strand-svg:focus-visible {
      outline: 1px solid var(--action-green);
      outline-offset: 1px;
    }

    /*
      <b>touch-action: none, and it is not optional.</b>

      Without it the browser claims the gesture for page scrolling the moment a
      finger moves, pointermove stops arriving, and dragging on a phone simply
      does nothing — which is the single most common way this feature ships
      broken. It sits on the hit circle rather than the group because that is the
      element the pointer is captured on.

      Asserted statically in the spec: it cannot be checked in jsdom, which has
      no gesture handling to claim anything.
    */
    .bead [data-testid='hit-target'] {
      touch-action: none;
    }

    .view-controls {
      position: absolute;
      inset-block-end: 10px;
      inset-inline-start: 50%;
      transform: translateX(-50%);

      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 999px;

      max-inline-size: calc(100% - 20px);

      /*
        GLASS.

        The panel sits on the board, over a radial gradient and — once anyone
        zooms in — over the beads themselves. Frosting it lets what is behind
        stay present without competing: the colour underneath comes through,
        blurred and slightly enriched, so the bar reads as a layer above the
        bracelet rather than a hole cut in it.

        88% opaque with a 6px blur was the first version and it was neither
        thing: too solid for the blur to show, too translucent to be a clean
        surface. Glass needs the background to actually let light through.

        The saturate is what stops a blur of a pale ground looking grey and dead.
        The inset highlight along the top edge is the lit rim of a real pane, and
        it is what separates this from "a translucent rectangle".
      */
      background: color-mix(in srgb, var(--surface-raised, #fff) 55%, transparent);
      backdrop-filter: blur(14px) saturate(160%);
      -webkit-backdrop-filter: blur(14px) saturate(160%);
      border: 1px solid color-mix(in srgb, #fff 55%, transparent);
      box-shadow:
        0 8px 24px -12px rgb(0 0 0 / 0.28),
        inset 0 1px 0 color-mix(in srgb, #fff 70%, transparent);
    }

    /*
      <b>Every glass panel needs the three ways out.</b>

      A frosted surface is a background that is deliberately not opaque, and it is
      only legible because something is blurring what is behind it. Take the blur
      away and the same declaration is a see-through strip with controls floating
      on the bracelet — so each case that removes the blur must put the surface
      back.

      1. No support: Firefox had none until 103 and it is still behind a flag in
         some builds. Without this the panel is 55% transparent with nothing
         frosting it.
      2. Reduced transparency: a system-level accessibility setting, and honouring
         it is the whole point of it existing.
      3. Forced colours: backdrop-filter is ignored outright, and the system
         palette must win rather than being tinted by a translucent layer.
    */
    @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
      .view-controls {
        background: var(--surface-raised, #fff);
        border-color: var(--border-subtle, rgba(0, 0, 0, 0.08));
      }
    }

    @media (prefers-reduced-transparency: reduce) {
      .view-controls {
        background: var(--surface-raised, #fff);
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
      }
    }

    @media (forced-colors: active) {
      .view-controls {
        background: Canvas;
        border-color: CanvasText;
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        box-shadow: none;
      }
    }

    /*
      The slider. Zoom is a magnitude, so it gets the control that shows one.

      accent-color rather than a rebuilt thumb and track: the native control
      already has the keyboard handling, the touch target and the platform's own
      focus ring, and every one of those is lost the moment it is replaced with
      styled divs.
    */
    .zoom-slider {
      inline-size: clamp(80px, 22vw, 140px);
      block-size: 44px;
      accent-color: var(--brand-green, #1f4d3a);
      cursor: pointer;
      background: none;
    }

    /*
      The same 44 px rule the bead hit circles obey.

      A minus sign is 11 px wide, and a control sized to its glyph is a control
      sized for a mouse. These are the buttons a person reaches for *because*
      the beads have become hard to hit, so they are the last place to put a
      target that is harder still.
    */
    .view-controls .chip {
      min-inline-size: 44px;
      min-block-size: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      padding-inline: 8px;
      white-space: nowrap;
    }

    .zoom-readout {
      min-width: 4.5ch;
      text-align: center;
      font-size: 0.8125rem;
      font-variant-numeric: tabular-nums;
      color: var(--text-secondary);
    }

    /* The stage owns the gesture; the browser must not claim it for scrolling. */
    .strand-svg {
      touch-action: none;
    }

    /*
      An empty place on the rope.

      Quiet enough that twenty-six of them read as a bracelet waiting to be
      filled rather than as twenty-six holes. No dash: a dashed circle already
      means "a stone we have no artwork for" a few lines up, and two different
      absences drawn the same way is worse than either.
    */
    .empty-place {
      fill: var(--surface-secondary);
      stroke: var(--border-subtle);
      stroke-width: 1;
      opacity: 0.55;
      pointer-events: none;
    }

    .strand-svg.is-spinning {
      cursor: grabbing;
    }

    .strand-svg > g {
      transition: transform 0.12s ease-out;
    }

    .bead.is-dragging {
      cursor: grabbing;

      /*
        No transition while dragging. The .bead rule animates transform over
        180 ms so the ring re-lays out gracefully on drop; applied to the drag
        itself that makes the bead trail the pointer by a fifth of a second,
        which feels broken rather than smooth.
      */
      transition: none;
    }

    /* The dragged bead rides above the rest of the ring rather than under them. */
    .bead.is-dragging .bead-ring,
    .bead.is-dragging image,
    .bead.is-dragging circle {
      pointer-events: none;
    }

    .bead {
      cursor: pointer;
      transform-box: fill-box;
      transform-origin: center;
      transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .bead:hover,
    .bead.is-selected {
      transform: scale(1.06);
    }

    .bead-ring {
      animation: bead-select 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes bead-select {
      from {
        opacity: 0;
        stroke-width: 6;
      }
      to {
        opacity: 1;
        stroke-width: 2;
      }
    }

    .readout {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 2px 14px;
      font-size: 0.875rem;
    }

    .readout dt {
      color: var(--text-muted);
    }

    .readout dd {
      margin: 0;
      font-variant-numeric: tabular-nums;
      color: var(--text-primary);
    }

    @media (prefers-reduced-motion: reduce) {
      .bead,
      .bead-ring {
        transition: none;
        animation: none;
      }

      .bead:hover,
      .bead.is-selected {
        transform: none;
      }

      /*
        The view transform eases like the insertion animation does, and yields the
        same way. A zoom that jumps is still a zoom; a zoom that swoops is what
        someone asked not to be shown.
      */
      .strand-svg > g {
        transition: none;
      }
    }
  `,
})
export class StrandViewComponent {
  public readonly configuration = input.required<SolvedStrand>();

  /**
   * The stones chosen so far, in order, filling the rope from the first place.
   *
   * <b>Separate from `configuration` on purpose.</b> `configuration` is the rope
   * — how many places there are and where each one sits — and it comes from a
   * solve that knows nothing about the person's choices. This is what is IN those
   * places. Reading the stone from the rope's own slots would report the probe
   * material the geometry was asked about, which is the same for every place and
   * is not a stone anybody chose.
   */
  public readonly placed = input<readonly PlacedStone[]>([]);

  /** Dims the stage while a newer solve is in flight. Never clears it. */
  public readonly pending = input<boolean>(false);

  /** Emits the slot position a person picked, so a parent can act on it. */
  public readonly slotSelected = output<number>();

  /** Enter, Space or double-click — the parent opens the replace picker. */
  public readonly slotActivated = output<number>();

  /** Delete or Backspace on the selected bead. */
  public readonly slotRemoved = output<number>();

  /**
   * Ctrl+Arrow moved the selected bead.
   *
   * <b>Built before pointer drag, not after.</b> The keyboard path is the one
   * that has to work — it is the accessible one and it is far easier to test —
   * and drag is layered on top of the same output.
   */
  public readonly slotMoved = output<{ from: number; to: number }>();

  private readonly translate = inject(TranslateService);

  private readonly stage = viewChild.required<ElementRef<SVGSVGElement>>('stage');

  protected readonly selected = signal<number | null>(null);

  /** Empty until something moves; a live region must not speak on first render. */
  protected readonly announcement = signal('');

  protected readonly layout = computed(() => layoutStrand(this.configuration()));

  /**
   * Every place on the rope, with the stone in it or null.
   *
   * The rope fills from the first place, so place `i` holds stone `i`. Sorting
   * that out here rather than in the template keeps the two collections from
   * being indexed against each other in five places.
   */
  protected readonly sockets = computed<readonly Socket[]>(() => {
    const placed = this.placed();

    return this.layout().beads.map((bead, index) => ({
      bead,
      position: index,
      stone: index < placed.length ? placed[index] : null,
    }));
  });

  /**
   * <b>A stone is drawn at the size it was placed at.</b>
   *
   * The rope is solved with the stones already on it, so place `i` is the size of
   * stone `i` and the two agree — but they agree because the request said so, not
   * because anything here makes them. Reading the stone's own diameter is what
   * keeps a 6 mm bead 6 mm when the size control moves to 10: the control picks
   * the size of the NEXT stone, and changing it must not reach backwards and
   * resize the ones already chosen.
   *
   * Falls back to the place's size for an empty place, which has no stone to ask.
   */
  protected drawnSize(socket: Socket): number {
    const stone = socket.stone;

    if (stone === null) {
      return socket.bead.size;
    }

    return socket.bead.size * (stone.diameterMm / socket.bead.slot.diameterMm);
  }

  /** Places with a stone in them — the only ones a person can select or drag. */
  protected readonly filled = computed(() => this.sockets().filter((s) => s.stone !== null));

  protected readonly activeId = computed(() => {
    const position = this.selected();
    return position === null ? null : this.beadId(position);
  });

  /**
   * Distinct stones, in the order they first appear on the rope.
   *
   * <b>Counted from `placed`, never from the rope's slots.</b> Every slot on the
   * rope names the probe material its geometry was asked about, so tallying those
   * would report one stone, the same one, whatever the person actually chose.
   */
  protected readonly tally = computed(() => {
    const counts = new Map<string, { slug: string; name: string; count: number }>();

    for (const stone of this.placed()) {
      const entry = counts.get(stone.slug);
      if (entry) {
        entry.count += 1;
      } else {
        counts.set(stone.slug, { slug: stone.slug, name: stone.name, count: 1 });
      }
    }

    return [...counts.values()];
  });

  protected readonly stoneCount = computed(() => this.tally().length);

  /** How many places the rope has, and how many are filled. */
  protected readonly capacity = computed(() => this.layout().beads.length);
  protected readonly placedCount = computed(() => this.placed().length);

  /** Signed, because a loose bracelet and a tight one are different problems. */
  protected readonly fit = computed(() => {
    const deviation = this.configuration().fitDeviationMm;
    return `${deviation >= 0 ? '+' : ''}${deviation.toFixed(1)} mm`;
  });

  protected beadId(position: number): string {
    return `sc-bead-${position}`;
  }

  protected image(socket: Socket): string | null {
    return socket.stone === null ? null : beadImage(socket.stone.slug);
  }

  /**
   * What a screen reader says for one bead.
   *
   * Position first, because "bead 7 of 26" is what orients someone arrowing round
   * a ring they cannot see; the stone name alone leaves them counting.
   */
  protected beadLabel(socket: Socket): string {
    const stone = socket.stone;

    if (stone === null) {
      return '';
    }

    return `${socket.position + 1} / ${this.capacity()}: ${stone.name}, ${stone.diameterMm} mm`;
  }

  private moveTo(from: number, to: number): void {
    this.selected.set(to);
    this.announce(from, to);
    this.slotMoved.emit({ from, to });
  }

  /** Says what just happened, for someone who cannot see it happen. */
  private announce(from: number, to: number): void {
    const stone = this.placed()[from];

    if (stone === undefined) {
      return;
    }

    this.announcement.set(
      this.translate.instant('STONECRAFT.DESIGNER.MOVED', {
        stone: stone.name,
        position: to + 1,
        count: this.placedCount(),
      }),
    );
  }

  // ── The view ─────────────────────────────────────────────────────────────

  /**
   * <b>Zoom and rotation are how someone is LOOKING at a bracelet, not what the
   * bracelet is.</b>
   *
   * Neither is written to `strand`, neither is saved with the configuration, and
   * neither triggers a solve — the solve pipeline watches `strand`, the wrist and
   * the template, and nothing here touches any of them. There is a test asserting
   * a zoom and a rotation produce zero `/solve` calls, because the easy mistake is
   * to wire a view transform into the signal the solve is derived from and fire a
   * request per animation frame.
   *
   * <b>Rotation is a no-op on the physical object, which is exactly why it must
   * live here.</b> A bracelet is a closed cycle with no clasp: `[A,B,C,D]` and
   * `[B,C,D,A]` are the same bracelet. The cord length is the sum of the diameters
   * and is permutation-invariant, and the solved radius depends on the cyclic
   * order, which a rotation preserves — spin it and the solver returns
   * byte-identical geometry.
   *
   * So "just rotate the strand array" is the obvious implementation and it is
   * wrong. It would store two identical bracelets as different strands, spend a
   * round trip to be told the same numbers, show a difference between two saved
   * designs that does not exist, and drift `moveBead` indices against what the
   * person can see.
   *
   * <b>If the product ever gains a clasp or a fixed focal bead this decision has
   * to be revisited</b>, because rotation would then carry meaning. It has
   * neither today.
   */
  protected readonly zoom = signal(1);

  /**
   * The rotation, as a unit vector rather than an angle.
   *
   * `{ cos: 1, sin: 0 }` is upright. Held this way because no angle is ever
   * needed: a drag composes one rotation with another, and SVG takes a matrix.
   * See `rotateBy` — measuring an angle would mean `atan2`, and turning radians
   * into degrees would mean `Math.PI`, and the geometry grep forbids both.
   */
  protected readonly rotation = signal<{ cos: number; sin: number }>({ cos: 1, sin: 0 });

  /** 100% is the default view, and the readout says so. */
  protected readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));

  protected static readonly MIN_ZOOM = 0.5;
  protected static readonly MAX_ZOOM = 4;
  private static readonly ZOOM_STEP = 0.25;

  /*
    The clamp's two ends as percentages, for the slider.

    Derived rather than written twice: a slider whose maximum disagrees with the
    clamp is a control that appears to go somewhere it does not, and the two
    would drift the first time the range changed.
  */
  protected readonly minZoomPercent = StrandViewComponent.MIN_ZOOM * 100;
  protected readonly maxZoomPercent = StrandViewComponent.MAX_ZOOM * 100;

  protected readonly canZoomIn = computed(() => this.zoom() < StrandViewComponent.MAX_ZOOM);
  protected readonly canZoomOut = computed(() => this.zoom() > StrandViewComponent.MIN_ZOOM);
  protected readonly isDefaultView = computed(
    () => this.zoom() === 1 && this.rotation().cos === 1 && this.rotation().sin === 0,
  );

  /**
   * <b>The ring is pinned to the centre of the board.</b>
   *
   * Scale and rotation only, both about the centre, so the bracelet turns and
   * grows where it is and can never be carried off to a corner. There is
   * deliberately no translation term: see `onWheel` for why the usual
   * zoom-toward-the-pointer is not here either.
   */
  protected viewTransform(): string {
    const centre = this.layout().centre;
    const { cos, sin } = this.rotation();

    return (
      `translate(${centre} ${centre}) scale(${this.zoom()}) ` +
      `matrix(${cos} ${sin} ${-sin} ${cos} 0 0) translate(${-centre} ${-centre})`
    );
  }

  /**
   * The invisible hit circle, in user units, sized so its ON-SCREEN radius does
   * not move when the view does.
   *
   * <b>This is the detail that decides whether the feature works on a phone.</b>
   * User units shrink on screen as the view zooms out, so at 50% a bead's target
   * halves. Dividing the whole radius by the zoom cancels that exactly — the
   * circle grows in the model as the view shrinks, and the two multiply back to
   * the same pixels.
   *
   * Only below 100%. Above it the target is already growing and compensating
   * would shrink it back, which is the opposite of the point.
   *
   * <b>What this guarantees is "never smaller than at 100%", and that is not the
   * same as "at least 44 px".</b> Whether the default clears 44 depends on how
   * wide the stage is rendered: 1000 user units across a 360 px column makes a
   * 46-unit hit radius about 17 px, so a 26-bead bracelet on a narrow phone is
   * already under the target before anyone zooms. That is a real gap and it is
   * older than this control; recorded in the expansion doc rather than papered
   * over here, because fixing it means changing how the stage is sized.
   */
  protected hitRadius(socket: Socket): number {
    return (this.drawnSize(socket) / 2 + 6) / Math.min(this.zoom(), 1);
  }

  protected onZoomSlider(event: Event): void {
    const percent = Number((event.target as HTMLInputElement).value);

    if (!Number.isFinite(percent)) {
      return;
    }

    this.setZoom(percent / 100);
  }

  protected zoomIn(): void {
    this.stepZoom(1);
  }

  protected zoomOut(): void {
    this.stepZoom(-1);
  }

  /**
   * To the next 25% stop, not 25% from wherever the pinch happened to stop.
   *
   * Adding the step to the current value means that once a pinch has left the
   * grid every press stays off it — 158% becomes 183%, then 208% — and the
   * buttons no longer land on round numbers at all. Moving to the next stop
   * makes them a stepper, which is what a person pressing + twice expects, and
   * it re-grids a view that a continuous gesture knocked off it.
   *
   * The epsilon is for the floating-point case where the zoom is already exactly
   * on a stop and `floor` would otherwise return the stop below it.
   */
  private stepZoom(direction: 1 | -1): void {
    const step = StrandViewComponent.ZOOM_STEP;
    const stops = this.zoom() / step;

    const next = direction > 0 ? Math.floor(stops + 1e-9) + 1 : Math.ceil(stops - 1e-9) - 1;

    this.setZoom(next * step);
  }

  /** Back to the view the bracelet was drawn at: 100% and no rotation. */
  protected resetView(): void {
    this.zoom.set(1);
    this.rotation.set({ cos: 1, sin: 0 });
  }

  private setZoom(next: number): void {
    this.zoom.set(
      Math.min(StrandViewComponent.MAX_ZOOM, Math.max(StrandViewComponent.MIN_ZOOM, next)),
    );
  }

  /**
   * Wheel and trackpad.
   *
   * <b>Ctrl or Cmd plus scroll zooms. Plain scroll is not ours.</b> The usual
   * companion to a zoom is a pan, and there is no pan here: the ring stays in
   * the middle of its board by design, so a plain scroll is left to the page,
   * which is what a person expects a scroll to do when the thing under the
   * pointer cannot be scrolled itself. `preventDefault` is called only on the
   * zoom path, for the same reason.
   *
   * A trackpad pinch arrives as a wheel event with `ctrlKey` set, so pinch and
   * Cmd-scroll are one code path rather than two that drift apart.
   */
  protected onWheel(event: WheelEvent): void {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();

    this.setZoom(this.zoom() * Math.exp(-event.deltaY / 300));
  }

  // ── Rotating ─────────────────────────────────────────────────────────────

  /** Where the pointer was, relative to the ring centre, on the last move. */
  private spin: { x: number; y: number } | null = null;

  /**
   * Dragging empty stage spins the ring.
   *
   * <b>No angle is ever computed.</b> The obvious implementation takes `atan2` of
   * the pointer about the centre and subtracts; `atan2` is one of the names the
   * geometry grep forbids, and converting the result to degrees would need
   * `Math.PI`, which a second guard forbids for its own reason. Both apply to the
   * solver rather than to a view control — and a guard stepped over when it is
   * inconvenient is not a guard.
   *
   * A rotation is a `(cos, sin)` pair, and the pair taking one vector to another
   * comes straight from their dot and cross products over the product of the
   * magnitudes. Composing that with the rotation already applied is two
   * multiplications and an add. <b>Exact, not approximated</b> — an earlier draft
   * accumulated small angles from the cross product alone, which is the
   * small-angle approximation and drifts; this does not, and is shorter.
   *
   * A square root is not trigonometry and is not forbidden by either guard.
   */
  private rotateBy(clientX: number, clientY: number): void {
    const centre = this.layout().centre;
    const point = this.toUserUnits(clientX, clientY);

    // The ring centre is the centre of the board and stays there, so this is the
    // pivot with no correction needed.
    const next = { x: point.x - centre, y: point.y - centre };
    const previous = this.spin;

    this.spin = next;

    if (previous === null) {
      return;
    }

    const lengths =
      Math.sqrt(previous.x * previous.x + previous.y * previous.y) *
      Math.sqrt(next.x * next.x + next.y * next.y);

    if (lengths === 0) {
      return;
    }

    // The rotation carrying `previous` onto `next`, as a unit vector.
    const step = {
      cos: (previous.x * next.x + previous.y * next.y) / lengths,
      sin: (previous.x * next.y - previous.y * next.x) / lengths,
    };

    this.rotation.update((r) => {
      const composed = {
        cos: r.cos * step.cos - r.sin * step.sin,
        sin: r.sin * step.cos + r.cos * step.sin,
      };

      // Renormalised each step so thousands of composed drags cannot let
      // floating-point error grow the ring.
      const length = Math.sqrt(composed.cos * composed.cos + composed.sin * composed.sin);

      return length === 0 ? r : { cos: composed.cos / length, sin: composed.sin / length };
    });
  }

  /**
   * A drag that starts on empty stage spins the ring; one that starts on a bead
   * reorders it, and that handler is on the bead group and stops here.
   */
  protected onStagePointerDown(event: PointerEvent): void {
    if (this.grab !== null || (event.target as Element).closest('[role="option"]') !== null) {
      return;
    }

    capturePointer(event);
    this.spinPointer = event.pointerId;
    this.spin = null;
    this.rotateBy(event.clientX, event.clientY);
  }

  protected onStagePointerMove(event: PointerEvent): void {
    if (this.spinPointer !== event.pointerId) {
      return;
    }

    event.preventDefault();
    this.rotateBy(event.clientX, event.clientY);
  }

  protected endSpin(event: PointerEvent): void {
    if (this.spinPointer !== event.pointerId) {
      return;
    }

    this.spinPointer = null;
    this.spin = null;
  }

  private spinPointer: number | null = null;

  /** For the cursor only. */
  protected isSpinning(): boolean {
    return this.spinPointer !== null;
  }

  // ── Dragging ─────────────────────────────────────────────────────────────

  /**
   * Where the pointer went down, in client pixels, and which bead it grabbed.
   *
   * Null between gestures. `passed` is the movement threshold: below it the
   * gesture is still a click and still selects, which is why it is a separate
   * flag rather than being inferred from a non-null drag.
   */
  private grab: {
    pointerId: number;
    from: number;
    clientX: number;
    clientY: number;
    passed: boolean;
  } | null = null;

  /**
   * Suppresses the `click` that follows a completed drag.
   *
   * `pointerup` is followed by `click` on the same element, and without this a
   * drop would also select whatever the pointer happened to be over. The click
   * handler is kept rather than replaced because it is also what a synthetic
   * `element.click()` reaches, and the keyboard and test paths use it.
   */
  private suppressClick = false;

  /** The bead being dragged, so the template can lift it out of the ring. */
  protected readonly dragFrom = signal<number | null>(null);

  /** Where it would land. Marked with the selection ring, as the brief asks. */
  protected readonly dropTarget = signal<number | null>(null);

  /** How far the dragged bead has been carried, in user units. */
  private readonly dragOffset = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  /**
   * Pixels of movement before a click becomes a drag.
   *
   * Without a threshold every selection is an accidental reorder, and on touch
   * that is constant — a finger never lands and lifts on the same pixel.
   */
  private static readonly DRAG_THRESHOLD_PX = 4;

  /**
   * The dragged bead's offset, as a CSS transform rather than an SVG attribute.
   *
   * <b>An attribute would not work.</b> `.bead:hover` already sets
   * `transform: scale(1.06)` in CSS, and a CSS transform beats an SVG
   * presentation attribute — so the attribute form was silently ignored for the
   * whole gesture, because the pointer is by definition hovering the bead it is
   * dragging. The bead simply never moved.
   *
   * The scale is kept in the same declaration so the lift cue survives, and
   * lengths in a CSS transform on an SVG element are user units, which is what
   * the offset is already in.
   */
  protected dragTransform(position: number): string | null {
    if (this.dragFrom() !== position) {
      return null;
    }

    const { x, y } = this.dragOffset();

    return `translate(${x}px, ${y}px) scale(1.06)`;
  }

  protected onPointerDown(event: PointerEvent, position: number): void {
    /*
      Clear the suppression here rather than trusting the click to consume it.

      A drop sets `suppressClick` so the click that follows `pointerup` does not
      also select whatever the pointer landed on. But a click does not always
      follow — the pointer can come up outside the element, the browser can
      cancel it — and a flag left set then eats the NEXT legitimate selection,
      one gesture later, which is impossible to attribute to a drag. Clearing on
      the way in bounds it to a single gesture by construction.
    */
    this.suppressClick = false;

    // Focus the ring on the way in, so Escape reaches the keydown handler and
    // so the keyboard controls work straight after a pointer interaction.
    this.stage().nativeElement.focus({ preventScroll: true });

    capturePointer(event);

    this.grab = {
      pointerId: event.pointerId,
      from: position,
      clientX: event.clientX,
      clientY: event.clientY,
      passed: false,
    };
  }

  protected onPointerMove(event: PointerEvent): void {
    const grab = this.grab;

    if (grab === null || grab.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - grab.clientX;
    const dy = event.clientY - grab.clientY;

    if (!grab.passed) {
      // Squared comparison, so no square root and no geometry.
      const threshold = StrandViewComponent.DRAG_THRESHOLD_PX;

      if (dx * dx + dy * dy < threshold * threshold) {
        return;
      }

      grab.passed = true;
      this.dragFrom.set(grab.from);
    }

    const scale = this.userUnitsPerPixel();

    // Un-rotated and un-zoomed, so the bead moves with the pointer rather than
    // at an angle to it once the ring has been turned.
    this.dragOffset.set(this.toLayoutDirection({ x: dx * scale, y: dy * scale }));
    this.dropTarget.set(this.nearestSlot(event.clientX, event.clientY));

    // Only once the gesture is a drag, so a tap is never stolen from the page.
    event.preventDefault();
  }

  protected onPointerUp(event: PointerEvent): void {
    const grab = this.grab;

    if (grab === null || grab.pointerId !== event.pointerId) {
      return;
    }

    const to = this.dropTarget();
    const dragged = grab.passed;

    this.grab = null;
    this.resetDrag();

    if (!dragged) {
      // Still a click. `select` runs from the click handler that follows.
      return;
    }

    this.suppressClick = true;

    if (to !== null && to !== grab.from) {
      // ONE move, and therefore one solve, on drop. Re-solving per pointermove
      // would put hundreds of calls through /solve per gesture.
      this.moveTo(grab.from, to);
    }
  }

  /** Escape, `pointercancel`, or a pointer that stops belonging to us. */
  protected cancelDrag(): void {
    this.grab = null;
    this.resetDrag();
  }

  private resetDrag(): void {
    this.dragFrom.set(null);
    this.dropTarget.set(null);
    this.dragOffset.set({ x: 0, y: 0 });
  }

  /**
   * The slot whose centre is closest to the pointer.
   *
   * <b>Squared distance, and deliberately not an angle.</b> The obvious
   * implementation is `atan2` around the centre divided by the step — and that
   * is a second implementation of the solver's closure condition, which
   * disagrees with the server on any mixed-diameter strand. It is also simply
   * the wrong answer: the beads are not evenly spaced when their diameters
   * differ.
   *
   * No `Math.hypot` and no square root either. The comparison is identical
   * without one, and its absence keeps the file obviously free of geometry —
   * which is what the grep in `strand-geometry.spec.ts` checks.
   */
  private nearestSlot(clientX: number, clientY: number): number | null {
    const beads = this.layout().beads;

    if (beads.length === 0) {
      return null;
    }

    // Layout units, because `bead.cx`/`bead.cy` are: see `toLayoutUnits`.
    const point = this.toLayoutUnits(clientX, clientY);

    let best = beads[0];
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const bead of beads) {
      const dx = point.x - bead.cx;
      const dy = point.y - bead.cy;
      const distance = dx * dx + dy * dy;

      if (distance < bestDistance) {
        bestDistance = distance;
        best = bead;
      }
    }

    return best.slot.position;
  }

  /**
   * Client pixels to viewBox units.
   *
   * The viewBox is square and the default `xMidYMid meet` letterboxes it inside
   * whatever box CSS gives the element, so the scale is the smaller ratio and
   * the remainder is split evenly as padding.
   */
  private toUserUnits(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.stage().nativeElement.getBoundingClientRect();
    const extent = this.layout().extent;
    const scale = Math.min(rect.width, rect.height) / extent;

    if (!Number.isFinite(scale) || scale <= 0) {
      return { x: 0, y: 0 };
    }

    return {
      x: (clientX - rect.left - (rect.width - extent * scale) / 2) / scale,
      y: (clientY - rect.top - (rect.height - extent * scale) / 2) / scale,
    };
  }

  /**
   * Client pixels to <b>layout</b> units — the inverse of the view transform.
   *
   * <b>`toUserUnits` is not enough, and this is the bug that taught us so.</b>
   * The beads are drawn inside the group carrying zoom and rotation, so
   * their `cx`/`cy` are in the layout's own coordinates, not the viewBox's. A
   * pointer converted only as far as viewBox units is being compared against
   * numbers from a different space: with the view at its default the two spaces
   * coincide and everything works, and the moment the ring is rotated the
   * nearest bead to the pointer is computed about where the bead <i>used</i> to
   * be. Grab a stone after a half-turn and it flies off in the opposite
   * direction.
   *
   * Forward, the group maps a layout point `l` to `c + z·R·(l − c)`. Going back
   * is that read right to left.
   */
  private toLayoutUnits(clientX: number, clientY: number): { x: number; y: number } {
    const centre = this.layout().centre;
    const view = this.toUserUnits(clientX, clientY);

    const offset = this.toLayoutDirection({
      x: view.x - centre,
      y: view.y - centre,
    });

    return { x: centre + offset.x, y: centre + offset.y };
  }

  /**
   * The same inverse for a direction rather than a point — only the rotation and
   * the zoom apply.
   *
   * This is what a drag offset needs. The offset is a CSS transform on a bead
   * <i>inside</i> the group, so whatever it is given is rotated and scaled again
   * on the way to the screen; undoing both here is what makes the stone track
   * the pointer instead of setting off at an angle to it.
   *
   * `R` is `matrix(cos sin -sin cos)`, so its inverse is the same pair with the
   * sign of `sin` flipped. Still no angle anywhere.
   */
  private toLayoutDirection(view: { x: number; y: number }): { x: number; y: number } {
    const { cos, sin } = this.rotation();
    const zoom = this.zoom();

    if (zoom === 0) {
      return { x: 0, y: 0 };
    }

    return {
      x: (view.x * cos + view.y * sin) / zoom,
      y: (view.y * cos - view.x * sin) / zoom,
    };
  }

  private userUnitsPerPixel(): number {
    const rect = this.stage().nativeElement.getBoundingClientRect();
    const scale = Math.min(rect.width, rect.height) / this.layout().extent;

    return Number.isFinite(scale) && scale > 0 ? 1 / scale : 0;
  }

  protected select(position: number): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }

    this.selected.set(position);

    /*
      Clicking a bead selects it, but a click on an SVG *child* does not move
      focus to the tabindex'd <svg> in Chrome — so without this line the ring
      holds a selection that the keyboard cannot act on, and Delete or
      Ctrl+Arrow straight after a click does nothing at all. Found by driving
      it: select bead, press Delete, watch the bracelet not change.
    */
    this.stage().nativeElement.focus({ preventScroll: true });

    this.slotSelected.emit(position);
  }

  /**
   * Arrow keys walk the strand, and they wrap.
   *
   * Wrapping because the thing being navigated is a closed ring — stopping at
   * bead 26 would be a claim about the bracelet that is not true.
   */
  protected onKeydown(event: KeyboardEvent): void {
    /*
      Escape abandons a drag and puts the bead back, before any other key
      handling runs. Without it a person who starts a drag by accident — which
      the 4 px threshold makes rare but not impossible — has no way out but to
      complete it, and there is no undo.
    */
    /*
      Zoom has a keyboard equivalent and rotation deliberately does not.

      Magnification is an accessibility feature in its own right, so +, - and 0
      are bound. Rotation carries NO information — a bracelet is the same object
      at every angle, and the ring's reading order, labels and
      `aria-activedescendant` are identical however it is turned — so there is
      nothing a screen-reader user is missing and nothing to bind. Said here so
      the next accessibility pass does not close a gap that is not one.
    */
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.zoomIn();

      return;
    }

    if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      this.zoomOut();

      return;
    }

    if (event.key === '0') {
      event.preventDefault();
      this.resetView();

      return;
    }

    if (event.key === 'Escape' && this.grab !== null) {
      event.preventDefault();
      this.cancelDrag();
      return;
    }

    const count = this.configuration().slots.length;
    if (count === 0) {
      return;
    }

    const current = this.selected();

    // Ctrl+Arrow moves the selected bead rather than the selection.
    if ((event.ctrlKey || event.metaKey) && current !== null) {
      /*
        The selection has to move with the bead, not stay on the index.

        It did not, and the result was a control that looked like it worked and
        did not: one Ctrl+Right walked the bead from 0 to 1, the selection stayed
        on 0 — now a different stone — and the next Ctrl+Right walked *that* one
        back into slot 1, returning the strand to where it started. Two presses,
        no movement. `moveBead` on the store already did this correctly; the
        component held its own selection and the two disagreed.
      */
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        this.moveTo(current, (current + 1) % count);
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.moveTo(current, (current - 1 + count) % count);
        return;
      }
    }

    if (current !== null && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault();
      this.slotRemoved.emit(current);
      return;
    }

    if (current !== null && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.slotActivated.emit(current);
      return;
    }

    let next: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = current === null ? 0 : (current + 1) % count;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = current === null ? count - 1 : (current - 1 + count) % count;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.select(next);
  }
}

/**
 * Takes pointer capture, and does not care if it cannot.
 *
 * <b>`setPointerCapture` throws</b> — `NotFoundError` — when the id names no
 * active pointer, which happens when the pointer is released between the browser
 * dispatching the event and the handler running, and whenever a synthetic event
 * is dispatched. Unguarded it aborts the handler, so the drag never starts and
 * the only trace is a console error. Optional chaining does not help: the method
 * exists, it is the call that fails.
 *
 * Capture is a convenience here — it keeps a drag alive when the pointer leaves
 * the stage — and losing it costs a drag that ends at the edge, not a broken one.
 * The stage itself is captured rather than `event.target`, because the target may
 * be a bead that re-renders mid-drag and takes the capture with it.
 */
function capturePointer(event: PointerEvent): void {
  const stage = (event.currentTarget ?? event.target) as Element | null;

  try {
    stage?.setPointerCapture(event.pointerId);
  } catch {
    // Nothing to do and nothing to report: the drag works without it.
  }
}
