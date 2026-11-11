# THADICO DQM - Workspace Portal (SPFx 1.24.1)

Ứng dụng **Workspace Portal** phát triển trên nền tảng **SharePoint Framework (SPFx 1.24.1)** và **React 18**, vận hành trực tiếp trên **SharePoint Online** bằng tài khoản Microsoft 365 tiêu chuẩn (miễn phí 100% bản quyền, không yêu cầu Power Apps Premium).

---

## 1. Các phân hệ chính (Modules)

### 1.1. Quản lý Báo cáo Ngày & Tuần (`src/modules/report`)
- Lưu trữ trên SharePoint Document Library **`CapNhatCongViec`**:
  - Phân quyền theo trạm (`Unit`) và loại báo cáo (`DailyReport`, `WeeklyReport`) thông qua file `Report_Role.xlsx`.
  - Mẫu chuẩn đặt tại `_template/DailyReport_template.xlsx` (cấu trúc **6 sheets**: `01_General`, `02_Manpower`, `03_Equipment`, `04_WorkQty`, `05_Materials`, `06_Issues`) và `_template/WeeklyReport_template.xlsx`.
  - File báo cáo từng ngày lưu tại: `data/<Unit>/<DocID>_<yyyyMMdd>/<DocID>_<yyyyMMdd>.xlsx`.
  - Ảnh hiện trường tải lên trực tiếp vào: `data/<Unit>/<DocID>_<yyyyMMdd>/photos/`.
- **Tính năng nổi bật:**
  - **Tự động kế thừa dữ liệu ngày trước:** Khi mở một ngày mới chưa có báo cáo, hệ thống tự động lấy dữ liệu từ báo cáo của ngày liền kề trước đó (hoặc ngày gần nhất trước đó) để điền sẵn vào form; nếu chưa có mới lấy từ `_template`.
  - **Khoá dòng cố định theo Template (`IsLocked`):** Các mục cố định (ví dụ đơn vị `TCJV`, `NTP-TV01` trong bảng Nhân lực; mã `*-DW-1120`, `*-DW-1130` trong bảng Khối lượng) được khoá biểu tượng `🔒`, không cho xoá hoặc sửa mã định danh.
  - **Xem bản in / Xuất PDF khổ A4:** Dựng đúng bố cục báo cáo song ngữ Việt – Anh chuẩn A4 (tự động chảy trang liên tục, không bị ngắt khoảng trắng, giữ nguyên đường viền bảng) để in hoặc lưu thành PDF trực tiếp từ trình duyệt.
  - **Lazy-load SheetJS (`xlsx`):** Chỉ tải thư viện đọc/ghi Excel khi người dùng mở phân hệ Báo cáo.

---

## 2. Yêu cầu hệ thống & Cài đặt

- **Node.js:** `v22.x` (theo chuẩn SPFx `1.24.1`)
- **Trình quản lý gói:** `npm`

```bash
cd /Volumes/DATA/THADICO_local/REPO_DQM/DQM_Check_In_App
npm install
```

---

## 3. Chạy thử nghiệm ở môi trường Local (Development)

```bash
npm run start
```

1. Dịch vụ local chạy tại `https://localhost:4321`.
2. Nếu mở trên trình duyệt mới lần đầu, truy cập `https://localhost:4321/temp/build/manifests.js` $\rightarrow$ Chọn **Advanced** $\rightarrow$ **Proceed to localhost (unsafe)** để tin cậy chứng chỉ SSL local.
3. Mở SharePoint Hosted Workbench tại:
   - `https://ytf84.sharepoint.com/sites/metro-checkin-dev/_layouts/15/workbench.aspx?reset=true`

---

## 4. Đóng gói bản Production (`.sppkg`) & Triển khai

```bash
npm run build
```

- Lệnh trên thực thi `heft test --clean --production` và `heft package-solution --production`.
- Gói cài đặt thành phẩm được xuất ra tại:
  `sharepoint/solution/workspace_portal.sppkg`

### Các bước triển khai lên SharePoint App Catalog:
1. Mở **SharePoint App Catalog** của site hoặc tenant (`Apps for SharePoint`).
2. Tải file `sharepoint/solution/workspace_portal.sppkg` lên và chọn **Deploy**.
3. Mở trang SharePoint đích $\rightarrow$ **Edit** $\rightarrow$ Bấm **`+`** $\rightarrow$ Chọn **Workspace Portal** $\rightarrow$ **Republish**.

---

## 5. Tài liệu tham khảo nội bộ

- [`AGENTS.md`](./AGENTS.md): Quy chuẩn kiến trúc, quy tắc UI đa thiết bị (Responsive) và hướng dẫn dành cho AI Agent / Developer.
- [`project_architecture.md`](./project_architecture.md): Sơ đồ kiến trúc phân tầng Multi-Module (`entry`, `app`, `core`, `modules`).
- [`docs/REPORT_MODULE_PLAN.md`](./docs/REPORT_MODULE_PLAN.md): Chi tiết thiết kế 6 sheets và nghiệp vụ của phân hệ Quản lý Report.
