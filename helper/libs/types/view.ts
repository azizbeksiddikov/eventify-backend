// view.types.ts

// Base View type
export interface View {
  _id: string;
  memberId: string;
  viewGroup: "MEMBER" | "EVENT" | "GROUP";
  viewRefId: string;
  createdAt: Date;
}

// Input type for creating a new view record
export interface ViewInput {
  memberId: string;
  viewGroup: "MEMBER" | "EVENT" | "GROUP";
  viewRefId: string;
}

// Response type for view queries with pagination and aggregation
export interface ViewsResponse {
  views: View[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// View filter options for queries
export interface ViewFilter {
  memberId?: string;
  viewGroup?: "MEMBER" | "EVENT" | "GROUP";
  viewRefId?: string;
  fromDate?: Date;
  toDate?: Date;
  sort?: "createdAt";
  order?: "asc" | "desc";
}

// Type for view statistics
export interface ViewStats {
  totalViews: number;
  uniqueViewers: number;
  viewsByDate: Array<{
    date: string;
    count: number;
  }>;
  viewsByHour: Array<{
    hour: number;
    count: number;
  }>;
}
