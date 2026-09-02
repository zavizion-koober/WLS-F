import { inject, Injectable } from '@angular/core';
import { Action, State, StateContext, Store } from '@ngxs/store';
import {
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  groupBy,
  map,
  mergeMap,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { CartService } from './cart.service';
import { CartStateModel, GuestCartItem } from './cart.models';
import {
  AddCustomBraceletToCart,
  AddToCart,
  ClearCart,
  CloseCartDrawer,
  LoadCart,
  MergeGuestCart,
  OpenCartDrawer,
  RemoveFromCart,
  ToggleCartDrawer,
  UpdateCartQuantity,
} from './cart.actions';
import { AuthSelectors } from '@store/auth/auth.selectors';
import { NotificationService } from '@core/services/notification.service';
import { SavedBraceletsService } from '@core/services/saved-bracelets.service';

@State<CartStateModel>({
  name: 'cart',
  defaults: {
    lines: [],
    loading: false,
    drawerOpen: false,
  },
})
@Injectable()
export class CartState {
  private readonly cartService = inject(CartService);
  private readonly savedBraceletsService = inject(SavedBraceletsService);
  private readonly store = inject(Store);
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  private readonly quantityUpdate$ = new Subject<{
    productId: string;
    itemId: string;
    quantity: number;
  }>();

  constructor() {
    this.quantityUpdate$
      .pipe(
        groupBy((item) => item.itemId),
        mergeMap((group$) =>
          group$.pipe(
            debounceTime(350),
            distinctUntilChanged((prev, curr) => prev.quantity === curr.quantity),
            concatMap((item) =>
              this.cartService.updateQuantity(item.itemId, item.quantity).pipe(
                catchError(() => {
                  this.notification.error(
                    this.translate.instant('MESSAGES.ERRORS.DATA_LOAD_FAILED', {
                      defaultValue: 'Failed to update item quantity',
                    }),
                  );
                  this.store.dispatch(new LoadCart());
                  return of(null);
                }),
              ),
            ),
          ),
        ),
      )
      .subscribe();
  }

  @Action(LoadCart)
  loadCart(ctx: StateContext<CartStateModel>) {
    const isAuth = this.store.selectSnapshot(AuthSelectors.isAuthenticated);
    ctx.patchState({ loading: true });

    if (isAuth) {
      const guestCustomItems = this.cartService.readGuest().filter((i) => !!i.customBracelet);
      return this.cartService.getServerCart().pipe(
        switchMap((serverLines) => {
          if (guestCustomItems.length === 0) {
            ctx.patchState({ lines: serverLines, loading: false });
            return of(serverLines);
          }
          return this.cartService.getGuestLines(guestCustomItems).pipe(
            map((customLines) => {
              const combined = [...customLines, ...serverLines];
              ctx.patchState({ lines: combined, loading: false });
              return combined;
            }),
          );
        }),
        catchError(() => {
          ctx.patchState({ loading: false });
          return of([]);
        }),
      );
    } else {
      const guestItems = this.cartService.readGuest();
      return this.cartService.getGuestLines(guestItems).pipe(
        tap((lines) => ctx.patchState({ lines, loading: false })),
        catchError(() => {
          ctx.patchState({ loading: false });
          return of([]);
        }),
      );
    }
  }

  @Action(AddToCart)
  addToCart(ctx: StateContext<CartStateModel>, action: AddToCart) {
    const isAuth = this.store.selectSnapshot(AuthSelectors.isAuthenticated);

    if (action.openDrawer) {
      ctx.patchState({ drawerOpen: true });
    }

    if (isAuth) {
      return this.cartService.addItem(action.productId, action.quantity).pipe(
        switchMap(() => ctx.dispatch(new LoadCart())),
        tap(() => {
          this.notification.success(
            this.translate.instant('CHECKOUT.CART.ADDED_TO_BAG', { defaultValue: 'Item added to bag' }),
          );
        }),
      );
    } else {
      const guestItems = this.cartService.readGuest();
      const guestIndex = guestItems.findIndex((i) => i.productId === action.productId);

      if (guestIndex >= 0) {
        guestItems[guestIndex].quantity += action.quantity;
      } else {
        guestItems.push({ productId: action.productId, quantity: action.quantity });
      }

      this.cartService.writeGuest(guestItems);
      return ctx.dispatch(new LoadCart()).pipe(
        tap(() => {
          this.notification.success(
            this.translate.instant('CHECKOUT.CART.ADDED_TO_BAG', { defaultValue: 'Item added to bag' }),
          );
        }),
      );
    }
  }

  @Action(AddCustomBraceletToCart)
  addCustomBraceletToCart(ctx: StateContext<CartStateModel>, action: AddCustomBraceletToCart) {
    if (action.openDrawer) {
      ctx.patchState({ drawerOpen: true });
    }

    const productId = `custom-bracelet-${action.bracelet.id}`;
    const guestItems = this.cartService.readGuest();
    const guestIndex = guestItems.findIndex((i) => i.productId === productId);

    if (guestIndex >= 0) {
      guestItems[guestIndex].quantity += 1;
      guestItems[guestIndex].customBracelet = action.bracelet;
    } else {
      guestItems.push({ productId, quantity: 1, customBracelet: action.bracelet });
    }

    this.cartService.writeGuest(guestItems);
    this.savedBraceletsService.updateStatus(action.bracelet.id, 'in_cart');

    return ctx.dispatch(new LoadCart()).pipe(
      tap(() => {
        this.notification.success(
          this.translate.instant('CHECKOUT.CART.ADDED_TO_BAG', { defaultValue: 'Custom bracelet added to ritual bag' }),
        );
      }),
    );
  }

  @Action(UpdateCartQuantity)
  updateCartQuantity(ctx: StateContext<CartStateModel>, action: UpdateCartQuantity) {
    if (action.quantity <= 0) {
      return ctx.dispatch(new RemoveFromCart(action.productId, action.itemId));
    }

    // 1. Optimistically update state in real time
    const state = ctx.getState();
    const updatedLines = state.lines.map((l) =>
      l.productId === action.productId ? { ...l, quantity: action.quantity } : l,
    );
    ctx.patchState({ lines: updatedLines });

    const isAuth = this.store.selectSnapshot(AuthSelectors.isAuthenticated);

    if (isAuth && action.itemId) {
      // 2. Debounce network dispatch to prevent spamming backend
      this.quantityUpdate$.next({
        productId: action.productId,
        itemId: action.itemId,
        quantity: action.quantity,
      });
      return of(undefined);
    } else {
      const guestItems = this.cartService.readGuest();
      const guestIndex = guestItems.findIndex((i) => i.productId === action.productId);

      if (guestIndex >= 0) {
        guestItems[guestIndex].quantity = action.quantity;
      } else {
        guestItems.push({ productId: action.productId, quantity: action.quantity });
      }

      this.cartService.writeGuest(guestItems);
      return of(undefined);
    }
  }

  @Action(RemoveFromCart)
  removeFromCart(ctx: StateContext<CartStateModel>, action: RemoveFromCart) {
    // Optimistic removal
    const state = ctx.getState();
    ctx.patchState({
      lines: state.lines.filter((l) => l.productId !== action.productId),
    });

    const isAuth = this.store.selectSnapshot(AuthSelectors.isAuthenticated);

    if (isAuth && action.itemId) {
      return this.cartService.removeItem(action.itemId).pipe(
        switchMap(() => ctx.dispatch(new LoadCart())),
      );
    } else {
      let guestItems = this.cartService.readGuest();
      const removedItem = guestItems.find((i) => i.productId === action.productId);
      if (removedItem?.customBracelet) {
        this.savedBraceletsService.updateStatus(removedItem.customBracelet.id, 'saved');
      }
      guestItems = guestItems.filter((i) => i.productId !== action.productId);
      this.cartService.writeGuest(guestItems);
      return of(undefined);
    }
  }

  @Action(ClearCart)
  clearCart(ctx: StateContext<CartStateModel>) {
    const isAuth = this.store.selectSnapshot(AuthSelectors.isAuthenticated);

    if (isAuth) {
      return this.cartService.clear().pipe(
        tap(() => ctx.patchState({ lines: [] })),
      );
    } else {
      this.cartService.clearGuest();
      ctx.patchState({ lines: [] });
      return of(undefined);
    }
  }

  @Action(MergeGuestCart)
  mergeGuestCart(ctx: StateContext<CartStateModel>) {
    const guestItems = this.cartService.readGuest();
    if (guestItems.length === 0) {
      return ctx.dispatch(new LoadCart());
    }

    return this.cartService.merge(guestItems).pipe(
      tap(() => {
        // Keep custom bracelets in guest storage if any
        const customItems = guestItems.filter((i) => !!i.customBracelet);
        if (customItems.length > 0) {
          this.cartService.writeGuest(customItems);
        } else {
          this.cartService.clearGuest();
        }
      }),
      switchMap(() => ctx.dispatch(new LoadCart())),
      catchError(() => {
        this.cartService.clearGuest();
        return ctx.dispatch(new LoadCart());
      }),
    );
  }

  @Action(OpenCartDrawer)
  openCartDrawer(ctx: StateContext<CartStateModel>) {
    ctx.patchState({ drawerOpen: true });
  }

  @Action(CloseCartDrawer)
  closeCartDrawer(ctx: StateContext<CartStateModel>) {
    ctx.patchState({ drawerOpen: false });
  }

  @Action(ToggleCartDrawer)
  toggleCartDrawer(ctx: StateContext<CartStateModel>) {
    const state = ctx.getState();
    ctx.patchState({ drawerOpen: !state.drawerOpen });
  }
}
