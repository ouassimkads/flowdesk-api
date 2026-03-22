  import {
    Injectable,
    NotFoundException,
    ConflictException,
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';
  import {
    CreateWorkflowStepDto,
    UpdateWorkflowStepDto,
    ReorderStepsDto,
  } from './dto/workflow-step.dto';

  @Injectable()
  export class WorkflowStepsService {
    constructor(private prisma: PrismaService) {}

    // ── Get all active steps ──────────────────────────────────────────────────
    async findAll(includeInactive = false) {
      return this.prisma.workflowStep.findMany({
        where: includeInactive ? {} : { isActive: true },
        orderBy: { position: 'asc' },
      });
    }

    // ── Get one ───────────────────────────────────────────────────────────────
    async findOne(id: string) {
      const step = await this.prisma.workflowStep.findUnique({ where: { id } });
      if (!step) throw new NotFoundException('الخطوة غير موجودة.');
      return step;
    }

    // ── Create ────────────────────────────────────────────────────────────────
    // async create(dto: CreateWorkflowStepDto) {
    //   const existing = await this.prisma.workflowStep.findUnique({ where: { position: dto.position } });
    //   if (existing) throw new ConflictException(`يوجد خطوة بالترتيب ${dto.position} بالفعل.`);

    //   return this.prisma.workflowStep.create({ data: dto });
    // }
    // async create(dto: CreateWorkflowStepDto) {
    //   const existing = await this.prisma.workflowStep.findUnique({
    //     where: { position: dto.position },
    //   });
    //   if (existing)
    //     throw new ConflictException(`يوجد خطوة بالترتيب ${dto.position} بالفعل.`);

    //   return this.prisma.workflowStep.create({
    //     data: {
    //       ...dto,
    //       type: dto.type || 'input',
    //       requiresDocuments: dto.requiresDocuments || false,
    //     },
    //   });
    // }

    // async create(dto: CreateWorkflowStepDto) {
    //   const existing = await this.prisma.workflowStep.findUnique({
    //     where: { position: dto.position },
    //   });
    //   if (existing)
    //     throw new ConflictException(`يوجد خطوة بالترتيب ${dto.position} بالفعل.`);

    //   const workflowStep = await this.prisma.workflowStep.create({
    //     data: {
    //       ...dto,
    //       type: dto.type || 'input',
    //       requiresDocuments: dto.requiresDocuments || false,
    //     },
    //   });

    //   // ── Sync to all existing applications ────────────────────────────────────
    //   const applications = await this.prisma.application.findMany({
    //     select: { id: true },
    //   });

    //   if (applications.length > 0) {
    //     await this.prisma.applicationStep.createMany({
    //       data: applications.map((app) => ({
    //         applicationId: app.id,
    //         workflowStepId: workflowStep.id,
    //         status: 'LOCKED',
    //       })),
    //       skipDuplicates: true,
    //     });
    //   }

    //   return workflowStep;
    // }

    async create(dto: CreateWorkflowStepDto) {
      const existing = await this.prisma.workflowStep.findUnique({
        where: { position: dto.position },
      });
      if (existing)
        throw new ConflictException(
          `يوجد خطوة بالترتيب ${dto.position} بالفعل.`,
        );

      const workflowStep = await this.prisma.workflowStep.create({
        data: {
          ...dto,
          type: dto.type || 'input',
          requiresDocuments: dto.requiresDocuments || false,
        },
      });

      // ── Sync to all existing applications with correct status ─────────────
      const applications = await this.prisma.application.findMany({
        select: {
          id: true,
          steps: {
            include: {
              workflowStep: { select: { position: true } },
            },
          },
        },
      });

      if (applications.length > 0) {
        await this.prisma.applicationStep.createMany({
          data: applications.map((app) => {
            // Find the highest approved/pending position in this application
            const maxUnlockedPosition = app.steps
              .filter((s) =>
                ['APPROVED', 'PENDING', 'UNLOCKED'].includes(s.status),
              )
              .reduce((max, s) => Math.max(max, s.workflowStep.position), -1);

            // New step should be UNLOCKED only if it fits where the user currently is
            // i.e. the previous position was already approved and this position is next
            const previousStepApproved = app.steps.some(
              (s) =>
                s.workflowStep.position === workflowStep.position - 1 &&
                s.status === 'APPROVED',
            );

            const isFirstStep = workflowStep.position === 1;

            const status =
              isFirstStep || previousStepApproved ? 'UNLOCKED' : 'LOCKED';

            return {
              applicationId: app.id,
              workflowStepId: workflowStep.id,
              status,
            };
          }),
          skipDuplicates: true,
        });
      }

      return workflowStep;
    }
    // ── Update ────────────────────────────────────────────────────────────────
    async update(id: string, dto: UpdateWorkflowStepDto) {
      await this.findOne(id);

      if (dto.position !== undefined) {
        const conflict = await this.prisma.workflowStep.findFirst({
          where: { position: dto.position, NOT: { id } },
        });
        if (conflict)
          throw new ConflictException(
            `يوجد خطوة بالترتيب ${dto.position} بالفعل.`,
          );
      }

      return this.prisma.workflowStep.update({ where: { id }, data: dto });
    }

    // ── Reorder (bulk position update) ───────────────────────────────────────
    async reorder(dto: ReorderStepsDto) {
      await this.prisma.$transaction(
        dto.steps.map(({ id, position }) =>
          this.prisma.workflowStep.update({
            where: { id },
            data: { position },
          }),
        ),
      );
      return this.findAll();
    }

    // ── Delete (soft-disable) ─────────────────────────────────────────────────
    async remove(id: string) {
      await this.findOne(id);
      return this.prisma.workflowStep.update({
        where: { id },
        data: { isActive: false },
      });
    }
  }
