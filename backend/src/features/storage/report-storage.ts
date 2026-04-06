import fs from 'node:fs';
import path from 'node:path';

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface StorageFileInput {
  filename?: string;
  path: string;
  size?: number;
  sizeMB?: string;
}

export interface StorageUploadOptions {
  prefix?: string;
  folderPath?: string;
  recipientEmail?: string;
  kind?: string;
}

interface S3Config {
  bucket?: string;
  region?: string;
  endpoint?: string;
  forcePathStyle: boolean;
  urlMode: 'object' | 'signed';
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  serverSideEncryption?: string;
  signedUrlExpiresInSeconds: number;
}

export interface UploadedStorageFile {
  filename: string;
  key: string;
  size?: number;
  sizeMB?: string;
  downloadUrl: string;
  providerUrl: string;
}

export interface S3UploadResult {
  provider: 's3';
  bucket: string;
  region: string;
  prefix: string;
  urlMode: 'object' | 'signed';
  signedUrlExpiresInSeconds: number;
  uploadedFiles: UploadedStorageFile[];
  objectCount: number;
}

export function isS3Configured(source: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(source.AWS_S3_BUCKET?.trim() && source.AWS_REGION?.trim());
}

export function sanitizeStoragePathSegment(value: string, fallback = 'unknown'): string {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return normalized || fallback;
}

export function sanitizeStorageObjectPath(value: string): string {
  return String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((segment) => sanitizeStoragePathSegment(segment, 'file'))
    .join('/');
}

export function sanitizeStorageFileName(value: string, fallback = 'file'): string {
  const normalizedValue = String(value || '').replace(/\\/g, '/');
  const parsed = path.posix.parse(path.posix.basename(normalizedValue));
  const name = sanitizeStoragePathSegment(parsed.name, fallback);
  const extension = parsed.ext
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '');

  return `${name}${extension}`;
}

export function buildStoragePrefix({
  basePrefix = process.env.AWS_S3_PREFIX || 'silver-surfers',
  folderPath = '',
  recipientEmail = '',
  kind = 'reports',
  timestamp = new Date(),
}: {
  basePrefix?: string;
  folderPath?: string;
  recipientEmail?: string;
  kind?: string;
  timestamp?: Date;
}): string {
  const year = String(timestamp.getUTCFullYear());
  const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getUTCDate()).padStart(2, '0');
  const emailSegment = sanitizeStoragePathSegment(recipientEmail.replace('@', '-at-') || 'anonymous');
  const folderSegment = sanitizeStoragePathSegment(path.basename(folderPath || kind), kind);
  const prefixRoot = sanitizeStorageObjectPath(basePrefix) || 'silver-surfers';

  return [prefixRoot, kind, year, month, day, emailSegment, folderSegment]
    .filter(Boolean)
    .join('/');
}

export function buildS3Uri(bucket: string, prefix: string): string {
  return `s3://${bucket}/${prefix}`;
}

export function buildS3ObjectUrl({
  bucket,
  region,
  key,
  endpoint,
  forcePathStyle = false,
}: {
  bucket: string;
  region: string;
  key: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}): string {
  const normalizedKey = String(key || '').replace(/^\/+/, '');

  if (endpoint) {
    const normalizedEndpoint = endpoint.replace(/\/+$/, '');
    if (forcePathStyle) {
      return `${normalizedEndpoint}/${bucket}/${normalizedKey}`;
    }

    return `${normalizedEndpoint}/${normalizedKey}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${normalizedKey}`;
}

function getContentType(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();

  switch (extension) {
    case '.pdf':
      return 'application/pdf';
    case '.json':
      return 'application/json';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function readS3Config(source: NodeJS.ProcessEnv = process.env): S3Config {
  return {
    bucket: source.AWS_S3_BUCKET?.trim(),
    region: source.AWS_REGION?.trim(),
    endpoint: source.AWS_S3_ENDPOINT?.trim() || undefined,
    forcePathStyle: source.AWS_S3_FORCE_PATH_STYLE === 'true',
    urlMode: source.AWS_S3_URL_MODE?.trim() === 'object' ? 'object' : 'signed',
    accessKeyId: source.AWS_ACCESS_KEY_ID?.trim() || undefined,
    secretAccessKey: source.AWS_SECRET_ACCESS_KEY?.trim() || undefined,
    sessionToken: source.AWS_SESSION_TOKEN?.trim() || undefined,
    serverSideEncryption: source.AWS_S3_SERVER_SIDE_ENCRYPTION?.trim() || undefined,
    signedUrlExpiresInSeconds: parseNumber(source.AWS_S3_SIGNED_URL_EXPIRES_SECONDS, 7 * 24 * 60 * 60),
  };
}

export async function createS3AccessUrl(options: {
  bucket: string;
  region: string;
  key: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  urlMode?: 'object' | 'signed';
  signedUrlExpiresInSeconds?: number;
}): Promise<string> {
  const config = readS3Config();

  if (options.urlMode === 'signed' || config.urlMode === 'signed') {
    const { S3Client, GetObjectCommand, getSignedUrl } = await getS3Runtime();
    const client = new S3Client(buildS3ClientConfig({
      ...config,
      bucket: options.bucket,
      region: options.region,
      endpoint: options.endpoint || config.endpoint,
      forcePathStyle: options.forcePathStyle ?? config.forcePathStyle,
      urlMode: 'signed',
      signedUrlExpiresInSeconds: options.signedUrlExpiresInSeconds || config.signedUrlExpiresInSeconds,
    }));

    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: options.bucket,
        Key: options.key,
      }),
      {
        expiresIn: options.signedUrlExpiresInSeconds || config.signedUrlExpiresInSeconds,
      },
    );
  }

  return buildS3ObjectUrl({
    bucket: options.bucket,
    region: options.region,
    key: options.key,
    endpoint: options.endpoint || config.endpoint,
    forcePathStyle: options.forcePathStyle ?? config.forcePathStyle,
  });
}

async function readS3BodyAsBuffer(
  body: unknown,
): Promise<Buffer> {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === 'function') {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(bytes);
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = body as NodeJS.ReadableStream;

    stream.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function downloadS3Object(options: {
  bucket: string;
  region: string;
  key: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}): Promise<{
  body: Buffer;
  contentType?: string;
  contentLength?: number;
}> {
  const config = readS3Config();
  const { S3Client, GetObjectCommand } = await getS3Runtime();
  const client = new S3Client(buildS3ClientConfig({
    ...config,
    bucket: options.bucket,
    region: options.region,
    endpoint: options.endpoint || config.endpoint,
    forcePathStyle: options.forcePathStyle ?? config.forcePathStyle,
  }));

  const result = await client.send(new GetObjectCommand({
    Bucket: options.bucket,
    Key: options.key,
  }));

  return {
    body: await readS3BodyAsBuffer(result.Body),
    contentType: result.ContentType,
    contentLength: typeof result.ContentLength === 'number' ? result.ContentLength : undefined,
  };
}

async function getS3Runtime() {
  const [{ S3Client, GetObjectCommand }, { Upload }, { getSignedUrl }] = await Promise.all([
    import('@aws-sdk/client-s3'),
    import('@aws-sdk/lib-storage'),
    import('@aws-sdk/s3-request-presigner'),
  ]);

  return {
    S3Client,
    Upload,
    GetObjectCommand,
    getSignedUrl,
  };
}

function buildS3ClientConfig(config: S3Config) {
  const clientConfig: {
    region: string | undefined;
    endpoint?: string;
    forcePathStyle?: boolean;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };
  } = {
    region: config.region,
  };

  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
  }

  if (config.forcePathStyle) {
    clientConfig.forcePathStyle = true;
  }

  if (config.accessKeyId && config.secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      ...(config.sessionToken ? { sessionToken: config.sessionToken } : {}),
    };
  }

  return clientConfig;
}

export async function uploadFilesToS3(
  files: StorageFileInput[],
  options: StorageUploadOptions = {},
): Promise<S3UploadResult> {
  const config = readS3Config();
  if (!config.bucket || !config.region) {
    throw new Error('AWS S3 is not configured. Set AWS_S3_BUCKET and AWS_REGION.');
  }

  const prefix = options.prefix || buildStoragePrefix({
    basePrefix: process.env.AWS_S3_PREFIX || 'silver-surfers',
    folderPath: options.folderPath || '',
    recipientEmail: options.recipientEmail || '',
    kind: options.kind || 'reports',
  });

  const { S3Client, Upload, GetObjectCommand, getSignedUrl } = await getS3Runtime();
  const client = new S3Client(buildS3ClientConfig(config));
  const uploadedFiles: UploadedStorageFile[] = [];

  for (const file of files) {
    const originalName = file.filename || path.basename(file.path);
    const normalizedDirectory = sanitizeStorageObjectPath(path.posix.dirname(String(originalName).replace(/\\/g, '/')));
    const normalizedBaseName = sanitizeStorageFileName(originalName);
    const normalizedName = normalizedDirectory && normalizedDirectory !== '.'
      ? `${normalizedDirectory}/${normalizedBaseName}`
      : normalizedBaseName;
    const key = `${prefix}/${normalizedName}`;

    const upload = new Upload({
      client,
      params: {
        Bucket: config.bucket,
        Key: key,
        Body: fs.createReadStream(file.path),
        ContentType: getContentType(file.filename || file.path),
        ...(config.serverSideEncryption ? { ServerSideEncryption: config.serverSideEncryption } : {}),
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
      leavePartsOnError: false,
    });

    await upload.done();

    const downloadUrl = config.urlMode === 'signed'
      ? await getSignedUrl(
          client,
          new GetObjectCommand({
            Bucket: config.bucket,
            Key: key,
          }),
          { expiresIn: config.signedUrlExpiresInSeconds },
        )
      : buildS3ObjectUrl({
          bucket: config.bucket,
          region: config.region,
          key,
          endpoint: config.endpoint,
          forcePathStyle: config.forcePathStyle,
        });

    uploadedFiles.push({
      filename: file.filename || path.basename(file.path),
      key,
      size: file.size,
      sizeMB: file.sizeMB,
      downloadUrl,
      providerUrl: downloadUrl,
    });
  }

  return {
    provider: 's3',
    bucket: config.bucket,
    region: config.region,
    prefix,
    urlMode: config.urlMode,
    signedUrlExpiresInSeconds: config.signedUrlExpiresInSeconds,
    uploadedFiles,
    objectCount: uploadedFiles.length,
  };
}
