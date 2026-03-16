/**
 * Scanner Service Client
 * Compatibility wrapper retained for the legacy audit modules.
 * The backing service is now Node-based, but the exported function names stay
 * stable so the existing audit pipeline keeps working during the migration.
 */

import axios from 'axios';
import fs from 'fs/promises';

const SCANNER_SERVICE_URL = process.env.SCANNER_SERVICE_URL || process.env.PYTHON_SCANNER_URL || 'http://localhost:8001';

/**
 * Perform audit using the scanner service (primary method)
 * @param {object} options - Audit options
 * @param {string} options.url - URL to audit
 * @param {string} [options.device='desktop'] - Device type
 * @param {string} [options.format='json'] - Report format
 * @param {boolean} [options.isLiteVersion=false] - Whether lite version
 * @returns {Promise<object>} Result object
 */
export async function tryPythonScanner(options) {
    const { url, device = 'desktop', format = 'json', isLiteVersion = false } = options;
    
    // Increase timeout: 5 minutes for full audits, 4 minutes for lite audits
    const timeoutMs = isLiteVersion ? 240000 : 300000; // 4 minutes for lite, 5 minutes for full
    const timeoutMinutes = Math.floor(timeoutMs / 60000);
    
    try {
        console.log(`🔎 Using scanner service for: ${url} (${isLiteVersion ? 'lite' : 'full'} audit, ${timeoutMinutes}min timeout)`);
        
        const response = await axios.post(`${SCANNER_SERVICE_URL}/audit`, {
            url: url,
            device: device,
            format: format,
            isLiteVersion: isLiteVersion,
            includeReport: false
        }, {
            timeout: timeoutMs,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data && response.data.success) {
            console.log(`✅ Scanner service succeeded for: ${url}`);

            let localReportPath = response.data.reportPath;
            let inlineReport = response.data.report;

            if (localReportPath) {
                const isAccessibleLocally = await fs.access(localReportPath).then(() => true).catch(() => false);
                if (!isAccessibleLocally) {
                    localReportPath = null;
                }
            }

            if (!localReportPath && inlineReport) {
                const path = await import('path');
                const os = await import('os');
                const urlObj = new URL(url);
                const hostname = urlObj.hostname.replace(/\./g, '-');
                const timestamp = Date.now();
                const versionSuffix = isLiteVersion ? '-lite' : '';
                const reportFilename = `report-${hostname}-${timestamp}${versionSuffix}.json`;
                localReportPath = path.join(os.tmpdir(), reportFilename);

                await fs.writeFile(localReportPath, JSON.stringify(inlineReport, null, 2), 'utf-8');
                console.log(`📄 Report saved to local temp file: ${localReportPath}`);
            }

            if (!localReportPath) {
                throw new Error('Scanner service did not return an accessible report path or inline report payload.');
            }
            
            // Convert Python response to Node.js format
            return {
                success: true,
                reportPath: localReportPath,
                ...(inlineReport ? { report: inlineReport } : {}),
                isLiteVersion: response.data.isLiteVersion,
                version: response.data.version,
                url: response.data.url,
                device: response.data.device,
                strategy: response.data.strategy || 'Node-Lighthouse',
                attemptNumber: response.data.attemptNumber || 1,
                message: response.data.message || 'Audit completed using scanner service'
            };
        } else {
            const errorMsg = response.data?.error || 'Scanner service failed';
            console.log(`❌ Scanner service returned failure: ${errorMsg}`);
            return {
                success: false,
                error: errorMsg,
                errorCode: response.data?.errorCode || 'PYTHON_SCANNER_FAILED'
            };
        }
    } catch (error) {
        // Extract status code from error.response or error.message
        let status = null;
        const responseBody = error.response?.data;
        if (error.response) {
            status = error.response.status;
        } else if (error.message) {
            // Parse status code from error message (e.g., "Request failed with status code 504")
            const statusMatch = error.message.match(/status code (\d+)/i);
            if (statusMatch) {
                status = parseInt(statusMatch[1], 10);
            }
        }
        
        // Handle specific HTTP status codes with clear messages
        if (status === 504) {
            const clearError = `The website scan timed out after ${timeoutMinutes} minutes. The website may be slow to load or the scanner service is experiencing high load. Please try again in a few moments.`;
            console.error(`❌ Scanner service timeout (504 Gateway Timeout): ${url}`);
            console.error(`   The scan exceeded the ${timeoutMinutes}-minute timeout limit.`);
            return {
                success: false,
                error: clearError,
                errorCode: 'SCAN_TIMEOUT',
                statusCode: 504
            };
        } else if (status === 503) {
            const clearError = `The scanner service is temporarily unavailable. Please try again in a few moments.`;
            console.error(`❌ Scanner service unavailable (503): ${url}`);
            return {
                success: false,
                error: clearError,
                errorCode: 'SERVICE_UNAVAILABLE',
                statusCode: 503
            };
        } else if (status && status >= 500) {
            const detailText = [
                responseBody?.error,
                responseBody?.details?.stderr,
                responseBody?.details?.stdout,
                responseBody?.details?.error
            ].filter(Boolean).join('\n');

            let clearError = `The scanner service encountered an internal error (${status}). Please try again later.`;
            let errorCode = 'SERVER_ERROR';

            if (/chrome_path|chromium_path|chrome\/chromium executable|unable to locate a chrome\/chromium executable/i.test(detailText)) {
                clearError = 'The scanner service browser is not configured correctly. Please contact support.';
                errorCode = 'SCANNER_BROWSER_UNAVAILABLE';
            } else if (/chrome launch failed|chrome executable not found|chrome executable is not accessible/i.test(detailText)) {
                clearError = 'The scanner service could not launch its browser. Please try again later or contact support.';
                errorCode = 'SCANNER_BROWSER_LAUNCH_FAILED';
            }

            console.error(`❌ Scanner service server error (${status}): ${url}`);
            if (detailText) {
                console.error(`   Scanner service details:\n${detailText}`);
            }
            return {
                success: false,
                error: clearError,
                errorCode,
                statusCode: status
            };
        }
        
        // Handle connection errors
        if (error.code === 'ECONNREFUSED') {
            const clearError = `Unable to connect to the scanner service. The service may be down or unreachable.`;
            console.error(`⚠️ Scanner service connection refused: ${SCANNER_SERVICE_URL}`);
            return {
                success: false,
                error: clearError,
                errorCode: 'SERVICE_UNAVAILABLE'
            };
        }
        
        if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
            const clearError = `The scan request timed out after ${timeoutMinutes} minutes. The website may be taking too long to load. Please try again or contact support if the issue persists.`;
            console.error(`❌ Scanner service request timeout: ${url} (${timeoutMinutes}min limit exceeded)`);
            return {
                success: false,
                error: clearError,
                errorCode: 'REQUEST_TIMEOUT'
            };
        }
        
        // Generic error handling - check if message contains status code pattern
        let clearError;
        if (error.message && error.message.includes('status code')) {
            // If we have a status code in the message but didn't catch it above, provide generic timeout message
            const statusMatch = error.message.match(/status code (\d+)/i);
            if (statusMatch && parseInt(statusMatch[1], 10) === 504) {
                clearError = `The website scan timed out after ${timeoutMinutes} minutes. The website may be slow to load or the scanner service is experiencing high load. Please try again in a few moments.`;
                console.error(`❌ Scanner service timeout (504 from message): ${url}`);
                return {
                    success: false,
                    error: clearError,
                    errorCode: 'SCAN_TIMEOUT',
                    statusCode: 504
                };
            }
        }
        
        // Default generic error message
        clearError = `An error occurred while scanning the website: ${error.message}. Please try again or contact support if the issue persists.`;
        console.error(`❌ Scanner service error: ${error.message}`);
        console.error(`   URL: ${url}`);
        console.error(`   Error details:`, responseBody || error.stack);
        return {
            success: false,
            error: clearError,
            errorCode: 'SCANNER_SERVICE_ERROR',
            originalError: error.message
        };
    }
}

/**
 * Lightweight precheck using the scanner service
 * This is much faster than a full audit - just verifies URL is reachable
 * @param {string} url - URL to precheck
 * @returns {Promise<object>} Precheck result
 */
export async function pythonPrecheck(url) {
    const precheckTimeout = 60000; // Increased to 60 seconds for precheck
    
    try {
        console.log(`🔎 Scanner service precheck for: ${url} (60s timeout)`);
        
        const response = await axios.post(`${SCANNER_SERVICE_URL}/precheck`, {
            url: url
        }, {
            timeout: precheckTimeout,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data && response.data.success) {
            console.log(`✅ Scanner precheck succeeded: ${url} → ${response.data.finalUrl || url}`);
            return {
                ok: true,
                finalUrl: response.data.finalUrl || url,
                status: response.data.status,
                redirected: response.data.redirected || false
            };
        } else {
            const errorMsg = response.data?.error || 'Precheck failed';
            console.log(`❌ Scanner precheck failed: ${errorMsg}`);
            return {
                ok: false,
                error: errorMsg
            };
        }
    } catch (error) {
        // Extract status code from error.response or error.message
        let status = null;
        if (error.response) {
            status = error.response.status;
        } else if (error.message) {
            // Parse status code from error message (e.g., "Request failed with status code 504")
            const statusMatch = error.message.match(/status code (\d+)/i);
            if (statusMatch) {
                status = parseInt(statusMatch[1], 10);
            }
        }
        
        // Handle specific HTTP status codes
        if (status === 504) {
            const clearError = `Website precheck timed out. The website may be slow to respond or unreachable.`;
            console.error(`❌ Scanner precheck timeout (504): ${url}`);
            return {
                ok: false,
                error: clearError
            };
        } else if (status === 503) {
            const clearError = `Scanner service is temporarily unavailable. Please try again in a few moments.`;
            console.error(`❌ Scanner precheck service unavailable (503): ${url}`);
            return {
                ok: false,
                error: clearError
            };
        }
        
        // Handle connection errors
        if (error.code === 'ECONNREFUSED') {
            const clearError = `Unable to connect to the scanner service. The service may be down.`;
            console.error(`⚠️ Scanner service connection refused: ${SCANNER_SERVICE_URL}`);
            return {
                ok: false,
                error: clearError
            };
        }
        
        if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
            const clearError = `Website precheck timed out after 60 seconds. The website may be slow to respond.`;
            console.error(`❌ Scanner precheck timeout: ${url}`);
            return {
                ok: false,
                error: clearError
            };
        }
        
        // Generic error
        const clearError = `Precheck failed: ${error.message}. Please verify the website URL is correct and try again.`;
        console.error(`❌ Scanner precheck error: ${error.message}`);
        return {
            ok: false,
            error: clearError
        };
    }
}

/**
 * Check if the scanner service is available
 * @returns {Promise<boolean>}
 */
export async function isPythonScannerAvailable() {
    try {
        const response = await axios.get(`${SCANNER_SERVICE_URL}/health`, {
            timeout: 5000
        });
        return response.data?.status === 'healthy';
    } catch (error) {
        return false;
    }
}
