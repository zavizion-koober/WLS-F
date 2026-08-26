import {
  BestSellerPeriod,
  ProductFilterInput,
  ProductSortInput,
  ProductStatus,
  Zodiac,
} from 'src/generated/graphql';

export interface ProductImageItem {
  id: string;
  url: string;
  altText: string;
  isPrimary?: boolean;
  displayOrder?: number;
}

export interface ProductCategoryInfo {
  id: string;
  imageUrl?: string | null;
  type?: string;
  translations?: ReadonlyArray<{
    name: string;
    description?: string | null;
    language: string;
  }> | null;
}

export interface ProductTranslationItem {
  name: string;
  shortDescription: string;
  longDescription?: string;
  howToUse?: string | null;
  materials?: string | null;
  language: string;
}

export interface ProductInventoryItem {
  stockQuantity: number;
  lowStockThreshold?: number;
  sku?: string;
}

export interface ProductPricingItem {
  price?: { amount: number | string } | null;
  salePrice?: { amount: number | string } | null;
}

export interface ProductListItem {
  id: string;
  status: ProductStatus;
  zodiac?: Zodiac | null;
  slug?: { value: string } | null;
  inventory?: ProductInventoryItem | null;
  pricing?: ProductPricingItem | null;
  images?: ProductImageItem[] | null;
  category?: ProductCategoryInfo | null;
  intention?: ProductCategoryInfo | null;
  translations?: ProductTranslationItem[] | null;
}

export interface ProductDetailItem extends ProductListItem {
  // Inherits all fields with full translations
}

export interface BestSellerSummaryItem {
  soldCount: number;
  product: ProductListItem;
}

export interface ILoadProductsParams {
  where?: ProductFilterInput;
  order?: ProductSortInput[];
  skip?: number;
  take?: number;
}

export interface ILoadBestSellersParams {
  period?: BestSellerPeriod;
  skip?: number;
  take?: number;
}

export interface ProductsQueryResult {
  items: ProductListItem[];
  totalCount: number;
}

export interface ProductsStateModel {
  products: ProductListItem[];
  totalCount: number;
  loading: boolean;
  activeProduct: ProductDetailItem | null;
  activeProductLoading: boolean;
  bestSellers: BestSellerSummaryItem[];
  bestSellersLoading: boolean;
  productsCache: Record<string, ProductsQueryResult>;
  productDetailCache: Record<string, ProductDetailItem>;
  loadingQueries: Record<string, boolean>;
}

