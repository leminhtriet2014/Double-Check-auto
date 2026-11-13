---
name: printspec-color-analyzer
description: Phân tích kiến trúc PrintSpecThree, giải mã tiêu chuẩn in ấn ISO 12647/ISO 15339/G7, trích xuất dữ liệu màu CxF/XML, và chuyển đổi thuật toán đo kiểm màu sắc (Delta E, TVI, Dot Gain, Grey Balance) từ ActionScript sang JavaScript/Google Apps Script.
---

# PrintSpec Three & Color Management System Analyzer

Skill chuyên dụng cho kỹ sư màu sắc và lập trình viên trong ngành in ấn, phục vụ việc phân tích mã nguồn, tiêu chuẩn màu và thuật toán từ phần mềm **PrintSpecThree** (Mellow Colour), sau đó chuyển đổi/tích hợp vào công cụ kiểm tra tự động (`double_check_tool`, `Colorquality.gs`, `JS_Printspec.html`).

---

## 1. Bản đồ Tài nguyên & Dữ liệu trong `PrintSpecThree/`

Khi cần tra cứu bất kỳ tính năng hoặc dữ liệu nào, hãy truy cập trực tiếp các đường dẫn sau:

| Mục tiêu nghiên cứu | Đường dẫn tệp tin | Định dạng & Mục đích |
| :--- | :--- | :--- |
| **Tiêu chuẩn màu quốc tế** | `PrintSpecThree/projectresources/printspec/TopLevelStandards.xml` | XML CxF3 chứa tọa độ màu mục tiêu CIELab ($L^*, a^*, b^*$) và CMYK theo các chuẩn ISO 12647, ISO 15339, G7. |
| **Ngưỡng chấm điểm (Scores)** | `PrintSpecThree/projectresources/printspec/ScoresTables.xml` | Quy định dung sai **Good**, **Fair**, **Soso** cho CMYK 100%, Mid Grey, Dark Grey, Overprint (Red, Green, Violet). |
| **Dải màu đo kiểm (Strips)** | `PrintSpecThree/projectresources/mcfileservices/preferences/MeasureStrips.xml` | Định nghĩa hơn 35.000 dòng cấu hình các ô màu (Solid 100%, Tints 25%, 50%, 75%), phím mực (ink keys). |
| **Bù trừ đường cong bản in** | `PrintSpecThree/projectresources/printspec/IndigoCurves.xml` | Đường cong bù độ gia tăng tầng thứ (TVI curves) cho máy in HP Indigo / Offset. |
| **Giám sát tự động (Hot folder)**| `PrintSpecThree/projectresources/printspec/FolderMonitor.xml` | Cấu hình thư mục giám sát để tự động nhập dữ liệu quét từ máy đo. |
| **Thuật ngữ & Nhãn giao diện** | `PrintSpecThree/projectresources/locale/en_US/*.properties` | Chứa toàn bộ tên menu, thông số kỹ thuật, lỗi của các module: `PrintSpec`, `InkSpec`, `PaletteEditor`, `MellowCloud`. |
| **Mã nguồn Logic nghiệp vụ** | `PrintSpecThree/PrintSpec.swf` | Mã ActionScript 3 (dùng JPEXS Free Flash Decompiler để trích xuất ra các file `.as`). |

---

## 2. Các Quy trình Phân tích Cốt lõi (Workflows)

### Quy trình 1: Trích xuất & Chuẩn hóa Ngưỡng Dung sai (Tolerances)
1. Đọc file `ScoresTables.xml` để lấy bảng dung sai theo từng chuẩn in (ví dụ: ISO 15339):
   - Solid CMYK: $\Delta E$ cho Cyan 100, Magenta 100, Yellow 100, Black 100.
   - Cân bằng xám (Grey Balance): Light Grey, Mid Grey, Dark Grey.
   - Chồng màu (Overprints): Red, Green, Violet.
2. Xuất dữ liệu sang định dạng JSON để nạp vào hệ thống JavaScript/Apps Script:
   ```json
   {
     "standard": "ISO 15339",
     "tolerances": {
       "C_100": { "good": 1.5, "fair": 2.4, "soso": 4.0 },
       "M_100": { "good": 1.5, "fair": 2.4, "soso": 4.0 },
       "Y_100": { "good": 1.5, "fair": 2.4, "soso": 4.0 },
       "K_100": { "good": 2.4, "fair": 5.5, "soso": 6.0 },
       "Mid_Grey": { "good": 3.0, "fair": 3.5 }
     }
   }
   ```

### Quy trình 2: Tái lập Dải màu đo kiểm (Control Strip Re-engineering)
1. Tra cứu cấu trúc strip trong `MeasureStrips.xml`.
2. Xác định thứ tự ô màu từ trái sang phải (`PaletteEditor.leftToRight`):
   - Các ô kiểm soát độ phủ cơ bản: $C_{100}, M_{100}, Y_{100}, K_{100}$.
   - Các ô đo độ gia tăng tầng thứ TVI: $25\%, 50\%, 75\%$.
   - Các ô xám cân bằng 3 màu (CMY grey patch: $C_{50}, M_{40}, Y_{40}$...).
3. Xây dựng parser đọc file kết quả đo quang phổ dạng CxF hoặc CGATS text từ máy đo (eXact, i1Pro).

### Quy trình 3: Chuyển đổi Thuật toán sang JavaScript / Google Apps Script
Khi người dùng cung cấp đoạn mã ActionScript (trích từ `PrintSpec.swf`), hãy:
1. Xác định thuật toán đo lường:
   - **CIEDE2000 ($\Delta E_{00}$)**: Tính toán sai lệch màu với trọng số $k_L, k_C, k_H$.
   - **TVI / Dot Gain**: Công thức Murray-Davies:
     $$\text{TVI} = \frac{1 - 10^{-(D_t - D_0)}}{1 - 10^{-(D_s - D_0)}} \times 100\% - t$$
   - **Grey Balance $\Delta Ch$**: Độ lệch sắc độ giữa ô xám in thực tế và chuẩn xám lý thuyết.
2. Viết lại mã nguồn thành các hàm JavaScript/Apps Script độc lập, tối ưu hiệu năng, sẵn sàng nhúng vào `Colorquality.gs` hoặc `double_check_tool`.

---

## 3. Quy tắc hỗ trợ lập trình viên
- **Luôn ưu tiên tính thực chiến**: Cung cấp mã nguồn JavaScript/Python chạy được ngay, có kèm dữ liệu mẫu (mock data) để đối chiếu kết quả.
- **Tương thích hệ thống**: Mã tạo ra phải dễ dàng tích hợp vào cấu trúc `pipeline.js`, `tnf_sheet_checker.js` hoặc giao diện HTML/CSS của dự án `Double-Check-auto`.
