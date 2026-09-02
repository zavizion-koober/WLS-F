import { Zodiac } from 'src/generated/graphql';
import type { SavedBracelet } from '@core/models/saved-bracelet.models';

export interface GuestCartItem {
  productId: string;
  quantity: number;
  customBracelet?: SavedBracelet | null;
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
  customBracelet?: SavedBracelet | null;
}

export interface CartStateModel {
  lines: CartLine[];
  loading: boolean;
  drawerOpen: boolean;
}
