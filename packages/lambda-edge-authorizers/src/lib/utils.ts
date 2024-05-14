import { createHash } from "crypto";

export function getCorrelationId() {
  return process.env._X_AMZN_TRACE_ID
    ? createHash('md5').update(process.env._X_AMZN_TRACE_ID).digest('hex')
    : undefined;
}

export function formatErr(err: Error | Record<string, unknown>): Record<string, unknown> {
  return {
    message: typeof err.message === 'string' ? err.message : `${err}`,
    stack: typeof err.stack === 'string' ? err.stack.split('\n').map(s => s.trim()) : undefined,
    ...Object.fromEntries(Object.entries(err).filter(([key]) => key !== 'message' && key !== 'stack')),
  };
}

export function jsonStringify(value: unknown): string {
  /**
   * @link https://github.com/trentm/node-bunyan/blob/5c2258ecb1d33ba34bd7fbd6167e33023dc06e40/lib/bunyan.js#L1156
   */
  const seen = new Set();
  const safeCyclesSet = function (_key: string, val: unknown) {
    if (!val || typeof (val) !== 'object') {
      return val;
    } else if (seen.has(val)) {
      return '[Circular]';
    } else {
      seen.add(val);
      return val;
    }
  };

  return JSON.stringify(value, safeCyclesSet);
}
