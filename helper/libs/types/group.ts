// group.types.ts

// Base Group type
export interface Group {
  _id: string;
  groupName: string;
  groupDesc?: string;
  groupImage?: string;
  groupViews: number;
  groupLikes: number;
  groupCategories: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Input type for creating a new group
export interface GroupInput {
  groupName: string;
  groupDesc?: string;
  groupImage?: string;
  groupCategories: string[];
}

// Input type for updating an existing group
export interface GroupUpdateInput {
  groupName?: string;
  groupDesc?: string;
  groupImage?: string;
  groupCategories?: string[];
}

// Response type for group queries with pagination and aggregation
export interface GroupsResponse {
  groups: Group[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Group filter options for queries
export interface GroupFilter {
  category?: string;
  search?: string; // For searching by name or description
  sort?: "groupName" | "createdAt" | "groupLikes" | "groupViews";
  order?: "asc" | "desc";
}

// Type for group statistics
export interface GroupStats {
  _id: string;
  groupName: string;
  memberCount: number;
  eventCount: number;
  groupViews: number;
  groupLikes: number;
  popularEvents: Array<{ eventName: string; attendeeCount: number }>;
}
