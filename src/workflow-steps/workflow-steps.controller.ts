import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkflowStepsService } from './workflow-steps.service';
import {
  CreateWorkflowStepDto,
  UpdateWorkflowStepDto,
  ReorderStepsDto,
} from './dto/workflow-step.dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';

@ApiTags('Workflow Steps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflow-steps')
export class WorkflowStepsController {
  constructor(private service: WorkflowStepsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all workflow steps (visible to all authenticated users)' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Query('includeInactive') includeInactive?: boolean) {
    return this.service.findAll(includeInactive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single workflow step' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new workflow step (Admin)' })
  create(@Body() dto: CreateWorkflowStepDto) {
    return this.service.create(dto);
  }

  @Patch('reorder')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reorder workflow steps (Admin)' })
  reorder(@Body() dto: ReorderStepsDto) {
    return this.service.reorder(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a workflow step (Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkflowStepDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Soft-delete (disable) a workflow step (Admin)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
