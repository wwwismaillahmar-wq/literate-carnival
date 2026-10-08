export class PlatformError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}

export function toPlatformError(error: unknown): PlatformError {
  if (error instanceof PlatformError) return error;
  if (error instanceof Error) return new PlatformError(error.message, 'INTERNAL_ERROR');
  return new PlatformError('Unexpected platform error', 'INTERNAL_ERROR');
}
