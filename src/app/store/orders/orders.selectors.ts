import { Selector } from '@ngxs/store';
import { OrdersState } from './orders.state';
import { CustomerOrder, OrdersStateModel } from './orders.models';

export class OrdersSelectors {
  @Selector([OrdersState])
  static orders(state: OrdersStateModel): CustomerOrder[] {
    return state.orders;
  }

  @Selector([OrdersState])
  static totalCount(state: OrdersStateModel): number {
    return state.totalCount;
  }

  @Selector([OrdersState])
  static loading(state: OrdersStateModel): boolean {
    return state.loading;
  }

  @Selector([OrdersState])
  static placingOrder(state: OrdersStateModel): boolean {
    return state.placingOrder;
  }

  @Selector([OrdersState])
  static lastCreatedOrderId(state: OrdersStateModel): string | null {
    return state.lastCreatedOrderId;
  }
}
