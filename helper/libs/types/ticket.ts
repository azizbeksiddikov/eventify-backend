// ticket.types.ts

// Base Ticket type
export interface Ticket {
  _id: string;
  eventId: string;
  memberId: string;
  ticketStatus: "PURCHASED" | "CANCELLED" | "USED";
  ticketPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

// Input type for creating a new ticket
export interface TicketInput {
  eventId: string;
  memberId: string;
  ticketPrice: number;
}

// Input type for updating an existing ticket
export interface TicketUpdateInput {
  ticketStatus: "PURCHASED" | "CANCELLED" | "USED";
}

// Response type for ticket queries with pagination and aggregation
export interface TicketsResponse {
  tickets: Array<
    Ticket & {
      event?: {
        _id: string;
        eventName: string;
        eventDate: Date;
        eventStartTime: string;
        eventEndTime: string;
      };
      member?: {
        _id: string;
        username: string;
        memberFullName: string;
      };
    }
  >;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Ticket filter options for queries
export interface TicketFilter {
  eventId?: string;
  memberId?: string;
  ticketStatus?: "PURCHASED" | "CANCELLED" | "USED";
  fromDate?: Date;
  toDate?: Date;
  sort?: "createdAt" | "ticketPrice";
  order?: "asc" | "desc";
}

// Type for ticket sales statistics
export interface TicketStats {
  totalSold: number;
  totalCancelled: number;
  totalUsed: number;
  totalRevenue: number;
  salesByDay: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
}
