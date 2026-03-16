import { env } from '../../config/env.ts';
import { logger } from '../../config/logger.ts';

const precheckLogger = logger.child('feature:audits:precheck');

export interface CandidateUrlResult {
  input: string;
  candidateUrls: string[];
}

export interface PrecheckSuccessResult {
  ok: true;
  status?: number;
  finalUrl: string;
  redirected: boolean;
}

export interface PrecheckFailureResult {
  ok: false;
  error: string;
}

export type PrecheckResult = PrecheckSuccessResult | PrecheckFailureResult;

type FetchLike = typeof fetch;

function timeoutSignal(timeoutMs: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timer),
  };
}

export function buildCandidateUrls(input: string | undefined): CandidateUrlResult {
  const raw = String(input || '').trim();
  if (!raw) {
    return { input: raw, candidateUrls: [] };
  }

  if (/^https?:\/\//i.test(raw)) {
    return { input: raw, candidateUrls: [raw] };
  }

  const cleaned = raw.replace(/^\w+:\/\//, '');
  return {
    input: raw,
    candidateUrls: [`https://${cleaned}`, `http://${cleaned}`],
  };
}

async function runScannerPrecheck(
  url: string,
  fetchImpl: FetchLike,
): Promise<PrecheckResult> {
  const { signal, cancel } = timeoutSignal(60_000);

  try {
    precheckLogger.debug('Trying scanner-service precheck.', { url, scannerServiceUrl: env.scannerServiceUrl });

    const response = await fetchImpl(`${env.scannerServiceUrl}/precheck`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal,
    });

    const payload = await response.json().catch(() => undefined) as {
      success?: boolean;
      finalUrl?: string;
      status?: number;
      redirected?: boolean;
      error?: string;
    } | undefined;

    if (response.ok && payload?.success) {
      return {
        ok: true,
        finalUrl: payload.finalUrl || url,
        status: payload.status,
        redirected: Boolean(payload.redirected),
      };
    }

    return {
      ok: false,
      error: payload?.error || `Scanner precheck failed with status ${response.status}.`,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    cancel();
  }
}

async function runHttpPrecheck(
  url: string,
  fetchImpl: FetchLike,
  timeoutMs = 8_000,
): Promise<PrecheckResult> {
  const { signal, cancel } = timeoutSignal(timeoutMs);

  try {
    let response = await fetchImpl(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal,
    });

    if (!response.ok || response.status === 405) {
      response = await fetchImpl(url, {
        method: 'GET',
        redirect: 'follow',
        signal,
      });
    }

    return {
      ok: true,
      finalUrl: response.url || url,
      status: response.status,
      redirected: response.redirected,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    cancel();
  }
}

export async function precheckCandidateUrl(
  url: string,
  fetchImpl: FetchLike = fetch,
): Promise<PrecheckResult> {
  const scannerResult = await runScannerPrecheck(url, fetchImpl);
  if (scannerResult.ok) {
    return scannerResult;
  }

  precheckLogger.debug('Scanner-service precheck failed, falling back to direct fetch.', {
    url,
    error: scannerResult.error,
  });

  return runHttpPrecheck(url, fetchImpl);
}
