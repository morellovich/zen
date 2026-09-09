/**
 * OpenTelemetry bootstrap.
 *
 * This module must be imported before anything else in `main.ts`: the SDK
 * patches the modules it instruments at require time, so any module loaded
 * ahead of `sdk.start()` is never instrumented.
 *
 * @see `deploy/README_OTLP.md`
 */
import FastifyOtelInstrumentation from '@fastify/otel';
import { Logger } from '@nestjs/common';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { GraphQLInstrumentation } from '@opentelemetry/instrumentation-graphql';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { PrismaInstrumentation } from '@prisma/instrumentation';

import { environment } from './environments/environment';

const logger = new Logger('OTLP');

if (environment.openTelemetry) {
  const resource = defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: environment.openTelemetry.serviceName,
    })
  );

  const options = environment.openTelemetry.exporters;

  const sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter(options.trace),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(options.meter),
    }),
    instrumentations: [
      new HttpInstrumentation(),
      // Fastify, not Express: the API runs on `@nestjs/platform-fastify`.
      // `@fastify/otel` is the official replacement for the now-deprecated
      // `@opentelemetry/instrumentation-fastify`.
      new FastifyOtelInstrumentation({ registerOnInitialization: true }),
      new GraphQLInstrumentation(),
      new PrismaInstrumentation(),
    ],
  });

  sdk.start();
  logger.log(`Started telemetry for '${environment.openTelemetry.serviceName}'`);

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => logger.log('Telemetry terminated'))
      .catch(error => logger.error(error));
  });
}
