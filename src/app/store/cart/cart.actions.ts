export class LoadCart {
  static readonly type = '[Cart] Load Cart';
}

export class AddToCart {
  static readonly type = '[Cart] Add To Cart';
  constructor(
    public productId: string,
    public quantity = 1,
    public openDrawer = true,
  ) {}
}

export class UpdateCartQuantity {
  static readonly type = '[Cart] Update Cart Quantity';
  constructor(
    public productId: string,
    public itemId: string | null,
    public quantity: number,
  ) {}
}

export class RemoveFromCart {
  static readonly type = '[Cart] Remove From Cart';
  constructor(
    public productId: string,
    public itemId: string | null,
  ) {}
}

export class ClearCart {
  static readonly type = '[Cart] Clear Cart';
}

export class MergeGuestCart {
  static readonly type = '[Cart] Merge Guest Cart';
}

export class OpenCartDrawer {
  static readonly type = '[Cart] Open Drawer';
}

export class CloseCartDrawer {
  static readonly type = '[Cart] Close Drawer';
}

export class ToggleCartDrawer {
  static readonly type = '[Cart] Toggle Drawer';
}
