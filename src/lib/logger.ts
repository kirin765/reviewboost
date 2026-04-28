type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMeta = Record<string, unknown>;

function emit(level: LogLevel, msg: string, meta?: LogMeta): void {
  const entry = { level, msg, ts: new Date().toISOString(), ...meta };
  if (level === 'error') console.error(JSON.stringify(entry));
  else if (level === 'warn') console.warn(JSON.stringify(entry));
  else if (process.env.LOG_LEVEL !== 'silent') console.log(JSON.stringify(entry));
}

export const logger = {
  debug: (msg: string, meta?: LogMeta) => emit('debug', msg, meta),
  info:  (msg: string, meta?: LogMeta) => emit('info', msg, meta),
  warn:  (msg: string, meta?: LogMeta) => emit('warn', msg, meta),
  error: (msg: string, meta?: LogMeta) => emit('error', msg, meta),
};
