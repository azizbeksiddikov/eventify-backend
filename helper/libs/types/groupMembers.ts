export interface GroupMember {
  _id: string;
  groupId: string;
  memberId: string;
  memberRole: "ORGANIZER" | "MEMBER" | "BANNED";
  joinDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Input type for adding a member to a group
export interface GroupMemberInput {
  groupId: string;
  memberId: string;
  memberRole: "ORGANIZER" | "MEMBER" | "BANNED";
}

// Input type for updating a group member's role
export interface GroupMemberUpdateInput {
  memberRole: "ORGANIZER" | "MEMBER" | "BANNED";
}

// Response type for group members queries with pagination
export interface GroupMembersResponse {
  groupMembers: Array<
    GroupMember & {
      memberDetails?: {
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
