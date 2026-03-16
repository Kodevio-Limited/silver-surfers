import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { resolveBackendPath } from '../../config/paths.ts';
import { AppError } from '../../shared/errors/app-error.ts';

const tempRootPath = path.resolve(os.tmpdir());
const allowedRoots = [
  resolveBackendPath('reports'),
  resolveBackendPath('reports-full'),
  resolveBackendPath('reports-lite'),
  tempRootPath,
];

function isInsideRoot(targetPath: string, rootPath: string): boolean {
  const relative = path.relative(rootPath, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function isManagedTempCleanupPath(targetPath: string): boolean {
  const directoryName = path.basename(targetPath);
  return directoryName.startsWith('silver-surfers') || directoryName.startsWith('report-');
}

export function assertAllowedCleanupPath(folderPath: string): string {
  const resolvedPath = path.resolve(folderPath);
  const matchedRoot = allowedRoots.find((root) => isInsideRoot(resolvedPath, root));

  if (!matchedRoot) {
    throw new AppError('Cleanup path is not allowed.', 400);
  }

  if (resolvedPath === matchedRoot) {
    throw new AppError('Cleanup root deletion is not allowed.', 400);
  }

  if (matchedRoot === tempRootPath && !isManagedTempCleanupPath(resolvedPath)) {
    throw new AppError('Cleanup path is not a managed temp directory.', 400);
  }

  return resolvedPath;
}

export async function cleanupFolder(folderPath: string): Promise<{ cleanedPath: string }> {
  const resolvedPath = assertAllowedCleanupPath(folderPath);
  const stats = await fs.stat(resolvedPath).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  });

  if (stats && !stats.isDirectory()) {
    throw new AppError('Cleanup path must be a directory.', 400);
  }

  await fs.rm(resolvedPath, { recursive: true, force: true });
  return { cleanedPath: resolvedPath };
}
