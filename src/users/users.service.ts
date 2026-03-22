import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarColor: true,
  createdAt: true,
  updatedAt: true,
  nationalNumber: true,
  personalAdress: true,
  workAdress: true,
  academicLevel: true,
  phoneNumber: true,
};



@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ── All applicants (admin) ──────────────────────────────────────────────────
  async findAllApplicants() {
    return this.prisma.user.findMany({
      where: { role: 'APPLICANT' },
      select: {
        ...USER_SELECT,
        application: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            steps: {
              select: {
                id: true,
                status: true,
                workflowStep: { select: { id: true, label: true, icon: true, position: true } },
              },
              orderBy: { workflowStep: { position: 'asc' } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Single user ────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_SELECT,
        application: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            steps: {
              select: {
                id: true,
                status: true,
                rejectionReason: true,
                adminNote: true,
                unlockedAt: true,
                submittedAt: true,
                reviewedAt: true,
                workflowStep: { select: { id: true, label: true, description: true, icon: true, position: true } },
                documents: {
                  where: { isDeleted: false },
                  select: { id: true, filename: true, mimeType: true, sizeBytes: true, uploadedAt: true },
                },
              },
              orderBy: { workflowStep: { position: 'asc' } },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('المستخدم غير موجود.');
    return user;
  }
}
