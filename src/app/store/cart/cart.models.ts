import { Zodiac } from 'src/generated/graphql';

export interface GuestCartItem {
  productId: string;
  quantity: number;
}

export interface CartLine {
  itemId: string | null;
  productId: string;
  quantity: number;
  name: string;
  price: number;
  imageUrl: string | null;
  stockQuantity: number;
  zodiac?: Zodiac | null;
  categoryId?: string | null;
  intentionId?: string | null;
}

export interface CartStateModel {
  lines: CartLine[];
  loading: boolean;
  drawerOpen: boolean;
}
