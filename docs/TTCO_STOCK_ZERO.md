# Hiển thị tồn kho bằng 0

- Sau khi tải JSON tồn kho thành công, nếu kho/chủng loại đang chọn không có dòng tồn khác 0, ô **Khối lượng TTCO_APP** hiển thị `0`.
- Khi chưa tải được dữ liệu hoặc tải lỗi, ứng dụng không suy ra tồn kho bằng 0.
- Kỳ báo cáo giữ năm/tháng hiện tại. Nếu `CDOTHAN` chưa có tồn đầu tháng 10, tồn đầu vẫn là `0`; không chuyển tồn tháng 9 sang. Nhập/xuất tháng 10 vẫn tính theo công thức hiện có.
- Chấp nhận các cặp mã DB đã xác minh: `29 → Kho 26`, `26 → Kho 29`, `27 → Kho 30`. Các cặp tên/mã kho không hợp lệ vẫn bị loại.

## Kiểm tra

```text
npm test
npm run build
```

Kiểm tra tự điền trên trình duyệt, gồm màn hình 1280px và 390px:

1. Chạy `npm run dev -- --host 127.0.0.1 --port 5188 --strictPort`.
2. Chạy `node tests/stockDisplay.browser.cjs <đường-dẫn-module-playwright> msedge` với Playwright đã có trong môi trường. Có thể bỏ đường dẫn nếu module nằm trong đường tìm kiếm của Node; bỏ `msedge` nếu đã cài Chromium của Playwright.

Kiểm tra dùng JSON mẫu, không sửa dữ liệu TTCO hoặc website đang chạy.
