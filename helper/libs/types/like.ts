// like.types.ts

// Base Like type
export interface Like {
  _id: string;
  memberId: string;
  likeGroup: "MEMBER" | "EVENT" | "GROUP";
  likeRefId: string;
  createdAt: Date;
}

// Input type for creating a new like
export interface LikeInput {
  memberId: string;
  likeGroup: "MEMBER" | "EVENT" | "GROUP";
  likeRefId: string;
}
