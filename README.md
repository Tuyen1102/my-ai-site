# AI Site Starter (WebLLM + lunr.js + Downloads)

Trang web tĩnh **miễn phí 100%** để:
- Chat AI ngay trong trình duyệt (WebGPU) bằng **WebLLM** (không cần API key).
- Tìm kiếm tài liệu nội bộ bằng **lunr.js** (RAG đơn giản).
- Đăng tải tiện ích/phần mềm qua **downloads.json** (gợi ý dùng GitHub Releases).

## Cách dùng nhanh (GitHub Pages)
1. Tạo repo mới, ví dụ: `my-ai-site`.
2. Tải file **ai-site-starter.zip** lên và giải nén toàn bộ vào repo.
3. Commit & push.
4. Vào Settings → Pages → **Build and deployment**:
   - Source: chọn **Deploy from a branch**.
   - Branch: `main` (hoặc `master`), folder: **/** (root).
5. Mở `https://<username>.github.io/<repo>/` để xem website.

> Nếu muốn dùng chế độ GitHub Pages thư mục `docs/`, bạn có thể di chuyển tất cả file vào `docs/` và chọn Branch `main` + Folder `docs/`.

## Cloudflare Pages (miễn phí)
1. Tạo project mới, kết nối repo.
2. Build command: (để trống) • Output directory: `/`.
3. Deploy là xong.

## Tùy biến
- **downloads.json**: thêm tiện ích (tên, phiên bản, URL, SHA256...).
- **docs/context.json**: thêm nội dung FAQ, README rút gọn để AI tham chiếu.
- **docs/articles/**: thêm các bài viết `.md` sẽ tự được đưa vào mục **Tài liệu** và chỉ mục tìm kiếm lunr.
- Bạn có thể đổi tiêu đề site ở phần `<header>` trong `index.html`.

## Lưu ý hiệu năng
- Model mặc định: `Qwen2.5-0.5B-Instruct-q4f16_1` (nhẹ, tải nhanh). Nếu máy mạnh, sửa trong `index.html` để dùng `Qwen2.5-1.5B-Instruct-q4f32_1`.
- Trình duyệt cần hỗ trợ WebGPU (Chrome/Edge mới). Nếu không hỗ trợ, chatbot sẽ hiển thị cảnh báo.

Chúc bạn triển khai thuận lợi!
