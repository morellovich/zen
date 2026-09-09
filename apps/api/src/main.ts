import helmet from '@fastify/helmet';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import processRequest from 'graphql-upload/processRequest.mjs';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

const logger = new Logger('NestApplication');

async function bootstrap() {
  const adapter = new FastifyAdapter();
  const fastify = adapter.getInstance();

  fastify.addContentTypeParser(
    /^multipart\//,
    (request: any, payload: any, done: (err: Error | null) => void) => {
      (request as unknown as { isMultipart?: boolean }).isMultipart = true;
      done(null);
    }
  );

  fastify.addHook('preValidation', async (request: any, reply) => {
    if (!request.raw.isMultipart && !request.isMultipart) {
      return;
    }
    request.body = await processRequest(request.raw, reply.raw, environment.graphql.uploads);
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    cors: environment.cors,
  });
  app.enableShutdownHooks();

  if (environment.helmet) {
    if (typeof environment.helmet === 'object')
      await app.register(helmet as any, environment.helmet as any);
    else await app.register(helmet as any);
    logger.log('Using helmet');
  }

  const port = process.env.PORT || environment.port || environment.expressPort || 7080;

  await app.listen(port, '0.0.0.0');
  logger.log(`GraphQL server running at http://localhost:${port}/graphql`);
}

bootstrap().catch(error => {
  logger.error(error);
  process.exit(1);
});
