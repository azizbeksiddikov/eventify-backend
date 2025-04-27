// follow.types.ts

// Base Follow type
export interface Follow {
  _id: string;
  followingId: string; // ID of member being followed
  followerId: string; // ID of member who is following
  createdAt: Date;
}

// Input type for creating a new follow relationship
export interface FollowInput {
  followingId: string;
  followerId: string;
}

// Response type for follow queries with pagination
export interface FollowsResponse {
  follows: Array<
    Follow & {
      follower?: {
        _id: string;
        username: string;
        memberFullName: string;
        memberImage?: string;
      };
      following?: {
        _id: string;
        username: string;
        memberFullName: string;
        memberImage?: string;
      };
    }
  >;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Follow filter options for queries
export interface FollowFilter {
  followingId?: string;
  followerId?: string;
  sort?: "createdAt";
  order?: "asc" | "desc";
}

// Type for follower statistics
export interface FollowerStats {
  totalFollowers: number;
  totalFollowing: number;
  followersByDate: Array<{
    date: string;
    count: number;
  }>;
}
