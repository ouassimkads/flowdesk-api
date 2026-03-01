import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '../../generated/client'
interface LogDto {
  action: AuditAction;
  adminId?: string;
  applicationId?: string;
  applicationStepId?: string;
  note?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(dto: LogDto) {
    return this.prisma.auditLog.create({ data: dto });
  }

  async findByApplication(applicationId: string) {
    return this.prisma.auditLog.findMany({
      where: { applicationId },
      include: {
        admin: { select: { id: true, name: true, email: true } },
        applicationStep: {
          include: { workflowStep: { select: { label: true, icon: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(limit = 50) {
    return this.prisma.auditLog.findMany({
      include: {
        admin: { select: { id: true, name: true } },
        application: { include: { applicant: { select: { name: true, email: true } } } },
        applicationStep: {
          include: { workflowStep: { select: { label: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
