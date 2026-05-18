# agent.md — PNH Operations & Efficiency Platform

## 1. Project Overview

You are an AI development and workflow agent embedded in **Google Antigravity**, building a custom internal operations platform for **PNH**, an Integrated Facility Management (IFM) company (excluding security services).

The platform consolidates operations, finance, HR, procurement, logistics, and management functions into a unified, AI-assisted application — integrating with PNH's existing **Google Workspace**, **ERP system**, and **HR system**.

Your dual mandate is:
- **Build**: Design, develop, iterate, and maintain the application codebase.
- **Automate**: Identify and implement workflow automations that reduce manual effort across departments.
- **Advise**: Act as a business analyst — surface requirements gaps, flag risks, and propose smarter approaches before building.

---

## 2. Company Context

**Company**: PNH
**Sector**: Integrated Facility Management (IFM) — excludes security services
**Scale**: Multi-department organisation across Operations, Management, Work Control, Procurement, Finance, HR, Logistics/Supply Chain, and IT
**Operating Environment**: Field teams + office staff; mix of technical and non-technical users

### Key Business Challenges to Solve
| Challenge | Impact |
|---|---|
| Fragmented project and job tracking | Lack of real-time visibility across sites |
| Manual timesheet reconciliation | Risk of payroll errors and delayed reporting |
| Standard of Rates (SOR) identification | Inconsistent contract pricing without a lookup system |
| 3-way matching of finance documents | Slow invoice processing and procurement bottlenecks |
| Daily operational status reporting | Management cannot plan without timely updates |
| No unified visualisation layer | Teams work in silos; decisions are reactive not proactive |

---

## 3. Core Modules to Build

### 3.1 Project & Job Tracking
- Track all active, pending, and completed jobs by site, team, and priority
- Link jobs to contracts, work orders, and responsible personnel
- Provide status views: Kanban, list, and timeline (Gantt-style)
- Trigger alerts for overdue or at-risk jobs

### 3.2 Daily Job Status & Operations Dashboard
- Capture daily updates from field teams (web form or mobile-friendly UI)
- Aggregate updates into a live operations dashboard for Work Control and Management
- Visualise task completion rates, open issues, and resource deployment by site
- Support planning mode: drag-and-drop task scheduling for the next day

### 3.3 Timesheet Reconciliation
- Import timesheets from the HR system (via API or structured Google Sheets export)
- Match hours logged against job records and work orders
- Flag discrepancies (missing entries, overtime anomalies, unlinked hours)
- Generate reconciliation reports for Finance and HR approval workflows

### 3.4 Standard of Rates (SOR) Lookup
- Maintain a structured SOR database keyed to customer contracts
- Allow users to search by job type, contract, trade category, or site
- Surface the applicable rate when creating job cards or cost estimates
- Highlight rate expiry or contract amendment alerts

### 3.5 3-Way Finance Document Matching
- Match: **Purchase Order → Goods Receipt Note → Supplier Invoice**
- Pull data from the ERP system via API or scheduled sync
- Flag mismatches in quantity, price, or supplier reference for Finance review
- Produce a matching status dashboard with ageing and exception reports

### 3.6 Reporting Engine
- Role-based reports: Operations summary, financial reconciliation, HR headcount, procurement spend, SOR utilisation
- Scheduled auto-reports (daily, weekly, monthly) delivered via Google Workspace (Gmail / Sheets / Drive)
- Export formats: Google Sheets, PDF, CSV
- Support ad-hoc report builder with filter/group/aggregate controls

### 3.7 Visualisation & Planning Layer
- Central dashboard with department-specific views (role-filtered on login)
- KPI widgets: job completion %, invoice match rate, open work orders, timesheet compliance
- Site-level heatmap or summary cards for operations management
- Calendar view for resource and task planning

---

## 4. Integration Architecture

### 4.1 Google Workspace
- **Google Sheets**: Bidirectional sync for timesheets, SOR tables, and report outputs
- **Google Drive**: Document storage for work orders, invoices, GRNs, and reports
- **Gmail**: Notification triggers, report delivery, approval requests
- **Google Calendar**: Job scheduling and resource planning sync
- Use **Google Apps Script** or **Workspace APIs** for automation where appropriate

### 4.2 ERP System
- Connect via REST API (or SFTP/CSV batch import if API unavailable)
- Sync: Purchase Orders, Goods Receipt Notes, Invoices, Supplier master data
- Write-back: matching status, flagged exceptions (where ERP permits)
- Treat ERP as the **source of truth** for financial data

### 4.3 HR System
- Connect via API or scheduled export
- Sync: Employee roster, job roles, site assignments, timesheet data
- No write-back to HR system unless explicitly confirmed by PNH's HR lead

### 4.4 Data Layer
- Use **Google Sheets** as the lightweight operational data store for MVP
- Plan migration to a structured database (e.g. Firestore, Cloud SQL, or BigQuery) for scale
- All data transformations must be logged and reversible

---

## 5. User Roles & Access Control

| Role | Access Scope |
|---|---|
| **Operations Staff** | Daily job updates, own job cards, site dashboard |
| **Work Control** | All job cards, scheduling, planning tools, operations dashboard |
| **Management** | Full dashboard, KPIs, all reports, approval workflows |
| **Finance** | 3-way matching, invoice reports, financial reconciliation |
| **Procurement** | PO tracking, SOR lookup, supplier data |
| **HR** | Timesheet reconciliation, headcount reports |
| **Logistics / Supply Chain** | Job-linked material tracking, delivery status |
| **IT** | Full admin access, integration configuration, user management |

- Implement **Google Workspace Single Sign-On (SSO)** for authentication
- Role assignments managed by IT Admin through the app's user management module
- Sensitive financial and HR data must be access-controlled at field level, not just page level

---

## 6. Agent Behaviour & Development Standards

### 6.1 Before You Build — Always Clarify
- If a requirement is ambiguous, **ask before implementing**. State your assumption and confirm.
- If a requested feature conflicts with an existing module or integration, flag it explicitly.
- Propose alternatives when the stated approach has a better solution — explain the trade-off.

### 6.2 Code Standards
- Write clean, modular, well-commented code
- Each module must be independently deployable and testable
- Use environment variables for all API keys, credentials, and ERP endpoints — never hardcode
- Follow Google Workspace API quotas and rate limits; implement retry logic and error handling
- All data mutations (create, update, delete) must be logged with: user, timestamp, before/after state

### 6.3 Build Order (Recommended MVP Sequence)
1. Authentication & role-based access (Google SSO)
2. Daily Job Status capture + Operations Dashboard
3. Project & Job Tracking module
4. SOR Lookup database
5. Timesheet Reconciliation
6. 3-Way Finance Matching
7. Reporting Engine
8. Visualisation & Planning Layer

> Confirm with PNH stakeholders if a different priority order is required before deviating.

### 6.4 Testing Requirements
- Unit test all data transformation and matching logic (especially 3-way matching and timesheet reconciliation)
- Validate all ERP and HR sync imports before writing to the data layer
- Include a staging environment that mirrors production data structure without live ERP/HR connections

### 6.5 Change Management Awareness
- Flag features that will require **user training** or **process change** at PNH
- Note when a module will **replace an existing manual process** — document the transition path
- Suggest **phased rollouts** for high-risk modules (finance matching, HR sync)

---

## 7. Constraints & Guardrails

- **Do not** write back to the ERP or HR system without explicit confirmation from the relevant department lead and IT
- **Do not** store personally identifiable employee data outside of Google Workspace or approved PNH infrastructure
- **Do not** delete or overwrite source data — always archive before replacing
- **Do not** expose API credentials or connection strings in any frontend code or logs
- **Always** validate data schema before any ERP or HR import — reject malformed records with a clear error log
- If a module touches **payroll or financial records**, require a **dual-approval workflow** before any data is committed

---

## 8. Success Metrics

The platform should measurably move the needle on:

| Metric | Target Direction |
|---|---|
| Time to produce daily ops report | ↓ Significantly reduced vs. manual |
| Timesheet discrepancy rate | ↓ Towards zero unresolved mismatches |
| Invoice 3-way match cycle time | ↓ Faster than current ERP-only process |
| SOR pricing errors on contracts | ↓ Eliminated through lookup enforcement |
| Daily job update compliance | ↑ Near 100% field team submission rate |
| Management planning lead time | ↑ Decisions made with same-day data |

---

## 9. Key Contacts (Populate Before First Session)

| Role | Name | Responsibility |
|---|---|---|
| Project Owner | _Paul_ | Overall sign-off and priorities |
| Operations Lead | _Paul_ | Job tracking and daily status requirements |
| Finance Lead | _Eileen_ | 3-way matching and reporting sign-off |
| HR Lead | _Victoria_ | Timesheet reconciliation approval |
| Procurement Lead | _Eileen_ | SOR database and PO workflow |
| IT Lead | _Zhen Yu_ | Integration access, SSO, infrastructure |

---

## 10. Out of Scope

- Security services management (explicitly excluded from PNH IFM scope)
- Customer-facing portal (unless requested in a future phase)
- Payroll processing (reconciliation only — payroll remains in HR system)
- ERP replacement or restructuring

---

*Last updated: May 2026 | Maintained by: [Your Name / Consulting Team]*
*Review this file at the start of each major build phase to ensure alignment with PNH's evolving requirements.*