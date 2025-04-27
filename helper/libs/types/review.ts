// review.types.ts

// Base Review type
export interface Review {
  _id: string;
  memberId: string;
  reviewGroup: "MEMBER" | "EVENT" | "GROUP";
  reviewRefId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Input type for creating a new review
export interface ReviewInput {
  memberId: string;
  reviewGroup: "MEMBER" | "EVENT" | "GROUP";
  reviewRefId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

// Input type for updating an existing review
export interface ReviewUpdateInput {
  rating?: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

// Response type for review queries with pagination and aggregation
export interface ReviewsResponse {
  reviews: Array<
    Review & {
      member?: {
        _id: string;
        username: string;
        memberFullName: string;
        memberImage?: string;
      };
      // Reference details will be populated based on reviewGroup
      referenceDetails?: {
        name: string;
        image?: string;
      };
    }
  >;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  averageRating?: number;
}

// Review filter options for queries
export interface ReviewFilter {
  memberId?: string;
  reviewGroup?: "MEMBER" | "EVENT" | "GROUP";
  reviewRefId?: string;
  minRating?: 1 | 2 | 3 | 4 | 5;
  sort?: "createdAt" | "rating";
  order?: "asc" | "desc";
}

// Type for review statistics
export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  };
}
