# Nguyên tắc lấy tồn kho TTCO_APP_PERIOD

## Nguyên tắc chính

Dữ liệu tồn kho đưa lên app phải khớp màn hình **BÁO CÁO NHẬP - XUẤT - TỒN KHO THAN** của TTCO_APP theo kỳ hiện tại.

Công thức áp dụng cho toàn bộ kho:

```text
TonKho_App = TonDK tháng bắt đầu + Tổng NhapTK trong kỳ - Tổng XuatTK trong kỳ
```

Với cập nhật tự động hằng ngày, kỳ mặc định là **năm hiện tại, tháng hiện tại**:

```text
NamHT = năm hiện tại
ThangTu = tháng hiện tại
ThangDen = tháng hiện tại
```

Ví dụ ngày 14/05/2026:

```text
NamHT = 2026
ThangTu = 5
ThangDen = 5
```

## Ví dụ kiểm chứng Kho 1 tháng 5/2026

Theo TTCO_APP:

```text
Tồn đầu kỳ: 509,950
Nhập trong kỳ: 7.409,000
Xuất trong kỳ: 7.094,800
Tồn cuối kỳ: 824,150
```

Công thức:

```text
509,950 + 7.409,000 - 7.094,800 = 824,150
```

## Quy tắc mapping kho

- `MaKho DB = 01` -> `Kho 1`
- `MaKho DB = 28` -> `Kho 39`
- Không tự map `46B` hoặc `39` thành `Kho 39`
- Kho 9, Kho 10 gộp tên Cám động theo tên gốc trước dấu ngoặc
- Kho 39 giữ chi tiết từng chủng loại than nhập khẩu/tàu/quốc gia

## File app đọc

```text
public/data/ton_kho_latest.json
```

Trong đó:

```text
ton = ttcoApp = TonCuoi_TinhLai
```

## Tiêu chí đạt

```text
GitHub raw/API == DB local JSON: ĐÚNG
GitHub Pages == DB local JSON: ĐÚNG
```
