import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveStepDto, RejectStepDto } from './dto/application.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api/v1';


// ── Helper to map a raw document to one with a url ───────────────────────────
const mapDoc = (doc: any) => ({
  ...doc,
  url: `${BASE_URL}/steps/${doc.applicationStepId}/documents/${doc.id}/view`,
});

const STEP_INCLUDE = {
  workflowStep: {
    select: {
      id: true,
      label: true,
      description: true,
      icon: true,
      position: true,
      type: true,
      requiresDocuments: true,
    },
  },
  documents: {
    where: { isDeleted: false },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      uploadedAt: true,
      applicationStepId: true, // ✅ needed to build the url
    },
  },
};

const APPLICATION_INCLUDE = {
  applicant: {
    select: { id: true, name: true, email: true, avatarColor: true },
  },
  steps: {
    include: STEP_INCLUDE,
    orderBy: { workflowStep: { position: 'asc' } as any },
  },
};

// ── Helper to add url to every document in an application ────────────────────
const mapApplicationDocs = (app: any) => ({
  ...app,
  steps: app.steps.map((step: any) => ({
    ...step,
    documents: step.documents.map(mapDoc),
  })),
});

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private audit: AuditService,
  ) {}

  // ── Get all applications (admin) ──────────────────────────────────────────
  async findAll(statusFilter?: string) {
    const apps = await this.prisma.application.findMany({
      where: statusFilter ? { status: statusFilter as any } : {},
      include: APPLICATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return apps.map(mapApplicationDocs);
  }

  // ── Get my application (applicant) ────────────────────────────────────────
  async findMine(userId: string) {
    const app = await this.prisma.application.findUnique({
      where: { applicantId: userId },
      include: {
        steps: {
          include: STEP_INCLUDE,
          orderBy: { workflowStep: { position: 'asc' } as any },
        },
      },
    });

    if (!app) throw new NotFoundException('لا يوجد طلب مرتبط بحسابك.');
    return mapApplicationDocs(app);
  }

  // ── Get one application by id (admin) ─────────────────────────────────────
  async findOne(id: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: APPLICATION_INCLUDE,
    });

    if (!app) throw new NotFoundException('الطلب غير موجود.');
    return mapApplicationDocs(app);
  }

  // ── Get a specific step (admin or owner) ──────────────────────────────────
  async findStep(
    applicationId: string,
    stepId: string,
    userId: string,
    isAdmin: boolean,
  ) {
    const step = await this.prisma.applicationStep.findUnique({
      where: { id: stepId },
      include: {
        ...STEP_INCLUDE,
        application: { select: { applicantId: true } },
      },
    });

    if (!step || step.applicationId !== applicationId)
      throw new NotFoundException('الخطوة غير موجودة.');

    if (!isAdmin && step.application.applicantId !== userId)
      throw new ForbiddenException('ليس لديك صلاحية الوصول لهذه الخطوة.');

    return {
      ...step,
      documents: step.documents.map(mapDoc),
    };
  }

  // ── Approve step (admin) ──────────────────────────────────────────────────
  async approveStep(
    applicationId: string,
    stepId: string,
    dto: ApproveStepDto,
    adminId: string,
  ) {
    const step = await this.getStepOrFail(applicationId, stepId);

    if (step.status !== 'PENDING') {
      throw new BadRequestException(
        'يمكن الموافقة فقط على الخطوات في حالة "قيد المراجعة".',
      );
    }

    const now = new Date();

    await this.prisma.applicationStep.update({
      where: { id: stepId },
      data: {
        status: 'APPROVED',
        adminNote: dto.adminNote ?? null,
        reviewedAt: now,
      },
    });

    const workflowSteps = await this.prisma.workflowStep.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
    });

    const currentIdx = workflowSteps.findIndex(
      (s) => s.id === step.workflowStepId,
    );
    const nextWorkflowStep = workflowSteps[currentIdx + 1];

    if (nextWorkflowStep) {
      await this.prisma.applicationStep.updateMany({
        where: { applicationId, workflowStepId: nextWorkflowStep.id },
        data: { status: 'UNLOCKED', unlockedAt: now },
      });
    } else {
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { status: 'COMPLETE' },
      });
    }

    await this.audit.log({
      action: 'STEP_APPROVED',
      adminId,
      applicationId,
      applicationStepId: stepId,
      note: dto.adminNote,
    });

    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { applicantId: true },
    });

    await this.notifications.create({
      userId: app.applicantId,
      applicationId,
      title: 'تمت الموافقة على خطوتك ✅',
      body: nextWorkflowStep
        ? `تمت الموافقة على "${step.workflowStep?.label ?? 'الخطوة'}". يمكنك الآن المتابعة إلى الخطوة التالية.`
        : 'تهانينا! تمت الموافقة على جميع خطواتك. طلبك مكتمل.',
    });

    return this.findOne(applicationId);
  }

  // ── Reject step (admin) ───────────────────────────────────────────────────
  async rejectStep(
    applicationId: string,
    stepId: string,
    dto: RejectStepDto,
    adminId: string,
  ) {
    const step = await this.getStepOrFail(applicationId, stepId);

    if (step.status !== 'PENDING') {
      throw new BadRequestException(
        'يمكن رفض الخطوات في حالة "قيد المراجعة" فقط.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.applicationStepDocument.updateMany({
        where: { applicationStepId: stepId },
        data: { isDeleted: true },
      }),
      this.prisma.applicationStep.update({
        where: { id: stepId },
        data: {
          status: 'REJECTED',
          rejectionReason: dto.rejectionReason,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.application.update({
        where: { id: applicationId },
        data: { status: 'REJECTED' },
      }),
    ]);

    await this.audit.log({
      action: 'STEP_REJECTED',
      adminId,
      applicationId,
      applicationStepId: stepId,
      note: dto.rejectionReason,
    });

    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { applicantId: true },
    });

    await this.notifications.create({
      userId: app.applicantId,
      applicationId,
      title: 'تم رفض خطوتك ❌',
      body: `تم رفض "${step.workflowStep?.label ?? 'الخطوة'}". السبب: ${dto.rejectionReason}`,
    });

    return this.findOne(applicationId);
  }

  // ── Submit step (applicant) ───────────────────────────────────────────────
  async submitStep(
    applicationId: string,
    stepId: string,
    userId: string,
    dto?: { inputValue?: string },
  ) {
    const step = await this.getStepOrFail(applicationId, stepId);

    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { applicantId: true },
    });
    if (app.applicantId !== userId)
      throw new ForbiddenException('لا يمكنك تعديل هذا الطلب.');

    if (!['UNLOCKED', 'REJECTED'].includes(step.status)) {
      throw new BadRequestException(
        'لا يمكن إرسال هذه الخطوة في حالتها الحالية.',
      );
    }

    const type = step.workflowStep.type;

    switch (type) {
      case 'input':
        if (!dto?.inputValue || dto.inputValue.trim() === '') {
          throw new BadRequestException('يجب إدخال قيمة لهذه الخطوة.');
        }
        await this.prisma.applicationStep.update({
          where: { id: stepId },
          data: {
            status: 'PENDING',
            submittedAt: new Date(),
            inputValue: dto.inputValue,
            rejectionReason: null,
          },
        });
        break;

      case 'document':
        if (step.workflowStep.requiresDocuments) {
          const docCount = await this.prisma.applicationStepDocument.count({
            where: { applicationStepId: stepId, isDeleted: false },
          });
          if (docCount === 0)
            throw new BadRequestException(
              'يجب رفع مستند واحد على الأقل قبل الإرسال.',
            );
        }
        await this.prisma.applicationStep.update({
          where: { id: stepId },
          data: {
            status: 'PENDING',
            submittedAt: new Date(),
            rejectionReason: null,
          },
        });
        break;

      case 'button':
        await this.prisma.applicationStep.update({
          where: { id: stepId },
          data: {
            status: 'PENDING',
            submittedAt: new Date(),
            rejectionReason: null,
          },
        });
        break;

      default:
        throw new BadRequestException('نوع الخطوة غير مدعوم.');
    }

    await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: 'IN_PROGRESS' },
    });

    await this.audit.log({
      action: 'STEP_RESET',
      applicationId,
      applicationStepId: stepId,
    });

    return this.findMine(userId);
  }

  // ── Stats for admin dashboard ─────────────────────────────────────────────
  async getStats() {
    const [total, complete, rejected, pendingSteps] = await Promise.all([
      this.prisma.application.count(),
      this.prisma.application.count({ where: { status: 'COMPLETE' } }),
      this.prisma.application.count({ where: { status: 'REJECTED' } }),
      this.prisma.applicationStep.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      totalApplicants: total,
      complete,
      inProgress: total - complete - rejected,
      rejected,
      pendingStepsCount: pendingSteps,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private async getStepOrFail(applicationId: string, stepId: string) {
    const step = await this.prisma.applicationStep.findUnique({
      where: { id: stepId },
      include: {
        workflowStep: {
          select: {
            id: true,
            label: true,
            position: true,
            type: true,
            requiresDocuments: true,
          },
        },
      },
    });

    if (!step || step.applicationId !== applicationId)
      throw new NotFoundException('الخطوة غير موجودة في هذا الطلب.');

    return step;
  }
}
