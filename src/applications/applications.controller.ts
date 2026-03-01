import {
  Controller, Get, Post, Patch,
  Param, Body, Query, UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { ApproveStepDto, RejectStepDto, SubmitStepDto } from './dto/application.dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { GetUser, Roles } from '../common/decorators';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private service: ApplicationsService) {}

  // ── Admin endpoints ────────────────────────────────────────────────────────

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all applications (Admin)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['IN_PROGRESS', 'COMPLETE', 'REJECTED'],
  })
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get dashboard stats (Admin)' })
  getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get single application by ID (Admin)' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/steps/:stepId/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Approve a step — unlocks next step for applicant (Admin)',
  })
  approveStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: ApproveStepDto,
    @GetUser('id') adminId: string,
  ) {
    return this.service.approveStep(id, stepId, dto, adminId);
  }

  @Patch(':id/steps/:stepId/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reject a step — resets it for re-upload (Admin)' })
  rejectStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() dto: RejectStepDto,
    @GetUser('id') adminId: string,
  ) {
    return this.service.rejectStep(id, stepId, dto, adminId);
  }

  // ── Applicant endpoints ────────────────────────────────────────────────────

  @Get('mine/application')
  @ApiOperation({ summary: 'Get my application with all steps (Applicant)' })
  findMine(@GetUser('id') userId: string) {
    return this.service.findMine(userId);
  }

  // @Post('mine/steps/:stepId/submit')
  // @ApiOperation({ summary: 'Submit a step for review after uploading documents (Applicant)' })
  // submitStep(
  //   @Param('stepId') stepId: string,
  //   @GetUser('id') userId: string,
  // ) {
  //   // Resolve applicationId from user's own application
  //   return this.service.findMine(userId).then(app =>
  //     this.service.submitStep(app.id, stepId, userId),
  //   );
  // }
  @Post('mine/steps/:stepId/submit')
  @ApiOperation({ summary: 'Submit a step for review (Applicant)' })
  submitStep(
    @Param('stepId') stepId: string,
    @Body() dto: SubmitStepDto,
    @GetUser('id') userId: string,
  ) {
    return this.service
      .findMine(userId)
      .then((app) => this.service.submitStep(app.id, stepId, userId, dto));
  }
}
