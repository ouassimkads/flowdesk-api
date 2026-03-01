import { Module } from '@nestjs/common';
import { WorkflowStepsService } from './workflow-steps.service';
import { WorkflowStepsController } from './workflow-steps.controller';

@Module({
  providers: [WorkflowStepsService],
  controllers: [WorkflowStepsController],
  exports: [WorkflowStepsService],
})
export class WorkflowStepsModule {}
