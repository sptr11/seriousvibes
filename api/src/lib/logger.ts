const isProduction = process.env.NODE_ENV === 'production'

interface LogEntry {
  level: 'info' | 'warn' | 'error'
  msg: string
  [key: string]: unknown
}

function emit(entry: LogEntry) {
  const { level, msg, ...data } = entry
  const extra = Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : ''
  const line = isProduction
    ? JSON.stringify({ ts: new Date().toISOString(), ...entry })
    : `[${level}] ${msg}${extra}`

  if (entry.level === 'error') {
    console.error(line)
  } else {
    console.log(line)
  }
}

export const log = {
  info(msg: string, data?: Record<string, unknown>) {
    emit({ level: 'info', msg, ...data })
  },
  warn(msg: string, data?: Record<string, unknown>) {
    emit({ level: 'warn', msg, ...data })
  },
  error(msg: string, data?: Record<string, unknown>) {
    emit({ level: 'error', msg, ...data })
  },
}
