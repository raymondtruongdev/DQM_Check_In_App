# THADICO DQM - Workspace Portal (SPFx)

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
* **Styling:** Custom Modern SaaS Design System (Pure CSS variables trong `src/core/styles/portal.css`, accent `#1d4ed8`, một tông xanh duy nhất)
* **Icons:** Fluent UI System Icons (`@fluentui/react-icons`, bản Regular) qua component `core/components/Icon.tsx` (tree-shaken, bundle ~205KB)
* **HTTP Client:** `@microsoft/sp-http` (`SPHttpClient` v1)

---

## 3. SharePoint Lists & Data Architecture

WebPart tự động nhận diện site hiện hành qua `pageContext.web.absoluteUrl` (hoặc cấu hình `siteUrl` qua Property Pane). Dữ liệu gồm danh sách `UserProfiles` (phân quyền) và thư viện tài liệu `CapNhatCongViec` (module Report):

### 1. `UserProfiles` (Role & Department Authorization List)
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
│   │   ├── components/          # Icon (Fluent), layout/ (TopAppBar, ToastAlert)
│   │   ├── types/ constants/ utils/
│   │   └── styles/portal.css    # Design System CSS tokens & styling
│   ├── modules/
│   │   ├── home/                # HomeView: trang chủ liệt kê module từ registry
│   │   └── report/              # Module: Quản lý Report (Report_Role.xlsx, Daily/Weekly report, tree-table, SharePoint data/<Unit>/<DocID>_<yyyyMMdd>/)
│   └── assets/
├── AGENTS.md
└── package.json

---

## 5. Key Components & Behavioral Rules

### 1. Portal Architecture & Authentication Flow (Landing Page + Zero-Click SSO)

* **Portal Landing Page:** On entry, users land on the modern SaaS Welcome Portal (`modules/home/HomeView.tsx`). It greets the user with their verified Microsoft 365 identity, role badge, department, and an overview of system features.
* **Module Tiles:** The Landing page lists modules from `moduleRegistry.tsx`; clicking an active tile opens that module.
* **Return Home Navigation:** Inside a module, users can click the **"Trang Chủ"** button to return to the Landing page at any time.
* **Zero-Click SSO & Profile Resolution:** Identity is resolved via Microsoft Entra ID (`pageContext.user.email` / `loginName`) against the `UserProfiles` list.
  - If a matching email is found, role and department are seamlessly assigned.
  - In development or QA, the Landing Page includes a testing Profile Switcher to easily toggle between Admin and User (DIRC) accounts without re-authenticating with Microsoft 365.

### 2. Data Service (`SharePointClient.ts`)

* Uses `SPHttpClient.configurations.v1`.
* All calls specify `'Accept': 'application/json;odata=nometadata'` to minimize payload overhead.
* Updates use `POST` with headers `'X-HTTP-Method': 'MERGE'` and `'If-Match': '*'`.
* Deletions use `POST` with headers `'X-HTTP-Method': 'DELETE'` and `'If-Match': '*'`.

### 3. Report Management Module (`modules/report`)

* **Storage Model:** Uses the SharePoint Document Library (`CapNhatCongViec`).
  - Permissions: `Report_Role.xlsx` (sheet `Role`: `ID`, `Unit`, `DocID`, `DocTitle`, `Site manager`, `Email`, `Status`).
  - Base Templates: `_template/<DocID>_template.xlsx` (`DailyReport_template.xlsx`, `WeeklyReport_template.xlsx`).
  - Daily/Weekly Report Folders & Files: `data/<Unit>/<DocID>_<yyyyMMdd>/<DocID>_<yyyyMMdd>.xlsx` (e.g. `data/ST01/DailyReport_20261110/DailyReport_20261110.xlsx`).
  - Site Photos Subfolder: `data/<Unit>/<DocID>_<yyyyMMdd>/photos/` (uploaded/deleted directly from the form via `ReportFileService`).
* **Role Authorization (`core/services/RoleResolutionService.ts`):** User email matches `Report_Role.xlsx` with `Status = TRUE` for valid DocIDs (`DailyReport`, `WeeklyReport`). Admin (`UserProfiles.Role = admin`) has access to all active assignments.
* **Navigation & Tile Buttons (`ReportLandingView.tsx`):**
  - Landing page shows tile buttons based on assigned roles (e.g. `ST01 DailyReport`, `ST01 WeeklyReport`, `ST02 DailyReport`), grouped with unit tabs and search filter.
* **6-Sheet Daily Report Architecture (`DailyReport_template.xlsx` & `reportCodec.ts`):**
  - `01_General`: Key-Value metadata (`DocTile`, `DocTileEn`, `SubTile`, `DocCode`, `Location`, `ReportNo`, `ReportDate`, `Shift`, `WeatherAM`, `WeatherPM`, `MaxTemp`, `HrsLost`, `ProgressEval`, `Summary`, `ManpowerSummary`, `EquipmentSummary`, `WorkQtySummary`, `MaterialsSummary`, `WorksPlanSummary`, `IssuesSummary`, `WorksToday`, `PlanTomorrow`, HSE KPIs, `PreparedBy`, `SiteManager`, `TcjvRep`, `EngineerAck`, `ApprovalComment`). Không còn `ApprovedAt` (bỏ nút xác nhận duyệt; ngày lưu = `Ngày | Date`) và `DataChecks` (K01..K12 đã bỏ hoàn toàn).
  - `02_Manpower`: `Org | Category | Nos | Hrs | ManHrs | IsLocked` (auto-calculates `ManHrs = Nos * Hrs` and totals).
  - `03_Equipment`: `Equipment | Qty | Hrs | Status | Remark | IsLocked`.
  - `04_WorkQty`: `ActivityID | Item | Unit | Plan | Actual | Percent | Remark | IsLocked` (auto-calculates `Percent = round(Actual / Plan * 100)`).
  - `05_Materials`: `Material | Unit | Recv | Used | MirMar | IsLocked`.
  - `06_Issues`: `IssueID | Description | Severity | CriticalPath | Owner | DueDate | Status | IsLocked`.
  - `07_Tasks` (optional, used for `WeeklyReport` tree-table with automatic parent rate calculation).
* **⚠️ WeeklyReport hiện chỉ là placeholder:** tile `WeeklyReport`, file template tuần tạm và code module tuần (`ReportTaskTable`, sheet `07_Tasks`, tính tỉ lệ cha/con) chỉ dùng để hiển thị UI, chưa phải tính năng hoàn chỉnh. Chủ dự án sẽ làm phần báo cáo tuần sau. Không test, sửa logic hay mở rộng phần riêng của weekly (task tree, template/data tuần) và không coi đó là việc tồn đọng cho tới khi được yêu cầu; chỉ giữ UI dùng chung (nút, icon, token) nhất quán.
* **Locked Predefined Template Rows (`IsLocked`):**
  - Rows with `IsLocked = TRUE` in the template (by default `TCJV` and `NTP-TV01` in `02_Manpower`, and `<Unit>-DW-1120` / `<Unit>-DW-1130` in `04_WorkQty`) cannot be deleted (`🔒` badge replaces `×` button) and their key identifier columns (`Org`, `Category`, `ActivityID`, `Item`, `Unit`) are `readOnly`. Users can still edit quantities/hours and add/delete custom rows (`IsLocked = FALSE`).
* **Smart Data Loading & Previous-Day Prefill (`ReportDataService.loadReport`):**
  1. If `data/<Unit>/<DocID>_<yyyyMMdd>/<DocID>_<yyyyMMdd>.xlsx` exists on SharePoint, loads that exact report (`isExisting = true`).
  2. Otherwise, looks for the adjacent previous day's report (`dateStr - 1 day`) or scans `data/<Unit>/` subfolders for the closest prior `<DocID>_<yyyyMMdd>` report (`getPreviousReportFile`). If found, pre-fills the form from that previous report (`copiedFromDate` badge shown, `isExisting = false`).
  3. If no prior report exists for that unit, falls back to `_template/<DocID>_template.xlsx`.
* **A4 Print Preview & PDF Export (`ReportPrintPreviewModal.tsx`):**
  - Renders the bilingual report (Sections I $\rightarrow$ VIII + 4-column Signature block) in A4 portrait layout (`Mau_BCN_ST06_20261025.pdf` standard) with continuous page flow (no blank page gaps when dynamic rows are added) and full table borders.
  - Ngắt trang: tiêu đề mục + hàng tiêu đề + 2 dòng đầu luôn đi cùng nhau, 2 dòng cuối không bị bỏ lẻ (`break-after: avoid` trên `thead tr`, `tbody tr:first-child`, `tbody tr:nth-last-child(2)`); phần giữa chảy liên tục. Trên điện thoại khung xem trước giữ bề rộng A4 tối thiểu và cuộn ngang.
  - Ảnh hiện trường: nếu có ảnh trong `photos/`, bản in thêm một dòng cuối bảng mục VIII, dưới "Kế hoạch ngày mai (tóm tắt)" (2 ảnh/hàng, mỗi ảnh có tên file; ảnh không bị ngắt giữa hai trang). `handlePrint` đợi mọi ảnh tải xong (tối đa 20s) rồi mới gọi `window.print()`; URL ảnh là tuyệt đối để iframe in tải được bằng phiên SharePoint.
* **Save & Overwrite:**
  - Automatically ensures `data/<Unit>` and `data/<Unit>/<DocID>_<yyyyMMdd>/` exist before saving, with ETag concurrency protection.
* **SheetJS Lazy-Loading:** Loaded via dynamic `import(/* webpackChunkName: 'xlsx' */ 'xlsx')` so other modules do not incur bundle overhead.

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
2. **Preserve Design Tokens:** Always use CSS variables from `portal.css` (`--color-accent`, `--space-*`, `--radius-*`) instead of hardcoding random hex colors. Không dùng `!important` (reset nút dùng `:where()` nên mọi class đều ghi đè được). Ngoại lệ duy nhất: CSS in A4 trong `ReportPrintPreviewModal.tsx` (iframe riêng, màu cố định theo mẫu giấy: tiêu đề mục `#014a94`, nền hàng tiêu đề `#dbe6f1`, `DAILY REPORT` đỏ `#c00000`).
   - **Nút:** chỉ dùng `.btn` + biến thể: `btn--primary` (hành động chính: Lưu, Tải template), `btn--secondary` (mọi nút còn lại: Trang chủ, Quay lại, Làm mới, In), `btn--ghost` / `btn--ghost-danger` (nút nhỏ trong bảng), `btn--danger` (chỉ thao tác phá huỷ), `btn--light` (trên banner xanh đậm); cỡ `btn--sm`, `btn--icon`. Một tông xanh, KHÔNG tạo class nút riêng theo module (như `report-btn-*`).
   - **Chiều cao điều khiển:** dùng `--control-h` (40px; tự lên 44px khi ≤768px hoặc màn cảm ứng) và `--control-h-sm` (32px → 36px). Không đặt `height` cứng cho nút/ô nhập.
   - **Icon:** luôn dùng `<Icon name="..." size={16|20|24} />` (thêm icon mới vào bảng `ICONS` trong `Icon.tsx`); không viết `<svg>` tay hay emoji/ký tự (×, ✓, 🔒) làm icon giao diện. Ngoại lệ: hình thương hiệu của ô module trong `moduleRegistry.tsx`.
   - **Ô nhập & bảng:** ô nhập dùng class có trong khối form của `portal.css` (`.portal-input`, `.report-info-input`, `.report-cell-input`...) và phải `box-sizing: border-box`; bảng nhập liệu bọc trong `.table-responsive`.
3. **Git Commit & Push Policy:** DO NOT automatically run `git commit` or `git push`. Only commit and push when the user explicitly requests or approves it.
4. **Responsive & Cross-Device UI Rules (BẮT BUỘC khi thêm/sửa giao diện):**
   - **Kiểm tra mọi cỡ màn hình:** desktop rộng (≥1440px), laptop (1024–1440px), **iPad mini / tablet dọc (768px)**, tablet ngang (1024px), điện thoại (≤480px). Mỗi thay đổi UI phải được rà lại ở các cỡ này, không chỉ ở desktop.
   - **Breakpoints chuẩn:** `≤1024px` (tablet), `≤768px` (iPad mini / tablet nhỏ), `≤640px` và `≤480px` (điện thoại). Đặt media query ở cuối file CSS của phạm vi đó (`core/styles/portal.css` hoặc `modules/<name>/<name>.css`). Lưu ý các quy tắc `@media` cũ có thể ghi đè; khi thêm quy tắc mới phải kiểm tra xung đột (đặc biệt tại đúng 768px).
   - **Không để nội dung bị cắt hoặc mất:** lưới dùng `repeat(N, minmax(0, 1fr))`, phần tử con flex/grid có `min-width: 0`; không dùng `white-space: nowrap` trên khối chứa văn bản dài nếu không có `text-overflow: ellipsis` hoặc cho phép xuống dòng. Không dùng `overflow: hidden` ở thẻ cha làm cắt cột bên phải.
   - **Không bóp chữ:** tiêu đề, badge, nút không được bị bẻ từng chữ. Nếu thiếu chỗ thì cho nhóm điều khiển xuống hàng (`flex-wrap: wrap`) thay vì ép `nowrap` toàn bộ hàng.
   - **Bố cục logic theo cỡ màn hình:** desktop/tablet: tiêu đề bên trái, điều khiển (sắp xếp, làm mới, view tabs) bên phải cùng hàng; điện thoại: xếp dọc, điều khiển rộng hết chiều ngang, dùng 1 cột thẻ. Tablet: 2 cột thẻ. Giới hạn bề rộng nội dung (`max-width: 1440px`, căn giữa) trên màn hình rộng.
   - **Chuyên nghiệp & nhất quán:** dùng token trong `portal.css`, khoảng cách theo `--space-*`, vùng chạm tối thiểu ~36–44px trên cảm ứng, căn hàng đều giữa các nhóm điều khiển, bảng dữ liệu cuộn ngang trong `.table-responsive` thay vì tràn trang.
   - **Xác minh trước khi báo hoàn thành:** build sạch (`npm run build`, 0 cảnh báo lint) và, nếu có thể, kiểm tra trực quan ở 1440px, 1024px, 768px, 390px. Nếu không kiểm tra được trực quan, phải nói rõ với người dùng là chưa xem lại trên thiết bị.
5. **Standard Recipe for Adding a New Module (e.g. `tasks`):**
   - Create `src/modules/<name>/` with `<Name>Module.tsx` (receives `ModuleProps`), `views/`, `components/`, `services/<Name>Service.ts`, `types/<name>.types.ts`, `constants/`, `utils/`, and `index.ts` exporting a `PortalModule`.
   - Only files belonging to a module carry that module's name (e.g. `Report*`). Shared code in `core/` and `app/` must not contain module names or company names.
   - Register the module in `src/app/moduleRegistry.tsx`; `HomeView` lists it automatically and `PortalShell` opens it on click.
   - SharePoint access: build module services on `core/services/SharePointClient`; list names live in the module's service file.
   - Dependencies are one-way: `modules/*` → `core/*`; `core/` never imports `modules/`; modules never import each other.
   - Storage keys use the prefix `portal_<module>_...`. Use CSS variables from `core/styles/portal.css`.
