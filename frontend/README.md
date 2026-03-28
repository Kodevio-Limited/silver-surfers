# Frontend Guide

## What this frontend is

The frontend is a React app built with `react-scripts` and `react-router-dom`.

Main entry files:

- `src/index.js`
- `src/App.js`
- `src/index.css`
- `src/App.css`

The app is mostly page-driven. Shared layout lives in `Header`, `Footer`, `ProtectedRoute`, and `AdminLayout`.

## Route ownership

`src/App.js` is the routing source of truth.

### Public pages

- `/` -> `src/pages/Home.js`
- `/services` -> `src/pages/Services.js`
- `/about` -> `src/pages/About.js`
- `/contact` -> `src/pages/Contact.js`
- `/faq` -> `src/pages/FAQ.js`
- `/blog` -> `src/pages/Blog.js`
- `/blog/:id` -> `src/pages/BlogPost.js`
- `/terms`, `/terms-of-use` -> `src/pages/TermsOfUse.js`
- `/privacy`, `/privacy-policy` -> `src/pages/PrivacyPolicy.js`
- `/accessibility-guides` -> `src/pages/AccessibilityGuides.js`

### Auth and account pages

- `/login` -> `src/pages/Login.js`
- `/register`, `/signup` -> `src/pages/Register.js`
- `/verify-email` -> `src/pages/VerifyEmail.js`
- `/resend-verification` -> `src/pages/ResendVerification.js`
- `/forgot-password` -> `src/pages/ForgotPassword.js`
- `/reset-password` -> `src/pages/ResetPassword.js`
- `/account` -> `src/pages/Account.js`
- `/account/analysis/:taskId` -> `src/pages/AnalysisDetail.js`

### Billing and audit pages

- `/checkout` -> `src/pages/Checkout.js`
- `/subscription` -> `src/pages/Subscription.js`
- `/subscription-success` -> `src/pages/SubscriptionSuccess.js`
- `/payment-success` -> `src/pages/PaymentSuccess.js`
- `/team/accept` -> `src/pages/AcceptTeamInvite.js`
- `/success` -> `src/pages/Success.js`

### Admin pages

Admin pages actually used by the router live in `src/pages/admin/`.

- `/admin/login` -> `src/pages/AdminLogin.js`
- `/admin/dashboard` -> `src/pages/admin/AdminDashboard.js`
- `/admin/users` -> `src/pages/admin/AdminUsers.js`
- `/admin/blog` -> `src/pages/admin/AdminBlog.js`
- `/admin/faqs` -> `src/pages/admin/AdminFAQs.js`
- `/admin/analysis` -> `src/pages/admin/AdminAnalysis.js`
- `/admin/bulk-quick-scans` -> `src/pages/admin/AdminBulkQuickScans.js`
- `/admin/quick-scans` -> `src/pages/admin/AdminQuickScans.js`
- `/admin/starter-scans` -> `src/pages/admin/AdminStarterScans.js`
- `/admin/pro-scans` -> `src/pages/admin/AdminProScans.js`
- `/admin/onetime-scans` -> `src/pages/admin/AdminOneTimeScans.js`
- `/admin/contact` -> `src/pages/admin/AdminContact.js`
- `/admin/legal` -> `src/pages/AdminLegal.js`

Legacy compatibility route:

- `/admin/content` -> `src/pages/AdminContentManager.js`

## Shared app structure

### Global shell

- `src/App.js`
  Decides whether the public `Header` and `Footer` are shown.
- `src/components/Header.js`
  Main navigation, account menu, search, route persistence.
- `src/components/Footer.js`
  Marketing footer and legal/resource links.
- `src/components/ScrollToTop.js`
  Scroll reset on route changes.

### Auth gates

- `src/components/ProtectedRoute.js`
  Calls `getMe()` and protects user-only or admin-only routes.
- `src/layouts/AdminLayout.js`
  Admin sidebar, admin auth verification, nested admin outlet.

### Legal rendering

- `src/components/LegalDocumentViewer.js`
  Loads legal content and can submit acceptance.
- `src/components/LegalAcceptanceModal.js`
  Used for legal confirmation flows.

### Content helpers

- `src/components/RichTextEditor.js`
  Admin blog/editor helper and rich text preview support.
- `src/components/SimpleTextFormatter.js`
  Used to render legal and plain rich-text-style content.
- `src/components/SearchBar.js`
  Client-side search against a hardcoded route/content map.

## API integration

There are two ways the frontend talks to the backend:

1. `src/api.js`
   Main app API wrapper, uses Axios, attaches auth tokens, and contains most business actions.
2. `src/config/apiBase.js`
   Small fetch helper used by a few pages for simple JSON requests.

Backend base URL resolution:

- preferred: `REACT_APP_API_BASE_URL`
- legacy fallback: `REACT_APP_API_URL` or `REACT_APP_API_BASE`
- default: `http://localhost:8000`

### Where each major page gets data

- `Home.js`
  Calls `quickAudit`.
- `Services.js`
  Calls `getSubscriptionPlans`, `getSubscription`, and `createCheckoutSession`.
- `Blog.js`, `BlogPost.js`, `FAQ.js`
  Use `fetchJSON()` directly against `/blogs` and `/faqs`.
- `Contact.js`
  Calls `submitContact`.
- `Login.js`, `Register.js`, `VerifyEmail.js`, `ResetPassword.js`
  Mix `fetchJSON()` and functions from `api.js`.
- `Account.js`
  Calls `listMyAnalysis`, `getMe`, and `getSubscription`.
- `AnalysisDetail.js`
  Calls `getMyAnalysisDetail` and `fetchMyAnalysisReportFile`.
- `Subscription.js`
  Handles subscription management, team members, team scans, upgrades, and portal access through `api.js`.
- Admin pages
  Use `admin*` helpers from `src/api.js`.

## If you want to change X, edit Y

### Change navigation or routes

- Router definitions: `src/App.js`
- Public header links: `src/components/Header.js`
- Footer links: `src/components/Footer.js`
- Admin sidebar: `src/layouts/AdminLayout.js`

### Change auth flow

- Login form and redirect behavior: `src/pages/Login.js`
- Signup flow: `src/pages/Register.js`
- Protected route logic: `src/components/ProtectedRoute.js`
- Backend auth wrappers used by the UI: `src/api.js`

### Change audit submission UX

- Free quick scan form: `src/pages/Home.js`
- Paid audit checkout/start flow: `src/pages/Checkout.js`
- Subscription plan marketing and CTA logic: `src/pages/Services.js`
- API calls behind those flows: `src/api.js`

### Change account history or report downloads

- Account list screen: `src/pages/Account.js`
- Detail screen and report buttons: `src/pages/AnalysisDetail.js`
- API wrappers: `src/api.js`
- Backend response shaping:
  `../backend/src/features/auth/auth.routes.ts`
  `../backend/src/features/audits/analysis-details.ts`

### Change blog or FAQ rendering

- Blog index: `src/pages/Blog.js`
- Blog detail: `src/pages/BlogPost.js`
- FAQ page: `src/pages/FAQ.js`
- Admin editors:
  `src/pages/admin/AdminBlog.js`
  `src/pages/admin/AdminFAQs.js`

### Change contact and legal pages

- Contact page: `src/pages/Contact.js`
- Legal pages:
  `src/pages/TermsOfUse.js`
  `src/pages/PrivacyPolicy.js`
  `src/pages/AccessibilityGuides.js`
- Shared legal viewer: `src/components/LegalDocumentViewer.js`

### Change admin screens

Edit the files in `src/pages/admin/` first. Those are the pages mounted by the live router.

Common admin ownership:

- dashboard summary: `src/pages/admin/AdminDashboard.js`
- blog admin: `src/pages/admin/AdminBlog.js`
- FAQ admin: `src/pages/admin/AdminFAQs.js`
- analysis queue: `src/pages/admin/AdminAnalysis.js`
- quick scans: `src/pages/admin/AdminQuickScans.js`
- bulk quick scans: `src/pages/admin/AdminBulkQuickScans.js`
- users: `src/pages/admin/AdminUsers.js`
- contact inbox: `src/pages/admin/AdminContact.js`

## Styling map

Styling is mixed:

- global base styles: `src/index.css`
- app-level styles: `src/App.css`
- page-specific CSS files:
  `Home.css`, `Services.css`, `About.css`, `Contact.css`, `FAQ.css`, `Blog.css`, `BlogPost.css`, `Checkout.css`, `Success.css`
- component-specific CSS:
  `Header.css`, `Footer.css`, `ScanResultsModal.css`
- utility-class-heavy JSX is used throughout many pages

So when changing a screen, always check both the component file and its adjacent CSS file.

## Important caveats and cleanup notes

### Duplicate admin pages exist

There are admin-related files in both:

- `src/pages/`
- `src/pages/admin/`

The router mostly uses the `src/pages/admin/` versions. Some root-level admin files appear to be older or compatibility-only. Before editing an admin screen, check `src/App.js` first so you do not change an unused file.

### API calls are centralized, but not fully consistent

The app mixes:

- Axios-based wrappers from `src/api.js`
- `fetchJSON()` from `src/config/apiBase.js`
- a few direct `fetch()` calls inside pages

If you are adding a new endpoint, prefer putting it in `src/api.js` unless the page is already intentionally using `fetchJSON()` for simple unauthenticated content.

### Auth state is localStorage-based

Token and route persistence are stored in `localStorage`.

Common keys:

- `token`
- `authToken`
- `userRole`
- `adminUser`
- `lastRoute`
- `pendingInviteToken`
- `pendingInviteEmail`

If login or redirect behavior changes, search these keys before editing.

### Search is hardcoded

`src/components/SearchBar.js` does not search real backend content. It searches a static local array. If page names, sections, or pricing language change, update that file too.

## Practical editing shortcuts

If you want to quickly find the right file:

- new public page or route: `src/App.js`
- shared nav/footer issue: `src/components/Header.js` or `src/components/Footer.js`
- account/subscription issue: `src/pages/Account.js` or `src/pages/Subscription.js`
- legal issue: `src/components/LegalDocumentViewer.js`
- admin issue: `src/pages/admin/*`
- API issue: `src/api.js`
- base URL/config issue: `src/config/apiBase.js`

## Test and verification status

There is only the default CRA test scaffold in `src/App.test.js`. Compared with the backend, automated frontend coverage is very light, so UI regressions are more likely to be caught by manual testing than by tests right now.
