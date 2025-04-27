// member.types.ts

import { MemberStatus, MemberType } from "../enums/member.enum";

// Base Member type
export interface Member {
  _id: string;
  username: string;
  memberEmail: string;
  memberPhone?: string;
  memberPassword: string;
  memberFullName: string;
  memberType: MemberType;
  memberPoints: number;
  memberDesc?: string;
  memberImage?: string;
  memberStatus: MemberStatus;
  emailVerified: boolean;
  memberLikes: number;
  memberFollowings: number;
  memberFollowers: number;
  memberViews: number;
  createdAt: Date;
  updatedAt: Date;
}

// Input type for creating a new member
export interface MemberInput {
  username: string;
  memberEmail: string;
  memberPhone?: string;
  memberPassword: string;
  memberFullName: string;
  memberType: MemberType;
  memberDesc?: string;
  memberImage?: string;
}

// Input type for updating an existing member
export interface MemberUpdateInput {
  username?: string;
  memberPhone?: string;
  memberPassword?: string;
  memberFullName?: string;
  memberType?: MemberType;
  memberPoints?: number;
  memberDesc?: string;
  memberImage?: string;
  memberStatus?: MemberStatus;
  emailVerified?: boolean;
}

// Response type for member queries with pagination and aggregation
export interface MembersResponse {
  members: Member[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Member filter options for queries
export interface MemberFilter {
  memberType?: MemberType;
  memberStatus?: MemberStatus;
  emailVerified?: boolean;
  search?: string; // For searching by username, email, or fullName
  sort?: "username" | "createdAt" | "memberPoints" | "memberFollowers";
  order?: "asc" | "desc";
}
