const isProd = process.env.NODE_ENV === 'production';

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    if (!isProd) console.log(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    if (!isProd) console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, error?: unknown) => {
    const detail = error instanceof Error ? { message: error.message } : undefined;
    console.error(`[ERROR] ${message}`, detail ?? '');
  },
};
