// event.types.ts

// Base Event type
export interface Event {
  _id: string;
  eventName: string;
  eventDesc?: string;
  eventDate: Date;
  eventStartTime: string;
  eventEndTime: string;
  eventAddress: string;
  eventOrganizerId: string;
  eventCapacity: number;
  attendeeCount: number;
  eventImage?: string;
  eventStatus: "ACTIVE" | "CANCELLED" | "COMPLETED";
  groupId?: string;
  eventCategories: string[];
  eventLikes: number;
  eventViews: number;
  createdAt: Date;
  updatedAt: Date;
}

// Input type for creating a new event
export interface EventInput {
  eventName: string;
  eventDesc?: string;
  eventDate: Date;
  eventStartTime: string;
  eventEndTime: string;
  eventAddress: string;
  eventCapacity: number;
  eventImage?: string;
  groupId?: string;
  eventCategories: string[];
}

// Input type for updating an existing event
export interface EventUpdateInput {
  eventName?: string;
  eventDesc?: string;
  eventDate?: Date;
  eventStartTime?: string;
  eventEndTime?: string;
  eventAddress?: string;
  eventCapacity?: number;
  eventImage?: string;
  eventStatus?: "ACTIVE" | "CANCELLED" | "COMPLETED";
  groupId?: string;
  eventCategories?: string[];
}

// Response type for event queries with pagination and aggregation
export interface EventsResponse {
  events: Array<
    Event & {
      organizer?: {
        _id: string;
        username: string;
        memberFullName: string;
      };
      group?: {
        _id: string;
        groupName: string;
      };
    }
  >;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Event filter options for queries
export interface EventFilter {
  eventStatus?: "ACTIVE" | "CANCELLED" | "COMPLETED";
  eventCategories?: string[];
  groupId?: string;
  eventOrganizerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string; // For searching by name or description
  sort?: "eventDate" | "createdAt" | "eventLikes" | "attendeeCount";
  order?: "asc" | "desc";
}

// Type for event statistics
export interface EventStats {
  _id: string;
  eventName: string;
  attendeeCount: number;
  ticketsSold: number;
  ticketsUsed: number;
  eventViews: number;
  eventLikes: number;
  averageRating: number;
}
