# NGUYÃŠN Táº®C V21.1 - TÃNH Tá»’N KHO TTCO_APP Tá»ª DB THUáº¦N

## 1. Má»¥c tiÃªu

Tá»« nay, khi tá»± Ä‘á»™ng láº¥y tá»“n kho cho app web, nguyÃªn táº¯c chuáº©n lÃ  **dá»±ng láº¡i tá»“n kho tá»« DB nghiá»‡p vá»¥**, khÃ´ng láº¥y trá»±c tiáº¿p `CDOTHAN.TonCK` vÃ  khÃ´ng phá»¥ thuá»™c vÃ o viá»‡c má»Ÿ TTCO_APP.

NguyÃªn táº¯c nÃ y dÃ¹ng Ä‘á»ƒ tÃ­nh tá»“n kho hiá»ƒn thá»‹ trong app web:

```text
Tá»“n kho app = Tá»“n Ä‘áº§u ká»³ + Nháº­p trong ká»³ - Xuáº¥t trong ká»³
```

---

## 2. CÃ´ng thá»©c chuáº©n V21.1

```text
TonDK  = CDOTHAN.TonDK

NhapTK = SUM(ThanNhap.Klg_Tan theo MaKho_N, MaThan)
       + SUM(ThanVaoSang.Klg_Tan theo MaKho, MaThan, MaCT IN ('2011','2021'))

XuatTK = SUM(ThanXuatCT.Klg_Tan theo MaKho_X, MaThan_XK)

TonCK  = TonDK + NhapTK - XuatTK
```

TrÆ°á»ng app web sá»­ dá»¥ng:

```text
ton = ttcoApp = TonCK
```

---

## 3. Nguá»“n báº£ng chuáº©n

| Vai trÃ² | Báº£ng | TrÆ°á»ng chÃ­nh |
|---|---|---|
| Tá»“n Ä‘áº§u ká»³ | `CDOTHAN` | `NamHT`, `ThangHT`, `MaKho`, `MaThan`, `TonDK` |
| Nháº­p trong ká»³ | `ThanNhap` | `Ngay`, `MaKho_N`, `MaThan`, `Klg_Tan` |
| Nháº­p bá»• sung | `ThanVaoSang` | `Ngay`, `MaKho`, `MaThan`, `MaCT`, `Klg_Tan` |
| Xuáº¥t trong ká»³ | `ThanXuatCT` + `ThanXuat` | `Ngay`, `MaKho_X`, `MaThan_XK`, `Klg_Tan`, `NID` |
| TÃªn than | `TTCO_QTHT.dbo.DMTHAN` | `MaThan`, `TenThan` |

---

## 4. Kiá»ƒm chá»©ng Kho 1

Máº«u TTCO_APP vÃ  V21 DB thuáº§n Ä‘Ã£ khá»›p:

```text
Kho 1 | Cá»¥c xÃ´ 1c

TonDK  = 509,950
NhapTK = 7.409,000
XuatTK = 7.094,800
TonCK  = 824,150
Lá»‡ch   = 0,000
```

Káº¿t luáº­n: **logic V21.1 Ä‘Æ°á»£c dÃ¹ng lÃ m nguyÃªn táº¯c chuáº©n Ä‘á»ƒ tÃ­nh tá»“n kho DB thuáº§n.**

---

## 5. KhÃ´ng dÃ¹ng trá»±c tiáº¿p `CDOTHAN.TonCK` lÃ m tá»“n cuá»‘i

KhÃ´ng láº¥y `CDOTHAN.TonCK` lÃ m sá»‘ tá»“n hiá»ƒn thá»‹ cuá»‘i cÃ¹ng, vÃ¬ Kho 1 Ä‘Ã£ chá»©ng minh:

```text
CDOTHAN.TonCK = 671,750
V21 TonCK     = 824,150
TTCO_APP      = 824,150
```

Do Ä‘Ã³:

```text
CDOTHAN dÃ¹ng Ä‘á»ƒ láº¥y TonDK
ThanNhap/ThanVaoSang dÃ¹ng Ä‘á»ƒ láº¥y NhapTK
ThanXuatCT dÃ¹ng Ä‘á»ƒ láº¥y XuatTK
TonCK tÃ­nh láº¡i = TonDK + NhapTK - XuatTK
```

---

## 6. NguyÃªn táº¯c lá»c dÃ²ng hiá»ƒn thá»‹

Chá»‰ Ä‘Æ°a lÃªn app web vÃ  file JSON chÃ­nh cÃ¡c dÃ²ng thá»a mÃ£n:

```text
ÄÃ£ mapping chuáº©n tÃªn kho
vÃ 
KhÃ´ng pháº£i dÃ²ng tá»“n rá»—ng hoÃ n toÃ n
```

DÃ²ng tá»“n rá»—ng hoÃ n toÃ n lÃ  dÃ²ng cÃ³ Ä‘á»“ng thá»i:

```text
TonDK  = 0
NhapTK = 0
XuatTK = 0
TonCK  = 0
```

CÃ¡c dÃ²ng nÃ y **khÃ´ng Ä‘Æ°a vÃ o tá»“n kho**.

---

## 7. Äiá»u chá»‰nh sau Ä‘á»‘i chiáº¿u V21

### 7.1. Kho 32 - CÃ¡m 8C

Qua Ä‘á»‘i chiáº¿u thá»±c táº¿, dÃ²ng:

```text
Kho 32 | CÃ¡m 8C
```

**khÃ´ng Ä‘Ãºng mapping**, nÃªn tá»« V21.1 trá»Ÿ Ä‘i **khÃ´ng Ä‘Æ°a vÃ o tá»“n kho chuáº©n** cho Ä‘áº¿n khi xÃ¡c Ä‘á»‹nh láº¡i Ä‘Æ°á»£c mÃ£ kho/mÃ£ than Ä‘Ãºng.

### 7.2. DÃ²ng tá»“n rá»—ng

CÃ¡c dÃ²ng cÃ³ `TonDK = 0`, `Nháº­p = 0`, `Xuáº¥t = 0`, `Tá»“n cuá»‘i = 0` bá»‹ loáº¡i khá»i báº£ng tá»“n kho chÃ­nh.

### 7.3. Sá»­a lá»—i Kho 39 V23

Äá»‘i vá»›i Kho 39, cÃ¡c dÃ²ng than nháº­p kháº©u cÃ³ mÃ£ `NHK.*` pháº£i Ä‘Æ°á»£c giá»¯ vÃ  truyá»n Ä‘á»§ metadata vÃ o JSON:

```text
coalCode
MaThan
rawKhoCode
sourceFix = KHO39_NHK_DETAIL
```

LÃ½ do: app web cÃ³ logic lá»c dÃ²ng hiá»ƒn thá»‹; náº¿u tÃªn than nháº­p kháº©u khÃ´ng cÃ³ dáº¥u ngoáº·c, vÃ­ dá»¥ `Than Anthracite LÃ o Táº§u TRÆ¯á»œNG NGUYÃŠN STAR`, nhÆ°ng JSON khÃ´ng cÃ³ `coalCode = NHK.*`, app cÃ³ thá»ƒ khÃ´ng nháº­n lÃ  dÃ²ng than nháº­p kháº©u chi tiáº¿t.

---

## 8. NguyÃªn táº¯c mapping kho

Chá»‰ Ä‘Æ°a vÃ o app web cÃ¡c mÃ£ kho Ä‘Ã£ mapping chuáº©n:

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

CÃ¡c mÃ£ chÆ°a mapping hoáº·c mÃ£ táº¡m nhÆ°:

```text
K04, K05, K06, K07, K60, K71, k04, k06, k17, k52, k54, k59, 34, 39
```

chá»‰ lÆ°u audit/warnings, khÃ´ng hiá»ƒn thá»‹ trong app web chÃ­nh.

---

## 9. NguyÃªn táº¯c xá»­ lÃ½ tÃªn chá»§ng loáº¡i than

### Kho 9 vÃ  Kho 10

CÃ¡c chá»§ng loáº¡i cÃ³ pháº§n quá»‘c gia/tÃªn tÃ u trong ngoáº·c Ä‘Æ°á»£c gá»™p theo tÃªn gá»‘c.

VÃ­ dá»¥:

```text
CÃ¡m 6a.14 (Ãšc - TÃ u ...)
CÃ¡m 6a.14 (Mozambique - TÃ u ...)
=> CÃ¡m 6a.14
```

```text
CÃ¡m 5a.14 (Ãšc - TÃ u ...)
=> CÃ¡m 5a.14
```

### Kho 39

Kho 39 láº¥y tá»« `MaKho DB = 28` vÃ  giá»¯ chi tiáº¿t tá»«ng chá»§ng loáº¡i/tÃ u nháº­p kháº©u, khÃ´ng gá»™p NHK chung.

---

## 10. Quy táº¯c xuáº¥t JSON lÃªn GitHub

ÄÆ°á»ng dáº«n app web Ä‘á»c:

```text
public/data/ton_kho_latest.json
```

Cáº¥u trÃºc chÃ­nh:

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
      "coal": "Cá»¥c xÃ´ 1c",
      "TonDK": 509.95,
      "NhapTK": 7409.0,
      "XuatTK": 7094.8,
      "ton": 824.15,
      "ttcoApp": 824.15
    }
  ]
}
```

NgoÃ i JSON chÃ­nh, luÃ´n upload kÃ¨m:

```text
public/data/ton_kho_audit.json
public/data/ton_kho_warnings.json
public/data/ton_kho_verify_report.json
docs/NGUYEN_TAC_V21_1_TINH_TON_KHO_TTCO_APP_DB_THUAN.md
```

---

## 11. NguyÃªn táº¯c váº­n hÃ nh

1. BAT láº¥y dá»¯ liá»‡u trá»±c tiáº¿p tá»« DB.
2. Tá»± tÃ­nh tá»“n kho theo cÃ´ng thá»©c V21.1.
3. Loáº¡i dÃ²ng chÆ°a mapping, dÃ²ng rá»—ng vÃ  dÃ²ng `Kho 32 | CÃ¡m 8C`.
4. Upload JSON lÃªn GitHub.
5. App web tá»± Ä‘á»c `ton_kho_latest.json`.
6. Náº¿u kiá»ƒm tra hash GitHub/Page khÃ´ng khá»›p thÃ¬ bÃ¡o lá»—i, khÃ´ng coi lÃ  cáº­p nháº­t thÃ nh cÃ´ng.
