# Module Cập nhật công việc (progress) – Cấu hình dữ liệu trên SharePoint

> Site dev: `https://ytf84.sharepoint.com/sites/metro-checkin-dev`
> Không dùng database. Toàn bộ dữ liệu là file Excel trong 1 thư viện tài liệu SharePoint.
> File mẫu để upload: `data_test/sharepoint_sample/`

## 1. Quyết định thiết kế

| Hạng mục | Quy tắc |
|---|---|
| Lưu trữ | Thư viện tài liệu `CapNhatCongViec` (tên cấu hình được trong code, mặc định này) |
| Khóa dữ liệu | Cặp `DocID` + `Unit` (mỗi Unit = 1 vị trí thi công, 1 template riêng) |
| Chế độ lưu | Mỗi ngày 1 file cho mỗi (DocID, Unit); lưu lại trong ngày thì ghi đè, `UpdateTime` = giờ lưu cuối |
| Tên file dữ liệu | `yyMMdd_<DocID>_<Unit>.xlsx`, ví dụ `261107_HCM2-DA1-Tuong-vay_ST01.xlsx` |
| `DocID` | Không dấu cách, ví dụ `HCM2-DA1-Tuong-vay` (phải giống nhau ở tb_role, template và tên thư mục) |
| `Unit` | So khớp chính xác (bỏ qua hoa/thường, khoảng trắng). `ST1` ≠ `ST01` |
| Level 1, 2 | Lấy từ template, khóa tên; user chỉ sửa Tỉ lệ hoàn thành, Khối lượng, Đơn vị |
| Level 3+ | User tự thêm (nút "+ Thêm"), ID tự sinh dạng `1.1.1`; sửa tên và xóa được |
| % của mục cha | Tự tính = trung bình cộng đều (không trọng số) các con trực tiếp, đệ quy từ dưới lên |
| Admin | Xem mọi Unit (theo `UserProfiles`, `Role = admin`); không cần dòng trong tb_role |
| Sửa template | Bằng file Excel, trực tiếp trên SharePoint (giai đoạn đầu) |

## 2. Cấu trúc thư viện

```
CapNhatCongViec/
├── Projects_Role.xlsx                          ← bảng tb_role (phân quyền)
├── _template/
│   └── <DocID>/
│       ├── ST01.xlsx                           ← template của Unit ST01
│       └── ST02.xlsx
└── data/
    └── <DocID>/
        └── yyMMdd_<DocID>_<Unit>.xlsx          ← module tự sinh
```

> Nếu SharePoint không cho tạo thư mục bắt đầu bằng `_`, đổi `_template` thành `template` (và đổi hằng số tương ứng trong code).

## 3. Các bước tạo trên SharePoint

### 3.1. Tạo thư viện
1. Vào site `metro-checkin-dev` → **+ New** → **Document library** → **Blank library**.
2. Đặt tên `CapNhatCongViec` (liền, không dấu) → **Create**.

### 3.2. Tạo thư mục và upload file mẫu
1. Tạo thư mục `_template` và `data` ở gốc thư viện.
2. Upload `data_test/sharepoint_sample/Projects_Role.xlsx` vào gốc.
3. Trong `_template`, tạo thư mục `HCM2-DA1-Tuong-vay`, upload `ST01.xlsx`, `ST02.xlsx` vào đó.
4. Trong `data`, tạo thư mục `HCM2-DA1-Tuong-vay` (để trống).

### 3.3. Phân quyền thư viện
Mức cơ bản: cho nhóm user cập nhật quyền **Edit** trên thư viện.

Mức chặt hơn (khuyến nghị khi chạy thật):
1. **Settings** → **Library settings** → **Permissions for this document library** → **Stop Inheriting Permissions**.
2. `_template` và `Projects_Role.xlsx`: user **Read**, chỉ admin **Edit**.
3. `data`: user **Edit**.

> Việc đối chiếu `tb_role` trong UI chỉ ẩn/hiện giao diện. Quyền thư mục SharePoint mới là chặn thật.

### 3.4. Không cần tạo SharePoint List mới
Module chỉ dùng thư viện này và danh sách `UserProfiles` sẵn có (xác định admin).

## 4. Định dạng file

### 4.1. `Projects_Role.xlsx` – sheet `Role`, Excel Table tên **`tb_role`**

| ID | Unit | DocID | DocTitle | Site manager | Email | Status |
|---|---|---|---|---|---|---|
| 1 | ST01 | HCM2-DA1-Tuong-vay | Xây tường vây | Trương Quốc Toàn | truongquoctoan1@thadico.com | TRUE |
| 2 | ST01 | HCM2-DA2-Phoi-tron-betong | Phối trộn bê tông | Trương Quốc Toàn | truongquoctoan1@thadico.com | TRUE |
| 3 | ST02 | HCM2-DA1-Tuong-vay | Xây tường vây | Trương Quốc Toàn | truongquoctoan1@thadico.com | TRUE |

- Mỗi dòng = quyền: *Email được cập nhật mảng việc DocID tại trạm/vị trí Unit này*.
- Cột `DocTitle`: Tên tiếng Việt thân thiện của mảng công việc, hiển thị trên các thẻ của Landing page theo Trạm thi công (Unit).
- Một trạm thi công (`Unit`, VD: ST01) có thể có nhiều mảng công việc (`DocID`). Landing page của module sẽ nhóm theo `Unit` và hiển thị danh sách các thẻ `DocID` tương ứng.
- Chỉ dòng có `Status` = TRUE (chấp nhận `TRUE`, `true`, `1`, boolean) và đủ DocID, Unit, Email mới có hiệu lực.
- Email so khớp không phân biệt hoa thường với email đăng nhập M365. Chú ý gõ đúng chính tả và đúng domain.
- Cột `Site manager` hiển thị trong header và thẻ mảng việc giao diện.

### 4.2. Template `_template/<DocID>/<Unit>.xlsx`

Vùng thông tin đầu sheet:

| A | B |
|---|---|
| DocTile | Tên bảng cập nhật |
| Doc_ID | `<DocID>` |
| Name | (module điền khi lưu) |
| Email | (module điền khi lưu) |
| Unit | `<Unit>` |
| UpdateTime | (module điền khi lưu) |

Bảng công việc bắt đầu từ hàng 8, Excel Table tên **`tb_thongtin`**:

| ID | Tên công việc | Tỉ lệ hoàn thành | Khối lượng | Đơn vị |
|---|---|---|---|---|
| 1 | Xây tường vây | | | |
| 1.1 | Đào đất | | | |

- Cột `ID` phải đặt định dạng **Text** (nếu để Number thì `1.10` bị đổi thành `1.1`).
- Chỉ khai báo level 1 và 2 trong template. Level 3 trở đi do user thêm lúc cập nhật.
- Mỗi file chỉ chứa 1 sheet, 1 Unit, tên sheet = Unit.

## 5. Quy trình vận hành

| Việc | Cách làm |
|---|---|
| Thêm Unit mới | Tạo `_template/<DocID>/<Unit>.xlsx` + thêm 1 dòng vào `tb_role` |
| Thêm DocID (dự án) mới | Tạo thư mục `_template/<DocID>` và `data/<DocID>`, thêm template và `tb_role` |
| Phân công người khác | Sửa Email trong `tb_role` |
| Thu hồi quyền | Đổi `Status` thành FALSE |
| Đổi nội dung cần cập nhật | Sửa template tương ứng bằng Excel (chỉ ảnh hưởng file của những ngày mới tạo) |
| Xem lịch sử | Version history của file trong thư viện, hoặc các file `yyMMdd_...` trong `data/<DocID>` |

> Đóng file Excel (không mở/check-out) trước khi user dùng module để tránh bị khóa file.

## 6. Luồng đăng nhập và mở giao diện

1. User vào site, lấy email SSO.
2. Đọc `tb_role`, lọc dòng khớp Email và `Status` = TRUE. Admin (từ `UserProfiles`) thấy mọi cặp DocID + Unit.
3. Không có dòng nào: hiện "Bạn chưa được phân quyền cập nhật".
4. Có 1 cặp: mở thẳng; nhiều cặp: chọn bằng tab/dropdown.
5. Mở file ngày hiện tại nếu đã có, nếu chưa thì tạo từ template (hoặc từ bản ngày gần nhất, nếu giữ giá trị cũ).
6. Lưu: ghi `<yyMMdd>_<DocID>_<Unit>.xlsx` vào `data/<DocID>`, cập nhật Name, Email, UpdateTime.

## 7. Checklist setup nhanh

- [ ] Tạo thư viện `CapNhatCongViec`
- [ ] Tạo thư mục `_template`, `data`, và thư mục con theo DocID
- [ ] Upload `Projects_Role.xlsx` (có Table `tb_role`, email đúng)
- [ ] Upload template từng Unit (Table `tb_thongtin`, ID kiểu Text)
- [ ] Phân quyền thư viện
- [ ] Kiểm tra DocID/Unit khớp giữa tb_role, tên thư mục, tên file

