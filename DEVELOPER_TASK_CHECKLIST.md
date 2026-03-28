# SilverSurfers Developer Task Checklist

Last updated: 2026-03-28

This checklist is based on the current repository and the scope comparison in `PROJECT_SCOPE_STATUS.md`.

## How to use this file

- `Done` means the capability already exists in the codebase in a usable form.
- `In Progress` means some foundation exists, but the feature is incomplete, mismatched with the agreed scope, inactive, or needs refinement.
- `Todo` means it is not yet built or not present in an active product-ready form.

## Done

### Platform foundation

- API server runtime exists
- Background worker runtime exists
- Dedicated scanner service runtime exists
- Mongo-backed data models exist for users, subscriptions, analysis records, quick scans, legal docs, and content
- Queue-backed audit processing exists
- Quick scan and full audit flows both exist

### Core audit engine

- URL-based audit submission exists
- Automated scan execution exists
- Multi-device scan execution exists for desktop, tablet, and mobile
- Lighthouse integration exists
- Custom senior-oriented Lighthouse gatherers and audits exist
- Internal link extraction exists for multi-page scanning

### Silver Score and reporting

- Silver Score v1 exists on a 0-100 scale
- Weighted scoring exists
- Risk tier classification exists with high / medium / low
- Score breakdown is exposed to the frontend
- Remediation roadmap generation exists with impact and effort labels
- PDF report generation exists
- Report download and report file handling exist

### User and admin product flows

- Public free scan flow exists
- Auth flows exist for register, login, verify email, forgot password, and reset password
- User dashboard exists for scan history and report downloads
- Admin dashboard exists
- Admin content management exists for blogs and FAQs
- Admin views exist for users, contact records, and scan data

### Billing and delivery

- Subscription plans exist
- Stripe checkout flow exists
- Stripe webhook handling exists
- Team subscription flows exist
- Email-based report delivery exists
- Contact notification email flow exists

## In Progress

### Milestone 1 scope alignment

- Final Milestone 1 definition needs to be locked against the current implementation
- The Silver Score definition is inconsistent across planning notes:
  current code is 4 dimensions, but some scope notes describe 8 dimensions
- The current system is strong M1 foundation work, but does not fully match the latest strategic roadmap wording

### Core audit engine expansion

- Multi-page scanning exists, but it is currently limited to roughly 25 internal links with shallow depth
- Current crawler behavior needs expansion if the committed target is up to 500 pages
- Current accessibility engine uses Lighthouse plus custom logic; this is not yet a dedicated enterprise mapping layer

### WCAG and aging-intelligence layer

- WCAG-related findings exist through current audits
- Proprietary aging-oriented heuristics exist in practice through custom audits
- A clearly separated `WCAG 2.2 AA mapping engine + proprietary aging overlay` is not yet formalized as its own layer

### Reporting and prioritization

- Reports are already structured and usable
- Remediation roadmap exists, but not yet with explicit buckets like:
  - Quick Wins
  - Medium Effort
  - High Effort
- Report quality is good, but not yet fully enterprise or stakeholder-ready

### Scheduler and monitoring

- Scheduler code exists
- Scheduled scanning is not clearly active in the main app flow
- Regression detection is not implemented
- Alerting is not implemented

### Certification and healthcare placeholders

- Certification model exists, but not the actual feature workflow
- Healthcare score model exists, but not the vertical solution

## Todo

### Product decisions to finalize first

- Decide whether Milestone 1 should use a 4-dimension score model or an 8-dimension score model
- Decide whether Milestone 1 requires OpenAI-driven explanations or whether rule-based reporting is acceptable for now
- Confirm that Milestone 1 is officially using `axe-core + Lighthouse + custom audits`, and only add paid axe DevTools later if enterprise workflow features are required
- Decide whether the multi-page scanner must support up to 500 pages in Milestone 1 or in a later phase

### M1 completion tasks

- Add OpenAI API integration for AI-generated explanations and remediation recommendations
- Add OpenAI-assisted prioritization if this remains part of M1
- Implement explicit effort/impact prioritization buckets
- Expand the score engine to the finalized dimension model
- Implement a clearer standalone WCAG 2.1 / 2.2 AA mapping layer
- Add enterprise-grade issue grouping and business-impact presentation if required for M1 acceptance
- Expand crawler depth and limits if 500-page scanning is required
- Improve PDF report narrative quality to the final accepted Milestone 1 standard
- Update scope and client-facing language so it does not promise paid axe DevTools unless that is actually being purchased
- Validate email service configuration for production
- Confirm scanner infrastructure configuration for production deployments

### M2 continuous monitoring and dashboards

- Build scheduled scanning UI and runtime activation
- Support daily, weekly, and monthly scan schedules
- Implement regression detection
- Add severity-gated regression alerts
- Add in-app notifications
- Expand dashboards to show trends, top issues, and role-gated executive views

### M3 healthcare vertical

- Build healthcare-specific scoring logic
- Add appointment booking friction analysis
- Add patient portal analysis
- Add insurance readability analysis
- Build healthcare-specific reporting views
- Build top-300 healthcare organization batch scoring pipeline

### M4 and M6 certification and advisory

- Build score-based certification eligibility logic
- Build badge issuance workflow
- Build badge generator
- Build public certification registry
- Build accessibility statement generator
- Build litigation defense pack export flow
- Build evidence and audit-trail export workflow

### Security and enterprise infrastructure

- Define and implement initial SOC 2 roadmap controls
- Define and implement HIPAA-oriented data handling policies
- Add enterprise SSO / SAML support
- Add Okta support
- Add Azure AD support
- Review storage, retention, and access controls for enterprise readiness

## Suggested implementation order

1. Lock M1 scope decisions
2. Finalize score model shape
3. Finalize and document the approved audit stack: `axe-core + Lighthouse + custom audits`
4. Add OpenAI reporting layer if required
5. Upgrade prioritization output
6. Expand crawler only if required for M1
7. Improve final report quality
8. Move to monitoring, healthcare, certification, and enterprise features

## Current best summary

The platform already has a real working product core.

The remaining work is mostly in:

- aligning implementation with the promised scope language
- adding the advanced intelligence layers
- scaling multi-page scanning
- building later-phase enterprise and vertical features
