import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('البريد الإلكتروني مستخدم بالفعل.');

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        avatarColor: dto.avatarColor ?? '#6366F1',
        phoneNumber: dto.phoneNumber,
        academicLevel: dto.academicLevel,
        personalAdress: dto.personalAdress,
        workAdress: dto.workAdress,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarColor: true,
        createdAt: true,
      },
    });

    // Create application + step rows for the new applicant
    await this.initializeApplication(user.id);

    const token = await this.signToken(user.id, user.email, user.role);
    return { user, accessToken: token };
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة.');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة.');

    const { password, ...safeUser } = user;
    const token = await this.signToken(user.id, user.email, user.role);
    return { user: safeUser, accessToken: token };
  }

  // ── Me ────────────────────────────────────────────────────────────────────
  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, avatarColor: true, createdAt: true },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private async signToken(userId: string, email: string, role: string) {
    return this.jwt.signAsync({ sub: userId, email, role });
  }

  private async initializeApplication(userId: string) {
    const steps = await this.prisma.workflowStep.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
    });

    if (steps.length === 0) return;

    await this.prisma.application.create({
      data: {
        applicantId: userId,
        steps: {
          create: steps.map((step, i) => ({
            workflowStepId: step.id,
            status: i === 0 ? 'UNLOCKED' : 'LOCKED',
            unlockedAt: i === 0 ? new Date() : null,
          })),
        },
      },
    });
  }
}
