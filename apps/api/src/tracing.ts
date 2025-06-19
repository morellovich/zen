import { Logger } from '@nestjs/common';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { GraphQLInstrumentation } from '@opentelemetry/instrumentation-graphql';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PrismaInstrumentation } from '@prisma/instrumentation';

import { environment } from './environments/environment';

const logger = new Logger('OTLP');

if (environment.openTelemetry) {
  const resource = defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: environment.openTelemetry.serviceName,
      // [ATTR_SERVICE_VERSION]: '0.0.1',
    })
  );

  const options = environment.openTelemetry.exporters;

  //======================================================

  const sdk = new NodeSDK({
    resource,
    // traceExporter: new ConsoleSpanExporter(),
    traceExporter: new OTLPTraceExporter(options.trace),
    metricReader: new PeriodicExportingMetricReader({
      // exporter: new ConsoleMetricExporter(),
      exporter: new OTLPMetricExporter(options.meter),
      // exportIntervalMillis: 3000,
    }),
    instrumentations: [
      // getNodeAutoInstrumentations(),
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new GraphQLInstrumentation(),
      new PrismaInstrumentation(),
    ],
  });

  sdk.start();
  logger.log('Started telemetry');
}
