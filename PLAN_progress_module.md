# PLAN – Module "Cập nhật công việc / Quản lý tiến độ" (`progress`)

> Tài liệu giao việc cho agent. Đọc kèm [AGENTS.md](./AGENTS.md) (quy tắc dự án) và [doc/progress_module_sharepoint_setup.md](./doc/progress_module_sharepoint_setup.md) (setup SharePoint và định dạng file).
> Trạng thái: **đã chốt thiết kế, chưa có code**. Dữ liệu mẫu: `data_test/sharepoint_sample/`. File demo gốc (không sửa): `data_test/demo_capnhat.xlsx`, `data_test/Projects_Role.xlsx`.
> Quy tắc: KHÔNG `git commit/push` nếu user chưa yêu cầu. Không import `@microsoft/power-apps`.

## 1. Mục tiêu

User M365 đăng nhập site, hệ thống đối chiếu email với bảng `tb_role`. Nếu `Status = TRUE` thì mở UI cập nhật tiến độ theo template của `DocID` + `Unit` được phân. Cập nhật mỗi ngày. Dữ liệu là file Excel trong thư viện tài liệu SharePoint, **không dùng database / SharePoint List mới**.

## 2. Quyết định đã chốt

| Hạng mục                        | Quy tắc                                                                                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thư viện                        | `CapNhatCongViec` (hằng số cấu hình, mặc định này)                                                                                                           |
| Khóa                             | `DocID` + `Unit`. `DocID` không dấu cách (`HCM2-DA1-Tuong-vay`). `Unit` so khớp chính xác (trim, không phân biệt hoa thường), `ST1` ≠ `ST01` |
| Lưu                              | Chế độ A: mỗi ngày 1 file cho mỗi (DocID, Unit); lưu lại trong ngày thì ghi đè                                                                             |
| Tên file                         | `yyMMdd_<DocID>_<Unit>.xlsx` trong `data/<DocID>/` (không có HHmm); giờ lưu nằm ở ô `UpdateTime`                                                          |
| Template                          | `_template/<DocID>/<Unit>.xlsx` (admin sửa tay bằng Excel; chỉ chứa level 1, 2)                                                                                  |
| Phân quyền                      | `Projects_Role.xlsx` → Table `tb_role` (`ID, DocID, Unit, Site manager, Email, Status`). Admin (`UserProfiles.Role = admin`) xem mọi Unit                    |
| Level 1, 2                        | Tên và ID khóa. Chỉ sửa `Tỉ lệ hoàn thành`, `Khối lượng`, `Đơn vị`                                                                                |
| Level 3+                          | User thêm bằng nút "+ Thêm" ở dòng cha. ID tự sinh `cha.N` (`1.1.1`). Sửa tên và xóa được                                                            |
| % cha                             | Tự tính = trung bình cộng đều các con trực tiếp, đệ quy từ dưới lên. Con trống = 0. Cha read-only. Lá nhập 0–100                                    |
| Khối lượng, Đơn vị của cha | Nhập tay (không cộng dồn)                                                                                                                                          |
| Excel lib                         | SheetJS `xlsx`, lazy-load (dynamic import)                                                                                                                           |

Định dạng file chi tiết: xem `doc/progress_module_sharepoint_setup.md` mục 4 (vùng thông tin hàng 1–6, Table `tb_thongtin` bắt đầu hàng 8, cột `ID` kiểu Text).

**File dữ liệu của ngày** = template + 2 cột phụ ở `tb_thongtin`: `ParentID`, `IsCustom` (TRUE cho dòng level 3+). Ô metadata `Name`, `Email`, `UpdateTime` được điền khi lưu.

## 3. Kiến trúc code

Tuân theo mục 7 của AGENTS.md (modules → core, một chiều; module không import nhau; core không chứa tên module).

```
src/modules/progress/
├── index.ts                          # export progressModule: PortalModule (status 'active')
├── ProgressModule.tsx                # nhận ModuleProps, điều phối luồng
├── progress.css                      # dùng token portal.css, responsive
├── types/progress.types.ts           # RoleEntry, TaskNode, TaskRow, ProgressDoc, ...
├── constants/progressConfig.ts       # LIBRARY_NAME, các đường dẫn thư mục, hàng bắt đầu bảng, tên Table
├── constants/progressStorageKeys.ts  # tiền tố portal_progress_
├── services/
│   ├── ProgressFileService.ts        # đọc/ghi file nhị phân trong thư viện (SPHttpClient)
│   ├── ProgressRoleService.ts        # đọc tb_role, lọc theo email, chuẩn hóa Status/Email/Unit
│   ├── ProgressTemplateService.ts    # đọc template DocID+Unit
│   ├── ProgressDataService.ts        # mở/tạo file của ngày (nạp từ ngày trước), lưu (ghi đè)
│   └── ProgressSummaryService.ts     # liệt kê + đọc nhiều file, gộp thành pivot
├── utils/
│   ├── excelCodec.ts                 # xlsx ⇄ TaskRow[]/metadata (SheetJS, lazy-load)
│   ├── taskTree.ts                   # dựng cây, sinh ID level 3, tính % cha, kiểm tra hợp lệ
│   └── fileNaming.ts                 # tên file yyMMdd, làm sạch ký tự cấm của SharePoint
├── components/
│   ├── TaskTreeTable.tsx             # bảng cây (cha khóa/lá nhập), dạng thẻ trên mobile
│   ├── AddSubTaskButton.tsx
│   ├── ProgressBar.tsx
│   ├── UnitPicker.tsx                # chọn DocID + Unit theo quyền
│   └── NoAccessState.tsx
└── views/
    ├── ProgressEntryView.tsx
    └── ProgressSummaryView.tsx
```

Cập nhật bắt buộc ngoài module:

- `src/app/moduleRegistry.tsx`: thay entry placeholder `{ id: 'progress', ... status: 'comingSoon' }` bằng `progressModule` (giữ icon hiện có `folderWithFileIcon`).
- `package.json`: thêm dependency `xlsx`. Kiểm tra cách SheetJS được cài (bản npm cũ có lỗ hổng, ưu tiên bản CDN chính thức `https://cdn.sheetjs.com/...` hoặc bản mới nhất tương thích), và kiểm tra build Heft/Webpack có tách chunk lazy được.
- `src/core/services/SharePointClient.ts`: thêm (generic, không chứa tên module) `getFileBuffer(siteUrl, serverRelativePath)`, `uploadFile(siteUrl, folderPath, fileName, buffer, overwrite)`, `ensureFolder(...)`, `fileExists(...)`. Dùng REST:
  - Đọc: `GET {site}/_api/web/GetFileByServerRelativeUrl('...')/$value`
  - Ghi: `POST {site}/_api/web/GetFolderByServerRelativeUrl('...')/Files/add(url='...',overwrite=true)` với body `ArrayBuffer`
  - Tạo thư mục: `POST .../_api/web/folders` (hoặc `folders.add`)
  - Đường dẫn dạng `/sites/metro-checkin-dev/CapNhatCongViec/...`; `encodeURIComponent` các segment, cẩn thận dấu `'` (nhân đôi).
- `src/core/constants/storageKeys.ts` / `src/core/types`: chỉ thêm nếu cần dùng chung (không đưa tên module vào core).

## 4. Luồng chạy

1. `ProgressModule` nhận `ModuleProps` (email, profile/role, spHttpClient, siteUrl; xem `src/core/types/module.types.ts`, tham khảo `CheckinModule.tsx`).
2. `ProgressRoleService.getAssignments(email, isAdmin)`:
   - Đọc `Projects_Role.xlsx` → Table `tb_role` (nếu không có Table thì đọc sheet `Role`).
   - Bỏ dòng thiếu DocID/Unit/Email. `Status` chấp nhận `TRUE`/`true`/`1`/boolean.
   - Email so khớp qua `extractCleanEmail` (trong `core/auth`), không phân biệt hoa thường.
   - Admin: liệt kê mọi (DocID, Unit) có trong `tb_role` (và/hoặc quét `_template/*`).
3. Không có quyền → `NoAccessState`. 1 cặp → mở thẳng. Nhiều cặp → `UnitPicker`.
4. `ProgressDataService.open(docId, unit, date)`:
   - Có `data/<DocID>/<yyMMdd>_<DocID>_<Unit>.xlsx` → đọc.
   - Chưa có → dựng từ template (level 1, 2) rồi **nạp sẵn giá trị của file gần nhất trước đó** (cùng DocID + Unit): `Tỉ lệ hoàn thành`, `Khối lượng`, `Đơn vị` và các dòng level 3+ do user đã thêm. Chưa lưu thì chưa tạo file; hiện banner "Đang nạp từ ngày dd/MM/yyyy, bấm Lưu để tạo file hôm nay". Không có file trước đó thì dùng template trống.
   - Quyền sửa: user thường chỉ sửa được **hôm nay**; ngày cũ chỉ xem (read-only). Admin sửa được mọi ngày. Chọn ngày bằng bộ chọn ngày; ngày không có file thì báo "Chưa có dữ liệu".
5. UI: bảng cây, người dùng nhập, % cha tính lại ngay khi nhập, nút Lưu (có cờ "chưa lưu").
6. Lưu: `ensureFolder` → `uploadFile(overwrite=true)`, điền `Name`, `Email`, `UpdateTime`. Toast thành công/lỗi (dùng `ToastAlert`).

## 5. Quy tắc nghiệp vụ và validate

- Lá: số 0–100 (cho phép rỗng = 0); `Khối lượng` là số ≥ 0 hoặc rỗng; `Đơn vị` là text.
- Sinh ID level 3: `maxChild+1` dưới cùng cha; không dùng lại ID đã xóa trong cùng phiên; luôn lưu ID dạng text (`@`).
- Xóa dòng cha level 3 thì xóa luôn con của nó (hỏi xác nhận).
- Thêm con vào mục lá đang có giá trị % tự nhập → cảnh báo; mục đó thành cha và % được tính tự động.
- Level 1, 2 từ template không được xóa hoặc đổi tên (UI ẩn các nút đó). Khi đọc file ngày, đối chiếu lại với template: dòng template bị thiếu thì thêm lại, dòng level 1, 2 bị sửa tên trong file thì ghi đè theo template (template là nguồn sự thật).
- Phân quyền theo ngày: `canEdit = isAdmin || date === hôm nay`. Kiểm tra cả khi bấm Lưu (không chỉ ẩn nút). Admin sửa ngày cũ thì giữ nguyên tên file của ngày đó và cập nhật `Name`/`Email`/`UpdateTime` theo admin.
- Chống ghi đè đồng thời: khi đọc lấy ETag, khi lưu gửi `If-Match: <etag>`; nếu 412 thì báo "File đã bị người khác cập nhật" và cho tải lại.

## 5b. Màn hình tổng hợp nhiều ngày (có làm, thuộc phạm vi module)

`views/ProgressSummaryView.tsx` + `services/ProgressSummaryService.ts`:
- Chọn DocID (trong quyền), khoảng ngày (từ–đến, mặc định 7/30 ngày gần nhất), Unit (một hoặc tất cả được phân).
- Liệt kê file trong `data/<DocID>/` (REST `GetFolderByServerRelativeUrl(...)/Files`), lọc theo prefix ngày và Unit trong tên file, rồi đọc song song có giới hạn (ví dụ 4 file một lượt) và cache theo `UniqueId/ETag/TimeLastModified`.
- Hiển thị: (1) bảng pivot: hàng = công việc (level 1, 2, 3 theo cây), cột = ngày, ô = % hoàn thành (ô trống nếu ngày đó không có file); (2) thẻ tổng quan % cuối kỳ cho mỗi Unit và mức tăng so với ngày trước; (3) biểu đồ đường đơn giản bằng SVG/CSS, không thêm thư viện biểu đồ.
- Nút **Xuất Excel** (SheetJS) cho bảng pivot đang xem.
- Chỉ đọc, user thường chỉ thấy Unit của mình; admin thấy tất cả. Responsive: bảng cuộn ngang trong `.table-responsive`, cột ID và tên công việc cố định bên trái nếu không chồng lấn (xem AGENTS.md: không sticky cho cột ACTION; sticky cột trái chỉ dùng khi đã kiểm tra không che nội dung).
- Điều hướng: tab "Cập nhật" / "Tổng hợp" trong `ProgressModule`.

## 6. Giao diện (theo AGENTS.md mục 7.6)

- Dùng token trong `core/styles/portal.css`, không hardcode màu. Khoảng cách `--space-*`, bo góc `--radius-*`.
- Header: DocTile, DocID, Unit, Site manager, ngày cập nhật, trạng thái lưu. Bộ chọn DocID/Unit.
- Bảng cây: cột `ID | Tên công việc | Tỉ lệ hoàn thành (thanh + ô nhập) | Khối lượng | Đơn vị | Hành động`. Dòng khóa có icon khóa. Thụt lề theo level.
- Breakpoint: ≤1024 (tablet), ≤768 (iPad mini), ≤640/≤480 (điện thoại, dạng thẻ 1 cột, nút rộng hết chiều ngang). Bọc bảng trong `.table-responsive`; `max-width: 1440px` căn giữa; vùng chạm ≥ 36–44px; media query đặt cuối `progress.css`.
- Kiểm tra trực quan ở 1440 / 1024 / 768 / 390px nếu có thể; nếu không, phải nói rõ với user là chưa xem trên thiết bị.

## 7. Các bước thực hiện (theo thứ tự)

1. Thêm dependency `xlsx`, xác nhận build chạy (`npm run build`), chunk lazy-load.
2. Mở rộng `SharePointClient` với các hàm file/folder (generic).
3. `types`, `constants`, `utils` (`taskTree`, `fileNaming`, `excelCodec`) kèm test đơn vị cho `taskTree` (sinh ID, tính %, đệ quy) và `excelCodec` (đọc/ghi các file trong `data_test/sharepoint_sample/`). Dùng cơ chế test hiện có của Heft nếu có.
4. Services: Role, Template, Data.
5. Components và view (`ProgressEntryView`, `ProgressSummaryView`); `progress.css` (responsive).
6. `ProgressModule` + `index.ts`; đăng ký trong `moduleRegistry.tsx`.
7. Test thủ công trên workbench: `https://ytf84.sharepoint.com/sites/metro-checkin-dev/_layouts/15/workbench.aspx?reset=true` (chạy `npm run start`). Dùng Profile Switcher sẵn có để thử admin/user.
8. `npm run build` sạch (0 cảnh báo lint), cập nhật mục "Directory & Key Components" trong `AGENTS.md` cho module mới.
9. Không commit/push; báo user kết quả, kèm phần chưa kiểm tra.

## 8. Điều kiện tiên quyết (user làm trên SharePoint)

Xem checklist ở `doc/progress_module_sharepoint_setup.md` mục 7: tạo thư viện `CapNhatCongViec`, thư mục `_template`/`data`, upload `Projects_Role.xlsx` (Table `tb_role`) và template từng Unit (Table `tb_thongtin`), phân quyền Edit cho `data`. **Chưa rõ user đã tạo xong chưa**; hỏi trước khi test với dữ liệu thật, và có thể dùng file mẫu ở `data_test/sharepoint_sample/` để unit test không cần SharePoint.

## 9. Rủi ro và lưu ý

- **SheetJS trong SPFx:** kích thước bundle (~0.4–0.8MB), kiểm tra tương thích TypeScript 5.8 và Webpack 5; phải lazy-load để không làm chậm module khác.
- **Email trong `tb_role`:** lệch chính tả/domain (ví dụ `truogquoctoan1` vs `truongquoctoan1`; `@thadico.com` vs `@minhtek.com`) làm user không thấy gì. Nên hiển thị thông báo kèm email đang đăng nhập để dễ chẩn đoán.
- **Quyền thật:** việc lọc theo `tb_role` chỉ ẩn/hiện UI; quyền thư mục SharePoint mới chặn thật.
- **File bị khóa:** nếu admin đang mở file Excel (check-out/đang sửa online), lệnh ghi có thể lỗi 423; hiện thông báo rõ.
- **Tên SharePoint:** thư mục `_template` có thể bị hạn chế ở một số cấu hình; nếu vậy dùng `template` và đổi hằng số ở `progressConfig.ts`.
- **Level cha và con trống:** con trống tính là 0 (có thể điều chỉnh sau nếu user muốn bỏ qua dòng trống).

## 10. Các câu hỏi đã được user chốt

1. Ngày mới **có nạp sẵn** giá trị của ngày trước (mục 4, bước 4).
2. **Admin sửa được file ngày cũ; user thường chỉ sửa hôm nay**, ngày cũ chỉ xem (mục 5).
3. **Có màn hình tổng hợp nhiều ngày** (mục 5b).

Câu hỏi còn mở: chưa có. Nếu phát sinh, hỏi user trước khi tự quyết.
