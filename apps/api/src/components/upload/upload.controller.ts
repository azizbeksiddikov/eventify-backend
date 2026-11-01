import {
	BadRequestException,
	Body,
	Controller,
	Post,
	UploadedFile,
	UploadedFiles,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { errorBody } from '../../libs/errors';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(AuthGuard)
export class UploadController {
	constructor(private readonly uploadService: UploadService) {}

	@Post('image')
	@UseInterceptors(
		FileInterceptor('file', {
			storage: memoryStorage(),
			limits: {
				fileSize: 15 * 1024 * 1024, // 15MB
			},
		}),
	)
	async uploadImage(
		@UploadedFile() file: Express.Multer.File,
		@Body('target') target: string,
	): Promise<{ url: string }> {
		if (!target) throw new BadRequestException(errorBody('UPLOAD_TARGET_REQUIRED'));

		const url = await this.uploadService.uploadSingleFile(file, target);
		return { url };
	}

	@Post('images')
	@UseInterceptors(
		FilesInterceptor('files', 10, {
			storage: memoryStorage(),
			limits: {
				fileSize: 15 * 1024 * 1024, // 15MB per file
			},
		}),
	)
	async uploadImages(
		@UploadedFiles() files: Express.Multer.File[],
		@Body('target') target: string,
	): Promise<{ urls: string[] }> {
		if (!target) {
			throw new BadRequestException(errorBody('UPLOAD_TARGET_REQUIRED'));
		}

		const urls = await this.uploadService.uploadMultipleFiles(files, target);
		return { urls };
	}
}
