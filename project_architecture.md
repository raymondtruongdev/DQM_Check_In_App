# **Kế Hoạch Chuẩn Hóa Kiến Trúc Dự Án (Enterprise React & SPFx Architecture Plan)**

> **Mục tiêu:** Chuyển đổi cấu trúc thư mục từ dạng phẳng ( *flat/monolithic* ) sang kiến trúc phân lớp chuyên nghiệp ( *Layered / Feature-based Architecture* ), tách bạch rõ ràng giữa  **Màn hình (Views/Pages)** ,  **Thành phần dùng chung (Components)** ,  **Dịch vụ dữ liệu (Services)** , **Tiện ích (Utils)** và  **Hệ thống CSS (Styles)** .

---

## **1. Đánh giá hiện trạng Codebase (Current State Analysis)**

  Hiện tại toàn bộ logic giao diện đang dồn chung vào thư mục `src/webparts/dqmCheckin/components/`:

| Vấn đề                                                       | Hiện trạng                                                                                                                                                   | Hậu quả                                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Gộp chung Màn hình & Component con**                 | `LoginPage.tsx`,`EditItemView.tsx`,`WorkItemsTable.tsx`,`CheckinCardsView.tsx`nằm ngang hàng với `SkeletonLoader.tsx`,`DeleteConfirmModal.tsx`. | Khó phân biệt đâu là Page/View chính, đâu là modal hay widget nhỏ.     |
| **Monolithic CSS**                                        | Tập tin `App.css`phình to tới **2.793 dòng** , chứa tất cả token, layout, login, table, card, modal, media queries.                             | Khó bảo trì, dễ xung đột CSS khi nhiều lập trình viên cùng làm việc. |
| **Model kiêm Utility**                                   | `DataCheckinModel.ts`vừa khai báo `interface`, vừa chứa các hàm logic bóc tách dữ liệu (`getItemName`,`getItemPhone`,...).                   | Vi phạm nguyên lý Single Responsibility (SRP).                                 |
| **Dữ liệu mẫu (Mock data) gắn chặt trong Container** | Mảng dữ liệu mẫu `SAMPLE_RECORDS`dài hàng chục dòng nằm trực tiếp trong `DqmCheckin.tsx`.                                                       | Làm phình to file điều phối chính.                                          |
| **Hàm tiện ích bị phân tán**                        | Các hàm xử lý ngày tháng, avatar, màu sắc nằm rải rác trong các component riêng lẻ.                                                              | Trùng lặp mã nguồn, khó tái sử dụng.                                      |

---

## **2. Mô hình Kiến trúc Chuẩn Doanh Nghiệp (Target Architecture)**

  Áp dụng chuẩn kiến trúc **Layered & Feature-Oriented React** tối ưu cho  **SharePoint Framework (SPFx)** :

<pre data-line-start="25" data-line-end="78"><div class="relative whitespace-pre-wrap word-break-all my-2 rounded-xl bg-muted border" data-line-start="25" data-line-end="78"><div class="min-h-7 relative box-border flex flex-row items-center justify-between rounded-t border-b border-border px-2 py-0.5"><div class="font-sans text-sm text-muted-foreground">text</div><div class="flex flex-row items-center gap-2 justify-end"></div></div><div class="p-3"><div class="code-block w-full text-xs cursor-text  "><div class="flex flex-col w-full"><div data-index="0" data-line-number="1" data-line-start="1" data-line-end="1" class="code-line "><div class="line-content"><span class="">src/webparts/dqmCheckin/</span></div></div><div data-index="1" data-line-number="2" data-line-start="2" data-line-end="2" class="code-line "><div class="line-content"><span class="">├── DqmCheckinWebPart.ts             # SPFx WebPart Entrypoint</span></div></div><div data-index="2" data-line-number="3" data-line-start="3" data-line-end="3" class="code-line "><div class="line-content"><span class="">├── DqmCheckinWebPart.manifest.json  # SPFx Manifest</span></div></div><div data-index="3" data-line-number="4" data-line-start="4" data-line-end="4" class="code-line "><div class="line-content"><span class="">│</span></div></div><div data-index="4" data-line-number="5" data-line-start="5" data-line-end="5" class="code-line "><div class="line-content"><span class="">├── constants/                       # Cấu hình & Dữ liệu hằng số</span></div></div><div data-index="5" data-line-number="6" data-line-start="6" data-line-end="6" class="code-line "><div class="line-content"><span class="">│   ├── appConfig.ts                 # Cấu hình cột, kích thước mặc định, site URL</span></div></div><div data-index="6" data-line-number="7" data-line-start="7" data-line-end="7" class="code-line "><div class="line-content"><span class="">│   ├── sampleRecords.ts             # Mock data phục vụ Demo / Fallback</span></div></div><div data-index="7" data-line-number="8" data-line-start="8" data-line-end="8" class="code-line "><div class="line-content"><span class="">│   └── storageKeys.ts               # Các key lưu trữ (sessionStorage, localStorage)</span></div></div><div data-index="8" data-line-number="9" data-line-start="9" data-line-end="9" class="code-line "><div class="line-content"><span class="">│</span></div></div><div data-index="9" data-line-number="10" data-line-start="10" data-line-end="10" class="code-line "><div class="line-content"><span class="">├── types/                           # Định nghĩa TypeScript Interfaces & Types thuần túy</span></div></div><div data-index="10" data-line-number="11" data-line-start="11" data-line-end="11" class="code-line "><div class="line-content"><span class="">│   ├── checkin.types.ts             # Data_checkinRead, Data_checkinWrite</span></div></div><div data-index="11" data-line-number="12" data-line-start="12" data-line-end="12" class="code-line "><div class="line-content"><span class="">│   ├── auth.types.ts                # UserSession, AccountRecord, Role</span></div></div><div data-index="12" data-line-number="13" data-line-start="13" data-line-end="13" class="code-line "><div class="line-content"><span class="">│   └── common.types.ts              # ViewMode, SortOption, ToastState</span></div></div><div data-index="13" data-line-number="14" data-line-start="14" data-line-end="14" class="code-line "><div class="line-content"><span class="">│</span></div></div><div data-index="14" data-line-number="15" data-line-start="15" data-line-end="15" class="code-line "><div class="line-content"><span class="">├── utils/                           # Hàm tiện ích dùng chung (Pure Functions)</span></div></div><div data-index="15" data-line-number="16" data-line-start="16" data-line-end="16" class="code-line "><div class="line-content"><span class="">│   ├── fieldParsers.ts              # getItemName, getItemPhone, getItemLocation, v.v.</span></div></div><div data-index="16" data-line-number="17" data-line-start="17" data-line-end="17" class="code-line "><div class="line-content"><span class="">│   ├── dateUtils.ts                 # formatCheckinTime, isoToDatetimeLocal, v.v.</span></div></div><div data-index="17" data-line-number="18" data-line-start="18" data-line-end="18" class="code-line "><div class="line-content"><span class="">│   └── avatarUtils.ts               # getAvatarColor, getAvatarLetter</span></div></div><div data-index="18" data-line-number="19" data-line-start="19" data-line-end="19" class="code-line "><div class="line-content"><span class="">│</span></div></div><div data-index="19" data-line-number="20" data-line-start="20" data-line-end="20" class="code-line "><div class="line-content"><span class="">├── services/                        # Tầng kết nối API & Dịch vụ SharePoint</span></div></div><div data-index="20" data-line-number="21" data-line-start="21" data-line-end="21" class="code-line "><div class="line-content"><span class="">│   ├── SharePointService.ts         # CRUD API list data_checkin</span></div></div><div data-index="21" data-line-number="22" data-line-start="22" data-line-end="22" class="code-line "><div class="line-content"><span class="">│   └── AuthService.ts               # Xử lý xác thực tài khoản Account list</span></div></div><div data-index="22" data-line-number="23" data-line-start="23" data-line-end="23" class="code-line "><div class="line-content"><span class="">│</span></div></div><div data-index="23" data-line-number="24" data-line-start="24" data-line-end="24" class="code-line "><div class="line-content"><span class="">├── views/                           # [MÀN HÌNH CHÍNH] Các view/màn hình toàn cảnh</span></div></div><div data-index="24" data-line-number="25" data-line-start="25" data-line-end="25" class="code-line "><div class="line-content"><span class="">│   ├── login/</span></div></div><div data-index="25" data-line-number="26" data-line-start="26" data-line-end="26" class="code-line "><div class="line-content"><span class="">│   │   ├── LoginView.tsx            # Màn hình đăng nhập (chuyển từ LoginPage.tsx)</span></div></div><div data-index="26" data-line-number="27" data-line-start="27" data-line-end="27" class="code-line "><div class="line-content"><span class="">│   │   └── LoginView.module.css     # CSS riêng biệt cho màn hình đăng nhập</span></div></div><div data-index="27" data-line-number="28" data-line-start="28" data-line-end="28" class="code-line "><div class="line-content"><span class="">│   ├── checkinCards/</span></div></div><div data-index="28" data-line-number="29" data-line-start="29" data-line-end="29" class="code-line "><div class="line-content"><span class="">│   │   └── CheckinCardsView.tsx     # Màn hình danh sách dạng thẻ (Desktop & Mobile)</span></div></div><div data-index="29" data-line-number="30" data-line-start="30" data-line-end="30" class="code-line "><div class="line-content"><span class="">│   ├── checkinTable/</span></div></div><div data-index="30" data-line-number="31" data-line-start="31" data-line-end="31" class="code-line "><div class="line-content"><span class="">│   │   └── CheckinTableView.tsx     # Màn hình danh sách dạng bảng (WorkItemsTable.tsx)</span></div></div><div data-index="31" data-line-number="32" data-line-start="32" data-line-end="32" class="code-line "><div class="line-content"><span class="">│   └── checkinEdit/</span></div></div><div data-index="32" data-line-number="33" data-line-start="33" data-line-end="33" class="code-line "><div class="line-content"><span class="">│       └── CheckinEditView.tsx      # Màn hình form chỉnh sửa bản ghi (EditItemView.tsx)</span></div></div><div data-index="33" data-line-number="34" data-line-start="34" data-line-end="34" class="code-line "><div class="line-content"><span class="">│</span></div></div><div data-index="34" data-line-number="35" data-line-start="35" data-line-end="35" class="code-line "><div class="line-content"><span class="">├── components/                      # [THÀNH PHẦN CON DÙNG CHUNG]</span></div></div><div data-index="35" data-line-number="36" data-line-start="36" data-line-end="36" class="code-line "><div class="line-content"><span class="">│   ├── layout/</span></div></div><div data-index="36" data-line-number="37" data-line-start="37" data-line-end="37" class="code-line "><div class="line-content"><span class="">│   │   └── TopAppBar.tsx            # Thanh điều hướng trên cùng, profile & logout</span></div></div><div data-index="37" data-line-number="38" data-line-start="38" data-line-end="38" class="code-line "><div class="line-content"><span class="">│   ├── modals/</span></div></div><div data-index="38" data-line-number="39" data-line-start="39" data-line-end="39" class="code-line "><div class="line-content"><span class="">│   │   └── DeleteConfirmModal.tsx   # Modal xác nhận xóa</span></div></div><div data-index="39" data-line-number="40" data-line-start="40" data-line-end="40" class="code-line "><div class="line-content"><span class="">│   └── feedback/</span></div></div><div data-index="40" data-line-number="41" data-line-start="41" data-line-end="41" class="code-line "><div class="line-content"><span class="">│       ├── SkeletonLoader.tsx       # Loading skeleton shimmer</span></div></div><div data-index="41" data-line-number="42" data-line-start="42" data-line-end="42" class="code-line "><div class="line-content"><span class="">│       ├── ErrorState.tsx           # Khung báo lỗi và retry</span></div></div><div data-index="42" data-line-number="43" data-line-start="43" data-line-end="43" class="code-line "><div class="line-content"><span class="">│       └── ToastAlert.tsx           # Thông báo Toast nổi</span></div></div><div data-index="43" data-line-number="44" data-line-start="44" data-line-end="44" class="code-line "><div class="line-content"><span class="">│</span></div></div><div data-index="44" data-line-number="45" data-line-start="45" data-line-end="45" class="code-line "><div class="line-content"><span class="">├── styles/                          # Hệ thống CSS Design System theo chuẩn</span></div></div><div data-index="45" data-line-number="46" data-line-start="46" data-line-end="46" class="code-line "><div class="line-content"><span class="">│   ├── tokens.css                   # Biến màu sắc, khoảng cách, font, shadow</span></div></div><div data-index="46" data-line-number="47" data-line-start="47" data-line-end="47" class="code-line "><div class="line-content"><span class="">│   ├── base.css                     # Reset, base font, layout chung</span></div></div><div data-index="47" data-line-number="48" data-line-start="48" data-line-end="48" class="code-line "><div class="line-content"><span class="">│   ├── table.css                    # Toàn bộ CSS chuyên biệt cho bảng dữ liệu & resize</span></div></div><div data-index="48" data-line-number="49" data-line-start="49" data-line-end="49" class="code-line "><div class="line-content"><span class="">│   ├── cards.css                    # CSS cho giao diện dạng thẻ (Cards)</span></div></div><div data-index="49" data-line-number="50" data-line-start="50" data-line-end="50" class="code-line "><div class="line-content"><span class="">│   └── modal.css                    # CSS cho modal và dialog</span></div></div><div data-index="50" data-line-number="51" data-line-start="51" data-line-end="51" class="code-line "><div class="line-content"><span class="">│</span></div></div><div data-index="51" data-line-number="52" data-line-start="52" data-line-end="52" class="code-line "><div class="line-content"><span class="">└── DqmCheckinApp.tsx                # Container chính (Root Orchestrator - đổi tên từ DqmCheckin.tsx)</span></div></div></div></div></div></div></pre>

---

## **3. Chi tiết Phân loại & Nhiệm vụ từng tầng**

### **1. Thư mục `views/` (Màn hình nghiệp vụ)**

  Tách rõ ràng 4 màn hình chính của ứng dụng:

* **`views/login/LoginView.tsx`** : Xử lý giao diện form đăng nhập, validation tài khoản.
* **`views/checkinCards/CheckinCardsView.tsx`** : Màn hình xem dạng thẻ đa thiết bị, bao gồm thanh tìm kiếm, bộ lọc sắp xếp và lưới thẻ.
* **`views/checkinTable/CheckinTableView.tsx`** : Màn hình xem dạng bảng 7 cột, xử lý kéo dãn cột (`column resizing`), sắp xếp cột, cuộn ngang.
* **`views/checkinEdit/CheckinEditView.tsx`** : Màn hình form chỉnh sửa chi tiết (Name, ID, Phone, Checkin, Location, Note) kèm thanh điều hướng breadcrumb.

### **2. Thư mục `components/` (Thành phần giao diện tái sử dụng)**

* **`components/layout/`** : Các thành phần khung bao ngoài như thanh `TopAppBar` (chứa nút chuyển Dạng thẻ/Bảng, Refresh, Thẻ Admin, Nút Logout).
* **`components/modals/`** : Hộp thoại xác nhận như `DeleteConfirmModal`.
* **`components/feedback/`** : Trạng thái tải `SkeletonLoader`, thông báo lỗi `ErrorState`, thông báo `ToastAlert`.

### **3. Thư mục `utils/` (Logic xử lý không dính UI)**

* Chuyển các hàm bóc tách dữ liệu (`getItemName`, `getItemDisplayId`, `getItemPhone`, `getItemLocation`, `getItemNote`, `getItemCheckIn`) ra tập tin `fieldParsers.ts`.
* Tách hàm định dạng ngày tháng `formatCheckinTime`, `isoToDatetimeLocal` vào `dateUtils.ts`.
* Tách hàm sinh màu avatar `getAvatarColor` và viết tắt `getAvatarLetter` vào `avatarUtils.ts`.
* **Lợi ích:** Các hàm này là hàm thuần túy (Pure Functions), dễ viết Unit Test và có thể tái sử dụng ở bất kỳ view nào.

  ### **4. Thư mục `styles/` (Phân rã CSS Monolithic)**

  Thay vì nhồi nhét **2.793 dòng** vào một file `App.css`:


  * **`tokens.css`** : Quản lý CSS Variables (`--color-accent`, `--space-*`, `--radius-*`).
* **`base.css`** : CSS Layout bao quanh `.app-layout`, `.main-content`.
* **`cards.css`** : CSS cho lưới thẻ, khung thông tin, avatar, badge trạng thái.
* **`table.css`** : CSS cho bảng dữ liệu, thanh kéo dãn resize cột, mobile card view của bảng.
* **`modal.css`** : CSS cho backdrop, overlay và dialog xóa.

---

## **4. Lộ trình Triển khai (Implementation Roadmap)**

  Quá trình tái cấu trúc sẽ được thực hiện theo 4 bước an toàn để **không làm gián đoạn mã nguồn** và  **luôn đảm bảo build thành công** :

<pre data-line-start="116" data-line-end="121"><div class="mermaid-wrapper relative my-4 w-fit max-w-full cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" data-line-start="116" data-line-end="121" role="button" tabindex="0" aria-label="Open Mermaid diagram preview"><img alt="Mermaid diagram" class="rounded-lg"/></div></pre>

### **Bước 1: Trích xuất Types, Constants & Utils (Rủi ro: Rất thấp)**

* Tạo các thư mục `types/`, `constants/`, `utils/`.
* Di chuyển `SAMPLE_RECORDS` sang `constants/sampleRecords.ts`.
* Tách các hàm parser từ `DataCheckinModel.ts` sang `utils/fieldParsers.ts`.
* Tách các hàm format ngày sang `utils/dateUtils.ts`.

  ### **Bước 2: Phân chia Stylesheet (Rủi ro: Rất thấp)**


  * Chia nhỏ `App.css` thành các file CSS thành phần (`tokens.css`, `base.css`, `table.css`, `cards.css`, `modal.css`) và import tập trung qua `index.css`.

  ### **Bước 3: Di chuyển Màn hình vào thư mục `views/` (Rủi ro: Thấp)**

  * Tạo thư mục `views/` và chuyển 4 màn hình chính vào các thư mục con tương ứng.
* Chuyển các modal và layout vào `components/layout/` và `components/modals/`.
* Cập nhật lại đường dẫn `import` trong toàn bộ codebase.

  ### **Bước 4: Kiểm thử và Đóng gói (Rủi ro: Không có)**


  * Chạy `npm run build` (`heft test` và `heft package-solution`).
* Kiểm tra tính toàn vẹn của bundle và file `.sppkg`.
