# Kế hoạch chỉnh sửa tồn kho TTCOAPP: Kho 35 và Kho 5-T4

Ghi nhận giai đoạn chuẩn bị ngày 21/09/2026: **đã sửa ánh xạ trong bản ứng viên, sửa frontend và đối chiếu được SQL trực tiếp**. Bản script và kiểm thử ứng viên được giữ trong `release-records/coal-stock-2026-09-21-candidate/staged/`; việc phát hành và kết quả kiểm tra sau phát hành được ghi riêng tại `release-records/coal-stock-2026-09-21-candidate/RELEASE.md`.

## 1. Bằng chứng và phạm vi đối chiếu

- Báo cáo TTCO APP do người dùng cung cấp ngày 21/09/2026: bảy dòng than của Kho 35 và Kho 5-T4. Ảnh báo cáo không hiển thị kỳ/thời điểm chốt số liệu; phải xác nhận trùng kỳ 09/2026 và thời điểm chốt trước khi nghiệm thu.
- JSON hiện hành `public/data/ton_kho_latest.json` được xuất lúc 08:00:09, 21/09/2026, kỳ 09/2026; không có dữ liệu hiển thị cho hai kho.
- `public/data/ton_kho_audit.json` và `ton_kho_warnings.json`: mã DB `75` có hai dòng, bị gắn `UNMAPPED_75`; mã `34` có năm dòng than nhập khẩu, bị gắn `UNMAPPED_34`; không có dòng mã DB `35`.
- Danh mục Excel đã có cả hai kho. Chỉ đưa khối lượng từ dữ liệu TTCO đã kiểm chứng, không suy diễn số tồn từ Excel.

| Kho / chủng loại | Mã DB / than trong audit | Tồn đầu TTCO APP (tấn) | Xuất TTCO APP | Tồn cuối TTCO APP | Tồn cuối audit hiện tại | Chênh audit - báo cáo |
|---|---|---:|---:|---:|---:|---:|
| 5-T4 / Cám 6a.1 | `75` / `11a.1` | 20.213,00 | 0,00 | 20.213,00 | 20.213,00 | 0,00 |
| 5-T4 / Cục don 8C | `75` / `b16.09` | 6.146,00 | 0,00 | 6.146,00 | 6.146,00 | 0,00 |
| 35 / LIME MIA | `34` / `NHK.299` | 6.038,84 | 190,00 | 5.848,84 | 6.038,84 | **+190,00** |
| 35 / MADREDEUS | `34` / `NHK.308` | 2.492,00 | 2.330,00 | 162,00 | 162,00 | 0,00 |
| 35 / FORTUNE ATLAS | `34` / `NHK.309` | 9.461,54 | 0,00 | 9.461,54 | 9.461,54 | 0,00 |
| 35 / SHINE RUBY | `34` / `NHK.313` | 3.126,00 | 1.026,00 | 2.100,00 | 3.126,00 | **+1.026,00** |
| 35 / MICHALIS | `34` / `NHK.314` | 3.319,92 | 0,00 | 3.319,92 | 3.319,92 | 0,00 |

**Đối chiếu tổng:** Kho 5-T4: tồn đầu/cuối **26.359,00 tấn**. Kho 35: tồn đầu **24.438,30**, xuất **3.546,00**, tồn cuối **20.892,30 tấn**. Gộp hai kho: tồn đầu **50.797,30**, xuất **3.546,00**, tồn cuối **47.251,30 tấn**. Audit đang có tổng **48.467,30 tấn** cho mã `34` + `75`, cao hơn báo cáo **1.216,00 tấn**. Đây là chênh lệch xuất kho, không phải chỉ là vấn đề ánh xạ mã kho.

## 2. Nguyên nhân đã xác định và điều cần kiểm chứng

1. **Đã xác minh và chuẩn bị sửa mapping:** Truy vấn `TTCO_QTHT.dbo.DMKHO` xác nhận `34 -> Kho 35`, `34a -> Kho 34`, `35 -> Kho 36`, `75 -> Kho 5-T4`. Mã `35 -> Kho 35` trước đây trong script thực tế sai tên theo danh mục DB. Đã cập nhật bản script ứng viên, frontend và tài liệu; mã `34A` giữ riêng biệt. Script tự chạy vẫn giữ ánh xạ cũ cho đến bước phát hành.
2. **Đã truy vết hai khoản xuất:** `ThanXuatCT` có `NHK.299`: một dòng 190 tấn (NID 82570); `NHK.313`: năm dòng tổng 1.026 tấn (NID 82571, 82572). Các chứng từ đều nối được `ThanXuat` qua `NID`, thuộc 19–20/09/2026, mã kho `34`. Truy vấn V21.1 hiện tại trả đúng hai khoản xuất mà không cần đổi công thức. JSON cũ xuất lúc 08:00:09 ngày 21/09 ghi 0, nhưng `NgayNh` của chứng từ chỉ có ngày 21/09, chưa xác định chính xác thời điểm nhập trong ngày; không khẳng định được chứng từ đã có trước lần xuất 08:00.
3. **Đã xử lý frontend:** Đồng bộ mã DB, phân biệt mã DB thô với tên kho chuẩn, ưu tiên tên kho khi ghép danh mục Excel và giữ `rawKhoCode` gốc khi đọc JSON. Tránh nhầm Kho 34/35/36 và Kho 5/Kho 5-T4.

## 3. Tiến độ thực hiện

- [x] **Xác minh nguồn**: đối chiếu DMKHO và bảy dòng kỳ 09/2026; xác nhận mã `34`, `34a`, `35`, `75`. Ảnh báo cáo không cho biết giờ chốt, nhưng số liệu truy vấn hiện tại khớp cả bảy dòng.
- [x] **Truy vết xuất thiếu**: xác minh chứng từ `NHK.299` và `NHK.313` cùng điều kiện nối SQL; dữ liệu hiện tại đã đủ, giữ công thức cũ và không trừ cứng 1.216 tấn.
- [x] **Chuẩn bị nguồn sinh dữ liệu**: cập nhật mapping, metadata nguồn, tài liệu mapping và phiên bản script trong bản ứng viên; khôi phục ánh xạ cũ ở script đang chạy lịch để tránh tự upload bản chưa duyệt.
- [x] **Sửa frontend**: phân biệt tên kho đã chuẩn hóa với mã DB thô, sửa cách ghép Excel/JSON, giữ mã kho gốc để kiểm tra nhất quán.
- [x] **Kiểm thử hồi quy**: bổ sung unittest cho 7 dòng và Vitest cho các mã kho có thể xung đột; trường hợp không có nguồn vẫn giữ trạng thái chưa có số liệu.
- [x] **Kiểm tra tích hợp**: truy vấn SQL read-only kỳ 09/2026 khớp Kho 5-T4 = 26.359,00; Kho 35 = 20.892,30; tổng = 47.251,30 tấn; sai lệch 0; hai mã không còn bị loại trong warnings. Dữ liệu SQL mới có 157 dòng thô, so với 153 dòng trong bản xuất 08:00, cần rà soát toàn bộ chênh lệch khi phát hành.
- [x] **Chuẩn bị ứng viên và bản lưu**: giữ riêng script, kiểm thử và bốn JSON ứng viên tại `release-records/coal-stock-2026-09-21-candidate/`; lưu bốn JSON hiện có trong thư mục `previous-local-snapshot/`. Đây là bản lưu tệp cục bộ, chưa xác minh là byte đang phục vụ trên GitHub Pages.
- [x] **Kiểm thử lại bản ứng viên**: Python 5/5, Python script đang chạy 6/6, Vitest 17/17 và `npm run build` thành công (cảnh báo kích thước bundle trên 500 kB).
- [ ] **Phát hành có kiểm chứng theo yêu cầu riêng**: lưu phiên bản JSON đang chạy, kiểm thử script và app, cập nhật `CHANGELOG.md`, xuất/upload JSON lên GitHub theo quy trình hiện có; xác nhận website tải đúng file, đúng kỳ và các số liệu trên; giữ phương án khôi phục bản trước. Xem hồ sơ phát hành để biết trạng thái sau thời điểm lập kế hoạch này.

**Giới hạn trước phát hành:** Ứng viên có thêm bảy dòng thuộc phạm vi hai kho, đồng thời có một dòng bị loại và bảy dòng thay đổi ở các kho khác do dữ liệu nguồn thay đổi so với bản 08:00. Cần đối chiếu chênh lệch này và lưu bản JSON thực tế đang phục vụ trước khi cập nhật GitHub. Báo cáo ảnh không hiển thị giờ chốt; chỉ có thể chứng minh truy vấn hiện tại khớp các dòng báo cáo. Bộ JSON website vẫn là bản cũ cho tới khi phát hành. Không sử dụng kết quả từ ảnh để ghi đè thủ công cơ sở dữ liệu.
