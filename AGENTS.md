# THADICO DQM - Check In App (SPFx)

## AI Agent & Developer Reference Guide

> **Project Location:** `/Volumes/DATA/THADICO_local/REPO_DQM/DQM_Check_In_App`
> **Target Environment:** SharePoint Online (Dev: `https://ytf84.sharepoint.com/sites/metro-checkin-dev`)
> **Architecture Model:** SharePoint Framework (SPFx 1.24.1) Client-Side Web Part
> **Licensing Tier:** Free (Standard Microsoft 365 Seeded License - Zero Power Apps Premium cost)

---

## 1. Project Background & Architectural Decision

### Why SPFx Instead of Power Apps Code App?

* **Tránh rào cản bản quyền:** Power Apps Code App luôn bị Microsoft gán nhãn *"Premium"*, ép người dùng mua license riêng.
* **Giải pháp SPFx:** Chạy trực tiếp trong SharePoint Online bằng tài khoản Microsoft 365 có sẵn của người dùng:
  - **Miễn phí 100%:** Sử dụng license M365 tiêu chuẩn, không giới hạn số lượng người dùng.
  - **Hiệu năng gốc (Native):** Kết nối trực tiếp REST API qua `SPHttpClient`, không có iframe hay container trễ.
  - **SSO tự động:** Tận dụng phiên đăng nhập Microsoft Entra ID hiện tại.

---

## 2. Technology Stack & Tooling

* **Framework:** SharePoint Framework (SPFx) `1.24.1`
* **UI Library:** React `18.3.1` (Hooks, Functional Components)
* **Build System:** `@rushstack/heft` `1.3.2` + Webpack `5.105.4` + TypeScript `~5.8.0`
* **Styling:** Custom Modern SaaS Design System (Pure CSS variables trong `src/core/styles/portal.css`, palette `#1d4ed8`)
* **HTTP Client:** `@microsoft/sp-http` (`SPHttpClient` v1)

---

## 3. SharePoint Lists & Data Architecture

WebPart tự động nhận diện site hiện hành qua `pageContext.web.absoluteUrl` (hoặc cấu hình `siteUrl` qua Property Pane). Dữ liệu gồm 2 danh sách chính:

### 1. `data_checkin` (Main Records List)
* `ID` (Number): ID nội bộ của SharePoint.
* `Id` (Number): Mã định danh số thứ tự check-in hiển thị (#ID).
* `Name` (Text): Họ và tên người check-in.
* `Check in` (`Check_x0020_in`) (DateTime): Thời gian check-in (ISO 8601 string).
* `Location` (Text): Tên vị trí / trạm (VD: ST5, Sala...).
* `Note` (Text): Ghi chú công việc.
* `Phone` (Text): Số điện thoại liên hệ.
* `Title` (Text): Tiêu đề chuẩn của SharePoint.

### 2. `UserProfiles` (Role & Department Authorization List)
* `Email` / `Title` / `field_1` (Text): Email tài khoản Microsoft 365 (UPN).
* `Username` / `field_2` (Text): Mã định danh hoặc Tên người dùng.
* `DepartmentCode` / `field_3` (Text): Mã phòng ban (VD: ADMIN, DIRC...).
* `DepartmentName` / `field_4` (Text): Tên phòng ban hiển thị (VD: Admin site, Bộ phận Giao diện...).
* `Role` / `field_5` (Text): Vai trò người dùng (`admin`, `user`).

---

## 4. Directory & File Structure

```text
DQM_Check_In_App/
├── config/                      # Cấu hình SPFx build, workbench serve & package solution
├── sharepoint/solution/         # Gói cài đặt thành phẩm (workspace_portal.sppkg)
├── src/
│   ├── entry/                   # Điểm vào SPFx: PortalWebPart.ts, manifest, loc/
│   ├── app/                     # Khung portal: PortalShell.tsx (auth + chọn module), moduleRegistry.tsx, IPortalProps.ts
│   ├── core/                    # Dùng chung cho mọi module (KHÔNG import từ modules/)
│   │   ├── auth/                # Session, UserProfileService, extractCleanEmail, checkIsAdmin
│   │   ├── services/            # SharePointClient (generic CRUD qua SPHttpClient)
│   │   ├── components/layout/   # TopAppBar, ToastAlert
│   │   ├── types/ constants/ utils/
│   │   └── styles/portal.css    # Design System CSS tokens & styling
│   ├── modules/
│   │   ├── home/                # HomeView: trang chủ liệt kê module từ registry
│   │   └── checkin/             # Module 1: CheckinModule, views/, components/, services/, types/, constants/, utils/
│   └── assets/
├── AGENTS.md
└── package.json

---

## 5. Key Components & Behavioral Rules

### 1. Portal Architecture & Authentication Flow (Landing Page + Zero-Click SSO)

* **Portal Landing Page:** On entry, users land on the modern SaaS Welcome Portal (`modules/home/HomeView.tsx`). It greets the user with their verified Microsoft 365 identity, role badge, department, and an overview of system features.
* **Call to Action (CTA):** A primary button **"Vào Danh Sách Check-in"** guides the user directly into the active management grid (Cards or Table mode).
* **Return Home Navigation:** Inside the check-in list, users can click the **"Trang Chủ"** button on `TopAppBar` to return to the Landing page at any time.
* **Top Header Identity:** Inside the check-in list, the top bar directly displays the user's M365 Email, Role Badge, and Department, omitting redundant app titles and duplicate pills for a clean experience on both desktop and mobile.
* **Zero-Click SSO & Profile Resolution:** Identity is resolved via Microsoft Entra ID (`pageContext.user.email` / `loginName`) against the `UserProfiles` list.
  - If a matching email is found, role and department are seamlessly assigned.
  - In development or QA, the Landing Page includes a testing Profile Switcher to easily toggle between Admin and User (DIRC) accounts without re-authenticating with Microsoft 365.

### 2. Data Grid Architecture (`modules/checkin/views/CheckinTableView.tsx`)

* **7 Standard Columns:**
  1. `Id` (`#field_0` or `#ID`)
  2. `Name` (Avatar + `Title`)
  3. `Phone` (`Phone` link)
  4. `Check in` (Formatted date/time)
  5. `Location` (Location badge)
  6. `Note` (Note text)
  7. `ACTION` (Edit & Delete buttons)
* **Column Resizing:** Users can drag header borders to resize columns. Double-clicking a border resets that column.
* **Persistent Widths:** Resized column widths are saved in `localStorage` under `portal_checkin_col_widths_v2`.
* **Action Column Alignment:** The `ACTION` column is fixed at `130px`, centered, and non-sticky to prevent overlaying the `Note` column.
* **Table Responsiveness:** Wrapped in `.table-responsive` with `overflow-x: auto !important` so columns maintain their minimum widths and scroll smoothly without text clipping.

### 3. Data Service (`CheckinService.ts` / `SharePointClient.ts`)

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
* Test Workbench URLs:
  - **Khuyến nghị (Live-Reload mượt mà, không bị popup cảnh báo):**
    `https://ytf84.sharepoint.com/sites/metro-checkin-dev/_layouts/15/workbench.aspx?reset=true`
  - **Dự phòng (Explicit Manifest - yêu cầu bấm "Load debug scripts"):**
    `https://ytf84.sharepoint.com/sites/metro-checkin-dev/_layouts/15/workbench.aspx?debugManifestsFile=https%3A%2F%2Flocalhost%3A4321%2Ftemp%2Fbuild%2Fmanifests.js&debug=true&noredir=true`

### Building for Production Deployment

```bash
cd /Volumes/DATA/THADICO_local/REPO_DQM/DQM_Check_In_App
npm run build
```

* Runs Heft test compilation and packages client-side assets directly into:
  📁 `sharepoint/solution/workspace_portal.sppkg`

### Deploying to SharePoint

1. Open the SharePoint App Catalog (e.g., `https://ytf84.sharepoint.com/sites/appcatalog` or tenant app catalog).
2. Navigate to **Apps for SharePoint**.
3. Upload `sharepoint/solution/workspace_portal.sppkg`.
4. Check **"Enable this app and add it to all sites"** (or add to specific sites) and click **Deploy**.
5. On any page in your SharePoint site, click **Edit** $\rightarrow$ Click **`+`** $\rightarrow$ Search and select **Workspace Portal** $\rightarrow$ **Republish**.

---

## 7. Guidelines for AI Agents Working on This Codebase

1. **Do NOT import `@microsoft/power-apps`:** This project is deliberately detached from Power Apps to eliminate licensing costs.
2. **Preserve Design Tokens:** Always use CSS variables from `portal.css` (`--color-accent`, `--space-*`, `--radius-*`) instead of hardcoding random hex colors.
3. **Keep the Action Column Clean:** Do not apply `position: sticky; right: 0;` to `.td-actions` or `.th-actions`, as sticky positioning inside flex-clipped containers causes action buttons to overlap adjacent data columns.
4. **Preserve Column Resizing Contract:** Any added column must be registered in `DEFAULT_COLUMN_WIDTHS`, `MIN_COLUMN_WIDTHS`, and `<colgroup>`.
5. **Git Commit & Push Policy:** DO NOT automatically run `git commit` or `git push`. Only commit and push when the user explicitly requests or approves it.
6. **Standard Recipe for Adding a New Module (e.g. `tasks`):**
   - Create `src/modules/<name>/` with `<Name>Module.tsx` (receives `ModuleProps`), `views/`, `components/`, `services/<Name>Service.ts`, `types/<name>.types.ts`, `constants/`, `utils/`, and `index.ts` exporting a `PortalModule`.
   - Only files belonging to a module carry that module's name (e.g. `Checkin*`). Shared code in `core/` and `app/` must not contain module names or company names.
   - Register the module in `src/app/moduleRegistry.tsx`; `HomeView` lists it automatically and `PortalShell` opens it on click.
   - SharePoint access: build module services on `core/services/SharePointClient`; list names live in the module's service file.
   - Dependencies are one-way: `modules/*` → `core/*`; `core/` never imports `modules/`; modules never import each other.
   - Storage keys use the prefix `portal_<module>_...`. Use CSS variables from `core/styles/portal.css`.
