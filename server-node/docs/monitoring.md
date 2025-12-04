# Monitoring and Observability Guide

This guide covers the monitoring and observability features of the Strudel MCP server, including logging, health checks, metrics collection, alerting, debugging, and error tracking.

## Table of Contents

- [Overview](#overview)
- [Logging](#logging)
- [Health Checks](#health-checks)
- [Metrics Collection](#metrics-collection)
- [Alerting](#alerting)
- [Debugging](#debugging)
- [Error Tracking](#error-tracking)
- [Monitoring Dashboard](#monitoring-dashboard)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Overview

The Strudel MCP server provides comprehensive monitoring and observability features for production operations, including:

- **Structured Logging**: Winston-based logging with correlation IDs
- **Health Checks**: RESTful endpoints for system health monitoring
- **Metrics Collection**: Prometheus-compatible metrics with custom collectors
- **Alerting**: Multi-channel alerting system with configurable thresholds
- **Debugging**: Advanced debugging with request tracing and performance profiling
- **Error Tracking**: Enhanced error tracking with grouping and analytics

## Logging

### Structured Logging

The server uses Winston for structured logging with JSON format output.

**Features**:
- Correlation ID tracking across requests
- Log levels: INFO, WARN, ERROR, DEBUG
- Multiple output channels: Console, File, API
- Log rotation and retention policies
- Context enrichment with metadata

### Logging Configuration

```typescript
import { structuredLogger } from '../utils/logger'

// Basic logging
structuredLogger.info('Server started', { port: 8081, mode: 'production' })
structuredLogger.warn('High memory usage detected', { usage: '85%' })
structuredLogger.error('Database connection failed', error)

// Performance logging
structuredLogger.performance('pattern_execution', 150, { pattern: 's("bd hh")' })

// Security logging
structuredLogger.security('dangerous_code_blocked', { 
  pattern: 'require("fs")',
  user: 'anonymous'
})

// Business logging
structuredLogger.business('pattern_executed', { 
  pattern: 's("bd hh")',
  success: true
})
```

### Log Levels

- **INFO**: General information and successful operations
- **WARN**: Warning conditions and deprecation notices
- **ERROR**: Error conditions and failed operations
- **DEBUG**: Detailed debugging information

### Log Format

Logs are structured in JSON format:

```json
{
  "timestamp": "2025-10-31T22:30:00.000Z",
  "level": "info",
  "message": "Server started",
  "service": "strudel-mcp-server",
  "version": "1.0.0",
  "correlationId": "uuid-generated-id",
  "port": 8081,
  "mode": "production"
}
```

### Log Files

Logs are written to files in the `logs/` directory:

- `logs/combined.log`: All log entries
- `logs/error.log`: Error-level logs only
- Files are rotated when they reach 5MB
- Maximum 5 rotated files are kept

## Health Checks

### Health Check Endpoints

The server provides several health check endpoints:

#### `/health`
Main health check endpoint that returns overall system health.

```bash
curl http://localhost:8081/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-31T22:30:00.000Z",
  "uptime": 3600000,
  "version": "1.0.0",
  "checks": {
    "database": { "status": "pass", "responseTime": 10 },
    "websocket": { "status": "pass", "responseTime": 5 },
    "memory": { "status": "pass", "responseTime": 15 },
    "cpu": { "status": "pass", "responseTime": 12 },
    "disk": { "status": "pass", "responseTime": 8 }
  },
  "metrics": {
    "activeConnections": 25,
    "totalRequests": 15000,
    "errorRate": 0.02,
    "avgResponseTime": 45
  }
}
```

#### `/liveness`
Kubernetes liveness probe endpoint.

```bash
curl http://localhost:8081/liveness
```

#### `/readiness`
Kubernetes readiness probe endpoint.

```bash
curl http://localhost:8081/readiness
```

### Health Check Components

The health check monitors:

1. **Database**: Connection and query performance
2. **WebSocket Server**: Active connections and message throughput
3. **Memory**: Heap usage and available memory
4. **CPU**: Processor utilization
5. **Disk**: Available disk space

### Health Status Levels

- **healthy**: All checks passing
- **degraded**: Some checks with warnings
- **unhealthy**: Critical checks failing

## Metrics Collection

### Prometheus Metrics

The server exposes Prometheus-compatible metrics:

#### Endpoint: `/metrics`

```bash
curl http://localhost:8081/metrics
```

### Available Metrics

#### Request Metrics
- `mcp_requests_total`: Total MCP requests by tool and status
- `mcp_request_duration_seconds`: Request duration histogram

#### WebSocket Metrics
- `websocket_connections_current`: Current active connections
- `websocket_connections_total`: Total connections by status

#### System Metrics
- `memory_usage_bytes`: Memory usage by type (heapUsed, heapTotal, rss, external)
- `cpu_usage_percent`: CPU usage by type (user, system)
- `system_uptime_seconds`: System uptime

#### Pattern Execution Metrics
- `pattern_executions_total`: Total pattern executions by status
- `pattern_execution_duration_seconds`: Pattern execution duration

#### Knowledge Base Metrics
- `knowledge_queries_total`: Total knowledge queries by topic and status

#### Security Metrics
- `security_events_total`: Security events by type

### Custom Metrics

Create custom metrics programmatically:

```typescript
import { getErrorTracker } from '../monitoring/error-tracking'

// Create a custom metric
const customCounter = metricsCollector.createCustomMetric(
  'custom_operations_total',
  'Total number of custom operations',
  'counter'
)

// Increment the metric
customCounter.inc()
```

## Alerting

### Alert Configuration

Alerting is configured through environment variables and configuration files.

```typescript
const alertConfig = {
  enabled: true,
  thresholds: {
    errorRate: 0.05,      // 5%
    responseTime: 1000,    // 1 second
    memoryUsage: 0.9,     // 90%
    cpuUsage: 0.8,        // 80%
    websocketConnections: 100
  },
  channels: {
    console: true,
    webhook: false,
    email: false
  }
}
```

### Alert Types

#### System Health Alerts
- **Critical**: System unhealthy
- **Warning**: System degraded
- **Info**: System status changes

#### Performance Alerts
- **Error**: High error rate (>5%)
- **Warning**: High response time (>1s)
- **Error**: High memory usage (>90%)
- **Warning**: High CPU usage (>80%)

#### Security Alerts
- **Error**: Security violations and blocked code
- **Warning**: Suspicious activity

#### Operational Alerts
- **Info**: High connection count
- **Error**: Service unavailable

### Alert Channels

#### Console Alerts
Alerts are logged to the console with structured formatting.

#### Webhook Alerts
Alerts can be sent to external webhook endpoints:

```typescript
const webhookConfig = {
  url: 'https://hooks.slack.com/services/...',
  timeout: 5000,
  retries: 3
}
```

#### Email Alerts
Alerts can be sent via email (requires SMTP configuration):

```typescript
const emailConfig = {
  smtp: {
    host: 'smtp.example.com',
    port: 587,
    secure: true,
    auth: {
      user: 'alerts@example.com',
      pass: 'password'
    }
  },
  from: 'alerts@strudel-mcp.com',
  to: ['admin@example.com']
}
```

## Debugging

### Enhanced Debug Mode

The server provides enhanced debugging capabilities with configurable levels.

### Debug Configuration

```typescript
const debugConfig = {
  enabled: true,
  level: 'detailed', // 'basic', 'detailed', 'verbose'
  features: {
    requestTracing: true,
    performanceProfiling: true,
    memoryProfiling: true,
    stackTraces: true,
    sqlQueryLogging: false,
    webSocketLogging: true,
    corsLogging: false,
    errorStackTraces: true,
    heapDumping: true
  },
  output: {
    console: true,
    file: true,
    api: false
  }
}
```

### Debug Features

#### Request Tracing
Full request lifecycle tracking with correlation IDs.

#### Performance Profiling
Function-level performance profiling with memory tracking.

#### Memory Profiling
Heap usage tracking and memory leak detection.

#### Stack Traces
Detailed stack traces for debugging.

#### WebSocket Logging
WebSocket message and connection logging.

### Debug Endpoints

#### `/api/debug/system`
System debug information.

```bash
curl http://localhost:8081/api/debug/system
```

#### `/api/debug/requests`
Recent debug requests.

```bash
curl http://localhost:8081/api/debug/requests
```

#### `/api/debug/profiles`
Performance profiling data.

```bash
curl http://localhost:8081/api/debug/profiles
```

#### `/api/debug/heap`
Heap dump information.

```bash
curl http://localhost:8081/api/debug/heap
```

### Debug Profile Decorator

Add performance profiling to functions:

```typescript
import { debugProfile } from '../monitoring/debug'

export class StrudelService {
  @debugProfile('execute_pattern')
  async executePattern(code: string): Promise<any> {
    // Function is automatically profiled
    return await this.executeCode(code)
  }
}
```

## Error Tracking

### Enhanced Error Tracking

The server provides comprehensive error tracking with grouping and analytics.

### Error Tracking Features

#### Error Grouping
Errors are grouped by component and type for better organization.

#### Occurrence Tracking
Track how often specific errors occur.

#### Context Enrichment
Rich context information for better debugging.

#### Tagging System
Automatic and manual error tagging.

### Error Types

- **system**: System-level errors
- **user**: User input validation errors
- **network**: Network communication errors
- **security**: Security violations and blocked code
- **performance**: Performance-related errors
- **business**: Business logic errors

### Error Tracking Configuration

```typescript
const trackingConfig = {
  enabled: true,
  maxEvents: 1000,
  maxGroups: 100,
  groupByComponent: true,
  groupByType: false,
  autoResolve: false,
  trackOccurrences: true,
  includeStackTrace: true,
  sendToExternal: false
}
```

### Error Tracking Usage

#### Manual Error Tracking
```typescript
import { getErrorTracker } from '../monitoring/error-tracking'

const errorTracker = getErrorTracker()

// Track different types of errors
errorTracker.trackSystemError('database', 'Connection failed', error)
errorTracker.trackUserError('validation', 'Invalid pattern syntax', error)
errorTracker.trackSecurityError('security', 'Dangerous code blocked', error)
```

#### Automatic Error Tracking
```typescript
import { trackError } from '../monitoring/error-tracking'

try {
  await riskyOperation()
} catch (error) {
  trackError(error, 'system', 'database', { query: 'SELECT * FROM...' })
}
```

#### Error Tracking Decorator
```typescript
import { trackError } from '../monitoring/error-tracking'

export class DatabaseService {
  @trackError('system', 'database')
  async query(sql: string): Promise<any> {
    // Errors are automatically tracked
    return await this.execute(sql)
  }
}
```

### Error Analytics

Get error statistics and trends:

```typescript
import { getErrorTracker } from '../monitoring/error-tracking'

const errorTracker = getErrorTracker()

// Get error statistics
const stats = errorTracker.getErrorStatistics()

// Get recent errors
const recentErrors = errorTracker.getRecentErrors(50)

// Get error groups
const groups = errorTracker.getErrorGroups()

// Get error trends
const trends = errorTracker.getErrorTrends('day')
```

## Monitoring Dashboard

### Web Dashboard

The server provides a web-based monitoring dashboard at `/dashboard`.

#### Dashboard Features

- **Overview**: System status and key metrics
- **Metrics**: Real-time performance metrics
- **Health**: System health check status
- **Alerts**: Active alerts and notifications
- **Recent Activity**: Recent requests and errors

#### Accessing the Dashboard

```bash
# Web interface
http://localhost:8081/dashboard

# API data
http://localhost:8081/api/dashboard
```

### Dashboard Components

#### Overview Section
- System status indicator
- Uptime and version information
- Quick status summary

#### Metrics Section
- Request metrics (total, success, error, rate)
- WebSocket metrics (active, total)
- System metrics (memory, CPU, uptime)
- Performance metrics (response time, throughput)

#### Health Section
- Overall health status
- Individual check results
- Check response times
- Health check details

#### Alerts Section
- Active alerts list
- Alert severity and timestamp
- Alert acknowledgment
- Real-time alert updates

## Configuration

### Environment Variables

```bash
# Logging
LOG_LEVEL=info
DEBUG=false

# Health Checks
HEALTH_CHECKS_ENABLED=true

# Metrics
METRICS_ENABLED=true
METRICS_PORT=9090

# Alerting
ALERTS_ENABLED=true
ALERTS_CONSOLE=true
ALERTS_WEBHOOK=false
ALERTS_EMAIL=false

# Debugging
DEBUG_ENABLED=false
DEBUG_LEVEL=basic
```

### Configuration Files

#### Server Configuration
```typescript
// src/config/monitoring.ts
export const monitoringConfig = {
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    debug: process.env.DEBUG === 'true'
  },
  health: {
    enabled: process.env.HEALTH_CHECKS_ENABLED === 'true',
    interval: 30000
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    port: parseInt(process.env.METRICS_PORT || '9090')
  },
  alerts: {
    enabled: process.env.ALERTS_ENABLED === 'true',
    thresholds: {
      errorRate: 0.05,
      memoryUsage: 0.9,
      cpuUsage: 0.8
    }
  }
}
```

## Troubleshooting

### Common Issues

#### Monitoring Not Working
1. Check if monitoring is enabled: `DEBUG=true`
2. Verify configuration files
3. Check log files for errors

#### Metrics Not Exporting
1. Ensure metrics are enabled: `METRICS_ENABLED=true`
2. Check metrics port availability
3. Verify Prometheus configuration

#### Alerts Not Triggering
1. Check alert thresholds
2. Verify alert channels configuration
3. Check alert manager logs

#### Debug Mode Issues
1. Check debug configuration
2. Verify debug level
3. Check debug middleware installation

### Health Check Failures

#### Database Health Check
- Verify database connection
- Check response time
- Check database logs

#### WebSocket Health Check
- Verify WebSocket server is running
- Check connection count
- Check message processing

#### Memory Health Check
- Monitor memory usage trends
- Check for memory leaks
- Verify garbage collection

### Performance Issues

#### High Response Time
- Check CPU usage
- Profile slow functions
- Analyze metrics data

#### High Memory Usage
- Check for memory leaks
- Profile memory allocation
- Monitor heap usage

### Debug Information

#### Enable Verbose Logging
```bash
DEBUG=true LOG_LEVEL=debug npm run dev
```

#### Check System Information
```bash
curl http://localhost:8081/api/debug/system
```

#### Review Error History
```bash
curl http://localhost:8081/api/debug/requests
```

#### Analyze Performance Profiles
```bash
curl http://localhost:8081/api/debug/profiles
```

## Best Practices

### Logging Best Practices
- Use structured logging with correlation IDs
- Log at appropriate levels
- Include relevant context
- Avoid logging sensitive data

### Health Checks Best Practices
- Implement comprehensive health checks
- Use appropriate timeouts
- Provide meaningful status messages
- Monitor check performance

### Metrics Best Practices
- Use Prometheus-compatible metrics
- Include relevant labels
- Track key business metrics
- Monitor metric cardinality

### Alerting Best Practices
- Set appropriate thresholds
- Use multiple alert channels
- Avoid alert fatigue
- Include actionable information

### Debugging Best Practices
- Use request tracing
- Profile performance bottlenecks
- Capture sufficient context
- Implement timeout handling
- Validate debugging output

This comprehensive monitoring and observability system provides the foundation for production operations and troubleshooting of the Strudel MCP server.
