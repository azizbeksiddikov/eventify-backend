import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class OllamaService {
	private readonly containerName = 'eventify-ollama';
	private readonly ollamaBaseUrl: string;
	private readonly networkName: string;
	private readonly volumeName: string;
	private isProcessing = false;

	constructor() {
		const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;
		if (!ollamaBaseUrl) throw new Error('OLLAMA_BASE_URL must be set');
		this.ollamaBaseUrl = ollamaBaseUrl;

		// Detect environment (dev or prod) based on NODE_ENV or container name
		const isProd = process.env.NODE_ENV === 'production';
		this.networkName = isProd ? 'monorepo-network-prod' : 'monorepo-network-dev';
		this.volumeName = isProd ? 'ollama_data_prod' : 'ollama_data';

		console.log(`OllamaService initialized for ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
	}

	markProcessingStart(): void {
		this.isProcessing = true;
	}

	markProcessingEnd(): void {
		this.isProcessing = false;
	}

	async startOllama(): Promise<void> {
		console.log('Starting Ollama service...');

		try {
			// Check if container already exists
			const { stdout: ollamaContainerId } = await execAsync(`docker ps -aq --filter name=${this.containerName}`);

			if (!ollamaContainerId.trim()) {
				// Container doesn't exist - create it
				console.log('Creating Ollama container...');

				// Ensure network exists
				try {
					await execAsync(`docker network inspect ${this.networkName}`);
				} catch {
					console.log(`Creating ${this.networkName}...`);
					await execAsync(`docker network create ${this.networkName}`);
				}

				// Create and start container
				await execAsync(`
					docker run -d \
						--name ${this.containerName} \
						--network ${this.networkName} \
						-p 11434:11434 \
						-v ${this.volumeName}:/root/.ollama \
						-e OLLAMA_NUM_PARALLEL=1 \
						-e OLLAMA_MAX_LOADED_MODELS=1 \
						--memory=1500M \
						--cpus=1.0 \
						--restart unless-stopped \
						ollama/ollama:latest
				`);

				await this.waitForOllama();
				return;
			}

			// Container exists - check if it's running
			const { stdout: isRunning } = await execAsync(`docker inspect -f '{{.State.Running}}' ${this.containerName}`);

			if (isRunning.trim() === 'true') {
				console.log('Ollama container is already running. Verifying accessibility...');
				try {
					await this.waitForOllama();
					return;
				} catch {
					console.warn('Ollama container is running but not responding. Attempting restart...');
					await execAsync(`docker restart ${this.containerName}`);
					await this.waitForOllama();
					return;
				}
			}

			// Container exists but is stopped - start it
			console.log('Starting existing Ollama container...');
			await execAsync(`docker start ${this.containerName}`);
			await this.waitForOllama();
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`Failed to start Ollama: ${errorMessage}`);
			throw new Error(`Ollama startup failed: ${errorMessage}`);
		}
	}

	async stopOllama(): Promise<void> {
		if (this.isProcessing) {
			console.warn('Ollama is still processing - skipping stop');
			return;
		}

		try {
			console.log('Stopping Ollama service...');
			const { stdout: isRunning } = await execAsync(`docker ps -q --filter name=${this.containerName}`);

			if (isRunning.trim()) {
				await execAsync(`docker stop ${this.containerName}`);
				console.log('Ollama stopped');
			} else {
				console.log('Ollama already stopped');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`Failed to stop Ollama: ${errorMessage}`);
		}
	}

	private async waitForOllama(): Promise<void> {
		const maxAttempts = 30;

		console.log(`Waiting for Ollama at ${this.ollamaBaseUrl}...`);
		for (let i = 0; i < maxAttempts; i++) {
			try {
				const response = await fetch(`${this.ollamaBaseUrl}/api/version`, {
					signal: AbortSignal.timeout(5000),
				});
				if (response.ok) {
					console.log(`Ollama is accessible at ${this.ollamaBaseUrl}`);
					return;
				}
			} catch (error) {
				if (i === maxAttempts - 1) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					console.error(`Cannot connect to Ollama at ${this.ollamaBaseUrl}: ${errorMessage}`);
					throw new Error(`Ollama did not start in time`);
				}
			}
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}
	}

	async unloadModelCache(): Promise<void> {
		try {
			await fetch(`${this.ollamaBaseUrl}/api/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: process.env.OLLAMA_MODEL,
					keep_alive: 0, // Unload immediately
				}),
			});
			console.log('Model cache unloaded');
		} catch (error) {
			console.error(`Failed to unload model cache: ${error}`);
		}
	}
}
