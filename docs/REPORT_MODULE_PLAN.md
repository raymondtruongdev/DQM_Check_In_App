# Kế hoạch triển khai module "Quản lý Report" (`src/modules/report`)

> Tài liệu giao việc cho AI agent. Đọc kỹ `AGENTS.md` ở thư mục gốc trước khi làm.
> Các quy tắc bắt buộc nằm ở mục 7 của AGENTS.md (công thức thêm module), mục 6 (UI responsive) và mục 5 (không tự `git commit`/`git push`).

## 0. Mục tiêu

Thêm module **Quản lý Report** vào portal SPFx (thay thế module `progress` đã gỡ bỏ khỏi dự án).

Luồng chạy:
1. Trang Home: user bấm tile **"Quản lý Report"**.
2. Trang Quản lý Report đọc email user đăng nhập và đối chiếu với `Report_Role.xlsx` (file role riêng của module Report). Mỗi dòng role hợp lệ sinh một tile, ví dụ `ST01 DailyReport`, `ST01 WeeklyReport`, `ST02 DailyReport`.
3. Bấm một tile thì mở form nhập báo cáo, dựng từ file mẫu trong `_template`.
4. Bấm **Save** thì app tự tạo thư mục mới `<DocID>_<yyyyMMdd>` (ví dụ `DailyReport_20261110`) tại `CapNhatCongViec/data/<Unit>/` và lưu file xlsx vào đó.

## 1. Dữ liệu mẫu (local, mô phỏng thư viện SharePoint `CapNhatCongViec`)

Thư mục gốc: `data_test/sharepoint_sample/`

```text
Projects_Role.xlsx           (role của module Tiến độ, KHÔNG dùng cho Report)
Report_Role.xlsx             (role của module Report)
_template/
  DailyReport_template.xlsx
  WeeklyReport_template.xlsx
data/
  ST01/DailyReport_20261110/    (rỗng, thư mục đích mẫu)
  ST01/WeeklyReport_20261110/   (rỗng)
  ST02/DailyReport_20261110/    (rỗng)
```

### 1.1 `Report_Role.xlsx` (sheet `Role`, cùng schema với `Projects_Role.xlsx`)

| ID | Unit | DocID | DocTitle | Site manager | Email | Status |
|---|---|---|---|---|---|---|
| 1 | ST01 | DailyReport | Báo cáo ngày | Trương Quốc Toàn | truongquoctoan1@minntek.com | TRUE |
| 2 | ST01 | WeeklyReport | Báo cáo tuần | Trương Quốc Toàn | truongquoctoan1@minntek.com | TRUE |
| 3 | ST02 | DailyReport | Báo cáo ngày | Trương Quốc Toàn | truongquoctoan1@minntek.com | TRUE |

### 1.2 Template (`DailyReport_template.xlsx`, `WeeklyReport_template.xlsx`)

Mỗi file có 1 sheet tên `ST01` (dải `A1:E31`), gồm hai vùng.

**Vùng metadata** (dòng 1–8, cột A là key, cột B là value):

| Key | Ví dụ giá trị trong template | Xử lý trong form |
|---|---|---|
| `DocTile` | BÁO CÁO NGÀY / BÁO CÁO TUẦN | Chỉ đọc (tiêu đề) |
| `SubTile` | DAILY REPORT Tuyến Metro số 2 – Gói thầu M2.1 … | Chỉ đọc |
| `DocCode` | HCM2_1-23_CS-MAUR_…_BCN | Chỉ đọc |
| `Location` | ST06 – Ga ST06 / ST01 – Ga ST01 | Tự điền theo Unit |
| `ReportNo` | (trống) | User nhập |
| `Shift` | (trống) | User nhập |
| `Email` | (trống) | Tự điền email user |
| `UpdateTime` | (trống) | Tự điền giờ lưu (ISO) |

**Vùng bảng công việc** (header ở dòng 11, dữ liệu từ dòng 12):

`ID | Tên công việc | Tỉ lệ hoàn thành | Khối lượng | Đơn vị`

Nội dung mẫu: `1 Xây tường vây` → `1.1 Đào đất`, `1.2 Làm móng`; `2 Xây hàng rào` → `2.1 Tập kết vật liệu`, `2.2 Hàn kết cấu`. Cấp cha/con suy ra từ `ID` (dấu chấm).

> Template mẫu đang có `Location` không nhất quán (Daily ghi ST06, Weekly ghi ST01). Khi mở form, `Location` luôn lấy theo Unit của tile, không lấy cứng từ template.

## 2. Quyết định đã chốt (từ người dùng)

| # | Quyết định |
|---|---|
| D1 | Module Report dùng file role **riêng**: `CapNhatCongViec/Report_Role.xlsx` (sheet `Role`). Không đọc `Projects_Role.xlsx`. |
| D2 | Phần role và SharePoint dùng chung được **chuyển lên `core/`**. |
| D3 | File lưu: `data/<Unit>/<DocID>_<yyyyMMdd>/<DocID>_<yyyyMMdd>.xlsx`, ví dụ `data/ST01/DailyReport_20261110/DailyReport_20261110.xlsx`. Lưu lại cùng ngày thì ghi đè (dùng ETag). |
| D4 | Tên thư mục theo DocID: `DailyReport_<yyyyMMdd>`, `WeeklyReport_<yyyyMMdd>`. |
| D5 | Báo cáo tuần dùng **ngày lập báo cáo** trong tên thư mục và tên file. |
| D6 | **Cho phép chọn ngày báo cáo** để nhập bù. Nếu ngày đó đã có file thì nạp lại để sửa. |

Giả định bổ sung (có thể đổi):
- Template trên SharePoint: `CapNhatCongViec/_template/<DocID>_template.xlsx` (phẳng). Nếu có sheet trùng tên Unit thì dùng sheet đó, không thì dùng sheet đầu tiên.
- Admin (`UserProfiles.Role = admin`) thấy tất cả tile có `Status = TRUE`. User thường chỉ thấy dòng có `Email` trùng và `Status = TRUE`.

## 3. Vấn đề phải xử lý

1. **Quy tắc phụ thuộc một chiều.** `modules/*` → `core/*`. `core/` không import `modules/`. Các module không import lẫn nhau.
   - Các phần dùng chung đặt tại `core/`: kiểu `RoleEntry`, `parseRoleBuffer`, logic resolve quyền theo email (`RoleResolutionService`), và các tiện ích đường dẫn (`pathUtils`).
   - Code trong `core/` và `app/` không chứa tên module hoặc tên công ty.
2. **Quản lý role.** Module Report đọc `Report_Role.xlsx`.
3. **Tên thư mục SharePoint.** Dùng lại `sanitizeSharePointPath` cho Unit, DocID và tên file.

## 4. Cấu trúc file cần tạo

```text
src/modules/report/
├── ReportModule.tsx          # nhận ModuleProps; điều hướng landing <-> entry; nạp role
├── index.ts                  # export reportModule: PortalModule (id 'report', title 'Quản lý Report', status 'active')
├── report.css                # CSS riêng, dùng biến trong core/styles/portal.css
├── constants/
│   ├── reportConfig.ts       # LIBRARY_NAME 'CapNhatCongViec', ROLE_FILE_NAME 'Report_Role.xlsx', TEMPLATE_FOLDER '_template', DATA_FOLDER 'data'
│   ├── reportStorageKeys.ts  # prefix portal_report_...
│   └── index.ts
├── types/
│   ├── report.types.ts       # ReportAssignment, ReportMetadata, ReportTask, ReportDoc
│   └── index.ts
├── services/
│   ├── ReportFileService.ts      # path template/data; ensureFolder; upload; get buffer + ETag
│   ├── ReportTemplateService.ts  # đọc template -> ReportDoc rỗng
│   ├── ReportDataService.ts      # load (nếu đã có), save, exists
│   └── index.ts
├── utils/
│   ├── reportCodec.ts        # parse/encode xlsx (metadata key-value + bảng công việc)
│   ├── reportFileNaming.ts   # <DocID>_<yyyyMMdd>, đường dẫn thư mục/file
│   ├── taskTree.ts           # dựng cây từ ID, tính tỉ lệ cha = trung bình con
│   └── index.ts
├── components/
│   ├── ReportTile.tsx        # tile button "ST01 DailyReport"
│   ├── ReportMetaForm.tsx    # form metadata
│   ├── ReportTaskTable.tsx   # bảng cây công việc
│   └── index.ts
└── views/
    ├── ReportLandingView.tsx # lưới tile theo quyền, nhóm theo Unit
    ├── ReportEntryView.tsx   # form nhập + nút Save
    └── index.ts
```

File ngoài module cần sửa:
- `src/app/moduleRegistry.tsx`: thêm `reportModule` vào `PORTAL_MODULES`. `HomeView` và `PortalShell` tự hiển thị và mở module.
- `core/`: thêm role service, role codec và tiện ích đường dẫn dùng chung.

Tham khảo các quy chuẩn kiến trúc:
- `ReportModule.tsx`: nạp role, điều hướng.
- `views/ReportLandingView.tsx`: bố cục chọn Unit và gói tile.
- `views/ReportEntryView.tsx` và `components/ReportTaskTable.tsx`: bảng cây nhập liệu.
- `services/ReportFileService.ts`: thao tác file/folder SharePoint.
- `utils/reportCodec.ts` và `utils/taskTree.ts`: đọc/ghi xlsx, tính tỉ lệ.
- `components/NoAccessState.tsx`: trạng thái không có quyền.
- `core/services/SharePointClient.ts`: các hàm `ensureFolder`, `uploadFile`, `getFileBuffer`, `getFileWithMeta`, `getFolderFiles`.

## 5. Chi tiết hành vi

### 5.1 Landing (`ReportLandingView`)
- Dữ liệu lấy từ `Report_Role.xlsx`. Tile hiển thị `"{Unit} {DocID}"`, kèm phụ đề `DocTitle` và tên Site manager.
- Nhóm theo Unit. Có thể có ô tìm kiếm giống `ProgressSiteLandingView`.
- Lưới tile phải `repeat(N, minmax(0, 1fr))`: 1 cột trên điện thoại, 2 cột trên tablet, nhiều cột trên desktop.
- Không có quyền thì hiện `NoAccessState`. Đang tải thì hiện trạng thái loading.
- Có nút quay về Home (`onGoHome`).

### 5.2 Entry (`ReportEntryView`)
- Phần đầu: tiêu đề từ `DocTile`/`SubTile`, `DocCode`, Unit, chọn **ngày báo cáo** (mặc định hôm nay, cho chọn ngày khác để nhập bù; cả Daily và Weekly).
- `ReportMetaForm`: `ReportNo` và `Shift` cho nhập. `Email`, `UpdateTime`, `Location` tự điền. `DocTile`, `SubTile`, `DocCode` chỉ đọc.
- `ReportTaskTable`:
  - Cây theo `ID`. Dòng lá nhập `Tỉ lệ hoàn thành` (0–100) và `Khối lượng` (số). `Đơn vị` lấy từ template.
  - Dòng cha: tỉ lệ tự tính bằng trung bình các con trực tiếp, chỉ đọc.
  - Dòng thuộc template không cho sửa tên hoặc xoá.
- Khi mở: nếu `data/<Unit>/<DocID>_<yyyyMMdd>/<file>.xlsx` đã tồn tại thì nạp dữ liệu và ETag. Không thì dựng từ template rỗng.
- Đổi ngày thì nạp lại. Nếu có thay đổi chưa lưu thì hỏi xác nhận.
- **Save:**
  1. Validate: tỉ lệ nằm trong 0–100, khối lượng là số.
  2. `ensureFolder` cho `data/<Unit>/<DocID>_<yyyyMMdd>`.
  3. Encode xlsx dựa trên template, giữ nguyên định dạng, ghi metadata và giá trị nhập, cập nhật `UpdateTime` và `Email`.
  4. Upload ghi đè kèm ETag. Nếu xung đột (412) thì báo người dùng tải lại.
  5. Hiện `ToastAlert` thành công hoặc thất bại.

### 5.3 Codec (`reportCodec.ts`)
- Dùng SheetJS lazy-load: `import(/* webpackChunkName: 'xlsx' */ 'xlsx')`. Không đưa `xlsx` vào bundle chính.
- Parse metadata: quét cột A cho các key đã biết, lấy giá trị cột B.
- Parse bảng: tìm dòng header chứa `ID` và `Tên công việc`, đọc đến khi gặp dòng trống.
- Encode: ghi lại đúng vị trí ô gốc, không làm vỡ các dòng trống phía dưới.

## 6. Các bước thực hiện (theo thứ tự)

1. **Refactor dùng chung.** Chuyển `RoleEntry`, `parseRoleBuffer`, role resolution (`RoleResolutionService`) và tiện ích đường dẫn lên `core/`.
2. **Types, constants, utils.** Viết `reportCodec`, `reportFileNaming`, `taskTree`.
3. **Services.** `ReportFileService`, `ReportTemplateService`, `ReportDataService`.
4. **UI.** Components, views, `ReportModule.tsx`, `report.css`.
5. **Đăng ký module** trong `moduleRegistry.tsx`.
6. **Kiểm tra** (mục 8).

## 7. Quy tắc bắt buộc

- Không import `@microsoft/power-apps`.
- Dùng biến CSS trong `core/styles/portal.css` (`--color-accent`, `--space-*`, `--radius-*`), không hardcode màu.
- Storage key có prefix `portal_report_...`.
- Mọi gọi SharePoint đi qua `SharePointClient`. Dùng header `Accept: application/json;odata=nometadata`.
- UI phải kiểm tra ở: ≥1440px, 1024px, 768px (iPad mini), ≤480px. Breakpoint chuẩn: ≤1024, ≤768, ≤640, ≤480.
  - Đặt media query ở cuối `report.css` và kiểm tra xung đột tại đúng 768px.
  - Không cắt nội dung, không bẻ chữ từng từ. Dùng `min-width: 0` cho con flex/grid và `flex-wrap: wrap` cho nhóm điều khiển.
  - Vùng chạm tối thiểu ~36–44px. Bảng cuộn ngang trong `.table-responsive`.
- **Không tự `git commit` hoặc `git push`.**

## 8. Kiểm tra trước khi báo hoàn thành

- [ ] `npm run build` sạch, 0 cảnh báo lint. Module `report` và `checkin` chạy bình thường.
- [ ] User `truongquoctoan1@minntek.com` thấy đúng 3 tile: `ST01 DailyReport`, `ST01 WeeklyReport`, `ST02 DailyReport`.
- [ ] User không có trong role thấy `NoAccessState`. Dòng role `Status = FALSE` không sinh tile.
- [ ] Module Report chỉ đọc `Report_Role.xlsx`.
- [ ] Mở form: metadata và cây công việc khớp template. Tỉ lệ cha tính đúng.
- [ ] Save tạo đúng `data/<Unit>/<DocID>_<yyyyMMdd>/` và file xlsx mở được bằng Excel.
- [ ] Chọn ngày khác (nhập bù) tạo thư mục và file đúng ngày đó. Save lần 2 trong cùng ngày ghi đè. Mở lại thì nạp đúng dữ liệu đã lưu.
- [ ] Giao diện đạt yêu cầu ở 1440 / 1024 / 768 / 390px. Nếu không kiểm tra trực quan được thì phải nói rõ là chưa xem lại trên thiết bị.
- [ ] Cập nhật `AGENTS.md` (mục cấu trúc thư mục và mô tả module Report) khi hoàn tất.

