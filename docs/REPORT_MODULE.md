# Tài liệu kỹ thuật Module "Quản lý Report" (`src/modules/report`)

> **Trạng thái:** ✅ Đã triển khai, gồm Báo cáo ngày 6 sheets + In PDF A4 + Khoá dòng cố định (`IsLocked`) + Kế thừa dữ liệu ngày liền kề trước đó.
> Tài liệu tham chiếu cho AI agent và Developer. Đọc kèm `AGENTS.md` ở thư mục gốc.

---

## 1. Tổng quan & Luồng hoạt động

Module **Quản lý Report** (`src/modules/report`) cho phép kỹ sư hiện trường, trưởng ga / CHT và Admin lập, lưu trữ, đính kèm ảnh hiện trường và xuất bản in PDF A4 cho **Báo cáo ngày (`DailyReport`)** và **Báo cáo tuần (`WeeklyReport`)** trực tiếp trên SharePoint Document Library `CapNhatCongViec`.

1. **Trang Home:** User bấm vào module **"Quản lý Report"**.
2. **Trang danh sách (`ReportLandingView.tsx`):**
   - Đọc email đăng nhập M365 hiện tại và đối chiếu với `CapNhatCongViec/Report_Role.xlsx` (sheet `Role`).
   - Hiển thị các tile được phân quyền (ví dụ: `ST01 DailyReport`, `ST01 WeeklyReport`, `ST02 DailyReport`), có bộ lọc theo Trạm (`Unit`) và tìm kiếm nhanh.
3. **Trang nhập báo cáo (`ReportEntryView.tsx`):**
   - Hỗ trợ chọn ngày báo cáo (`dateStr`) để lập báo cáo mới hoặc xem/sửa báo cáo ngày cũ.
   - **Thứ tự ưu tiên nạp dữ liệu thông minh (`ReportDataService.loadReport`):**
     1. Nếu ngày đang chọn đã có file `data/<Unit>/<DocID>_<yyyyMMdd>/<DocID>_<yyyyMMdd>.xlsx` trên SharePoint $\rightarrow$ nạp dữ liệu đã lưu (`Đã lưu trên SharePoint`).
     2. Nếu ngày đang chọn chưa có file $\rightarrow$ tự động tìm báo cáo của **ngày liền kề trước đó** (`ngày chọn - 1 ngày`) hoặc báo cáo gần nhất trước đó trong thư mục `data/<Unit>/` (`getPreviousReportFile`) để điền sẵn vào form (`Kế thừa từ ngày dd/MM/yyyy (chưa lưu)`).
     3. Nếu trạm hoàn toàn chưa có báo cáo nào trước đó $\rightarrow$ nạp từ `_template/<DocID>_template.xlsx`.
4. **Lưu báo cáo & Ảnh hiện trường:**
   - Bấm **Lưu báo cáo**: tự động tạo thư mục `data/<Unit>/<DocID>_<yyyyMMdd>/` và ghi file `.xlsx` 6 sheets chuẩn kèm kiểm tra ETag.
   - Bấm **Tải ảnh lên**: lưu trực tiếp ảnh vào `data/<Unit>/<DocID>_<yyyyMMdd>/photos/`.
   - Bấm **Xem bản in / Xuất PDF**: mở modal xem trước bản in chuẩn A4 song ngữ Việt – Anh và in / xuất PDF.

---

## 2. Cấu trúc lưu trữ trên SharePoint (`CapNhatCongViec`) & Mẫu Local (`data_test/sharepoint_sample/`)

```text
CapNhatCongViec/
├── Report_Role.xlsx                                   # Bảng phân quyền theo Email, Unit, DocID
├── _template/
│   ├── DailyReport_template.xlsx                      # Template Báo cáo ngày chuẩn 6 sheets
│   └── WeeklyReport_template.xlsx                     # Template Báo cáo tuần
└── data/
    ├── ST01/
    │   ├── DailyReport_20261110/
    │   │   ├── DailyReport_20261110.xlsx              # File báo cáo ngày
    │   │   └── photos/                                # Ảnh hiện trường đính kèm trong ngày
    │   └── WeeklyReport_20261110/
    │       └── WeeklyReport_20261110.xlsx
    └── ST06/
        └── DailyReport_20261025/
            └── DailyReport_20261025.xlsx
```

### 2.1 Cấu trúc 6 Sheets của `DailyReport_template.xlsx`

| Thứ tự | Tên Sheet | Cấu trúc cột | Ghi chú nghiệp vụ |
|---|---|---|---|
| **1** | `01_General` | `Key \| Value \| Mô tả` | Chứa toàn bộ thông tin định danh, Thời tiết (Mục I), Tóm tắt các mục I..VII (`Summary`, `ManpowerSummary`, `EquipmentSummary`, `WorkQtySummary`, `MaterialsSummary`, `WorksPlanSummary`, `IssuesSummary`), Công việc hôm nay & Kế hoạch ngày mai (Mục VI), An toàn HSE – Chất lượng – Chỉ thị TVGS (Mục VIII), và Chữ ký duyệt (Mục IX). |
| **2** | `02_Manpower` | `Org \| Category \| Nos \| Hrs \| ManHrs \| IsLocked` | Mục II. Nhân lực. Tự tính `ManHrs = Nos * Hrs` và dòng Tổng. Mặc định khoá (`IsLocked = TRUE`) các dòng đơn vị `TCJV` và `NTP-TV01`. |
| **3** | `03_Equipment` | `Equipment \| Qty \| Hrs \| Status \| Remark \| IsLocked` | Mục III. Thiết bị. Hỗ trợ chọn trạng thái (`Hoạt động`, `Chờ việc`, `Bảo dưỡng`, `Hỏng`). |
| **4** | `04_WorkQty` | `ActivityID \| Item \| Unit \| Plan \| Actual \| Percent \| Remark \| IsLocked` | Mục IV. Khối lượng thực hiện. Tự tính `% = round(Actual / Plan * 100)`. Mặc định khoá (`IsLocked = TRUE`) các dòng có mã `*-DW-1120` và `*-DW-1130`. |
| **5** | `05_Materials` | `Material \| Unit \| Recv \| Used \| MirMar \| IsLocked` | Mục V. Vật tư nhập & sử dụng kèm mã phiếu MIR/MAR. |
| **6** | `06_Issues` | `IssueID \| Description \| Severity \| CriticalPath \| Owner \| DueDate \| Status \| IsLocked` | Mục VII. Vướng mắc / Ràng buộc đang mở. Tô màu mức độ `Cao` / `Trung bình`. |

*(Đối với `WeeklyReport`, hỗ trợ thêm sheet `07_Tasks` hiển thị bảng cây công việc `ReportTaskTable` tự động tính trung bình tỉ lệ hoàn thành của cấp cha).*

---

## 3. Cấu trúc mã nguồn Module Report (`src/modules/report/`)

```text
src/modules/report/
├── ReportModule.tsx                     # Điều phối màn hình Landing <-> Entry, nạp quyền từ Report_Role.xlsx
├── index.ts                             # Export reportModule (PortalModule)
├── report.css                           # Hệ thống style chuẩn SaaS + A4 Print Preview + Responsive (<=1024, <=768, <=640, <=480)
├── constants/
│   ├── reportConfig.ts                  # LIBRARY_NAME = 'CapNhatCongViec', ROLE_FILE_NAME = 'Report_Role.xlsx'
│   ├── reportStorageKeys.ts             # Các khoá lưu trữ với tiền tố portal_report_...
│   └── index.ts
├── types/
│   ├── report.types.ts                  # ReportDoc, ReportMetadata, ManpowerRow, EquipmentRow, WorkQtyRow, MaterialRow, IssueRow (kèm isLocked, copiedFromDate)
│   └── index.ts
├── services/
│   ├── ReportFileService.ts             # Đọc/ghi file báo cáo, quét báo cáo ngày liền kề trước đó (getPreviousReportFile), quản lý thư mục photos/
│   ├── ReportTemplateService.ts         # Khởi tạo ReportDoc từ _template/<DocID>_template.xlsx
│   ├── ReportDataService.ts             # Kết hợp nạp báo cáo hiện có -> báo cáo ngày trước -> template mặc định; lưu 6 sheets; upload/xoá ảnh
│   └── index.ts
├── utils/
│   ├── reportCodec.ts                   # Lazy-load SheetJS, đọc/ghi workbook 6 sheets, xử lý cờ IsLocked
│   ├── reportFileNaming.ts              # Chuẩn hoá đường dẫn data/<Unit>/<DocID>_<yyyyMMdd>/
│   ├── reportTaskTree.ts                # Tính toán cây tiến độ cho WeeklyReport
│   └── index.ts
├── components/
│   ├── ReportTile.tsx                   # Thẻ chọn báo cáo theo Trạm (Unit) & Loại báo cáo
│   ├── ReportMetaForm.tsx               # Khung thông tin định danh + Mục I. Thông tin chung & Thời tiết
│   ├── ReportSectionsEditor.tsx         # Trình biên tập các mục II -> IX, khoá dòng cố định (🔒), upload ảnh hiện trường
│   ├── ReportPrintPreviewModal.tsx      # Xem trước bản in A4 & Xuất PDF chuẩn mẫu song ngữ
│   ├── ReportTaskTable.tsx              # Bảng cây công việc (dùng cho WeeklyReport)
│   └── NoAccessState.tsx                # Trạng thái thông báo khi chưa được cấp quyền
└── views/
    ├── ReportLandingView.tsx            # Màn hình danh sách tile báo cáo
    └── ReportEntryView.tsx              # Màn hình nhập liệu báo cáo + Thanh điều hướng nhanh mục I..IX
```

---

## 4. Danh sách tính năng đã hoàn thiện (Checklist)

- [x] Phân quyền đọc từ `CapNhatCongViec/Report_Role.xlsx` (Admin xem được tất cả các trạm có `Status = TRUE`).
- [x] Chuẩn hoá `DailyReport_template.xlsx` thành 6 sheets (`01_General` $\rightarrow$ `06_Issues`).
- [x] Bổ sung ô `Tóm tắt | Summary` cho tất cả các mục từ **I** đến **VII**.
- [x] Căn chỉnh đồng bộ chiều cao nhãn song ngữ Việt – Anh (`.report-bilingual-label`) trên mọi kích thước màn hình.
- [x] Cơ chế **Khoá mục cố định theo template (`IsLocked`)**: không cho xoá và khoá sửa tên định danh đối với các dòng cố định (`TCJV`, `NTP-TV01` trong mục II. Nhân lực; `*-DW-1120`, `*-DW-1130` trong mục IV. Khối lượng thực hiện).
- [x] Cơ chế **Tự động kế thừa dữ liệu ngày liền kề trước đó** khi chuyển sang ngày mới chưa có báo cáo, chỉ dùng template mặc định khi trạm chưa có báo cáo nào trước đó.
- [x] Tích hợp **Upload / Xoá ảnh hiện trường** trực tiếp vào `data/<Unit>/<DocID>_<yyyyMMdd>/photos/`.
- [x] Tích hợp **Xem bản in / Xuất PDF khổ A4** (`ReportPrintPreviewModal.tsx`) chảy trang tự nhiên không bị trang trắng và hiển thị đầy đủ viền bảng 4 cạnh.
- [x] Build production sạch (`npm run build` với 0 lỗi TypeScript và 0 cảnh báo ESLint).
