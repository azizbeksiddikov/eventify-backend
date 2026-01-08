import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class OllamaService {
	private readonly containerName = 'eventify-ollama';
	private readonly ollamaEnabled: boolean;

	constructor() {
		this.ollamaEnabled = process.env.LLM_ENABLED === 'true';
	}

	async startOllama(): Promise<void> {
		if (!this.ollamaEnabled) {
			console.log('LLM disabled, skipping Ollama start');
			return;
		}

		try {
			// Check if container exists and is stopped
			const { stdout } = await execAsync(`docker ps -a --filter "name=${this.containerName}" --format "{{.Status}}"`);

			if (!stdout.trim()) {
				console.log('Ollama container does not exist, skipping');
				return;
			}

			if (stdout.includes('Up')) {
				console.log('Ollama already running');
				return;
			}

			console.log('Starting Ollama container...');
			await execAsync(`docker start ${this.containerName}`);

			// Wait for Ollama to be ready
			await this.waitForOllama();
			console.log('Ollama started and ready');
		} catch (error) {
			const err = error as Error;
			console.error('Failed to start Ollama:', err.message);
			throw error;
		}
	}

	async stopOllama(): Promise<void> {
		if (!this.ollamaEnabled) {
			return;
		}

		try {
			const { stdout } = await execAsync(`docker ps --filter "name=${this.containerName}" --format "{{.Status}}"`);

			if (!stdout.includes('Up')) {
				console.log('Ollama already stopped');
				return;
			}

			console.log('Stopping Ollama container to free resources...');
			await execAsync(`docker stop ${this.containerName}`);
			console.log('Ollama stopped');
		} catch (error) {
			const err = error as Error;
			console.error('Failed to stop Ollama:', err.message);
		}
	}

	private async waitForOllama(): Promise<void> {
		const maxAttempts = 30;
		const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

		for (let i = 0; i < maxAttempts; i++) {
			try {
				const response = await fetch(`${ollamaUrl}/api/version`);
				if (response.ok) {
					return;
				}
			} catch {
				// Ollama not ready yet
			}
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}

		throw new Error('Ollama did not start in time');
	}
}
