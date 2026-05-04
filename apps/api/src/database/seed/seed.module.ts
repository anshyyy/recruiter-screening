import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../../modules/jobs/entities/job.entity';
import { SeedService } from './seed.service';
import { JobsSeeder } from './seeders/jobs.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  providers: [JobsSeeder, SeedService],
})
export class SeedModule {}
