/**
 * One-off entrypoint: boots the Nest application context so `SeedService` runs
 * (`OnModuleInit`), then exits. Same seed logic as starting the HTTP server.
 *
 * Run from `apps/api`: `pnpm run seed` (builds first, then executes compiled output).
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';

async function main(): Promise<void> {
  const ctx = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  await ctx.close();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
