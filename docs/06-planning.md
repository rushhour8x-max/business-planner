# 06 — Kế hoạch & Quản lý công việc

## Cấu trúc dữ liệu

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| title | Text | ✅ | Tiêu đề công việc |
| description | Text | — | Mô tả chi tiết |
| category | Enum | — | Kinh doanh / Kỹ thuật / Hành chính / Khác |
| priority | Enum | — | Cao / Trung bình / Thấp (mặc định: medium) |
| deadline | Date | — | Hạn hoàn thành |
| assignee | Text | — | Tên người phụ trách |
| assignedTo | UUID | — | User ID (khi admin giao việc) |
| status | Enum | — | Mặc định: `todo` |
| linkedTo | Text | — | `plan:{id}` hoặc `contract:{id}` |

## Trạng thái Task

| Status | Label VI | Icon |
|--------|---------|------|
| `todo` | Cần làm | ⬜ |
| `inProgress` | Đang làm | 🔄 |
| `done` | Hoàn thành | ✅ |

## Phân loại

| Category | Label VI |
|----------|---------|
| `business` | Kinh doanh |
| `technical` | Kỹ thuật |
| `admin` | Hành chính |
| `other` | Khác |

## Mức ưu tiên

| Priority | Label VI | Màu |
|----------|---------|-----|
| `high` | Cao | Đỏ |
| `medium` | Trung bình | Vàng |
| `low` | Thấp | Xanh |

## Views

### Kanban Board

```
┌──────────┐  ┌──────────────┐  ┌──────────────┐
│  Cần làm │  │  Đang làm    │  │  Hoàn thành  │
│  (todo)  │  │ (inProgress) │  │    (done)    │
├──────────┤  ├──────────────┤  ├──────────────┤
│ [Card]   │  │ [Card]       │  │ [Card]       │
│ [Card]   │  │              │  │              │
│          │  │              │  │              │
└──────────┘  └──────────────┘  └──────────────┘
```

- **Drag & Drop**: Kéo thả card giữa 3 cột → tự động cập nhật `status`
- **Card hiển thị**: Tiêu đề, Mô tả (trích), Priority tag, Deadline, Category tag, Assignee
- **Overdue**: Card quá hạn highlight viền đỏ

### Calendar View

```
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ CN  │ T2  │ T3  │ T4  │ T5  │ T6  │ T7  │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│     │     │  1  │  2  │  3  │  4  │  5  │
│     │     │     │ [T] │     │     │     │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│  6  │  7  │  8  │  9  │ 10  │ 11  │ 12  │
│     │     │ [T] │     │     │ [T] │     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

- Hiển thị theo tháng, có nút ◀/▶ chuyển tháng
- Task hiển thị dạng event bar theo deadline
- Tối đa 3 task/ngày, hiển thị "+N more" nếu nhiều hơn
- Click task → mở modal edit

## Tính năng

| Tính năng | Chi tiết |
|-----------|---------|
| **CRUD** | Tạo, sửa, xóa task |
| **Drag & Drop** | Kéo thả Kanban cards |
| **Overdue** | Tự động highlight task quá hạn |
| **Liên kết** | Gắn task với Phương án KD hoặc Hợp đồng |
| **Calendar** | View lịch tháng |
| **Badge** | Sidebar badge đếm số task overdue |
| **Xuất PDF/Excel** | Export danh sách task |

## Liên kết Task

Task có thể liên kết với:
- `plan:{uuid}` → Phương án kinh doanh cụ thể
- `contract:{uuid}` → Hợp đồng cụ thể
- Dropdown hiển thị tất cả plans + contracts để chọn
