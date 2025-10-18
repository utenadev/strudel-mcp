export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 8081,
  host: process.env.HOST || 'localhost',
  env: process.env.NODE_ENV || 'development',
  debug: process.env.DEBUG === 'true'
}
