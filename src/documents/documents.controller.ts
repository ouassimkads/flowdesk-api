import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { existsSync, createReadStream } from 'fs';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards';
import { GetUser } from '../common/decorators';

const multerOptions = {
  storage: diskStorage({
    destination: process.env.UPLOAD_DEST || './uploads',
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          'نوع الملف غير مدعوم. المقبول: PDF، JPG، PNG، DOCX.',
        ),
        false,
      );
    }
  },
  limits: {
    fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024,
  },
};

// ✅ No class-level @UseGuards — the view endpoint must be public
@ApiTags('Documents')
@Controller('steps/:stepId/documents')
export class DocumentsController {
  constructor(
    private service: DocumentsService,
    private prisma: PrismaService,
  ) {}

  // ✅ PUBLIC — no JWT, browser <img src="..."> loads this directly
  @Get(':id/view')
  @ApiOperation({ summary: 'Stream a document file (public)' })
  async viewDocument(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.prisma.applicationStepDocument.findUnique({
      where: { id, isDeleted: false },
    });

    if (!doc) return res.status(404).json({ message: 'المستند غير موجود' });

    const filePath = resolve(doc.storagePath);
    if (!existsSync(filePath))
      return res.status(404).json({ message: 'الملف غير موجود' });

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
    createReadStream(filePath).pipe(res);
  }

  // ── Protected routes ───────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all documents for a step' })
  findByStep(@Param('stepId') stepId: string, @GetUser() user: any) {
    return this.service.findByStep(stepId, user.id, user.role === 'ADMIN');
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload one or more documents to a step (max 5 files)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 5, multerOptions))
  upload(
    @Param('stepId') stepId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user: any,
  ) {
    if (!files || files.length === 0)
      throw new BadRequestException('لم يتم رفع أي ملفات.');

    return this.service.uploadToStep(
      stepId,
      files,
      user.id,
      user.role === 'ADMIN',
    );
  }

  @Delete(':documentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a document' })
  remove(@Param('documentId') documentId: string, @GetUser() user: any) {
    return this.service.remove(documentId, user.id, user.role === 'ADMIN');
  }
}
