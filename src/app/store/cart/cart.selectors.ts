import { Selector } from '@ngxs/store';
import { CartState } from './cart.state';
import { CartLine, CartStateModel } from './cart.models';

export class CartSelectors {
  @Selector([CartState])
  static lines(state: CartStateModel): CartLine[] {
    return state.lines;
  }

  @Selector([CartState])
  static totalCount(state: CartStateModel): number {
    return state.lines.reduce((total, line) => total + line.quantity, 0);
  }

  @Selector([CartState])
  static subtotal(state: CartStateModel): number {
    return state.lines.reduce((total, line) => total + line.price * line.quantity, 0);
  }

  @Selector([CartState])
  static loading(state: CartStateModel): boolean {
    return state.loading;
  }

  @Selector([CartState])
  static drawerOpen(state: CartStateModel): boolean {
    return state.drawerOpen;
  }

  @Selector([CartState])
  static isEmpty(state: CartStateModel): boolean {
    return state.lines.length === 0;
  }
}
