# Hướng Dẫn Prompt Gọi Lại Dự Án PrintSpecThree

Tài liệu này lưu lại các câu Prompt mẫu để khi về nhà bạn chỉ cần copy/paste vào khung chat với AI Assistant là hệ thống sẽ hiểu ngay bối cảnh dự án mà không cần phải giải thích lại từ đầu.

---

## 1. Prompt Khởi động Nhanh (Master Recall Prompt)
> *Copy toàn bộ đoạn dưới đây và gửi vào chat:*

```text
Chào bạn! Tôi muốn tiếp tục nghiên cứu và trích xuất logic từ phần mềm PrintSpecThree (đã lưu trong thư mục PrintSpecThree/ của repository này).

Dự án này là hệ thống quản lý màu sắc và chuẩn in ấn (CMS) của Mellow Colour, bao gồm:
1. File chuẩn màu CxF/XML: PrintSpecThree/projectresources/printspec/TopLevelStandards.xml
2. Bảng chấm điểm dung sai ISO 15339: PrintSpecThree/projectresources/printspec/ScoresTables.xml
3. Cấu hình dải màu đo kiểm: PrintSpecThree/projectresources/mcfileservices/preferences/MeasureStrips.xml
4. Logic ActionScript 3 chính nằm trong: PrintSpecThree/PrintSpec.swf

Hãy kích hoạt skill "printspec-color-analyzer". Trước tiên, hãy đọc file ScoresTables.xml và TopLevelStandards.xml để tóm tắt các tiêu chuẩn dung sai màu sắc mà hệ thống đang sử dụng.
```

---

## 2. Prompt Yêu Cầu Chuyên Sâu Theo Từng Nhiệm Vụ

### Task A: Phân tích & Trích xuất Bảng Điểm Dung Sai (Scores Tables)
```text
Hãy đọc file "PrintSpecThree/projectresources/printspec/ScoresTables.xml" và trích xuất toàn bộ cấu trúc chấm điểm của chuẩn ISO 15339 (Solid CMYK, Grey balance, Overprint). Sau đó viết một hàm JavaScript trả về object cấu hình dung sai để tôi tích hợp vào double_check_tool.
```

### Task B: Phân tích Cấu Trúc Dải Màu Đo Kiểm (Control Strip)
```text
Hãy đọc file "PrintSpecThree/projectresources/mcfileservices/preferences/MeasureStrips.xml", phân tích cách PrintSpec bố trí các patch màu (Cyan, Magenta, Yellow, Black 100%, 75%, 50%, 25% và các ô xám CMY). Hãy lập danh sách thứ tự ô màu từ trái sang phải cho dải đo chuẩn.
```

### Task C: Chuyển Đổi Thuật Toán Đo Màu Sang JavaScript / Google Apps Script
```text
Tôi có đoạn code ActionScript 3 trích xuất từ PrintSpec.swf như bên dưới:
[DÁN ĐOẠN CODE ACTIONSCRIPT TẠI ĐÂY]

Hãy giải thích thuật toán đo màu này (ví dụ: TVI, Dot Gain, Delta E2000, hoặc Grey Balance) và chuyển đổi nó thành hàm JavaScript/Google Apps Script tối ưu để tôi sử dụng trong Colorquality.gs / JS_Printspec.html.
```

### Task D: Phân Tích Cơ Chế Thư Mục Tự Động (Folder Monitor / Hot Folder)
```text
Hãy đọc file "PrintSpecThree/projectresources/printspec/FolderMonitor.xml" và giải thích cơ chế phần mềm tự động giám sát thư mục để nhận kết quả quét từ máy đo quang phổ (eXact, i1Pro).
```
