import { ILoadMyOrdersParams } from './orders.models';

export class LoadMyOrders {
  static readonly type = '[Orders] Load My Orders';
  constructor(public params?: ILoadMyOrdersParams) {}
}

export class CheckoutOrder {
  static readonly type = '[Orders] Checkout Order';
  constructor(public addressId: string) {}
}

export class CancelOrder {
  static readonly type = '[Orders] Cancel Order';
  constructor(public orderId: string) {}
}

export class ClearLastCreatedOrderId {
  static readonly type = '[Orders] Clear Last Created Order Id';
}
