# 04 — Phương án Kinh doanh

## Phân loại

| Loại | Mô tả | Subtypes |
|------|--------|----------|
| **Type 1** | Sản phẩm / Công nghệ | Mua bán, Phát triển SP, Chuyển giao CN |
| **Type 2** | Tư vấn / Dịch vụ | Tư vấn, Làm hồ sơ, Dịch vụ khác |

## Trạng thái

```
Nháp (draft) → Đang thực hiện (active) → Hoàn thành (completed)
                                        → Hủy (cancelled)
```

## Cấu trúc dữ liệu — Type 1 (Sản phẩm / Công nghệ)

### Section 1: Thông tin chung

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| name | Text | ✅ |
| planType | Enum: type1, type2 | ✅ |
| subtype | Enum: trading, product, tech | — |
| status | Enum: draft, active, completed, cancelled | Mặc định: draft |
| description | Text | — |

### Section 2: Thiết bị Nhập khẩu (dynamic list)

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| name | Text | Tên thiết bị |
| supplier | Text | Hãng / NCC |
| currency | Enum | USD, EUR, JPY, GBP, CNY, KRW, SGD, THB |
| exchangeRate | Number | Tỷ giá VND (auto-fetch hoặc nhập tay) |
| exchangeDate | Date | Ngày quy đổi |
| fob | Number | Giá FOB (ngoại tệ) |
| accessories | Number | Giá phụ kiện (ngoại tệ) |
| shipping | Number | CP vận chuyển, BH quốc tế (ngoại tệ) |
| **cif** | **Auto-calc** | `= fob + accessories + shipping` |
| **cifVnd** | **Auto-calc** | `= cif × exchangeRate` |
| importTax | Number (%) | Thuế nhập khẩu |
| vat | Number (%) | Thuế VAT |
| **totalLdp** | **Auto-calc** | `= cifVnd × (1 + importTax%) × (1 + vat%)` |

### Section 3: Thiết bị Nội địa (dynamic list)

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| name | Text | Tên thiết bị / vật tư |
| supplier | Text | Nhà cung cấp |
| quantity | Number | Số lượng |
| unitPrice | Number | Đơn giá (VND) |
| **subtotal** | **Auto-calc** | `= quantity × unitPrice` |

### Section 4: Chi phí Dịch vụ & Logistics

| Trường | Kiểu |
|--------|------|
| transportation | Number (VND) |
| insurance | Number (VND) |
| inspection | Number (VND) |
| installation | Number (VND) |
| translation | Number (VND) |
| interestRate | Number (%) |
| months | Number |
| **interest** | **Auto-calc**: `= tổng CP × interestRate% × months / 12` |
| bankFees | Number (VND) |
| warranty | Number (VND) |
| consumables | Number (VND) |
| management | Number (VND) |
| contingency | Number (VND) |

### Section 5: Tổng kết

| Trường | Công thức |
|--------|----------|
| **Tổng CP thiết bị NK** | `= Σ totalLdp` |
| **Tổng CP nội địa** | `= Σ subtotal` |
| **Tổng CP DV & khác** | `= Σ tất cả chi phí section 4` |
| **TỔNG CHI PHÍ ĐẦU VÀO** | `= NK + Nội địa + DV` |
| Giá bán dự kiến | Input |
| Số lượng dự kiến | Input |
| **Doanh thu mục tiêu** | `= giá bán × số lượng` |
| **Lợi nhuận gộp** | `= doanh thu - tổng CP` |
| Thuế TNDN & phí khác | Input |
| **Lợi nhuận ròng** | `= LN gộp - thuế` |
| **Biên lợi nhuận (%)** | `= LN ròng / doanh thu × 100` |

---

## Cấu trúc dữ liệu — Type 2 (Tư vấn / Dịch vụ)

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| client | Text | Khách hàng / Đối tác |
| workDesc | Text | Mô tả công việc |
| workers | Number | Số người tham gia |
| workDays | Number | Thời gian (ngày công) |
| dailyRate | Number | CP nhân công / người / ngày |
| **totalLabor** | **Auto-calc** | `= workers × workDays × dailyRate` |
| extras | Number | CP phát sinh (in ấn, đi lại...) |
| **totalCost** | **Auto-calc** | `= totalLabor + extras` |
| contractValue | Number | Giá trị HĐ / Phí dịch vụ |
| **profit** | **Auto-calc** | `= contractValue - totalCost` |
| **margin** | **Auto-calc** | `= profit / contractValue × 100` |

---

## Tính năng

| Tính năng | Chi tiết |
|-----------|---------|
| **CRUD** | Tạo, sửa, xóa phương án |
| **Tìm kiếm** | Real-time search by name |
| **Lọc** | Theo loại (Type 1/2) và trạng thái |
| **Tỷ giá real-time** | Fetch từ `open.er-api.com` — Cache 1 giờ |
| **Auto-calc** | Tính tự động CIF, LDP, tổng CP, lợi nhuận, biên LN |
| **Multi-currency** | 8 loại ngoại tệ + quy đổi VND |
| **So sánh** | So sánh 2+ phương án side-by-side |
| **Xuất PDF** | Báo cáo chi tiết (landscape, colored header) |
| **Xuất Excel** | Danh sách phương án + số liệu |

## Ngoại tệ hỗ trợ

USD, EUR, JPY, GBP, CNY, KRW, SGD, THB
