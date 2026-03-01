import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { AuditModule } from '../audit/audit.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/audit/audit.service';

@Module({
  imports: [AuditModule],
  providers: [DocumentsService, PrismaService, AuditService],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
