import { registerEnumType } from "@nestjs/graphql";

export enum MemberType {
  USER = "USER",
  ORGANIZER = "ORGANIZER",
  ADMIN = "ADMIN",
}

export enum MemberStatus {
  ACTIVE = "ACTIVE",
  BLOCK = "BANNED",
}

registerEnumType(MemberType, { name: "MemberType" });
registerEnumType(MemberStatus, { name: "MemberStatus" });
