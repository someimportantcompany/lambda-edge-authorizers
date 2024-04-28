interface LogMessage {
  event?: string,
  userId?: string,
  err?: Error | unknown | string,
  [key: string]: string | number | boolean | Date | any[] | Record<string, any> | unknown,
  level?: never,
}

const showDebug = process.env.LOG_DEBUG === 'true';

function formatLog(level: string, log: LogMessage): string {
  const formatted: Record<string, any> = {};

  if (log.err instanceof Error) {
    formatted.err = {
      message: typeof log.err.message === 'string' ? log.err.message : `${log.err}`,
      stack: log.err.stack?.split('\n').map(s => s.trim()),
      ...Object.fromEntries(Object.entries(log.err).filter(([key]) => key !== 'message' && key !== 'stack')),
    };
  }

  return JSON.stringify({ level, ...log, ...formatted }, safeCyclesSet());
}

/**
 * @link https://github.com/trentm/node-bunyan/blob/5c2258ecb1d33ba34bd7fbd6167e33023dc06e40/lib/bunyan.js#L1156
 */
function safeCyclesSet() {
  var seen = new Set();
  return function (_key: string, val: unknown) {
    if (!val || typeof (val) !== 'object') {
      return val;
    } else if (seen.has(val)) {
      return '[Circular]';
    } else {
      seen.add(val);
      return val;
    }
  };
}

export function debugLog(log: LogMessage): void {
  if (showDebug) {
    console.log(formatLog('debug', log));
  }
}

export function infoLog(log: LogMessage): void {
  console.log(formatLog('info', log));
}

export function warnLog(log: LogMessage): void {
  console.log(formatLog('warn', log));
}

export function errorLog(log: LogMessage): void {
  console.log(formatLog('error', log));
}
