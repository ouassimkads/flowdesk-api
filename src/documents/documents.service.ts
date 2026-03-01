import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── Upload documents to a step ────────────────────────────────────────────
  async uploadToStep(
    stepId: string,
    files: Express.Multer.File[],
    userId: string,
    isAdmin: boolean,
  ) {
    const step = await this.getStepWithOwnership(stepId, userId, isAdmin);

    if (!['UNLOCKED', 'REJECTED'].includes(step.status)) {
      throw new BadRequestException(
        'لا يمكن رفع مستندات لهذه الخطوة في حالتها الحالية. يجب أن تكون مفتوحة أو مرفوضة.',
      );
    }

    const docs = await this.prisma.$transaction(
      files.map(file =>
        this.prisma.applicationStepDocument.create({
          data: {
            applicationStepId: stepId,
            filename: file.originalname,
            storagePath: file.path,
            mimeType: file.mimetype,
            sizeBytes: file.size,
          },
        }),
      ),
    );

    // Audit
    await this.audit.log({
      action: 'DOCUMENT_UPLOADED',
      applicationId: step.applicationId,
      applicationStepId: stepId,
      note: `${files.length} ملف(ات) مرفوعة`,
    });

    return docs;
  }

  // ── List documents for a step ─────────────────────────────────────────────
  async findByStep(stepId: string, userId: string, isAdmin: boolean) {
    await this.getStepWithOwnership(stepId, userId, isAdmin);

    return this.prisma.applicationStepDocument.findMany({
      where: { applicationStepId: stepId, isDeleted: false },
      orderBy: { uploadedAt: 'asc' },
    });
  }

  // ── Delete a document ─────────────────────────────────────────────────────
  async remove(documentId: string, userId: string, isAdmin: boolean) {
    const doc = await this.prisma.applicationStepDocument.findUnique({
      where: { id: documentId },
      include: {
        applicationStep: {
          include: {
            application: { select: { applicantId: true, id: true } },
          },
        },
      },
    });

    if (!doc || doc.isDeleted) throw new NotFoundException('المستند غير موجود.');

    const isOwner = doc.applicationStep.application.applicantId === userId;
    if (!isAdmin && !isOwner) throw new ForbiddenException('ليس لديك صلاحية حذف هذا المستند.');

    const stepStatus = doc.applicationStep.status;
    if (!isAdmin && !['UNLOCKED', 'REJECTED'].includes(stepStatus)) {
      throw new BadRequestException('لا يمكن حذف المستندات بعد الإرسال للمراجعة.');
    }

    // Soft delete in DB
    await this.prisma.applicationStepDocument.update({
      where: { id: documentId },
      data: { isDeleted: true },
    });

    // Delete physical file if it exists
    if (doc.storagePath && fs.existsSync(doc.storagePath)) {
      fs.unlinkSync(doc.storagePath);
    }

    await this.audit.log({
      action: 'DOCUMENT_DELETED',
      applicationId: doc.applicationStep.application.id,
      applicationStepId: doc.applicationStepId,
      note: doc.filename,
    });

    return { message: 'تم حذف المستند بنجاح.' };
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private async getStepWithOwnership(stepId: string, userId: string, isAdmin: boolean) {
    const step = await this.prisma.applicationStep.findUnique({
      where: { id: stepId },
      include: { application: { select: { applicantId: true, id: true } } },
    });

    if (!step) throw new NotFoundException('الخطوة غير موجودة.');

    if (!isAdmin && step.application.applicantId !== userId) {
      throw new ForbiddenException('ليس لديك صلاحية الوصول لهذه الخطوة.');
    }

    return { ...step, applicationId: step.application.id };
  }
}
