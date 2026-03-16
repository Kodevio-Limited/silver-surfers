# SilverSurfers PRD Gap Analysis

Source document: `SilverSurfers_ai_Product_Requirements.md`

This note compares the PRD to the current codebase and sorts the next implementation work by dependency, not just by how the PRD is written.

## 1. What already exists

The current product already has a usable foundation in these areas:

- Public free quick scans and authenticated full audit queueing
- URL precheck and scanner-service integration
- Subscription billing, team management, and admin operations
- Basic account history and admin scan visibility
- A split API and worker runtime in the backend
- Content/admin surfaces for blog, FAQ, legal, and contact management

Current code evidence:

- Backend audit entrypoints: `Silver-Surfers-backend/src/features/audits/audits.controller.ts`
- Backend runtime split: `Silver-Surfers-backend/src/server/runtime.ts`
- Legacy features still mounted: `Silver-Surfers-backend/src/features/register-features.ts`
- Current frontend routes: `Silver-Surfers-frontend/src/App.js`
- Current user account/history page: `Silver-Surfers-frontend/src/pages/Account.js`

## 2. What the PRD expects that the product does not yet have

### A. Core product logic is still missing

These are the real heart of the PRD and are not implemented yet:

- Canonical Silver Score v1 across 4 primary dimensions
- 8-dimension-to-4-dimension scoring framework
- Risk tier classification
- Score breakdown with top contributing issues
- Remediation roadmap with effort/impact model
- Benchmarking and vertical comparison

This is the biggest product gap. Right now the platform can run scans, but it does not yet expose the PRD's proprietary scoring system as the main product.

### B. Monitoring engine is mostly not built

The PRD makes ongoing monitoring a Phase 1 core capability, but the current product is still mostly request/queue driven.

Missing:

- Scheduled scans
- Regression detection
- Trend history and annotations
- Real-time regression alerts
- Property portfolio monitoring

### C. Advisory and legal outputs are not built

Phase 1 PRD requirements like these are still missing:

- Executive Risk Brief PDF
- Accessibility Statement Generator
- Litigation Defense Documentation Pack
- Executive Compliance Brief

### D. Healthcare vertical module is not built

The PRD calls this out as a core differentiator, but there is no visible implementation yet for:

- Appointment Booking Friction Score
- Patient Portal Accessibility Score
- Insurance Plan Readability Score
- Healthcare composite SDR score

### E. Certification system is not built

Missing:

- Certification issuance engine
- Badge generator
- Public registry
- Revalidation and revocation workflows
- Certification verification API

### F. Enterprise API layer is not built

The PRD expects a versioned API platform. The current app does not yet expose that surface.

Missing:

- `/v1` API namespace
- score retrieval API
- batch API
- risk report API
- certification verification API
- schedule management API
- webhooks
- API keys / scoped permissions / OAuth-style enterprise auth

### G. Enterprise identity and governance are not built

The current app has basic `user` / `admin` roles, but the PRD requires a much richer enterprise access model.

Missing:

- RBAC with Admin / Compliance Manager / Developer / Read-Only
- SSO / SAML
- immutable audit trail for governance-sensitive actions
- stronger enterprise-grade access controls

### H. Frontend experience is still SMB/admin oriented

The frontend has public marketing pages, account history, and admin pages, but not the PRD's main enterprise experiences:

- Executive dashboard
- Compliance manager view
- Developer remediation view
- Monitoring dashboards
- Certification registry UI
- Benchmark comparison surfaces

## 3. Architecture mismatches that should be resolved before deeper feature work

The PRD and the current codebase are not fully aligned yet on technical direction.

### PRD says

- API-first microservices
- AWS-native deployment
- PostgreSQL
- Node.js plus Python split for different workloads

### Current codebase says

- Node.js / TypeScript migration is in progress
- MongoDB models are still central
- several legacy JS routes/services are still mounted
- worker split has started, but services are not yet cleanly separated by domain

This means the next updates should not jump straight into certification, healthcare, or enterprise integrations until the core product and data model are stabilized.

## 4. Working scope for now

Only **Phase 1** and **Phase 2** requirements are in scope for implementation.

That means:

- Build Phase 1 first
- Build Phase 2 only after the Phase 1 foundation is stable
- Do **not** spend time on Phase 3, post-Phase-3, or explicitly out-of-scope items

## 5. Recommended implementation order for Phase 1

### Priority 0: Align product architecture decisions

Before more big feature work, confirm these:

1. Is the target backend stack Node.js + TypeScript only, or Node + Python as the PRD says?
2. Is MongoDB temporary, or are we actually migrating to PostgreSQL?
3. Will enterprise API auth start with API keys first, then OAuth later?

Without these answers, we risk building Phase 1 on the wrong base.

### Phase 1.1: Finish the backend foundation

Build next:

1. Port the full-audit processor out of legacy `auditService.js`
2. Define a canonical audit result schema in TypeScript
3. Normalize findings into a reusable scoring/reporting model
4. Remove more legacy route/service bridges from `my-app`
5. Add worker health/readiness and queue observability

Reason:
Every serious Phase 1 feature depends on a stable full-audit pipeline.

### Phase 1.2: Build Silver Score v1

Build next:

1. Implement the 4 primary scoring dimensions
2. Map normalized findings into score weights
3. Add risk-tier classification
4. Store score snapshots per scan
5. Expose score breakdown data to the frontend

Reason:
This is the core product and the foundation of the rest of Phase 1.

### Phase 1.3: Build analysis detail and dashboard v1

Build next:

1. Full analysis detail endpoint
2. User-facing scan detail page
3. Executive summary view
4. Basic compliance/developer issue views from the same data source
5. Score history model and chart-ready API

Reason:
This turns the scan engine into the actual product experience promised in Phase 1.

### Phase 1.4: Build monitoring and regression detection

Build next:

1. Scheduled scan model
2. Scheduler/cron worker
3. Regression detection rules
4. Alert delivery model
5. Trend and regression history UI

Reason:
Monitoring is a Phase 1 pillar, not a later nice-to-have.

### Phase 1.5: Build advisory and legal outputs

Build next:

1. Accessibility Statement Generator
2. Executive Risk Brief PDF
3. Litigation Defense Pack
4. Executive Compliance Brief
5. Remediation workplan export

Reason:
These are Phase 1 commercial outputs and depend on score/history data already existing.

### Phase 1.6: Build healthcare vertical module v1

Build next:

1. Appointment booking heuristics
2. Patient portal heuristics
3. Insurance readability analysis
4. Healthcare composite score

Reason:
The PRD makes healthcare a Phase 1 differentiator, but it should be built on top of the generic score platform.

### Phase 1.7: Build certification v1

Build next:

1. Certification eligibility rules
2. Badge generator
3. Public registry v1
4. Verification flow
5. Renewal/revocation jobs

Reason:
Certification depends on stable scores, history, and monitoring windows.

### Phase 1.8: Build Phase 1 enterprise controls

Build next:

1. RBAC expansion beyond `admin` / `user`
2. audit logging for compliance-sensitive actions
3. SSO / SAML groundwork
4. baseline security hardening around access control and secrets

Reason:
These are Phase 1 requirements for enterprise trust, but they should follow the core product surface.

## 6. Best immediate next sprint

The best immediate **Phase 1** sprint is:

1. Finish the full-audit TypeScript migration
2. Define the canonical score/result schema
3. Implement Silver Score v1 with 4-dimension breakdown
4. Add a scan detail endpoint and first dashboard view

This is still the shortest path from "scan engine" to "actual Phase 1 product."

## 7. Recommended implementation order for Phase 2

Only start these after the Phase 1 items above are stable.

### Phase 2.1: Build API v1

Build next:

1. `/v1/score`
2. `/v1/score/{org-id}/history`
3. `/v1/scan/schedule`
4. `/v1/batch`
5. webhook delivery
6. API auth and rate limiting

### Phase 2.2: Expand litigation intelligence

Build next:

1. ADA lawsuit database
2. industry litigation heatmap
3. geographic risk breakdown
4. exposure scoring model if not fully delivered in Phase 1

### Phase 2.3: Build benchmarking and enterprise comparisons

Build next:

1. vertical benchmark APIs
2. benchmark comparison panel
3. competitor comparison support
4. richer portfolio-level risk views

### Phase 2.4: Build integrations

Build next:

1. WordPress plugin
2. Shopify app
3. Slack integration
4. Jira integration
5. GitHub Action

### Phase 2.5: Build partner and commercial expansion features

Build next:

1. Agency white-label dashboard
2. certification verification API
3. marketplace v1

## 8. Do not touch yet

These are outside the current implementation scope because they are **Phase 3**, **post-Phase-3**, or explicitly **out of scope** in the PRD:

- Microsoft Teams integration
- Consulting firm partner program
- Financial Services SDR Index
- International compliance expansion
- predictive litigation ML
- AI-powered automatic remediation
- custom report builder
- quarterly ADA risk briefings
- native mobile app accessibility testing
- PDF / document accessibility auditing
- real-time session recording / heatmaps

## 9. Final recommendation

If we are strictly following the PRD scope you set, the build order should be:

### Phase 1 order

1. Backend foundation
2. Silver Score engine
3. Analysis detail + dashboards
4. Monitoring + regression
5. Advisory/legal outputs
6. Healthcare module
7. Certification
8. Phase 1 enterprise controls

### Phase 2 order

1. API v1 + webhooks
2. Litigation intelligence expansion
3. Benchmarking and comparison
4. CMS / DevOps integrations
5. White-label and marketplace expansion

That is the cleanest Phase 1 + Phase 2-only roadmap from the current repo state.
