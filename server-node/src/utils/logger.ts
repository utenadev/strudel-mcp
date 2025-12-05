import winston from 'winston'
import { v4 as uuidv4 } from 'uuid'

// Logger configuration
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      correlationId,
      ...meta
    })
  })
)

// Create structured logger
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'strudel-mcp-server',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
})

// Correlation ID management
let currentCorrelationId: string | null = null

export const setCorrelationId = (id: string) => {
  currentCorrelationId = id
}

export const generateCorrelationId = (): string => {
  const id = uuidv4()
  setCorrelationId(id)
  return id
}

export const clearCorrelationId = () => {
  currentCorrelationId = null
}

// Enhanced logging methods
export const structuredLogger = {
  info: (message: string, meta?: any) => {
    winstonLogger.info(message, {
      ...meta,
      correlationId: currentCorrelationId || generateCorrelationId()
    })
  },

  error: (message: string, error?: any, meta?: any) => {
    winstonLogger.error(message, {
      ...meta,
      error: error?.stack || error,
      correlationId: currentCorrelationId || generateCorrelationId()
    })
  },

  warn: (message: string, meta?: any) => {
    winstonLogger.warn(message, {
      ...meta,
      correlationId: currentCorrelationId || generateCorrelationId()
    })
  },

  debug: (message: string, meta?: any) => {
    winstonLogger.debug(message, {
      ...meta,
      correlationId: currentCorrelationId || generateCorrelationId()
    })
  },

  // Performance logging
  performance: (operation: string, duration: number, meta?: any) => {
    winstonLogger.info(`Performance: ${operation}`, {
      operation,
      duration,
      ...meta,
      correlationId: currentCorrelationId
    })
  },

  // Security logging
  security: (event: string, details?: any) => {
    winstonLogger.warn(`Security Event: ${event}`, {
      event,
      ...details,
      correlationId: currentCorrelationId || generateCorrelationId(),
      category: 'security'
    })
  },

  // Business logging
  business: (event: string, details?: any) => {
    winstonLogger.info(`Business Event: ${event}`, {
      event,
      ...details,
      correlationId: currentCorrelationId || generateCorrelationId(),
      category: 'business'
    })
  }
}

// Maintain backward compatibility
// Maintain backward compatibility
export const logger = structuredLogger
