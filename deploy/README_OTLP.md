# OpenTelemetry

The API is instrumented with OpenTelemetry. `apps/api/src/tracing.ts` starts the
SDK and must remain the very first import in `main.ts` — instrumentation patches
modules as they load, so anything imported before `sdk.start()` is never traced.

Instrumented: HTTP, Fastify (via `@fastify/otel`, the official replacement for
the deprecated `@opentelemetry/instrumentation-fastify`), GraphQL and Prisma.

## Configuration

Per environment, in `apps/api/src/environments/*`:

```ts
export const environment: EnvironmentBase = {
  // ...
  openTelemetry: {
    serviceName: 'zen-api',
    exporters: {
      trace: { url: 'http://localhost:4318/v1/traces' },
      meter: { url: 'http://localhost:4318/v1/metrics' },
    },
  },
};
```

Set `openTelemetry: false` to disable the SDK; nothing is started and no
exporter connections are attempted.

## Running a backend locally

See `deploy/grafana/` for a Grafana + Tempo + Prometheus stack behind an OTLP
collector:

```bash
docker compose -f deploy/grafana/docker-compose.yaml up -d
```
