import type { Result } from '../contracts';
export const notImplemented = <T,>(phase: 2 | 3 | 4 | 5, feature: string): Result<T> => ({
  status: 'unavailable', reason: { code: 'not-implemented', phase, message: `${feature} is not implemented yet. Planned for Phase ${phase}.` },
});
