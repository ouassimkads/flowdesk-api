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
  async create(dto: CreateWorkflowStepDto) {
    const existing = await this.prisma.workflowStep.findUnique({
      where: { position: dto.position },
    });
    if (existing)
      throw new ConflictException(`يوجد خطوة بالترتيب ${dto.position} بالفعل.`);

    return this.prisma.workflowStep.create({
      data: {
        ...dto,
        type: dto.type || 'input',
        requiresDocuments: dto.requiresDocuments || false,
      },
    });
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
        this.prisma.workflowStep.update({ where: { id }, data: { position } }),
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
