import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.DATABASE_URL ??=
      'mysql://teaching_user:teaching_password@localhost:3307/teaching_management';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
        expect(body.data.status).toBe('ok');
        expect(body.error).toBeNull();
      });
  });

  it('/api/not-found (GET) should use the common error response', () => {
    return request(app.getHttpServer())
      .get('/api/not-found')
      .expect(404)
      .expect(({ body }) => {
        expect(body).toEqual({
          success: false,
          data: null,
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: expect.any(String),
          }),
        });
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
