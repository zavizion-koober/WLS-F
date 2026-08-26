import { CategoryItem } from '@store/categories/categories.models';
import { ProductListItem } from '@store/products/products.models';

export interface IntentionItem extends CategoryItem {}

export interface IntentionsStateModel {
  intentions: IntentionItem[];
  loading: boolean;
  productsByIntentionId: Record<string, ProductListItem[]>;
  loadingIntentions: Record<string, boolean>;
}

