import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpApiExceptionFilter } from './../src/common/filters/http-api-exception.filter';
import { TransformResponseInterceptor } from './../src/common/interceptors/transform-response.interceptor';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpApiExceptionFilter());
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    await app.init();
  });

  it('/api (GET) returns envelope', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          success: true,
          error: null,
          data: 'Hello World!',
        });
        expect(typeof res.body.message).toBe('string');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
