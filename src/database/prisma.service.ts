import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../generated/prisma/client';

type MariaDbPoolConfig = Exclude<
  ConstructorParameters<typeof PrismaMariaDb>[0],
  string
>;

function createMariaDbPoolConfig(databaseUrl: string): MariaDbPoolConfig {
  const url = new URL(databaseUrl);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    allowPublicKeyRetrieval: true,
  };
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const adapter = new PrismaMariaDb(
      createMariaDbPoolConfig(configService.getOrThrow<string>('DATABASE_URL')),
    );

    super({ adapter });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
