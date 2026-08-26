import { gql } from 'apollo-angular';
import { Injectable } from '@angular/core';
import * as Apollo from 'apollo-angular';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** The `DateTime` scalar type represents a date and time with time zone offset information. */
  DateTime: { input: string; output: string; }
  /** The `Decimal` scalar type represents a decimal floating-point number with high precision. */
  Decimal: { input: any; output: any; }
  /** The `UUID` scalar type represents a Universally Unique Identifier (UUID) as defined by RFC 9562. */
  UUID: { input: any; output: any; }
};

export type Address = {
  __typename?: 'Address';
  additionalInfo?: Maybe<Scalars['String']['output']>;
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  isDefault: Scalars['Boolean']['output'];
  street: Scalars['String']['output'];
  zipCode: Scalars['String']['output'];
};

/** Defines when a policy shall be executed. */
export enum ApplyPolicy {
  /** After the resolver was executed. */
  AfterResolver = 'AFTER_RESOLVER',
  /** Before the resolver was executed. */
  BeforeResolver = 'BEFORE_RESOLVER',
  /** The policy is applied in the validation step before the execution. */
  Validation = 'VALIDATION'
}

export enum AuthProvider {
  Apple = 'APPLE',
  Google = 'GOOGLE',
  Password = 'PASSWORD'
}

export enum BestSellerPeriod {
  AllTime = 'ALL_TIME',
  Last_7Days = 'LAST_7_DAYS',
  Last_30Days = 'LAST_30_DAYS',
  Last_90Days = 'LAST_90_DAYS'
}

/** A segment of a collection. */
export type BestSellerSummariesCollectionSegment = {
  __typename?: 'BestSellerSummariesCollectionSegment';
  /** A flattened list of the items. */
  items?: Maybe<Array<BestSellerSummary>>;
  /** Information to aid in pagination. */
  pageInfo: CollectionSegmentInfo;
  totalCount: Scalars['Int']['output'];
};

export type BestSellerSummary = {
  __typename?: 'BestSellerSummary';
  product: Product;
  soldCount: Scalars['Int']['output'];
};

export type BooleanOperationFilterInput = {
  eq?: InputMaybe<Scalars['Boolean']['input']>;
  neq?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CartItem = {
  __typename?: 'CartItem';
  id: Scalars['UUID']['output'];
  product: Product;
  quantity: Scalars['Int']['output'];
};

/** A segment of a collection. */
export type CategoriesCollectionSegment = {
  __typename?: 'CategoriesCollectionSegment';
  /** A flattened list of the items. */
  items?: Maybe<Array<Category>>;
  /** Information to aid in pagination. */
  pageInfo: CollectionSegmentInfo;
  totalCount: Scalars['Int']['output'];
};

export type Category = {
  __typename?: 'Category';
  id: Scalars['UUID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  products?: Maybe<Array<Product>>;
  status: CategoryStatus;
  translations?: Maybe<Array<CategoryTranslation>>;
  type: CategoryType;
};


export type CategoryProductsArgs = {
  order?: InputMaybe<Array<ProductSortInput>>;
  where?: InputMaybe<ProductFilterInput>;
};


export type CategoryTranslationsArgs = {
  order?: InputMaybe<Array<CategoryTranslationSortInput>>;
  where?: InputMaybe<CategoryTranslationFilterInput>;
};

export type CategoryFilterInput = {
  and?: InputMaybe<Array<CategoryFilterInput>>;
  id?: InputMaybe<UuidOperationFilterInput>;
  or?: InputMaybe<Array<CategoryFilterInput>>;
  status?: InputMaybe<CategoryStatusOperationFilterInput>;
  translations?: InputMaybe<ListFilterInputTypeOfCategoryTranslationFilterInput>;
  type?: InputMaybe<CategoryTypeOperationFilterInput>;
};

export type CategorySortInput = {
  status?: InputMaybe<SortEnumType>;
  type?: InputMaybe<SortEnumType>;
};

export enum CategoryStatus {
  Archived = 'ARCHIVED',
  Draft = 'DRAFT',
  Published = 'PUBLISHED'
}

export type CategoryStatusOperationFilterInput = {
  eq?: InputMaybe<CategoryStatus>;
  in?: InputMaybe<Array<CategoryStatus>>;
  neq?: InputMaybe<CategoryStatus>;
  nin?: InputMaybe<Array<CategoryStatus>>;
};

export type CategoryTranslation = {
  __typename?: 'CategoryTranslation';
  description?: Maybe<Scalars['String']['output']>;
  language: Language;
  name: Scalars['String']['output'];
};

export type CategoryTranslationFilterInput = {
  and?: InputMaybe<Array<CategoryTranslationFilterInput>>;
  description?: InputMaybe<StringOperationFilterInput>;
  language?: InputMaybe<LanguageOperationFilterInput>;
  name?: InputMaybe<StringOperationFilterInput>;
  or?: InputMaybe<Array<CategoryTranslationFilterInput>>;
};

export type CategoryTranslationSortInput = {
  description?: InputMaybe<SortEnumType>;
  name?: InputMaybe<SortEnumType>;
};

export enum CategoryType {
  Category = 'CATEGORY',
  Draft = 'DRAFT',
  Intention = 'INTENTION'
}

export type CategoryTypeOperationFilterInput = {
  eq?: InputMaybe<CategoryType>;
  in?: InputMaybe<Array<CategoryType>>;
  neq?: InputMaybe<CategoryType>;
  nin?: InputMaybe<Array<CategoryType>>;
};

/** Information about the offset pagination. */
export type CollectionSegmentInfo = {
  __typename?: 'CollectionSegmentInfo';
  /** Indicates whether more items exist following the set defined by the clients arguments. */
  hasNextPage: Scalars['Boolean']['output'];
  /** Indicates whether more items exist prior the set defined by the clients arguments. */
  hasPreviousPage: Scalars['Boolean']['output'];
};

export type DateTimeOperationFilterInput = {
  eq?: InputMaybe<Scalars['DateTime']['input']>;
  gt?: InputMaybe<Scalars['DateTime']['input']>;
  gte?: InputMaybe<Scalars['DateTime']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['DateTime']['input']>>>;
  lt?: InputMaybe<Scalars['DateTime']['input']>;
  lte?: InputMaybe<Scalars['DateTime']['input']>;
  neq?: InputMaybe<Scalars['DateTime']['input']>;
  ngt?: InputMaybe<Scalars['DateTime']['input']>;
  ngte?: InputMaybe<Scalars['DateTime']['input']>;
  nin?: InputMaybe<Array<InputMaybe<Scalars['DateTime']['input']>>>;
  nlt?: InputMaybe<Scalars['DateTime']['input']>;
  nlte?: InputMaybe<Scalars['DateTime']['input']>;
};

export type DecimalOperationFilterInput = {
  eq?: InputMaybe<Scalars['Decimal']['input']>;
  gt?: InputMaybe<Scalars['Decimal']['input']>;
  gte?: InputMaybe<Scalars['Decimal']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Decimal']['input']>>>;
  lt?: InputMaybe<Scalars['Decimal']['input']>;
  lte?: InputMaybe<Scalars['Decimal']['input']>;
  neq?: InputMaybe<Scalars['Decimal']['input']>;
  ngt?: InputMaybe<Scalars['Decimal']['input']>;
  ngte?: InputMaybe<Scalars['Decimal']['input']>;
  nin?: InputMaybe<Array<InputMaybe<Scalars['Decimal']['input']>>>;
  nlt?: InputMaybe<Scalars['Decimal']['input']>;
  nlte?: InputMaybe<Scalars['Decimal']['input']>;
};

export type EmailFilterInput = {
  and?: InputMaybe<Array<EmailFilterInput>>;
  or?: InputMaybe<Array<EmailFilterInput>>;
  value?: InputMaybe<StringOperationFilterInput>;
};

export type FloatOperationFilterInput = {
  eq?: InputMaybe<Scalars['Float']['input']>;
  gt?: InputMaybe<Scalars['Float']['input']>;
  gte?: InputMaybe<Scalars['Float']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Float']['input']>>>;
  lt?: InputMaybe<Scalars['Float']['input']>;
  lte?: InputMaybe<Scalars['Float']['input']>;
  neq?: InputMaybe<Scalars['Float']['input']>;
  ngt?: InputMaybe<Scalars['Float']['input']>;
  ngte?: InputMaybe<Scalars['Float']['input']>;
  nin?: InputMaybe<Array<InputMaybe<Scalars['Float']['input']>>>;
  nlt?: InputMaybe<Scalars['Float']['input']>;
  nlte?: InputMaybe<Scalars['Float']['input']>;
};

export type IntOperationFilterInput = {
  eq?: InputMaybe<Scalars['Int']['input']>;
  gt?: InputMaybe<Scalars['Int']['input']>;
  gte?: InputMaybe<Scalars['Int']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
  lt?: InputMaybe<Scalars['Int']['input']>;
  lte?: InputMaybe<Scalars['Int']['input']>;
  neq?: InputMaybe<Scalars['Int']['input']>;
  ngt?: InputMaybe<Scalars['Int']['input']>;
  ngte?: InputMaybe<Scalars['Int']['input']>;
  nin?: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
  nlt?: InputMaybe<Scalars['Int']['input']>;
  nlte?: InputMaybe<Scalars['Int']['input']>;
};

export enum Language {
  En = 'EN',
  Ka = 'KA',
  Ru = 'RU'
}

export type LanguageOperationFilterInput = {
  eq?: InputMaybe<Language>;
  in?: InputMaybe<Array<Language>>;
  neq?: InputMaybe<Language>;
  nin?: InputMaybe<Array<Language>>;
};

export type ListFilterInputTypeOfCategoryTranslationFilterInput = {
  all?: InputMaybe<CategoryTranslationFilterInput>;
  any?: InputMaybe<Scalars['Boolean']['input']>;
  none?: InputMaybe<CategoryTranslationFilterInput>;
  some?: InputMaybe<CategoryTranslationFilterInput>;
};

export type ListFilterInputTypeOfOrderItemFilterInput = {
  all?: InputMaybe<OrderItemFilterInput>;
  any?: InputMaybe<Scalars['Boolean']['input']>;
  none?: InputMaybe<OrderItemFilterInput>;
  some?: InputMaybe<OrderItemFilterInput>;
};

export type ListFilterInputTypeOfProductTranslationFilterInput = {
  all?: InputMaybe<ProductTranslationFilterInput>;
  any?: InputMaybe<Scalars['Boolean']['input']>;
  none?: InputMaybe<ProductTranslationFilterInput>;
  some?: InputMaybe<ProductTranslationFilterInput>;
};

export type Money = {
  __typename?: 'Money';
  amount: Scalars['Decimal']['output'];
};

export type MoneyFilterInput = {
  amount?: InputMaybe<DecimalOperationFilterInput>;
  and?: InputMaybe<Array<MoneyFilterInput>>;
  or?: InputMaybe<Array<MoneyFilterInput>>;
};

export type MoneySortInput = {
  amount?: InputMaybe<SortEnumType>;
};

/** A segment of a collection. */
export type MyOrdersCollectionSegment = {
  __typename?: 'MyOrdersCollectionSegment';
  /** A flattened list of the items. */
  items?: Maybe<Array<Order>>;
  /** Information to aid in pagination. */
  pageInfo: CollectionSegmentInfo;
  totalCount: Scalars['Int']['output'];
};

export type NullableOfZodiacOperationFilterInput = {
  eq?: InputMaybe<Zodiac>;
  in?: InputMaybe<Array<InputMaybe<Zodiac>>>;
  neq?: InputMaybe<Zodiac>;
  nin?: InputMaybe<Array<InputMaybe<Zodiac>>>;
};

export type Order = {
  __typename?: 'Order';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['UUID']['output'];
  items?: Maybe<Array<OrderItem>>;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  totalPrice: Scalars['Decimal']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user: User;
};

export type OrderFilterInput = {
  and?: InputMaybe<Array<OrderFilterInput>>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  items?: InputMaybe<ListFilterInputTypeOfOrderItemFilterInput>;
  or?: InputMaybe<Array<OrderFilterInput>>;
  shippingAddress?: InputMaybe<ShippingAddressFilterInput>;
  status?: InputMaybe<OrderStatusOperationFilterInput>;
  totalPrice?: InputMaybe<MoneyFilterInput>;
};

export type OrderItem = {
  __typename?: 'OrderItem';
  id: Scalars['UUID']['output'];
  price: Money;
  product?: Maybe<Product>;
  quantity: Scalars['Int']['output'];
};

export type OrderItemFilterInput = {
  and?: InputMaybe<Array<OrderItemFilterInput>>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  or?: InputMaybe<Array<OrderItemFilterInput>>;
  order?: InputMaybe<OrderFilterInput>;
  orderId?: InputMaybe<UuidOperationFilterInput>;
  price?: InputMaybe<MoneyFilterInput>;
  product?: InputMaybe<ProductFilterInput>;
  productId?: InputMaybe<UuidOperationFilterInput>;
  quantity?: InputMaybe<IntOperationFilterInput>;
  updatedAt?: InputMaybe<DateTimeOperationFilterInput>;
  user?: InputMaybe<UserFilterInput>;
  userId?: InputMaybe<UuidOperationFilterInput>;
};

export type OrderSortInput = {
  createdAt?: InputMaybe<SortEnumType>;
  id?: InputMaybe<SortEnumType>;
  status?: InputMaybe<SortEnumType>;
  totalPrice?: InputMaybe<MoneySortInput>;
};

export enum OrderStatus {
  Cancelled = 'CANCELLED',
  Confirmed = 'CONFIRMED',
  Delivered = 'DELIVERED',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Refunded = 'REFUNDED',
  Shipped = 'SHIPPED'
}

export type OrderStatusOperationFilterInput = {
  eq?: InputMaybe<OrderStatus>;
  in?: InputMaybe<Array<OrderStatus>>;
  neq?: InputMaybe<OrderStatus>;
  nin?: InputMaybe<Array<OrderStatus>>;
};

/** A segment of a collection. */
export type OrdersByUserIdCollectionSegment = {
  __typename?: 'OrdersByUserIdCollectionSegment';
  /** A flattened list of the items. */
  items?: Maybe<Array<Order>>;
  /** Information to aid in pagination. */
  pageInfo: CollectionSegmentInfo;
  totalCount: Scalars['Int']['output'];
};

/** A segment of a collection. */
export type OrdersCollectionSegment = {
  __typename?: 'OrdersCollectionSegment';
  /** A flattened list of the items. */
  items?: Maybe<Array<Order>>;
  /** Information to aid in pagination. */
  pageInfo: CollectionSegmentInfo;
  totalCount: Scalars['Int']['output'];
};

export type Product = {
  __typename?: 'Product';
  category?: Maybe<Category>;
  id: Scalars['UUID']['output'];
  images?: Maybe<Array<ProductImage>>;
  intention?: Maybe<Category>;
  inventory?: Maybe<ProductInventory>;
  isDeleted: Scalars['Boolean']['output'];
  pricing?: Maybe<ProductPricing>;
  reviews?: Maybe<Array<Review>>;
  slug?: Maybe<Slug>;
  status: ProductStatus;
  translations?: Maybe<Array<ProductTranslation>>;
  zodiac?: Maybe<Zodiac>;
};


export type ProductImagesArgs = {
  order?: InputMaybe<Array<ProductImageSortInput>>;
  where?: InputMaybe<ProductImageFilterInput>;
};


export type ProductReviewsArgs = {
  order?: InputMaybe<Array<ReviewSortInput>>;
  where?: InputMaybe<ReviewFilterInput>;
};


export type ProductTranslationsArgs = {
  order?: InputMaybe<Array<ProductTranslationSortInput>>;
  where?: InputMaybe<ProductTranslationFilterInput>;
};

export type ProductFilterInput = {
  and?: InputMaybe<Array<ProductFilterInput>>;
  categoryId?: InputMaybe<UuidOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  intentionId?: InputMaybe<UuidOperationFilterInput>;
  inventory?: InputMaybe<ProductInventoryFilterInput>;
  isDeleted?: InputMaybe<BooleanOperationFilterInput>;
  or?: InputMaybe<Array<ProductFilterInput>>;
  pricing?: InputMaybe<ProductPricingFilterInput>;
  slug?: InputMaybe<SlugFilterInput>;
  status?: InputMaybe<ProductStatusOperationFilterInput>;
  translations?: InputMaybe<ListFilterInputTypeOfProductTranslationFilterInput>;
  zodiac?: InputMaybe<NullableOfZodiacOperationFilterInput>;
};

export type ProductImage = {
  __typename?: 'ProductImage';
  altText: Scalars['String']['output'];
  displayOrder: Scalars['Int']['output'];
  id: Scalars['UUID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  url: Scalars['String']['output'];
};

export type ProductImageFilterInput = {
  altText?: InputMaybe<StringOperationFilterInput>;
  and?: InputMaybe<Array<ProductImageFilterInput>>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  displayOrder?: InputMaybe<IntOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  isPrimary?: InputMaybe<BooleanOperationFilterInput>;
  or?: InputMaybe<Array<ProductImageFilterInput>>;
  productId?: InputMaybe<UuidOperationFilterInput>;
  updatedAt?: InputMaybe<DateTimeOperationFilterInput>;
  url?: InputMaybe<StringOperationFilterInput>;
};

export type ProductImageSortInput = {
  altText?: InputMaybe<SortEnumType>;
  createdAt?: InputMaybe<SortEnumType>;
  displayOrder?: InputMaybe<SortEnumType>;
  id?: InputMaybe<SortEnumType>;
  isPrimary?: InputMaybe<SortEnumType>;
  productId?: InputMaybe<SortEnumType>;
  updatedAt?: InputMaybe<SortEnumType>;
  url?: InputMaybe<SortEnumType>;
};

export type ProductInventory = {
  __typename?: 'ProductInventory';
  lowStockThreshold: Scalars['Int']['output'];
  sku: Scalars['String']['output'];
  stockQuantity: Scalars['Int']['output'];
};

export type ProductInventoryFilterInput = {
  and?: InputMaybe<Array<ProductInventoryFilterInput>>;
  lowStockThreshold?: InputMaybe<IntOperationFilterInput>;
  or?: InputMaybe<Array<ProductInventoryFilterInput>>;
  sku?: InputMaybe<StringOperationFilterInput>;
  stockQuantity?: InputMaybe<IntOperationFilterInput>;
};

export type ProductInventorySortInput = {
  lowStockThreshold?: InputMaybe<SortEnumType>;
  sku?: InputMaybe<SortEnumType>;
  stockQuantity?: InputMaybe<SortEnumType>;
};

export type ProductPricing = {
  __typename?: 'ProductPricing';
  price?: Maybe<Money>;
  salePrice?: Maybe<Money>;
};

export type ProductPricingFilterInput = {
  and?: InputMaybe<Array<ProductPricingFilterInput>>;
  or?: InputMaybe<Array<ProductPricingFilterInput>>;
  price?: InputMaybe<MoneyFilterInput>;
  salePrice?: InputMaybe<MoneyFilterInput>;
};

export type ProductPricingSortInput = {
  price?: InputMaybe<MoneySortInput>;
  salePrice?: InputMaybe<MoneySortInput>;
};

export type ProductSortInput = {
  inventory?: InputMaybe<ProductInventorySortInput>;
  pricing?: InputMaybe<ProductPricingSortInput>;
  status?: InputMaybe<SortEnumType>;
  zodiac?: InputMaybe<SortEnumType>;
};

export enum ProductStatus {
  Archived = 'ARCHIVED',
  Draft = 'DRAFT',
  Published = 'PUBLISHED'
}

export type ProductStatusOperationFilterInput = {
  eq?: InputMaybe<ProductStatus>;
  in?: InputMaybe<Array<ProductStatus>>;
  neq?: InputMaybe<ProductStatus>;
  nin?: InputMaybe<Array<ProductStatus>>;
};

export type ProductTranslation = {
  __typename?: 'ProductTranslation';
  howToUse?: Maybe<Scalars['String']['output']>;
  language: Language;
  longDescription: Scalars['String']['output'];
  materials?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  shortDescription: Scalars['String']['output'];
};

export type ProductTranslationFilterInput = {
  and?: InputMaybe<Array<ProductTranslationFilterInput>>;
  language?: InputMaybe<LanguageOperationFilterInput>;
  longDescription?: InputMaybe<StringOperationFilterInput>;
  name?: InputMaybe<StringOperationFilterInput>;
  or?: InputMaybe<Array<ProductTranslationFilterInput>>;
  shortDescription?: InputMaybe<StringOperationFilterInput>;
};

export type ProductTranslationSortInput = {
  name?: InputMaybe<SortEnumType>;
};

export type ProductsCollectionSegment = {
  __typename?: 'ProductsCollectionSegment';
  /** A flattened list of the items. */
  items?: Maybe<Array<Product>>;
  /** Information to aid in pagination. */
  pageInfo: CollectionSegmentInfo;
  totalCount: Scalars['Int']['output'];
};

export type Query = {
  __typename?: 'Query';
  bestSellerProducts?: Maybe<BestSellerSummariesCollectionSegment>;
  cart: Array<CartItem>;
  categories?: Maybe<CategoriesCollectionSegment>;
  myOrders?: Maybe<MyOrdersCollectionSegment>;
  orders?: Maybe<OrdersCollectionSegment>;
  ordersByUserId?: Maybe<OrdersByUserIdCollectionSegment>;
  products?: Maybe<ProductsCollectionSegment>;
  profile?: Maybe<User>;
  reviews?: Maybe<ReviewsCollectionSegment>;
  reviewsByUserId?: Maybe<ReviewsByUserIdCollectionSegment>;
  userById?: Maybe<User>;
  users?: Maybe<UsersCollectionSegment>;
};


export type QueryBestSellerProductsArgs = {
  period?: InputMaybe<BestSellerPeriod>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCategoriesArgs = {
  order?: InputMaybe<Array<CategorySortInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<CategoryFilterInput>;
};


export type QueryMyOrdersArgs = {
  order?: InputMaybe<Array<OrderSortInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<OrderFilterInput>;
};


export type QueryOrdersArgs = {
  order?: InputMaybe<Array<OrderSortInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<OrderFilterInput>;
};


export type QueryOrdersByUserIdArgs = {
  order?: InputMaybe<Array<OrderSortInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  userId: Scalars['UUID']['input'];
  where?: InputMaybe<OrderFilterInput>;
};


export type QueryProductsArgs = {
  order?: InputMaybe<Array<ProductSortInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ProductFilterInput>;
};


export type QueryReviewsArgs = {
  order?: InputMaybe<Array<ReviewSortInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ReviewFilterInput>;
};


export type QueryReviewsByUserIdArgs = {
  order?: InputMaybe<Array<ReviewSortInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  userId: Scalars['UUID']['input'];
  where?: InputMaybe<ReviewFilterInput>;
};


export type QueryUserByIdArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryUsersArgs = {
  order?: InputMaybe<Array<UserSortInput>>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<UserFilterInput>;
};

export type Review = {
  __typename?: 'Review';
  comment?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['UUID']['output'];
  isApproved: Scalars['Boolean']['output'];
  product: Product;
  productId: Scalars['UUID']['output'];
  rating?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  user: User;
  userId: Scalars['UUID']['output'];
};

export type ReviewFilterInput = {
  and?: InputMaybe<Array<ReviewFilterInput>>;
  comment?: InputMaybe<StringOperationFilterInput>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  isApproved?: InputMaybe<BooleanOperationFilterInput>;
  or?: InputMaybe<Array<ReviewFilterInput>>;
  product?: InputMaybe<ProductFilterInput>;
  productId?: InputMaybe<UuidOperationFilterInput>;
  rating?: InputMaybe<FloatOperationFilterInput>;
  user?: InputMaybe<UserFilterInput>;
  userId?: InputMaybe<UuidOperationFilterInput>;
};

export type ReviewSortInput = {
  comment?: InputMaybe<SortEnumType>;
  createdAt?: InputMaybe<SortEnumType>;
  productId?: InputMaybe<SortEnumType>;
  rating?: InputMaybe<SortEnumType>;
};

/** A segment of a collection. */
export type ReviewsByUserIdCollectionSegment = {
  __typename?: 'ReviewsByUserIdCollectionSegment';
  /** A flattened list of the items. */
  items?: Maybe<Array<Review>>;
  /** Information to aid in pagination. */
  pageInfo: CollectionSegmentInfo;
  totalCount: Scalars['Int']['output'];
};

/** A segment of a collection. */
export type ReviewsCollectionSegment = {
  __typename?: 'ReviewsCollectionSegment';
  /** A flattened list of the items. */
  items?: Maybe<Array<Review>>;
  /** Information to aid in pagination. */
  pageInfo: CollectionSegmentInfo;
  totalCount: Scalars['Int']['output'];
};

export type ShippingAddress = {
  __typename?: 'ShippingAddress';
  additionalInfo?: Maybe<Scalars['String']['output']>;
  city: Scalars['String']['output'];
  country: Scalars['String']['output'];
  street: Scalars['String']['output'];
  zipCode: Scalars['String']['output'];
};

export type ShippingAddressFilterInput = {
  additionalInfo?: InputMaybe<StringOperationFilterInput>;
  and?: InputMaybe<Array<ShippingAddressFilterInput>>;
  city?: InputMaybe<StringOperationFilterInput>;
  country?: InputMaybe<StringOperationFilterInput>;
  or?: InputMaybe<Array<ShippingAddressFilterInput>>;
  street?: InputMaybe<StringOperationFilterInput>;
  zipCode?: InputMaybe<StringOperationFilterInput>;
};

export type Slug = {
  __typename?: 'Slug';
  value: Scalars['String']['output'];
};

export type SlugFilterInput = {
  and?: InputMaybe<Array<SlugFilterInput>>;
  or?: InputMaybe<Array<SlugFilterInput>>;
  value?: InputMaybe<StringOperationFilterInput>;
};

export enum SortEnumType {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type StringOperationFilterInput = {
  and?: InputMaybe<Array<StringOperationFilterInput>>;
  contains?: InputMaybe<Scalars['String']['input']>;
  endsWith?: InputMaybe<Scalars['String']['input']>;
  eq?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  ncontains?: InputMaybe<Scalars['String']['input']>;
  nendsWith?: InputMaybe<Scalars['String']['input']>;
  neq?: InputMaybe<Scalars['String']['input']>;
  nin?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  nstartsWith?: InputMaybe<Scalars['String']['input']>;
  or?: InputMaybe<Array<StringOperationFilterInput>>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  addresses?: Maybe<Array<Address>>;
  authProvider: AuthProvider;
  createdAt: Scalars['DateTime']['output'];
  details?: Maybe<UserDetails>;
  email: Scalars['String']['output'];
  fullName: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  isVerified: Scalars['Boolean']['output'];
  role: UserRole;
};

export type UserDetails = {
  __typename?: 'UserDetails';
  phoneNumber?: Maybe<Scalars['String']['output']>;
};

export type UserFilterInput = {
  and?: InputMaybe<Array<UserFilterInput>>;
  email?: InputMaybe<EmailFilterInput>;
  fullName?: InputMaybe<StringOperationFilterInput>;
  isVerified?: InputMaybe<BooleanOperationFilterInput>;
  or?: InputMaybe<Array<UserFilterInput>>;
  role?: InputMaybe<UserRoleOperationFilterInput>;
};

export enum UserRole {
  Admin = 'ADMIN',
  SuperAdmin = 'SUPER_ADMIN',
  User = 'USER'
}

export type UserRoleOperationFilterInput = {
  eq?: InputMaybe<UserRole>;
  in?: InputMaybe<Array<UserRole>>;
  neq?: InputMaybe<UserRole>;
  nin?: InputMaybe<Array<UserRole>>;
};

export type UserSortInput = {
  createdAt?: InputMaybe<SortEnumType>;
  fullName?: InputMaybe<SortEnumType>;
};

/** A segment of a collection. */
export type UsersCollectionSegment = {
  __typename?: 'UsersCollectionSegment';
  /** A flattened list of the items. */
  items?: Maybe<Array<User>>;
  /** Information to aid in pagination. */
  pageInfo: CollectionSegmentInfo;
  totalCount: Scalars['Int']['output'];
};

export type UuidOperationFilterInput = {
  eq?: InputMaybe<Scalars['UUID']['input']>;
  gt?: InputMaybe<Scalars['UUID']['input']>;
  gte?: InputMaybe<Scalars['UUID']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
  lt?: InputMaybe<Scalars['UUID']['input']>;
  lte?: InputMaybe<Scalars['UUID']['input']>;
  neq?: InputMaybe<Scalars['UUID']['input']>;
  ngt?: InputMaybe<Scalars['UUID']['input']>;
  ngte?: InputMaybe<Scalars['UUID']['input']>;
  nin?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
  nlt?: InputMaybe<Scalars['UUID']['input']>;
  nlte?: InputMaybe<Scalars['UUID']['input']>;
};

export enum Zodiac {
  Aquarius = 'AQUARIUS',
  Aries = 'ARIES',
  Cancer = 'CANCER',
  Capricorn = 'CAPRICORN',
  Gemini = 'GEMINI',
  Leo = 'LEO',
  Libra = 'LIBRA',
  Pisces = 'PISCES',
  Sagittarius = 'SAGITTARIUS',
  Scorpio = 'SCORPIO',
  Taurus = 'TAURUS',
  Virgo = 'VIRGO'
}

export type GetCartQueryVariables = Exact<{
  language: Language;
}>;


export type GetCartQuery = { __typename?: 'Query', cart: Array<{ __typename?: 'CartItem', id: any, quantity: number, product: { __typename?: 'Product', id: any, zodiac?: Zodiac | null, category?: { __typename?: 'Category', id: any } | null, intention?: { __typename?: 'Category', id: any } | null, slug?: { __typename?: 'Slug', value: string } | null, inventory?: { __typename?: 'ProductInventory', stockQuantity: number } | null, pricing?: { __typename?: 'ProductPricing', price?: { __typename?: 'Money', amount: any } | null, salePrice?: { __typename?: 'Money', amount: any } | null } | null, images?: Array<{ __typename?: 'ProductImage', url: string, altText: string }> | null, translations?: Array<{ __typename?: 'ProductTranslation', name: string, language: Language }> | null } }> };

export type GetCartProductsQueryVariables = Exact<{
  ids?: InputMaybe<Array<Scalars['UUID']['input']> | Scalars['UUID']['input']>;
  language: Language;
}>;


export type GetCartProductsQuery = { __typename?: 'Query', products?: { __typename?: 'ProductsCollectionSegment', totalCount: number, items?: Array<{ __typename?: 'Product', id: any, zodiac?: Zodiac | null, category?: { __typename?: 'Category', id: any } | null, intention?: { __typename?: 'Category', id: any } | null, slug?: { __typename?: 'Slug', value: string } | null, inventory?: { __typename?: 'ProductInventory', stockQuantity: number } | null, pricing?: { __typename?: 'ProductPricing', price?: { __typename?: 'Money', amount: any } | null, salePrice?: { __typename?: 'Money', amount: any } | null } | null, images?: Array<{ __typename?: 'ProductImage', url: string, altText: string }> | null, translations?: Array<{ __typename?: 'ProductTranslation', name: string, language: Language }> | null }> | null } | null };

export type GetCategoriesQueryVariables = Exact<{
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<CategoryFilterInput>;
  order?: InputMaybe<Array<CategorySortInput> | CategorySortInput>;
}>;


export type GetCategoriesQuery = { __typename?: 'Query', categories?: { __typename?: 'CategoriesCollectionSegment', totalCount: number, items?: Array<{ __typename?: 'Category', id: any, imageUrl?: string | null, status: CategoryStatus, type: CategoryType, translations?: Array<{ __typename?: 'CategoryTranslation', name: string, description?: string | null, language: Language }> | null }> | null } | null };

export type GetIntentionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetIntentionsQuery = { __typename?: 'Query', categories?: { __typename?: 'CategoriesCollectionSegment', totalCount: number, items?: Array<{ __typename?: 'Category', id: any, imageUrl?: string | null, status: CategoryStatus, type: CategoryType, translations?: Array<{ __typename?: 'CategoryTranslation', name: string, description?: string | null, language: Language }> | null }> | null } | null };

export type GetIntentionProductsQueryVariables = Exact<{
  intentionId: Scalars['UUID']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetIntentionProductsQuery = { __typename?: 'Query', products?: { __typename?: 'ProductsCollectionSegment', totalCount: number, items?: Array<{ __typename?: 'Product', id: any, status: ProductStatus, zodiac?: Zodiac | null, slug?: { __typename?: 'Slug', value: string } | null, inventory?: { __typename?: 'ProductInventory', stockQuantity: number } | null, images?: Array<{ __typename?: 'ProductImage', url: string, altText: string, isPrimary: boolean }> | null, pricing?: { __typename?: 'ProductPricing', price?: { __typename?: 'Money', amount: any } | null, salePrice?: { __typename?: 'Money', amount: any } | null } | null, category?: { __typename?: 'Category', id: any, translations?: Array<{ __typename?: 'CategoryTranslation', name: string, language: Language }> | null } | null, intention?: { __typename?: 'Category', id: any, translations?: Array<{ __typename?: 'CategoryTranslation', name: string, language: Language }> | null } | null, translations?: Array<{ __typename?: 'ProductTranslation', name: string, shortDescription: string, language: Language }> | null }> | null } | null };

export type GetMyOrdersQueryVariables = Exact<{
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  language: Language;
}>;


export type GetMyOrdersQuery = { __typename?: 'Query', myOrders?: { __typename?: 'MyOrdersCollectionSegment', totalCount: number, items?: Array<{ __typename?: 'Order', id: any, status: OrderStatus, totalPrice: any, createdAt: string, shippingAddress: { __typename?: 'ShippingAddress', country: string, city: string, street: string, zipCode: string, additionalInfo?: string | null }, items?: Array<{ __typename?: 'OrderItem', id: any, quantity: number, price: { __typename?: 'Money', amount: any }, product?: { __typename?: 'Product', id: any, slug?: { __typename?: 'Slug', value: string } | null, images?: Array<{ __typename?: 'ProductImage', url: string, altText: string }> | null, translations?: Array<{ __typename?: 'ProductTranslation', name: string, language: Language }> | null } | null }> | null }> | null } | null };

export type GetProductsQueryVariables = Exact<{
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ProductFilterInput>;
  order?: InputMaybe<Array<ProductSortInput> | ProductSortInput>;
}>;


export type GetProductsQuery = { __typename?: 'Query', products?: { __typename?: 'ProductsCollectionSegment', totalCount: number, items?: Array<{ __typename?: 'Product', id: any, status: ProductStatus, zodiac?: Zodiac | null, slug?: { __typename?: 'Slug', value: string } | null, inventory?: { __typename?: 'ProductInventory', stockQuantity: number } | null, pricing?: { __typename?: 'ProductPricing', price?: { __typename?: 'Money', amount: any } | null, salePrice?: { __typename?: 'Money', amount: any } | null } | null, images?: Array<{ __typename?: 'ProductImage', url: string, altText: string, isPrimary: boolean }> | null, category?: { __typename?: 'Category', id: any, translations?: Array<{ __typename?: 'CategoryTranslation', name: string, language: Language }> | null } | null, intention?: { __typename?: 'Category', id: any, translations?: Array<{ __typename?: 'CategoryTranslation', name: string, language: Language }> | null } | null, translations?: Array<{ __typename?: 'ProductTranslation', name: string, shortDescription: string, language: Language }> | null }> | null } | null };

export type GetProductBySlugQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type GetProductBySlugQuery = { __typename?: 'Query', products?: { __typename?: 'ProductsCollectionSegment', totalCount: number, items?: Array<{ __typename?: 'Product', id: any, status: ProductStatus, zodiac?: Zodiac | null, slug?: { __typename?: 'Slug', value: string } | null, inventory?: { __typename?: 'ProductInventory', stockQuantity: number, lowStockThreshold: number } | null, pricing?: { __typename?: 'ProductPricing', price?: { __typename?: 'Money', amount: any } | null, salePrice?: { __typename?: 'Money', amount: any } | null } | null, images?: Array<{ __typename?: 'ProductImage', id: any, url: string, altText: string, isPrimary: boolean }> | null, category?: { __typename?: 'Category', id: any, translations?: Array<{ __typename?: 'CategoryTranslation', name: string, language: Language }> | null } | null, intention?: { __typename?: 'Category', id: any, translations?: Array<{ __typename?: 'CategoryTranslation', name: string, language: Language }> | null } | null, translations?: Array<{ __typename?: 'ProductTranslation', name: string, shortDescription: string, longDescription: string, howToUse?: string | null, materials?: string | null, language: Language }> | null }> | null } | null };

export type GetBestSellerProductsQueryVariables = Exact<{
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
  period?: InputMaybe<BestSellerPeriod>;
}>;


export type GetBestSellerProductsQuery = { __typename?: 'Query', bestSellerProducts?: { __typename?: 'BestSellerSummariesCollectionSegment', totalCount: number, items?: Array<{ __typename?: 'BestSellerSummary', soldCount: number, product: { __typename?: 'Product', id: any, status: ProductStatus, zodiac?: Zodiac | null, slug?: { __typename?: 'Slug', value: string } | null, inventory?: { __typename?: 'ProductInventory', stockQuantity: number } | null, pricing?: { __typename?: 'ProductPricing', price?: { __typename?: 'Money', amount: any } | null, salePrice?: { __typename?: 'Money', amount: any } | null } | null, images?: Array<{ __typename?: 'ProductImage', url: string, altText: string, isPrimary: boolean }> | null, category?: { __typename?: 'Category', id: any, translations?: Array<{ __typename?: 'CategoryTranslation', name: string, language: Language }> | null } | null, intention?: { __typename?: 'Category', id: any, translations?: Array<{ __typename?: 'CategoryTranslation', name: string, language: Language }> | null } | null, translations?: Array<{ __typename?: 'ProductTranslation', name: string, shortDescription: string, language: Language }> | null } }> | null } | null };

export type GetProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type GetProfileQuery = { __typename?: 'Query', profile?: { __typename?: 'User', id: any, fullName: string, email: string, role: UserRole, createdAt: string, details?: { __typename?: 'UserDetails', phoneNumber?: string | null } | null, addresses?: Array<{ __typename?: 'Address', id: any, country: string, city: string, street: string, zipCode: string, additionalInfo?: string | null, isDefault: boolean }> | null } | null };

export const GetCartDocument = gql`
    query GetCart($language: Language!) {
  cart {
    id
    quantity
    product {
      id
      zodiac
      category {
        id
      }
      intention {
        id
      }
      slug {
        value
      }
      inventory {
        stockQuantity
      }
      pricing {
        price {
          amount
        }
        salePrice {
          amount
        }
      }
      images(order: [{displayOrder: ASC}]) {
        url
        altText
      }
      translations(where: {language: {eq: $language}}) {
        name
        language
      }
    }
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GetCartGQL extends Apollo.Query<GetCartQuery, GetCartQueryVariables> {
    document = GetCartDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetCartProductsDocument = gql`
    query GetCartProducts($ids: [UUID!], $language: Language!) {
  products(where: {id: {in: $ids}, status: {eq: PUBLISHED}}) {
    items {
      id
      zodiac
      category {
        id
      }
      intention {
        id
      }
      slug {
        value
      }
      inventory {
        stockQuantity
      }
      pricing {
        price {
          amount
        }
        salePrice {
          amount
        }
      }
      images(order: [{displayOrder: ASC}]) {
        url
        altText
      }
      translations(where: {language: {eq: $language}}) {
        name
        language
      }
    }
    totalCount
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GetCartProductsGQL extends Apollo.Query<GetCartProductsQuery, GetCartProductsQueryVariables> {
    document = GetCartProductsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetCategoriesDocument = gql`
    query GetCategories($skip: Int, $take: Int, $where: CategoryFilterInput, $order: [CategorySortInput!]) {
  categories(skip: $skip, take: $take, where: $where, order: $order) {
    items {
      id
      imageUrl
      status
      type
      translations {
        name
        description
        language
      }
    }
    totalCount
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GetCategoriesGQL extends Apollo.Query<GetCategoriesQuery, GetCategoriesQueryVariables> {
    document = GetCategoriesDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetIntentionsDocument = gql`
    query GetIntentions {
  categories(
    where: {type: {eq: INTENTION}, status: {eq: PUBLISHED}}
    order: [{type: ASC}]
  ) {
    items {
      id
      imageUrl
      status
      type
      translations {
        name
        description
        language
      }
    }
    totalCount
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GetIntentionsGQL extends Apollo.Query<GetIntentionsQuery, GetIntentionsQueryVariables> {
    document = GetIntentionsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetIntentionProductsDocument = gql`
    query GetIntentionProducts($intentionId: UUID!, $skip: Int, $take: Int) {
  products(
    skip: $skip
    take: $take
    where: {intentionId: {eq: $intentionId}, status: {eq: PUBLISHED}, isDeleted: {eq: false}}
  ) {
    items {
      id
      status
      zodiac
      slug {
        value
      }
      inventory {
        stockQuantity
      }
      images(order: [{displayOrder: ASC}]) {
        url
        altText
        isPrimary
      }
      pricing {
        price {
          amount
        }
        salePrice {
          amount
        }
      }
      category {
        id
        translations {
          name
          language
        }
      }
      intention {
        id
        translations {
          name
          language
        }
      }
      translations {
        name
        shortDescription
        language
      }
    }
    totalCount
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GetIntentionProductsGQL extends Apollo.Query<GetIntentionProductsQuery, GetIntentionProductsQueryVariables> {
    document = GetIntentionProductsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetMyOrdersDocument = gql`
    query GetMyOrders($skip: Int, $take: Int, $language: Language!) {
  myOrders(skip: $skip, take: $take, order: [{createdAt: DESC}]) {
    totalCount
    items {
      id
      status
      totalPrice
      createdAt
      shippingAddress {
        country
        city
        street
        zipCode
        additionalInfo
      }
      items {
        id
        quantity
        price {
          amount
        }
        product {
          id
          slug {
            value
          }
          images(order: [{displayOrder: ASC}]) {
            url
            altText
          }
          translations(where: {language: {eq: $language}}) {
            name
            language
          }
        }
      }
    }
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GetMyOrdersGQL extends Apollo.Query<GetMyOrdersQuery, GetMyOrdersQueryVariables> {
    document = GetMyOrdersDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetProductsDocument = gql`
    query GetProducts($skip: Int, $take: Int, $where: ProductFilterInput, $order: [ProductSortInput!]) {
  products(skip: $skip, take: $take, where: $where, order: $order) {
    items {
      id
      status
      zodiac
      slug {
        value
      }
      inventory {
        stockQuantity
      }
      pricing {
        price {
          amount
        }
        salePrice {
          amount
        }
      }
      images(order: [{displayOrder: ASC}]) {
        url
        altText
        isPrimary
      }
      category {
        id
        translations {
          name
          language
        }
      }
      intention {
        id
        translations {
          name
          language
        }
      }
      translations {
        name
        shortDescription
        language
      }
    }
    totalCount
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GetProductsGQL extends Apollo.Query<GetProductsQuery, GetProductsQueryVariables> {
    document = GetProductsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetProductBySlugDocument = gql`
    query GetProductBySlug($slug: String!) {
  products(where: {slug: {value: {eq: $slug}}}, take: 1) {
    items {
      id
      status
      zodiac
      slug {
        value
      }
      inventory {
        stockQuantity
        lowStockThreshold
      }
      pricing {
        price {
          amount
        }
        salePrice {
          amount
        }
      }
      images(order: [{displayOrder: ASC}]) {
        id
        url
        altText
        isPrimary
      }
      category {
        id
        translations {
          name
          language
        }
      }
      intention {
        id
        translations {
          name
          language
        }
      }
      translations {
        name
        shortDescription
        longDescription
        howToUse
        materials
        language
      }
    }
    totalCount
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GetProductBySlugGQL extends Apollo.Query<GetProductBySlugQuery, GetProductBySlugQueryVariables> {
    document = GetProductBySlugDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetBestSellerProductsDocument = gql`
    query GetBestSellerProducts($skip: Int, $take: Int, $period: BestSellerPeriod) {
  bestSellerProducts(skip: $skip, take: $take, period: $period) {
    totalCount
    items {
      soldCount
      product {
        id
        status
        zodiac
        slug {
          value
        }
        inventory {
          stockQuantity
        }
        pricing {
          price {
            amount
          }
          salePrice {
            amount
          }
        }
        images(order: [{displayOrder: ASC}]) {
          url
          altText
          isPrimary
        }
        category {
          id
          translations {
            name
            language
          }
        }
        intention {
          id
          translations {
            name
            language
          }
        }
        translations {
          name
          shortDescription
          language
        }
      }
    }
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GetBestSellerProductsGQL extends Apollo.Query<GetBestSellerProductsQuery, GetBestSellerProductsQueryVariables> {
    document = GetBestSellerProductsDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const GetProfileDocument = gql`
    query GetProfile {
  profile {
    id
    fullName
    email
    role
    createdAt
    details {
      phoneNumber
    }
    addresses {
      id
      country
      city
      street
      zipCode
      additionalInfo
      isDefault
    }
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GetProfileGQL extends Apollo.Query<GetProfileQuery, GetProfileQueryVariables> {
    document = GetProfileDocument;
    
    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }