import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';

import {
  calculateCustomBraceletPrice,
  generateBraceletName,
  type SavedBracelet,
  type SavedBraceletStoneSummary,
} from '@core/models/saved-bracelet.models';
import type { BeadGrade } from '@core/models/api-enums';
import type { StrandPosition } from '@core/models/bracelets.models';

export const SAVED_BRACELETS_KEY = 'witchlab_saved_bracelets';
export const ACTIVE_BRACELET_KEY = 'witchlab_active_bracelet_id';

interface BackendSavedBraceletDto {
  id: string;
  name: string;
  readingPublicId: string;
  wristMm: number;
  diameterMm: number;
  grade: BeadGrade;
  spacerStyle: 'none' | 'gold' | 'silver' | 'hematite';
  price: number;
  status: string;
  strandJson: string;
  stonesSummaryJson: string;
  createdAt: string;
  updatedAt: string;
}

interface SyncSavedBraceletsResponse {
  bracelets: BackendSavedBraceletDto[];
  syncedCount: number;
}

/**
 * Manages saved bracelet designs and local persistence.
 *
 * Distinguishes between:
 * - Reading (immutable astrological profile)
 * - Saved Design (persistent and editable bracelet configuration)
 * - Active Design (current design session)
 * - Cart Configuration (frozen snapshot ready for purchase)
 * - Purchased Bracelet (order history)
 */
@Injectable({
  providedIn: 'root',
})
export class SavedBraceletsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly http = inject(HttpClient);

  private readonly braceletsSignal = signal<readonly SavedBracelet[]>(this.readStorage());
  private readonly activeIdSignal = signal<string | null>(this.readActiveId());

  public readonly bracelets = this.braceletsSignal.asReadonly();
  public readonly count = computed(() => this.braceletsSignal().length);
  public readonly activeId = this.activeIdSignal.asReadonly();

  public readonly activeBracelet = computed(() => {
    const id = this.activeIdSignal();
    if (!id) return null;
    return this.braceletsSignal().find((b) => b.id === id) ?? null;
  });

  /**
   * Retrieves all saved bracelets for a given reading session.
   */
  public getByReadingId(readingPublicId: string): SavedBracelet[] {
    return this.braceletsSignal().filter((b) => b.readingPublicId === readingPublicId);
  }

  /**
   * Retrieves a single saved bracelet by its unique ID.
   */
  public getById(id: string): SavedBracelet | null {
    return this.braceletsSignal().find((b) => b.id === id) ?? null;
  }

  /**
   * Saves or updates a bracelet configuration.
   */
  public saveBracelet(input: {
    id?: string | null;
    name?: string;
    readingPublicId: string;
    strand: readonly StrandPosition[];
    wristMm: number;
    diameterMm: number;
    grade: BeadGrade;
    spacerStyle?: 'none' | 'gold' | 'silver' | 'hematite';
    stoneNames?: Map<string, string>;
  }): SavedBracelet {
    const now = new Date().toISOString();
    const id = input.id || this.generateId();
    const spacerStyle = input.spacerStyle ?? 'none';
    const priceBreakdown = calculateCustomBraceletPrice(
      input.strand,
      input.diameterMm,
      input.grade,
      spacerStyle,
    );

    // Build stone summary
    const stoneMap = new Map<string, { slug: string; name: string; count: number; diameterMm: number }>();
    for (const pos of input.strand) {
      const name = input.stoneNames?.get(pos.materialSlug) ?? pos.materialSlug;
      const existing = stoneMap.get(pos.materialSlug);
      if (existing) {
        existing.count += 1;
      } else {
        stoneMap.set(pos.materialSlug, {
          slug: pos.materialSlug,
          name,
          count: 1,
          diameterMm: pos.diameterMm,
        });
      }
    }
    const stones: SavedBraceletStoneSummary[] = [...stoneMap.values()];

    const existing = this.getById(id);
    const name = input.name || existing?.name || generateBraceletName(stones, input.readingPublicId);

    const saved: SavedBracelet = {
      id,
      name,
      readingPublicId: input.readingPublicId,
      strand: input.strand,
      wristMm: input.wristMm,
      diameterMm: input.diameterMm,
      grade: input.grade,
      spacerStyle,
      price: priceBreakdown.totalPrice,
      priceBreakdown,
      stones,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      status: existing?.status === 'ordered' ? 'ordered' : 'saved',
      orderId: existing?.orderId ?? null,
    };

    this.braceletsSignal.update((list) => {
      const idx = list.findIndex((b) => b.id === id);
      if (idx >= 0) {
        const next = [...list];
        next[idx] = saved;
        return next;
      }
      return [saved, ...list];
    });

    this.activeIdSignal.set(id);
    this.writeStorage();
    return saved;
  }

  /**
   * Sets the active editing bracelet.
   */
  public setActive(id: string | null): void {
    this.activeIdSignal.set(id);
    if (this.isBrowser) {
      if (id) {
        localStorage.setItem(ACTIVE_BRACELET_KEY, id);
      } else {
        localStorage.removeItem(ACTIVE_BRACELET_KEY);
      }
    }
  }

  /**
   * Duplicates a saved bracelet to allow variations.
   */
  public duplicate(id: string): SavedBracelet | null {
    const original = this.getById(id);
    if (!original) return null;

    const newId = this.generateId();
    const now = new Date().toISOString();
    const copy: SavedBracelet = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      status: 'saved',
      orderId: null,
    };

    this.braceletsSignal.update((list) => [copy, ...list]);
    this.writeStorage();
    return copy;
  }

  /**
   * Renames a saved bracelet.
   */
  public rename(id: string, newName: string): boolean {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    let updated = false;
    this.braceletsSignal.update((list) =>
      list.map((b) => {
        if (b.id === id) {
          updated = true;
          return { ...b, name: trimmed, updatedAt: new Date().toISOString() };
        }
        return b;
      }),
    );

    if (updated) {
      this.writeStorage();
    }
    return updated;
  }

  /**
   * Deletes a saved bracelet by ID.
   */
  public delete(id: string): void {
    this.braceletsSignal.update((list) => list.filter((b) => b.id !== id));
    if (this.activeIdSignal() === id) {
      this.setActive(null);
    }
    this.writeStorage();
  }

  /**
   * Updates status of a bracelet (e.g. 'in_cart' or 'ordered').
   */
  public updateStatus(id: string, status: 'draft' | 'saved' | 'in_cart' | 'ordered', orderId?: string): void {
    this.braceletsSignal.update((list) =>
      list.map((b) => {
        if (b.id === id) {
          return {
            ...b,
            status,
            orderId: orderId ?? b.orderId,
            updatedAt: new Date().toISOString(),
          };
        }
        return b;
      }),
    );
    this.writeStorage();
  }

  /**
   * Idempotently synchronizes guest local storage bracelets with the server on user login.
   */
  public syncWithBackend(): Observable<SavedBracelet[]> {
    if (!this.isBrowser) {
      return of([]);
    }

    const localList = this.braceletsSignal();
    const items = localList.map((b) => ({
      id: b.id,
      name: b.name,
      readingPublicId: b.readingPublicId,
      wristMm: b.wristMm,
      diameterMm: b.diameterMm,
      grade: b.grade,
      spacerStyle: b.spacerStyle,
      price: b.price,
      status: b.status === 'in_cart' ? 'InCart' : b.status === 'ordered' ? 'Ordered' : 'Saved',
      strandJson: JSON.stringify(b.strand),
      stonesSummaryJson: JSON.stringify(b.stones),
    }));

    return this.http
      .post<SyncSavedBraceletsResponse>('/api/v1/bracelets/saved/sync', { items })
      .pipe(
        map((res) => res.bracelets.map(this.mapDtoToSavedBracelet)),
        tap((synced) => {
          this.braceletsSignal.set(synced);
          this.writeStorage();
        }),
        catchError((err) => {
          console.warn('Failed to sync saved bracelets with server:', err);
          return of([...localList]);
        }),
      );
  }

  /**
   * Fetches saved bracelets from the backend for the current authenticated user or guest.
   */
  public loadFromBackend(): Observable<SavedBracelet[]> {
    return this.http
      .get<BackendSavedBraceletDto[]>('/api/v1/bracelets/saved')
      .pipe(
        map((dtos) => dtos.map(this.mapDtoToSavedBracelet)),
        tap((loaded) => {
          this.braceletsSignal.set(loaded);
          this.writeStorage();
        }),
        catchError((err) => {
          console.warn('Failed to load saved bracelets from server:', err);
          return of([...this.braceletsSignal()]);
        }),
      );
  }

  /**
   * Deletes a bracelet from the server and local state.
   */
  public deleteFromBackend(id: string): Observable<void> {
    this.delete(id);
    return this.http.delete<void>(`/api/v1/bracelets/saved/${id}`).pipe(
      catchError((err) => {
        console.warn(`Failed to delete bracelet ${id} from server:`, err);
        return of(undefined);
      }),
    );
  }

  private mapDtoToSavedBracelet(dto: BackendSavedBraceletDto): SavedBracelet {
    let strand: StrandPosition[] = [];
    try {
      strand = dto.strandJson ? JSON.parse(dto.strandJson) : [];
    } catch {
      strand = [];
    }

    let stones: SavedBraceletStoneSummary[] = [];
    try {
      stones = dto.stonesSummaryJson ? JSON.parse(dto.stonesSummaryJson) : [];
    } catch {
      stones = [];
    }

    const spacerStyle = (dto.spacerStyle?.toLowerCase() as any) || 'none';
    const grade = (dto.grade as BeadGrade) || 'Standard';
    const priceBreakdown = calculateCustomBraceletPrice(strand, dto.diameterMm, grade, spacerStyle);

    const statusStr = (dto.status || 'saved').toLowerCase();
    const status = (statusStr === 'incart' ? 'in_cart' : statusStr) as 'draft' | 'saved' | 'in_cart' | 'ordered';

    return {
      id: dto.id,
      name: dto.name,
      readingPublicId: dto.readingPublicId,
      strand,
      wristMm: dto.wristMm,
      diameterMm: dto.diameterMm,
      grade,
      spacerStyle,
      price: dto.price,
      priceBreakdown,
      stones,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      status,
      orderId: null,
    };
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private readStorage(): SavedBracelet[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(SAVED_BRACELETS_KEY);
      return raw ? (JSON.parse(raw) as SavedBracelet[]) : [];
    } catch {
      return [];
    }
  }

  private readActiveId(): string | null {
    if (!this.isBrowser) return null;
    try {
      return localStorage.getItem(ACTIVE_BRACELET_KEY);
    } catch {
      return null;
    }
  }

  private writeStorage(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(SAVED_BRACELETS_KEY, JSON.stringify(this.braceletsSignal()));
    } catch (e) {
      console.warn('Failed to write saved bracelets to localStorage:', e);
    }
  }
}
