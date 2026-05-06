# Silver Surfers - Project Navigation & Milestone 1 File Mapping

This document provides a comprehensive guide to navigating the Silver Surfers project repository, specifically outlining the file locations for all the required features outlined in **Milestone 1**.

## 1. How to Navigate the Complete Project

The repository is structured as a full-stack application with a clear separation between the frontend (React) and the backend (Node.js/Express).

### High-Level Folder Structure

```text
/home/mdpahlovi/Projects/Silver-Surfers
├── backend/               # Node.js Express Backend
│   ├── src/               # Application source code
│   │   ├── app/           # App initialization (Express setup)
│   │   ├── config/        # Environment and DB configurations
│   │   ├── features/      # Domain-driven feature modules (Audits, Auth, Billing)
│   │   ├── infrastructure/# Database, Caching, and Queue (BullMQ) integrations
│   │   ├── middleware/    # Express middlewares (RBAC, auth)
│   │   ├── models/        # Mongoose data models
│   │   ├── shared/        # Shared utilities, error handling, types
│   │   └── server.ts      # Main backend entry point
│   ├── python-scanner/    # Standalone scanner scripts (Lighthouse runner)
│   └── package.json       # Backend dependencies (Mongoose, BullMQ, Puppeteer, Lighthouse)
├── frontend/              # React Frontend Application
│   ├── public/            # Static assets (HTML, favicons, robots.txt)
│   └── src/               # React source code
│       ├── components/    # Reusable UI components
│       ├── layouts/       # Shared page layouts (AdminLayout)
│       ├── pages/         # Page-level components
│       ├── api.js         # API client layer
│       └── App.js         # React router and main app wrapper
└── docker-compose.yml     # Infrastructure orchestration
```

- **Backend (`backend/`):** Follows a domain-driven feature structure (`backend/src/features/`). This makes it highly modular. E.g., everything related to audits (controllers, routes, services, reporting) lives in `backend/src/features/audits/`.
- **Frontend (`frontend/`):** A standard React application setup. The routing maps page components from `frontend/src/pages/` to URLs. Reusable components live in `frontend/src/components/`.

---

## 2. Milestone 1 – Feature to File Mapping

Below is a detailed breakdown of where each component of Milestone 1 is implemented within the codebase.

### 1. Core Audit Engine (Foundation)

This is the heart of the scanning mechanism.

- **URL Input API (Backend):**
    - **Routes & Controller:** `backend/src/features/audits/audits.routes.ts` & `backend/src/features/audits/audits.controller.ts`
    - **Quick Scan Processing:** `backend/src/features/audits/quick-scan.processor.ts`
- **Scan Job System (Queue-based):**
    - **Queue Infrastructure:** `backend/src/infrastructure/queues/`
    - **Job Processors:** `backend/src/features/audits/audit-processors.ts`
    - **Worker Entry Point:** `backend/src/worker.ts`
- **Integrate axe-core & Google Lighthouse:**
    - **Lighthouse Runner:** `backend/python-scanner/lighthouse_runner.js`
    - **Scanner Logic / Puppeteer / Axe:** `backend/src/features/audits/scanner/`
    - **Scanner Clients:** `backend/src/features/scanner/scanner-client.ts`
- **Multi-Device Simulation:** Handled within the scanner configurations:
    - Configurations: `backend/src/features/audits/scanner/custom-config.js` & `backend/src/features/audits/scanner/custom-config-lite.js`

### 2. Silver Score System (Core Logic)

Handles scoring logic across the 8 dimensions.

- **Scoring Logic & Weight Calculations:** `backend/src/features/audits/scanner/scoring-logic.ts`
- **Scorecard Generation:** `backend/src/features/audits/audit-scorecard.ts`

### 3. WCAG Mapping Layer

Maps axe issues to specific WCAG 2.1/2.2 AA codes, severity, and recommendations.

- **WCAG Mapping & Normalization:** Handled inside the scanner and scoring logic at `backend/src/features/audits/scanner/scoring-logic.ts` and `backend/src/features/audits/full-audit.helpers.ts`.

### 4. AI Reporting Layer (Basic)

Integrates OpenAI API to generate business-friendly explanations.

- **OpenAI Integration & Prompt Logic:** `backend/src/features/audits/ai-reporting.ts`

### 5. PDF Report Generator (Enhanced but NOT Enterprise)

Generates the downloadable PDF report with the 8-dimension breakdown, scores, and clean layouts.

- **PDF Generator Engine:** `backend/src/features/audits/scanner/pdf-generator.js` and `backend/src/features/audits/scanner/pdf-generator-lite.js`
- **Report Delivery/Generation Orchestration:** `backend/src/features/audits/report-generation.ts` and `backend/src/features/audits/report-delivery.ts`
- **Report Files Management:** `backend/src/features/audits/report-files.ts`

### 6. Basic User Dashboard

Allows users to submit URLs, see scan history, and download reports.

- **Frontend Components:**
    - **URL Submission:** `frontend/src/components/SearchBar.js` (often used on `Home.js`)
    - **Scan History / Dashboard:** `frontend/src/pages/Account.js`
    - **Report Detail Views:** `frontend/src/pages/AnalysisDetail.js`, `frontend/src/pages/QuickScanDetail.js`
    - **Scan Results Modal:** `frontend/src/components/ScanResultsModal.js`
- **Backend Integration:**
    - **User History APIs:** `backend/src/features/records/` and `backend/src/features/audits/analysis-reports.ts`

### 7. Data Model (Critical)

The Mongoose schemas that hold the system together.

- **All Models are located in:** `backend/src/models/`
    - **User:** `backend/src/models/user.model.ts`
    - **Scan & ScanResult (Analysis Record):** `backend/src/models/analysis-record.model.ts`
    - **Audit Job:** `backend/src/models/audit-job.model.ts`
    - **Quick Scan:** `backend/src/models/quick-scan.model.ts`
    - **Shared Schemas (Issues, Scores):** `backend/src/models/shared-schemas.ts`

### 8. API & Infrastructure Setup

The environment setups to hook up OpenAI, DB, and external tools.

- **Environment Configuration Loader:** `backend/src/config/env.ts`
- **Docker Setup:** `docker-compose.yml`, `backend/Dockerfile`, `backend/Dockerfile.scanner`, `backend/Dockerfile.worker`
- **Environment Variables:** Handled via `.env` files in both `backend/.env` and `frontend/.env` (Note: ensure you populate your OpenAI API keys and DB URI here).
