import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../libs/logger';

const execAsync = promisify(exec);

@Injectable()
export class OllamaService {
	private readonly containerName = 'eventify-ollama';
	private readonly ollamaEnabled: boolean;
	private readonly context = 'OllamaService';

	constructor() {
		this.ollamaEnabled = true;
		logger.info(this.context, `Initialized: OLLAMA_BASE_URL=${process.env.OLLAMA_BASE_URL || 'NOT SET'}`);
	}

	async startOllama(): Promise<void> {
		if (!this.ollamaEnabled) {
			logger.info(this.context, 'LLM disabled, skipping Ollama start');
			return;
		}

		try {
			// Check if container exists and is stopped
			const { stdout } = await execAsync(`docker ps -a --filter "name=${this.containerName}" --format "{{.Status}}"`);

			if (!stdout.trim()) {
				logger.warn(
					this.context,
					`Ollama container (${this.containerName}) does not exist. Make sure it's started with --profile llm`,
				);
				logger.warn(this.context, '   Events will be processed without LLM filtering/completion');
				return;
			}

			if (stdout.includes('Up')) {
				logger.info(this.context, 'Ollama already running');
				// Verify it's actually accessible
				await this.waitForOllama();
				return;
			}

			logger.info(this.context, 'Starting Ollama container...');
			await execAsync(`docker start ${this.containerName}`);

			// Wait for Ollama to be ready
			await this.waitForOllama();
			logger.info(this.context, 'Ollama started and ready');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error(this.context, `Failed to start Ollama: ${errorMessage}`);
			logger.warn(this.context, '   Events will be processed without LLM filtering/completion');
			// Don't throw - allow processing to continue without LLM
		}
	}

	async stopOllama(): Promise<void> {
		if (!this.ollamaEnabled) {
			return;
		}

		try {
			const { stdout } = await execAsync(`docker ps --filter "name=${this.containerName}" --format "{{.Status}}"`);

			if (!stdout.includes('Up')) {
				logger.info(this.context, 'Ollama already stopped');
				return;
			}

			logger.info(this.context, 'Stopping Ollama container to free resources...');
			await execAsync(`docker stop ${this.containerName}`);
			logger.info(this.context, 'Ollama stopped');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error(this.context, `Failed to stop Ollama: ${errorMessage}`);
		}
	}

	private async waitForOllama(): Promise<void> {
		const maxAttempts = 30;
		const ollamaUrl = process.env.OLLAMA_BASE_URL;
		if (!ollamaUrl) {
			throw new Error('OLLAMA_BASE_URL is not set in environment variables');
		}

		logger.info(this.context, `Waiting for Ollama at ${ollamaUrl}...`);
		for (let i = 0; i < maxAttempts; i++) {
			try {
				const response = await fetch(`${ollamaUrl}/api/version`, {
					signal: AbortSignal.timeout(5000), // 5 second timeout
				});
				if (response.ok) {
					logger.info(this.context, `Ollama is accessible at ${ollamaUrl}`);
					return;
				}
			} catch (error) {
				const err = error as Error;
				if (i === maxAttempts - 1) {
					// Last attempt - show error
					const errorMessage = error instanceof Error ? error.message : String(error);
					logger.error(this.context, `Cannot connect to Ollama at ${ollamaUrl}: ${errorMessage}`);
					throw new Error(`Ollama did not start in time: ${err.message}`);
				}
				// Wait before retry
			}
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}

		throw new Error('Ollama did not start in time');
	}
}
