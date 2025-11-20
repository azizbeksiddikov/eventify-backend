import { Module } from '@nestjs/common';

// ===== Agenda Components =====
import { AgendaService } from './agenda.service';

@Module({
	providers: [AgendaService],
	exports: [AgendaService],
})
export class AgendaModule {}
