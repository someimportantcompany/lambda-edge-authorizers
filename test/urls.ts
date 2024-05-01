import { stringify } from "qs";

export function concatUrl(parts: string[], query?: Record<string, string | number | boolean | undefined>): string {
  return `${parts.join('')}${query ? `?${stringify(query)}` : ''}`;
}
