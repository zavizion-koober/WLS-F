import { inject, Injectable } from '@angular/core';
import { Action, State, StateContext } from '@ngxs/store';
import { catchError, of, switchMap, tap } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';

import { OrdersService } from './orders.service';
import { OrdersStateModel } from './orders.models';
import { CancelOrder, CheckoutOrder, ClearLastCreatedOrderId, LoadMyOrders } from './orders.actions';
import { LoadCart } from '@store/cart/cart.actions';
import { NotificationService } from '@core/services/notification.service';

@State<OrdersStateModel>({
  name: 'orders',
  defaults: {
    orders: [],
    totalCount: 0,
    loading: false,
    placingOrder: false,
    lastCreatedOrderId: null,
  },
})
@Injectable()
export class OrdersState {
  private readonly ordersService = inject(OrdersService);
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  @Action(LoadMyOrders)
  loadMyOrders(ctx: StateContext<OrdersStateModel>, action: LoadMyOrders) {
    ctx.patchState({ loading: true });
    return this.ordersService.getMyOrders(action.params).pipe(
      tap((res) =>
        ctx.patchState({
          orders: res.items,
          totalCount: res.totalCount,
          loading: false,
        }),
      ),
      catchError(() => {
        ctx.patchState({ loading: false });
        return of(null);
      }),
    );
  }

  @Action(CheckoutOrder)
  checkoutOrder(ctx: StateContext<OrdersStateModel>, action: CheckoutOrder) {
    ctx.patchState({ placingOrder: true });
    return this.ordersService.checkout(action.addressId).pipe(
      tap((orderId) => {
        ctx.patchState({
          placingOrder: false,
          lastCreatedOrderId: orderId,
        });
      }),
      switchMap((orderId) =>
        ctx.dispatch(new LoadCart()).pipe(
          tap(() => {
            this.router.navigate(['/order-success'], { queryParams: { orderId } });
          }),
        ),
      ),
      catchError((err) => {
        ctx.patchState({ placingOrder: false });
        throw err;
      }),
    );
  }

  @Action(CancelOrder)
  cancelOrder(ctx: StateContext<OrdersStateModel>, action: CancelOrder) {
    ctx.patchState({ loading: true });
    return this.ordersService.cancel(action.orderId).pipe(
      switchMap(() => ctx.dispatch(new LoadMyOrders())),
      tap(() => {
        this.notification.success(
          this.translate.instant('PROFILE.ORDERS.CANCEL_CONFIRMED', {
            defaultValue: 'Order cancelled successfully',
          }),
          this.translate.instant('MESSAGES.TITLES.SUCCESS'),
        );
      }),
      catchError((err) => {
        ctx.patchState({ loading: false });
        throw err;
      }),
    );
  }

  @Action(ClearLastCreatedOrderId)
  clearLastCreatedOrderId(ctx: StateContext<OrdersStateModel>) {
    ctx.patchState({ lastCreatedOrderId: null });
  }
}
