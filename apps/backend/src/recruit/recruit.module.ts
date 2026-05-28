import { Module } from '@nestjs/common';
import { JobsModule } from './jobs/jobs.module';
import { CandidatesModule } from './candidates/candidates.module';
import { InterviewsModule } from './interviews/interviews.module';

@Module({
  imports: [JobsModule, CandidatesModule, InterviewsModule],
})
export class RecruitModule {}
