import { registerEnumType } from '@nestjs/graphql';

// ===== Ticket Status =====
export enum TicketStatus {
	PURCHASED = 'PURCHASED',
	CANCELLED = 'CANCELLED',
	USED = 'USED',
}

// Register Ticket enum
registerEnumType(TicketStatus, { name: 'TicketStatus' });
