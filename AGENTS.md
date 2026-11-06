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
* **Styling:** Custom Modern SaaS Design System (Pure CSS variables trong `App.css`, palette `#1d4ed8`)
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

### 2. `Account` (Custom Authentication List)
* `Username` (Text): Tên đăng nhập.
* `Password` (Text): Mật khẩu xác thực.
* `Title` (Text): Tên hiển thị fallback.
* `Department` / `DeparmentName`: Phân loại phòng ban.

---

## 4. Directory & File Structure

```text
DQM_Check_In_App/
├── config/                      # Cấu hình SPFx build, workbench serve & package solution
├── sharepoint/solution/         # Gói cài đặt thành phẩm (myapp.sppkg) cho App Catalog
├── src/webparts/dqmCheckin/     # Mã nguồn chính của WebPart
│   ├── DqmCheckinWebPart.ts     # Entry point kết nối SharePoint BaseClientSideWebPart
│   ├── views/                   # Màn hình chức năng (views/<feature>/<Feature>View.tsx)
│   ├── components/              # UI dùng chung phân tầng:
│   │   ├── layout/              # Khung giao diện (TopAppBar, ToastAlert...)
│   │   ├── modals/              # Các hộp thoại popup (DeleteConfirmModal...)
│   │   ├── feedback/            # Trạng thái phản hồi (SkeletonLoader, ErrorState...)
│   │   ├── DqmCheckin.tsx       # Component điều phối trung tâm (Orchestrator)
│   │   └── App.css              # Design System CSS tokens & toàn bộ styling
│   ├── services/                # Tầng kết nối dữ liệu (SharePointService.ts qua SPHttpClient)
│   ├── types/                   # Định nghĩa TypeScript interfaces & domain types
│   ├── constants/               # Giá trị cấu hình tĩnh, Mock data & Storage keys
│   └── utils/                   # Các hàm tiện ích dùng chung (date, avatar, parsers...)
├── AGENTS.md                    # Tài liệu quy chuẩn kiến trúc & chỉ dẫn cho AI Agent
└── package.json                 # Cấu hình dependencies & build scripts
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
  📁 `sharepoint/solution/myapp.sppkg`

### Deploying to SharePoint

1. Open the SharePoint App Catalog (e.g., `https://ytf84.sharepoint.com/sites/appcatalog` or tenant app catalog).
2. Navigate to **Apps for SharePoint**.
3. Upload `sharepoint/solution/myapp.sppkg`.
4. Check **"Enable this app and add it to all sites"** (or add to specific sites) and click **Deploy**.
5. On any page in your SharePoint site, click **Edit** $\rightarrow$ Click **`+`** $\rightarrow$ Search and select **DqmCheckin** $\rightarrow$ **Republish**.

---

## 7. Guidelines for AI Agents Working on This Codebase

1. **Do NOT import `@microsoft/power-apps`:** This project is deliberately detached from Power Apps to eliminate licensing costs.
2. **Preserve Design Tokens:** Always use CSS variables from `App.css` (`--color-accent`, `--space-*`, `--radius-*`) instead of hardcoding random hex colors.
3. **Keep the Action Column Clean:** Do not apply `position: sticky; right: 0;` to `.td-actions` or `.th-actions`, as sticky positioning inside flex-clipped containers causes action buttons to overlap adjacent data columns.
4. **Preserve Column Resizing Contract:** Any added column must be registered in `DEFAULT_COLUMN_WIDTHS`, `MIN_COLUMN_WIDTHS`, and `<colgroup>`.
5. **Git Commit & Push Policy:** DO NOT automatically run `git commit` or `git push`. Only commit and push when the user explicitly requests or approves it.
6. **Standard Recipe for Adding New Screens & Modules:**
   - **New Screen / View:** Always place under `src/webparts/dqmCheckin/views/<featureName>/<FeatureName>View.tsx` (e.g. `views/analytics/AnalyticsView.tsx`).
   - **Views Barrel Export:** Always register and export the new view in `src/webparts/dqmCheckin/views/index.ts`.
   - **Types & Interfaces:** Place domain types into a dedicated file under `src/webparts/dqmCheckin/types/<domain>.types.ts` and re-export in `src/webparts/dqmCheckin/types/index.ts`. Never use inline interfaces for shared models.
   - **API / Services:** Add any new SharePoint list queries or mutations as typed methods inside `src/webparts/dqmCheckin/services/SharePointService.ts`.
   - **Shared UI Components:** If the new feature introduces reusable UI pieces (modals, bars, spinners), place them into appropriate subfolders in `components/` (`layout/`, `modals/`, `feedback/`) and re-export via `components/index.ts`.
   - **Design Tokens:** Always utilize existing CSS variables in `App.css` to maintain visual consistency.
   - **Integration:** Wire the new screen into the orchestrator `components/DqmCheckin.tsx` via state-driven view routing or view switcher.
