# Local observability stack

Brings up an OTLP collector with Grafana, Tempo (traces) and Prometheus
(metrics) for the telemetry the API emits from `apps/api/src/tracing.ts`.

```bash
docker compose -f deploy/grafana/docker-compose.yaml up -d
```

| Service   | URL                     | Purpose                          |
| --------- | ----------------------- | -------------------------------- |
| Grafana   | http://localhost:3000   | Dashboards, both datasources set  |
| Tempo     | http://localhost:3200   | Trace store                       |
| Prometheus| http://localhost:9090   | Metric store                      |
| Collector | http://localhost:4318   | OTLP/HTTP endpoint the API writes to |

The API points at the collector only, so swapping Tempo or Prometheus for
another backend is a change to `otel-collector.yaml` and never to application
config.

To view traces, open Grafana → Explore → Tempo → Search, and filter on the
`zen-api` service name. Metrics are queryable from the Prometheus datasource.

Telemetry is enabled per environment via `openTelemetry` in
`apps/api/src/environments/*`; set it to `false` to turn the SDK off entirely.
