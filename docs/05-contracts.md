# 05 — Hợp đồng

## Cấu trúc dữ liệu

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| number | Text | ✅ | Số hợp đồng |
| partner | Text | ✅ | Đối tác / Khách hàng |
| type | Enum | — | Mua bán / Dịch vụ / Thuê / Khác |
| value | Number | — | Giá trị HĐ (VND) |
| signDate | Date | — | Ngày ký kết |
| effectiveDate | Date | — | Ngày hiệu lực |
| expiryDate | Date | — | Ngày hết hạn |
| status | Enum | — | Mặc định: `drafting` |
| terms | Text | — | Điều khoản quan trọng |

## Trạng thái

| Status | Label VI | Label EN | Màu |
|--------|---------|---------|-----|
| `drafting` | Đang soạn | Drafting | Xám |
| `signed` | Đã ký | Signed | Xanh dương |
| `active` | Đang thực hiện | Active | Xanh lá |
| `completed` | Hoàn thành | Completed | Tím |
| `expired` | Hết hạn | Expired | Đỏ |

## Loại hợp đồng

| Type | Label VI |
|------|---------|
| `trading` | Mua bán |
| `service` | Dịch vụ |
| `lease` | Thuê |
| `other` | Khác |

## Tính năng

| Tính năng | Chi tiết |
|-----------|---------|
| **CRUD** | Tạo, sửa, xóa hợp đồng |
| **Tìm kiếm** | Search by số HĐ, tên đối tác |
| **Lọc** | Theo loại và trạng thái |
| **Cảnh báo hết hạn** | Tự động hiển thị HĐ hết hạn trong 30 ngày |
| **Badge** | Sidebar badge đếm số HĐ sắp hết hạn |
| **Xuất PDF** | Danh sách HĐ + stat cards |
| **Xuất Excel** | Export toàn bộ dữ liệu HĐ |

## Cảnh báo hết hạn

```
getExpiringContracts(days = 30):
  - Lấy ngày hiện tại
  - Tính ngày giới hạn = hiện tại + 30 ngày
  - Lọc HĐ có expiryDate trong khoảng [now, limit]
  - Hiển thị warning panel trên đầu trang Contracts
  - Hiển thị badge đỏ trong sidebar navigation
```
