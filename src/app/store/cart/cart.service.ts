import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import { GetCartGQL, GetCartProductsGQL, Language, Zodiac } from 'src/generated/graphql';

import { Locale, LocaleService } from '@core/services/locale.service';
import { CartLine, GuestCartItem } from './cart.models';

const GUEST_CART_KEY = 'witchlab_guest_cart';

const LANGUAGE_BY_LOCALE: Record<Locale, Language> = {
  en: Language.En,
  ka: Language.Ka,
  ru: Language.Ru,
};

type DecimalValue = number | string;

interface CartProductLike {
  id: string;
  zodiac?: Zodiac | null;
  category?: { id: string } | null;
  intention?: { id: string } | null;
  inventory?: { stockQuantity: number } | null;
  pricing?: {
    price?: { amount: DecimalValue } | null;
    salePrice?: { amount: DecimalValue } | null;
  } | null;
  images?: ReadonlyArray<{ url: string }> | null;
  translations?: ReadonlyArray<{ name: string }> | null;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly getCartGQL = inject(GetCartGQL);
  private readonly getCartProductsGQL = inject(GetCartProductsGQL);
  private readonly locale = inject(LocaleService);
  private readonly platformId = inject(PLATFORM_ID);

  public addItem(productId: string, quantity: number): Observable<void> {
    return this.http.post<void>('/api/v1/cart/add', { productId, quantity });
  }

  public updateQuantity(itemId: string, quantity: number): Observable<void> {
    return this.http.put<void>('/api/v1/cart/edit-quantity', { itemId, quantity });
  }

  public removeItem(itemId: string): Observable<void> {
    return this.http.delete<void>('/api/v1/cart/remove', { body: { value: itemId } });
  }

  public clear(): Observable<void> {
    return this.http.delete<void>('/api/v1/cart/clear');
  }

  public merge(items: GuestCartItem[]): Observable<void> {
    return this.http.post<void>('/api/v1/cart/merge', { items });
  }

  public getServerCart(): Observable<CartLine[]> {
    return this.getCartGQL
      .fetch({ variables: { language: this.language() }, fetchPolicy: 'network-only' })
      .pipe(
        map((result) =>
          (result.data?.cart ?? []).map((item) =>
            this.toLine(item.product, item.quantity, item.id),
          ),
        ),
      );
  }

  public getGuestLines(items: GuestCartItem[]): Observable<CartLine[]> {
    if (items.length === 0) {
      return of([]);
    }

    const ids = items.map((item) => item.productId);

    return this.getCartProductsGQL
      .fetch({ variables: { ids, language: this.language() }, fetchPolicy: 'network-only' })
      .pipe(
        map((result) => {
          const products = result.data?.products?.items ?? [];
          return items
            .map((item) => {
              const product = products.find((p) => p.id === item.productId);
              return product ? this.toLine(product, item.quantity, null) : null;
            })
            .filter((line): line is CartLine => line !== null);
        }),
      );
  }

  public readGuest(): GuestCartItem[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      return raw ? (JSON.parse(raw) as GuestCartItem[]) : [];
    } catch {
      return [];
    }
  }

  public writeGuest(items: GuestCartItem[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  }

  public clearGuest(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem(GUEST_CART_KEY);
  }

  private toLine(product: CartProductLike, quantity: number, itemId: string | null): CartLine {
    const rawPrice = product.pricing?.salePrice?.amount ?? product.pricing?.price?.amount ?? 0;

    return {
      itemId,
      productId: product.id,
      quantity,
      name: product.translations?.[0]?.name ?? '',
      price: Number(rawPrice),
      imageUrl: product.images?.[0]?.url ?? null,
      stockQuantity: product.inventory?.stockQuantity ?? 0,
      zodiac: product.zodiac ?? null,
      categoryId: product.category?.id ?? null,
      intentionId: product.intention?.id ?? null,
    };
  }

  private language(): Language {
    return LANGUAGE_BY_LOCALE[this.locale.active()] || Language.En;
  }
}
