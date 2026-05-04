import { EmploymentType } from '../../../modules/jobs/enums/employment-type.enum';

/** Plain rows used to build `Job` entities during seeding (no DB-generated fields). */
export type JobSeedRecord = {
  title: string;
  company: string;
  location: string | null;
  description: string;
  employmentType: EmploymentType;
};

export const JOB_SEED_RECORDS: readonly JobSeedRecord[] = [
  {
    title: 'Senior Full-Stack Engineer',
    company: 'Northwind Labs',
    location: 'Remote (US)',
    description:
      'Own features across NestJS services and React clients. Strong TypeScript, Postgres, and testing culture.',
    employmentType: EmploymentType.FULL_TIME,
  },
  {
    title: 'Platform Engineer',
    company: 'Blue River Systems',
    location: 'Austin, TX',
    description: 'Kubernetes, Terraform, and observability. Help us scale multi-tenant workloads safely.',
    employmentType: EmploymentType.FULL_TIME,
  },
  {
    title: 'Product Designer',
    company: 'Cedar & Co.',
    location: 'Remote (EU)',
    description: 'End-to-end product design for hiring workflows. Portfolio with complex web apps required.',
    employmentType: EmploymentType.CONTRACT,
  },
  {
    title: 'Data Analyst',
    company: 'Summit Analytics',
    location: 'Toronto, ON',
    description: 'SQL, dashboards, and stakeholder storytelling. Experience with recruitment funnels is a plus.',
    employmentType: EmploymentType.FULL_TIME,
  },
  {
    title: 'Engineering Manager',
    company: 'Harbor Tech',
    location: 'New York, NY',
    description: 'Lead a team of 6–8 engineers. Prior experience with B2B SaaS and performance reviews.',
    employmentType: EmploymentType.FULL_TIME,
  },
  {
    title: 'DevRel Engineer',
    company: 'OpenSpan',
    location: 'Remote (Global)',
    description: 'Docs, sample apps, and conference talks for an API-first hiring platform.',
    employmentType: EmploymentType.FULL_TIME,
  },
];
