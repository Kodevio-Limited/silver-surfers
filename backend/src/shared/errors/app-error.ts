export class AppError extends Error {
  readonly statusCode: number;
  readonly expose: boolean;
  readonly details?: unknown;

  constructor(message: string, statusCode = 500, options?: { expose?: boolean; details?: unknown }) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.expose = options?.expose ?? statusCode < 500;
    this.details = options?.details;
  }
}
