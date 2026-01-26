import { Injectable, BadRequestException } from '@nestjs/common';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getSerialForImage, validMimeTypes } from '../../libs/config';
import { Message } from '../../libs/enums/common.enum';
import { logger } from '../../libs/logger';

@Injectable()
export class UploadService {
	uploadSingleFile(file: Express.Multer.File, target: string): Promise<string> {
		if (!file) throw new BadRequestException(Message.UPLOAD_FAILED);

		const validMime = validMimeTypes.includes(file.mimetype);
		if (!validMime) throw new BadRequestException(Message.PROVIDE_ALLOWED_FORMAT);

		const imageName = getSerialForImage(file.originalname);
		const targetDir = join('uploads', target);
		const url = join(targetDir, imageName);

		if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

		try {
			writeFileSync(url, file.buffer);
			return Promise.resolve(url);
		} catch {
			throw new BadRequestException(Message.UPLOAD_FAILED);
		}
	}

	uploadMultipleFiles(files: Express.Multer.File[], target: string): Promise<string[]> {
		if (!files || files.length === 0) {
			throw new BadRequestException(Message.UPLOAD_FAILED);
		}

		const targetDir = join('uploads', target);
		if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

		const uploadedImages: string[] = [];

		for (const file of files) {
			const validMime = validMimeTypes.includes(file.mimetype);
			if (!validMime) {
				throw new BadRequestException(Message.PROVIDE_ALLOWED_FORMAT);
			}

			const imageName = getSerialForImage(file.originalname);
			const url = join(targetDir, imageName);

			try {
				writeFileSync(url, file.buffer);
				uploadedImages.push(url);
			} catch (err) {
				logger.error('UploadService', 'Error uploading file', err);
				throw new BadRequestException(Message.UPLOAD_FAILED);
			}
		}

		return Promise.resolve(uploadedImages);
	}
}
