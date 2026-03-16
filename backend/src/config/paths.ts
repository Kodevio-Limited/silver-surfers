import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

export const backendRoot = path.resolve(configDirectory, '..', '..');

export function resolveBackendPath(...segments: string[]): string {
  return path.resolve(backendRoot, ...segments);
}
