# Backend Migration Checklist

## Immediate
- [x] Replace the open `/cleanup` delete endpoint with admin-only access in the TypeScript API.
- [x] Move worker cleanup to an internal function call instead of an HTTP round-trip.
- [x] Replace the broken `--experimental-strip-types` test path with a TypeScript loader-based workflow.
- [x] Add a canonical Silver Score breakdown schema on persisted audit records.
- [ ] Verify local and deployment start scripts on the target Node version and hosting platform.

## TypeScript Migration
- [ ] Port `auditService.js` into `src/features/audits/` as smaller services.
- Progress: full-audit worker orchestration now runs from `src/features/audits/full-audit.processor.ts`, audit report delivery runs from `src/features/audits/report-delivery.ts`, and PDF orchestration/merge helpers now run from `src/features/audits/report-generation.ts`. Detailed PDF renderers are still wrapped from legacy modules.
- [x] Port the quick-scan worker path out of `auditService.js` into `src/features/audits/`.
- [ ] Port legacy Mongoose model access from `my-app/services/server/models/*.js` into `src/`.
- Progress: native TypeScript models now cover `AuditJob`, `AnalysisRecord`, `QuickScan`, `Subscription`, `User`, `BlogPost`, and `FAQ`. Content and auth feature dependencies no longer bridge those models from `my-app`.
- [x] Port remaining legacy routes mounted in [src/features/register-features.ts](/home/tamiz/Projects/Silver-Surfers/Silver-Surfers-backend/src/features/register-features.ts).
- Progress: `admin`, `stripe-webhook`, `subscription`, `team`, `contact`, and `legal` routes now run through `src/features/*` routers. The old legacy feature loader is no longer used by the active backend route registration.
- [x] Remove `loadProjectModule()` bridges once feature parity is complete.
- Progress: active backend runtime, route registration, full-audit orchestration, and report-generation now use direct imports instead of `loadProjectModule()`, and the old compatibility loader files have been removed.
- [x] Port billing/team email delivery and Stripe webhook orchestration into `src/features/billing/`.
- Progress: subscription, team, and Stripe webhook flows now use `src/features/billing/billing-email.service.ts` and `src/features/billing/stripe-webhook.service.ts` instead of the legacy `email.js` billing bridge.

## Runtime Architecture
- [x] Split API and background workers into separate deployable processes.
- [x] Keep the API process enqueue-only for long-running audit work.
- [ ] Run BullMQ with Redis in non-local environments.
- [ ] Add worker health/readiness checks and queue lag monitoring.
- Progress: queue access for admin operations now comes from `src/features/audits/audits.runtime.ts`, so runtime no longer injects queues into the legacy admin controller.

## Scanner
- [x] Replace per-scan browser launches with a real browser pool.
- [x] Reuse CDP sessions or long-lived browser instances across scans.
- [x] Block non-essential resources to improve throughput.
- [ ] Add scanner metrics for concurrency, queue depth, timeout rate, and memory use.
- Progress: `src/features/scanner/scanner.service.ts` now keeps a pooled Puppeteer browser set sized to scanner concurrency, reuses CDP endpoints for Lighthouse runs, and blocks heavy asset types during browser prechecks. Health output now includes browser pool load.

## Reports And Storage
- [x] Finish moving report delivery to S3-first storage.
- Progress: audit report email/delivery now runs from `src/features/audits/report-delivery.ts` for quick scans and full audits, report orchestration now runs from `src/features/audits/report-generation.ts`, auth verification/reset emails run from `src/features/auth/auth-email.service.ts`, and billing/team/system mail used by active TS routes now runs from `src/features/billing/billing-email.service.ts`.
- [x] Remove or isolate Google Drive fallback paths if they are no longer part of production.
- Progress: the active TypeScript report delivery path is now S3-or-unconfigured only and no longer uploads to Google Drive.
- [ ] Split PDF generation into dedicated worker responsibilities.
- [ ] Define report retention and signed URL expiry policies by plan.

## Security
- [ ] Review all admin and internal-only routes for auth coverage.
- [ ] Add stricter secrets validation for production startup.
- [ ] Add rate limiting for public audit submission endpoints.
- [ ] Add structured audit logging for admin and billing actions.

## Testing
- [x] Get `npm test` running reliably again.
- [ ] Add route-level tests for auth/admin protection on sensitive endpoints.
- [ ] Add queue integration tests for BullMQ mode.
- [ ] Add scanner-service integration tests around timeout and capacity behavior.
