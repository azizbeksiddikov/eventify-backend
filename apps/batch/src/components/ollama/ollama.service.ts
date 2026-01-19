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
	private readonly ollamaBaseUrl: string;
	private readonly ollamaModel: string;
	private isProcessing = false; // Track if we're actively processing events

	constructor() {
		this.ollamaEnabled = true;
		this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || '';
		this.ollamaModel = process.env.OLLAMA_MODEL || '';
		logger.info(this.context, `Initialized: OLLAMA_BASE_URL=${this.ollamaBaseUrl || 'NOT SET'}`);
	}

	/**
	 * Mark that processing has started
	 */
	markProcessingStart(): void {
		this.isProcessing = true;
	}

	/**
	 * Mark that processing has ended
	 */
	markProcessingEnd(): void {
		this.isProcessing = false;
	}

	async startOllama(): Promise<void> {
		if (!this.ollamaEnabled) {
			logger.info(this.context, 'LLM disabled, skipping Ollama start');
			return;
		}

		try {
			// Check if container exists and get its status
			const { stdout: statusOutput } = await execAsync(
				`docker ps -a --filter "name=${this.containerName}" --format "{{.Status}}"`,
			);
			const status = statusOutput.trim();

			// Container doesn't exist - try to create it with docker run
			if (!status) {
				logger.warn(
					this.context,
					`Ollama container (${this.containerName}) does not exist. Attempting to create it...`,
				);
				try {
					// Ensure network exists
					try {
						await execAsync(`docker network inspect monorepo-network`);
					} catch {
						// Network doesn't exist, create it
						logger.info(this.context, 'Creating monorepo-network...');
						await execAsync(`docker network create monorepo-network`);
					}

					// Create container using docker run (equivalent to docker-compose config)
					await execAsync(
						`docker run -d --name ${this.containerName} --restart unless-stopped --network monorepo-network -p 11434:11434 -v ollama_data:/root/.ollama -e OLLAMA_NUM_PARALLEL=1 -e OLLAMA_MAX_LOADED_MODELS=1 --memory=1500m --cpus="1.0" ollama/ollama:latest`,
					);
					logger.info(this.context, 'Ollama container created. Waiting for it to be ready...');
					await this.waitForOllama();
					return;
				} catch (createError) {
					const createErrorMessage = createError instanceof Error ? createError.message : String(createError);
					logger.error(this.context, `Failed to create Ollama container: ${createErrorMessage}`);
					logger.warn(
						this.context,
						'   Make sure to start containers with: docker compose -f docker-compose.dev.yml --profile llm up -d',
					);
					logger.warn(this.context, '   Or run: ./deploy_dev.sh');
					logger.warn(this.context, '   Events will be processed without LLM filtering/completion');
					return;
				}
			}

			// Container is already running - verify it's accessible
			if (status.includes('Up')) {
				logger.info(this.context, 'Ollama container is running. Verifying accessibility...');
				try {
					await this.waitForOllama();
					return;
				} catch {
					logger.warn(this.context, 'Ollama container is running but not responding. Attempting restart...');
					// Container is up but not responding - restart it
					await execAsync(`docker restart ${this.containerName}`);
					await this.waitForOllama();
					return;
				}
			}

			// Container exists but is stopped or exited - check exit code
			if (status.includes('Exited')) {
				const exitCodeMatch = status.match(/Exited \((\d+)\)/);
				const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : null;

				// If container exited with error (non-zero), remove and recreate it
				if (exitCode !== null && exitCode !== 0) {
					logger.warn(this.context, `Ollama container exited with code ${exitCode}. Removing and recreating...`);
					try {
						await execAsync(`docker rm -f ${this.containerName}`);
						logger.info(this.context, 'Removed crashed container. Creating new one...');

						// Ensure network exists
						try {
							await execAsync(`docker network inspect monorepo-network`);
						} catch {
							logger.info(this.context, 'Creating monorepo-network...');
							await execAsync(`docker network create monorepo-network`);
						}

						// Recreate container using docker run
						await execAsync(
							`docker run -d --name ${this.containerName} --restart unless-stopped --network monorepo-network -p 11434:11434 -v ollama_data:/root/.ollama -e OLLAMA_NUM_PARALLEL=1 -e OLLAMA_MAX_LOADED_MODELS=1 --memory=1500m --cpus="1.0" ollama/ollama:latest`,
						);
						await this.waitForOllama();
						logger.info(this.context, 'Ollama recreated and ready');
						return;
					} catch (recreateError) {
						const recreateErrorMessage = recreateError instanceof Error ? recreateError.message : String(recreateError);
						logger.error(this.context, `Failed to recreate container: ${recreateErrorMessage}`);
						logger.warn(this.context, '   Events will be processed without LLM filtering/completion');
						return;
					}
				}
			}

			// Container is stopped - try to start it
			logger.info(this.context, 'Starting stopped Ollama container...');
			await execAsync(`docker start ${this.containerName}`);

			// Wait for Ollama to be ready
			await this.waitForOllama();
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

	/**
	 * Monitor Ollama container memory usage and restart if approaching limit
	 * Only restarts if memory is high AND we're not actively processing (to avoid interrupting active requests)
	 */
	async checkAndCleanupMemory(): Promise<void> {
		if (!this.ollamaEnabled) {
			return;
		}

		try {
			// Check container memory usage
			const { stdout } = await execAsync(`docker stats ${this.containerName} --no-stream --format "{{.MemUsage}}"`);
			const memUsage = stdout.trim();

			// Parse memory usage (format: "XXX.XXMiB / 1.5GiB")
			const match = memUsage.match(/([\d.]+)(MiB|GiB)/);
			if (match) {
				const value = parseFloat(match[1]);
				const unit = match[2];
				const memMB = unit === 'GiB' ? value * 1024 : value;

				// Only restart if memory is high AND we're NOT actively processing
				// Never interrupt active processing, even if memory is critical
				if (memMB > 1200 && !this.isProcessing) {
					logger.warn(
						this.context,
						`Ollama memory usage high (${memMB.toFixed(0)}MB) and idle. Restarting to free memory...`,
					);
					await this.restartForMemoryCleanup();
				} else if (memMB > 1200 && this.isProcessing) {
					// Log warning if high during processing - will clean up after event via unloadModelCache()
					logger.warn(
						this.context,
						`Ollama memory usage high (${memMB.toFixed(0)}MB) but actively processing. Will cleanup after event completes.`,
					);
				}
			}
		} catch (error) {
			// Silently fail - memory monitoring is optional
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.debug(this.context, `Memory check failed: ${errorMessage}`);
		}
	}

	/**
	 * Restart Ollama container to free memory
	 * This is more reliable than trying to unload models via API
	 */
	async restartForMemoryCleanup(): Promise<void> {
		if (!this.ollamaEnabled) {
			return;
		}

		try {
			logger.info(this.context, 'Restarting Ollama container to free memory...');
			await execAsync(`docker restart ${this.containerName}`);
			await this.waitForOllama();
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error(this.context, `Failed to restart Ollama: ${errorMessage}`);
		}
	}

	/**
	 * Unload model from memory to free up cache without restarting container
	 * Uses Ollama API to unload the model, which is faster than restarting
	 */
	async unloadModelCache(): Promise<void> {
		if (!this.ollamaEnabled || !this.ollamaBaseUrl || !this.ollamaModel) {
			return;
		}

		try {
			// Use Ollama's /api/generate with keep_alive=0 to unload the model
			// This is faster than restarting the container
			await fetch(`${this.ollamaBaseUrl}/api/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: this.ollamaModel,
					prompt: '', // Empty prompt
					stream: false,
					keep_alive: '0s', // Unload immediately after this request
					options: {
						num_predict: 0, // Don't generate anything
					},
				}),
				signal: AbortSignal.timeout(3000), // 3 second timeout
			}).catch(() => {
				// Ignore errors - model might already be unloaded or request might timeout
			});

			logger.debug(this.context, 'Model cache unloaded (freed memory without restarting)');
		} catch (error) {
			// Silently fail - cache cleanup is optional
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.debug(this.context, `Failed to unload model cache: ${errorMessage}`);
		}
	}
}
