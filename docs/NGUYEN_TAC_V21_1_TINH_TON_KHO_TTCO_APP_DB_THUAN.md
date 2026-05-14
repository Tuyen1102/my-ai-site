# NGUYÊN TẮC V21.1 - TÍNH TỒN KHO TTCO_APP TỪ DB THUẦN

## 1. Mục tiêu

Từ nay, khi tự động lấy tồn kho cho app web, nguyên tắc chuẩn là **dựng lại tồn kho từ DB nghiệp vụ**, không lấy trực tiếp `CDOTHAN.TonCK` và không phụ thuộc vào việc mở TTCO_APP.

Nguyên tắc này dùng để tính tồn kho hiển thị trong app web:

```text
Tồn kho app = Tồn đầu kỳ + Nhập trong kỳ - Xuất trong kỳ
```

---

## 2. Công thức chuẩn V21.1

```text
TonDK  = CDOTHAN.TonDK

NhapTK = SUM(ThanNhap.Klg_Tan theo MaKho_N, MaThan)
       + SUM(ThanVaoSang.Klg_Tan theo MaKho, MaThan, MaCT IN ('2011','2021'))

XuatTK = SUM(ThanXuatCT.Klg_Tan theo MaKho_X, MaThan_XK)

TonCK  = TonDK + NhapTK - XuatTK
```

Trường app web sử dụng:

```text
ton = ttcoApp = TonCK
```

---

## 3. Nguồn bảng chuẩn

| Vai trò | Bảng | Trường chính |
|---|---|---|
| Tồn đầu kỳ | `CDOTHAN` | `NamHT`, `ThangHT`, `MaKho`, `MaThan`, `TonDK` |
| Nhập trong kỳ | `ThanNhap` | `Ngay`, `MaKho_N`, `MaThan`, `Klg_Tan` |
| Nhập bổ sung | `ThanVaoSang` | `Ngay`, `MaKho`, `MaThan`, `MaCT`, `Klg_Tan` |
| Xuất trong kỳ | `ThanXuatCT` + `ThanXuat` | `Ngay`, `MaKho_X`, `MaThan_XK`, `Klg_Tan`, `NID` |
| Tên than | `TTCO_QTHT.dbo.DMTHAN` | `MaThan`, `TenThan` |

---

## 4. Kiểm chứng Kho 1

Mẫu TTCO_APP và V21 DB thuần đã khớp:

```text
Kho 1 | Cục xô 1c

TonDK  = 509,950
NhapTK = 7.409,000
XuatTK = 7.094,800
TonCK  = 824,150
Lệch   = 0,000
```

Kết luận: **logic V21.1 được dùng làm nguyên tắc chuẩn để tính tồn kho DB thuần.**

---

## 5. Không dùng trực tiếp `CDOTHAN.TonCK` làm tồn cuối

Không lấy `CDOTHAN.TonCK` làm số tồn hiển thị cuối cùng, vì Kho 1 đã chứng minh:

```text
CDOTHAN.TonCK = 671,750
V21 TonCK     = 824,150
TTCO_APP      = 824,150
```

Do đó:

```text
CDOTHAN dùng để lấy TonDK
ThanNhap/ThanVaoSang dùng để lấy NhapTK
ThanXuatCT dùng để lấy XuatTK
TonCK tính lại = TonDK + NhapTK - XuatTK
```

---

## 6. Nguyên tắc lọc dòng hiển thị

Chỉ đưa lên app web và file JSON chính các dòng thỏa mãn:

```text
Đã mapping chuẩn tên kho
và
Không phải dòng tồn rỗng hoàn toàn
```

Dòng tồn rỗng hoàn toàn là dòng có đồng thời:

```text
TonDK  = 0
NhapTK = 0
XuatTK = 0
TonCK  = 0
```

Các dòng này **không đưa vào tồn kho**.

---

## 7. Điều chỉnh sau đối chiếu V21

### 7.1. Kho 32 - Cám 8C

Qua đối chiếu thực tế, dòng:

```text
Kho 32 | Cám 8C
```

**không đúng mapping**, nên từ V21.1 trở đi **không đưa vào tồn kho chuẩn** cho đến khi xác định lại được mã kho/mã than đúng.

### 7.2. Dòng tồn rỗng

Các dòng có `TonDK = 0`, `Nhập = 0`, `Xuất = 0`, `Tồn cuối = 0` bị loại khỏi bảng tồn kho chính.

---

## 8. Nguyên tắc mapping kho

Chỉ đưa vào app web các mã kho đã mapping chuẩn:

```text
01..25      -> Kho 1..Kho 25
29          -> Kho 26
30B/30b     -> Kho 27
31C/31c     -> Kho 28
31D/31d     -> Kho 28-1
26          -> Kho 29
27          -> Kho 30
43          -> Kho 31
31B/31b/44  -> Kho 32
45          -> Kho 33
34A/34a     -> Kho 34
35          -> Kho 35
36          -> Kho 37
46A/46a     -> Kho 38
28          -> Kho 39
60          -> Kho 40
71          -> Kho 1-T4
72          -> Kho 2-T4
73          -> Kho 3-T4
74          -> Kho 4-T4
```

Các mã chưa mapping hoặc mã tạm như:

```text
K04, K05, K06, K07, K60, K71, k04, k06, k17, k52, k54, k59, 34, 39
```

chỉ lưu audit/warnings, không hiển thị trong app web chính.

---

## 9. Nguyên tắc xử lý tên chủng loại than

### Kho 9 và Kho 10

Các chủng loại có phần quốc gia/tên tàu trong ngoặc được gộp theo tên gốc.

Ví dụ:

```text
Cám 6a.14 (Úc - Tàu ...)
Cám 6a.14 (Mozambique - Tàu ...)
=> Cám 6a.14
```

```text
Cám 5a.14 (Úc - Tàu ...)
=> Cám 5a.14
```

### Kho 39

Kho 39 lấy từ `MaKho DB = 28` và giữ chi tiết từng chủng loại/tàu nhập khẩu, không gộp NHK chung.

---

## 10. Quy tắc xuất JSON lên GitHub

Đường dẫn app web đọc:

```text
public/data/ton_kho_latest.json
```

Cấu trúc chính:

```json
{
  "ok": true,
  "meta": {
    "version": "V22_DB_REBUILD_V21_1",
    "formula": "TonDK=CDOTHAN; Nhap=ThanNhap+ThanVaoSang(2011,2021); Xuat=ThanXuatCT; TonCK=TonDK+Nhap-Xuat"
  },
  "data": [
    {
      "kho": "Kho 1",
      "coal": "Cục xô 1c",
      "TonDK": 509.95,
      "NhapTK": 7409.0,
      "XuatTK": 7094.8,
      "ton": 824.15,
      "ttcoApp": 824.15
    }
  ]
}
```

Ngoài JSON chính, luôn upload kèm:

```text
public/data/ton_kho_audit.json
public/data/ton_kho_warnings.json
public/data/ton_kho_verify_report.json
docs/NGUYEN_TAC_V21_1_TINH_TON_KHO_TTCO_APP_DB_THUAN.md
```

---

## 11. Nguyên tắc vận hành

1. BAT lấy dữ liệu trực tiếp từ DB.
2. Tự tính tồn kho theo công thức V21.1.
3. Loại dòng chưa mapping, dòng rỗng và dòng `Kho 32 | Cám 8C`.
4. Upload JSON lên GitHub.
5. App web tự đọc `ton_kho_latest.json`.
6. Nếu kiểm tra hash GitHub/Page không khớp thì báo lỗi, không coi là cập nhật thành công.
