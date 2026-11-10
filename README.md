# 🛠️ Avery Dennison QA Double-Check Automated Tool (Pipeline 2.0)

Hệ thống tự động đối soát thông tin đơn hàng và thông số kỹ thuật (VN SPEC) dành cho team Quality Assurance / Engineering của Avery Dennison.

Hỗ trợ cả 2 chế độ:
1. **Tra cứu Real-time từng Item**: Truy vấn trực tiếp vào hệ thống **`ItemMaster.php`** (Items Master - Offset & Digital) và đối chiếu với **VN SPEC PDF trên Google Drive**.
2. **Đối soát hàng loạt theo thư mục**: Quét các item theo thư mục ảnh (`09-Nov`, `07-Nov`, `06-Nov`...).

---

## 🚀 1. Cách Sử Dụng Nhanh (1-Click)

### Cách 1: Giao diện Web trực quan (Khuyên dùng)
1. Đúp chuột vào file **`Start_DoubleCheck_Tool.bat`**.
2. Trình duyệt sẽ mở trang quản trị tại: **`http://localhost:3000`**.
3. **Đối soát từng Item Real-time**:
   - Nhập mã GLID (ví dụ: `2-456230-007-01` hoặc `1-350296-000-00`) vào ô **Tra cứu nhanh Item**.
   - Bấm **"Kiểm Tra Real-time"**.
   - Hệ thống sẽ tự động mở `ItemMaster.php`, bóc tách toàn bộ 17 thông số, tìm kiếm VN Spec trên Google Drive, tính toán Leadtime, giải toán khổ cắt giấy và hiển thị bảng so khớp trực quan cùng 3 bằng chứng ảnh chụp màn hình (ItemMaster, Tìm kiếm Drive, Phiếu đối soát).
4. **Đối soát hàng loạt theo Thư Mục**:
   - Chọn thư mục (ví dụ: `09-Nov`, `07-Nov`...).
   - Nhấn **"Bắt Đầu Đối Soát"**.
   - Báo cáo HTML và file tổng hợp sẽ được tự động kết xuất.

### Cách 2: Chạy nhanh qua dòng lệnh (CLI)
```bash
# Đối soát 1 item cụ thể trên ItemMaster realtime:
node double_check_tool/cli.js --item 2-456230-007-01

# Đối soát hàng loạt theo thư mục:
node double_check_tool/cli.js --folder 07-Nov
```

---

## 📋 2. Quy Trình 4 Bước Chuẩn Hóa

| Bước | Hành Động | Chi Tiết Kỹ Thuật |
| :--- | :--- | :--- |
| **Bước 1** | **Tra cứu Real-time ItemMaster.php** | Tự động kết nối Chrome thực (`port 9222`), truy vấn trực tiếp trang web `ItemMaster.php?GLID=<GLID>`, trích xuất toàn bộ form, combo box và các checkbox DHTMLX (`Hole`, `Remove Wastage`, `Brand Protection`...). Chụp ảnh màn hình lưu bằng chứng. |
| **Bước 2** | **Tìm Kiếm VN Spec Trên Drive** | Tìm kiếm mã trên Web App *"Artwork - Spec Search On Drive"*, tự động bật chế độ `#searchRawText`, chụp ảnh màn hình kết quả tìm kiếm và chọn đúng file **VN SPEC PDF**. |
| **Bước 3** | **Bóc Tách & Giải Nén File Spec PDF** | Tải file PDF về máy, giải nén stream nhị phân (zlib, ascii85) để bóc tách chính xác các bảng thông số kỹ thuật (Customer Name, Kích thước mm/inch, Màu in, Lớp phủ Varnish, Lỗ chọt Hole Size, Phoi Wastage, Special Applications...). |
| **Bước 4** | **Đối Soát 17 Trường Quy Chuẩn & Tính Leadtime** | Thực hiện phân tích cấu trúc mã giấy, giải toán khổ cắt Offset Cut No, tính toán cộng dồn ngày sản xuất Leadtime theo bảng chuẩn Excel (`cách tính leadtime.xlsx`), xuất ảnh phiếu đối soát trực quan (PNG) và báo cáo HTML. |

---

## 🔍 3. Danh Sách 17 Quy Tắc Đối Soát Chi Tiết

| STT | Trường Dữ Liệu | Nguồn ItemMaster | Nguồn VN SPEC | Quy Tắc So Sánh & Ghi Chú |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **`GLID`** | `GLID` | Tên file / Spec | So khớp mã định danh toàn cầu (VD: `2-456230-007-01`). |
| **2** | **`Item Code`** | `Item_Code` | Customer Part Number | So khớp mã sản phẩm (VD: `1047833-GLB`). |
| **3** | **`Buying Office / Customer Name`** | `Buying_Office` | Header `Customer Name` | So khớp thương hiệu: Hỗ trợ alias quan hệ thương hiệu (`RYOHIN KEIKAKU = MUJI`, `OLD NAVY` thuộc `GAP INC`, `THE NORTH FACE = TNF/VF CORP`). |
| **4** | **`Product Length` (Số)** | `ProductionLength` | `Tag Length (mm)` | Kiểm tra dung sai 1mm. Bắt buộc cảnh báo **LỆCH SỐ** nếu vượt dung sai. |
| **5** | **`Product Width` (Số)** | `ProductionWidth` | `Tag Width (mm)` | Kiểm tra dung sai 1mm. Bắt buộc cảnh báo **LỆCH SỐ** nếu vượt dung sai. |
| **6** | **`Color F`** | `Color_F` | `INK Colors: Front Colors` | So khớp mã màu in mặt trước (VD: `2955C` vs `pantone 2955 C`). |
| **7** | **`Color B`** | `Color_B` | `INK Colors: Back Colors` | So khớp mã màu in mặt sau (VD: `2955C` vs `pantone 2955 C`). |
| **8** | **`Varnish F`** | `Varnish_F` | `INK Colors: Front Coating Type` | Lớp phủ trước. **Quy tắc:** Đối với `Dig. Machine` (máy Digital) thì **KHÔNG CẦN Varnish** như spec (ngoại trừ Buying Office là `UNIQLO` thì bắt buộc cần). |
| **9** | **`Varnish B`** | `Varnish_B` | `INK Colors: Back Coating Type` | Lớp phủ sau. **Quy tắc:** Đối với `Dig. Machine` (máy Digital) thì **KHÔNG CẦN Varnish** như spec (ngoại trừ Buying Office là `UNIQLO` thì bắt buộc cần). |
| **10** | **`Material Code`** | `Specs_Material` / `Stock_Code` | Bảng `Material` & Update Notes | **Bóc tách 5 thành phần & Quét từ đầu trang:** Lấy vật tư mới nhất (`Update MDM RM` / `New RM`) tính từ đầu trang trở xuống (đặc biệt đối với `THE NORTH FACE`). |
| **11** | **`Sheet Size & Cut No`** | `Sheet_Size` | Khổ gốc & Cut No | **Toán học khổ in:** Khổ gốc 965x660mm cắt 2 con (965/2 = 482.5mm) $\rightarrow$ Khổ in tính toán 660x482mm, thực tế in 660x482mm. |
| **12** | **`Offset Cut No` (Số)** | `Offset_Cut_No` | Số con cắt tính toán | Số con cắt từ khổ gốc (2, 4 hoặc 0). |
| **13** | **`Hole (Chọt Lỗ)`** | Checkbox `Hole` (`1` / `0`) | Dòng `Hole: Yes/No` & `Hole Size` | Xác nhận chọt lỗ và đường kính lỗ (`.125 in / 3.175 mm`). |
| **14** | **`Remove Wastage (Lột Phoi)`** | Checkbox `Remove_Wastage` | Dòng `Remove Wastage: Yes/No` | Xác nhận yêu cầu lột phoi rác sau công đoạn bế. |
| **15** | **`FSC & Brand Protection`** | Field `FSC` & `Brand Protection` | Header `FSC Content` & `BP Type` | **Quy tắc FSC:** Chỉ khi tại vị trí `FSC Content` trên Spec là **`FSC MIX CREDIT`** thì ItemMaster mới bắt buộc phải có FSC. Brand Protection: Theo chuẩn `T1/T2/T3` (Coach/Tapestry không cần tick). |
| **16** | **`Special Instructions`** | `Special_Instruction` | `Manufacturing Notes` / `Color Reference` | So khớp mã approved sample tham chiếu (VD: `ON-HT-US-01`). |
| **17** | **`Process & Leadtime`** | `Process` & `Standard_LeadTime` | `Special Applications` & File Excel | **Tính Leadtime:** 7 ngày cơ bản (Offset routing) + công đoạn phụ theo file `cách tính leadtime.xlsx` (VD: `S4` Soft Touch 4 lượt = +2 ngày $\rightarrow$ Tổng 9 ngày, khớp với `Standard_LeadTime = 9`). |

---

## 📂 4. Cấu Trúc Thư Mục Dự Án

```
├── double_check_tool/
│   ├── config/
│   │   ├── rules.json             # 17 quy tắc so khớp, matchMode và dung sai
│   │   ├── leadtime_rules.json    # 114 quy tắc công đoạn & số ngày Leadtime chuẩn từ file Excel
│   │   ├── steps.json             # Danh mục 4 bước trong pipeline
│   │   └── form_cache.json        # Cache dữ liệu dự phòng
│   ├── engine/
│   │   ├── browser.js             # Quản lý kết nối Chrome thực (Remote port 9222)
│   │   ├── item_master_fetcher.js # Trích xuất Real-time từ ItemMaster.php & chụp ảnh màn hình
│   │   ├── drive_searcher.js      # Tìm kiếm trên Web App Google Drive & chụp ảnh màn hình
│   │   ├── pdf_parser.js          # Giải nén stream nhị phân Oracle Reports PDF
│   │   ├── leadtime_calculator.js # Engine cộng dồn Leadtime theo 114 quy tắc công đoạn
│   │   ├── comparator.js          # Engine so khớp 17 trường, giải toán khổ cắt & bóc tách vật tư
│   │   ├── reporter.js            # Sinh phiếu so sánh PNG & Dashboard HTML
│   │   ├── folder_scanner.js      # Quét thư mục ảnh theo chuẩn tên
│   │   └── pipeline.js            # Nhạc trưởng điều phối toàn bộ luồng chạy
│   ├── public/                    # Giao diện Web App Dashboard (Port 3000)
│   ├── server.js                  # Node.js Server cung cấp Web UI và API SSE realtime
│   └── cli.js                     # CLI runner hỗ trợ cả Single Item và Folder
├── downloads/                     # Lưu trữ file VN SPEC PDF tải từ Drive
├── reports/                       # Báo cáo, ảnh bằng chứng ItemMaster & phiếu đối soát
│   ├── single_checks/
│   ├── 09-Nov/
│   ├── 07-Nov/
│   └── 06-Nov/
├── cách tính leadtime.xlsx        # File chuẩn tính leadtime công đoạn của nhà máy
├── Start_DoubleCheck_Tool.bat     # File kích hoạt Web UI bằng 1 click
└── Run_Check_Folder.bat           # File kích hoạt CLI bằng 1 click
```

---

## 🎓 5. Cập Nhật Quy Trình & Dạy Agent Thêm Tính Năng

- **Thêm/sửa trường kiểm tra**: Vào tab **"Quy Trình & Cấu Hình"** trên giao diện Web UI hoặc chỉnh sửa file `double_check_tool/config/rules.json`.
- **Dạy Agent qua Chat**: Khi có thay đổi công đoạn hoặc bảng mã mới, bạn chỉ cần gửi file Excel hoặc mô tả yêu cầu trong chat, Agent sẽ tự động cập nhật engine tính toán ngay lập tức!
