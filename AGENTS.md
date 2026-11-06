# THADICO DQM - Check In App (SPFx)
## AI Agent & Developer Reference Guide

> **Project Location:** `/Volumes/DATA/THADICO_local/REPO_DQM/DQM_Check_In_App`  
> **Target Environment:** SharePoint Online (`https://thadicodqm.sharepoint.com/sites/DataPortal`)  
> **Architecture Model:** SharePoint Framework (SPFx 1.24.1) Client-Side Web Part  
> **Licensing Tier:** Free (Standard Microsoft 365 / SharePoint Seeded License - No Power Apps Premium Required)

---

## 1. Project Background & Architectural Decision

### Why SPFx Instead of Power Apps Code App?
* **Problem with Power Apps Code App:** Microsoft automatically enforces a **"License designation: Premium"** policy on all Code Apps created via `@microsoft/power-apps`. Even when connecting solely to standard SharePoint lists, end-users without dedicated Power Apps Premium licenses or trials are blocked with paywall prompts (*"Start a Power Apps trial"*).
* **The SPFx Solution:** SPFx runs natively within SharePoint Online. It uses the logged-in user's existing Microsoft 365 context and communicates directly via SharePoint REST API (`SPHttpClient`).
  - **100% Free & Unlimited Users:** Covered entirely by standard Microsoft 365 enterprise licenses.
  - **Native Performance:** No iframe wrappers or Power Apps Player container latency.
  - **Single Sign-On (SSO):** Automatic Microsoft Entra ID session pass-through.

---

## 2. Technology Stack & Tooling

* **Framework:** SharePoint Framework (SPFx) `1.24.1`
* **UI Library:** React `18.3.1` with React DOM `18.3.1` (Hooks, Functional Components)
* **Build System:** `@rushstack/heft` `1.3.2` + Webpack `5.105.4` + TypeScript `~5.8.0`
* **Styling:** Custom Modern SaaS Design System (Pure CSS variables, Indigo/Blue palette `#1d4ed8`, zero external CSS framework bloat)
* **Icons:** Inline SVG icons (No external icon packages needed)
* **HTTP Client:** `@microsoft/sp-http` (`SPHttpClient` v1 configuration)

---

## 3. SharePoint Lists & Data Architecture

### Site URL
`https://thadicodqm.sharepoint.com/sites/DataPortal`

### 1. `data_checkin` (Main Records List)
* `ID` (Number): SharePoint item built-in internal ID.
* `Id` (Number): Custom Sequence / Work Item ID.
* `Name` (Single line of text): Name of the check-in person or work item.
* `Check in` (`Check_x0020_in`) (DateTime): Check-in timestamp (ISO 8601 string).
* `Location` (Single line of text): Location / Station name (e.g., ST5, Sala).
* `Note` (Single line of text): Notes / Remarks.
* `Phone` (Single line of text): Contact phone number.
* `Title` (Single line of text): Built-in SharePoint title field.

### 2. `Account` (Custom Authentication List)
* `Username` (Single line of text): User login identifier.
* `Password` (Single line of text): Plaintext credential for in-app validation.
* `Title` (Single line of text): Fallback display name or username.
* `Department` / `DeparmentName`: Department classification.

---

## 4. Directory & File Structure

```text
dqm-spfx-checkin/
├── config/
│   ├── package-solution.json    # Solution manifest & sppkg package definition
│   ├── serve.json               # Localhost HTTPS & SharePoint Workbench routing
│   └── config.json              # SPFx WebPart bundle entrypoints
├── sharepoint/
│   └── solution/
│       └── dqm-spfx-checkin.sppkg # Production package ready for App Catalog
├── src/
│   └── webparts/
│       └── dqmCheckin/
│           ├── DqmCheckinWebPart.ts        # BaseClientSideWebPart entrypoint
│           ├── DqmCheckinWebPart.manifest.json # WebPart metadata & capabilities
│           ├── types/                      # Domain & UI TypeScript types
│           │   ├── auth.types.ts
│           │   ├── checkin.types.ts
│           │   ├── common.types.ts
│           │   └── index.ts
│           ├── constants/                  # Configuration, storage keys, mocks
│           │   ├── sampleRecords.ts
│           │   ├── storageKeys.ts
│           │   ├── tableConfig.ts
│           │   └── index.ts
│           ├── utils/                      # Pure helper functions
│           │   ├── avatarUtils.ts
│           │   ├── dateUtils.ts
│           │   ├── fieldParsers.ts
│           │   └── index.ts
│           ├── services/
│           │   └── SharePointService.ts   # CRUD operations via SPHttpClient
│           ├── views/                      # Feature / Screen modules
│           │   ├── login/LoginView.tsx
│           │   ├── checkinCards/CheckinCardsView.tsx
│           │   ├── checkinTable/CheckinTableView.tsx
│           │   ├── checkinEdit/CheckinEditView.tsx
│           │   └── index.ts
│           ├── components/                 # Shared / Reusable UI components
│           │   ├── layout/
│           │   │   ├── TopAppBar.tsx
│           │   │   └── ToastAlert.tsx
│           │   ├── modals/
│           │   │   └── DeleteConfirmModal.tsx
│           │   ├── feedback/
│           │   │   ├── SkeletonLoader.tsx
│           │   │   └── ErrorState.tsx
│           │   ├── DqmCheckin.tsx         # Main Orchestrator component
│           │   ├── App.css                # SaaS Design System styles & tokens
│           │   └── index.ts
│           └── models/
│               └── DataCheckinModel.ts    # Re-export bridge for backward compat
├── AGENTS.md                    # This persistent reference guide
├── package.json
└── tsconfig.json
```

---

## 5. Key Components & Behavioral Rules

### 1. Authentication Flow (`LoginView.tsx` + `DqmCheckin.tsx`)
* The app defaults to showing the `LoginView` if no active session is found in `sessionStorage` (`dqm_spfx_session`).
* When the user clicks **Đăng Nhập**, `SharePointService.getAccounts()` queries the `Account` list directly via `SPHttpClient`.
* If credentials match, `currentUser` is saved to `sessionStorage` and the user transitions into the Check-in Management view.
* Clicking **Đăng xuất** in `TopAppBar` clears the session and resets back to `LoginView`.

### 2. Data Grid Architecture (`CheckinTableView.tsx`)
* **7 Standard Columns:**
  1. `Id` (`#field_0` or `#ID`)
  2. `Name` (Avatar + `Title`)
  3. `Phone` (`Phone` link)
  4. `Check in` (Formatted date/time)
  5. `Location` (Location badge)
  6. `Note` (Note text)
  7. `ACTION` (Edit & Delete buttons)
* **Column Resizing:** Users can drag header borders to resize columns. Double-clicking a border resets that column.
* **Persistent Widths:** Resized column widths are saved in `localStorage` under `dqm_spfx_col_widths_v2`.
* **Action Column Alignment:** The `ACTION` column is fixed at `130px`, centered, and non-sticky to prevent overlaying the `Note` column.
* **Table Responsiveness:** Wrapped in `.table-responsive` with `overflow-x: auto !important` so columns maintain their minimum widths and scroll smoothly without text clipping.

### 3. Data Service (`SharePointService.ts`)
* Uses `SPHttpClient.configurations.v1`.
* All calls specify `'Accept': 'application/json;odata=nometadata'` to minimize payload overhead.
* Updates use `POST` with headers `'X-HTTP-Method': 'MERGE'` and `'If-Match': '*'`.
* Deletions use `POST` with headers `'X-HTTP-Method': 'DELETE'` and `'If-Match': '*'`.

---

## 6. Developer Runbook & Common Commands

### Running Locally (Development Mode)
```bash
cd /Volumes/DATA/THADICO_local/REPO_DQM/DQM_Check_In_App
npm run start
```
* Local assets serve at `https://localhost:4321`.
* If testing on a new browser/machine, trust the SSL certificate once by opening:
  `https://localhost:4321/temp/build/manifests.js` $\rightarrow$ Click **Advanced** $\rightarrow$ **Proceed to localhost (unsafe)**.
* Test Workbench URL:
  `https://thadicodqm.sharepoint.com/sites/DataPortal/_layouts/15/workbench.aspx`

### Building for Production Deployment
```bash
cd /Volumes/DATA/THADICO_local/REPO_DQM/DQM_Check_In_App
npm run build
```
* Runs Heft test compilation and packages client-side assets directly into:
  📁 `sharepoint/solution/dqm-spfx-checkin.sppkg`

### Deploying to SharePoint
1. Open the SharePoint App Catalog (e.g., `https://thadicodqm.sharepoint.com/sites/appcatalog` or `sites/apps`).
2. Navigate to **Apps for SharePoint**.
3. Upload `sharepoint/solution/dqm-spfx-checkin.sppkg`.
4. Check **"Enable this app and add it to all sites"** (or add to specific sites) and click **Deploy**.
5. On any page in `DataPortal`, click **Edit** $\rightarrow$ Click **`+`** $\rightarrow$ Search and select **DqmCheckin** $\rightarrow$ **Republish**.

---

## 7. Guidelines for AI Agents Working on This Codebase

1. **Do NOT import `@microsoft/power-apps`:** This project is deliberately detached from Power Apps to eliminate licensing costs.
2. **Preserve Design Tokens:** Always use CSS variables from `App.css` (`--color-accent`, `--space-*`, `--radius-*`) instead of hardcoding random hex colors.
3. **Keep the Action Column Clean:** Do not apply `position: sticky; right: 0;` to `.td-actions` or `.th-actions`, as sticky positioning inside flex-clipped containers causes action buttons to overlap adjacent data columns.
4. **Preserve Column Resizing Contract:** Any added column must be registered in `DEFAULT_COLUMN_WIDTHS`, `MIN_COLUMN_WIDTHS`, and `<colgroup>`.
5. **Git Commit & Push Policy:** DO NOT automatically run `git commit` or `git push`. Only commit and push when the user explicitly requests or approves it.

