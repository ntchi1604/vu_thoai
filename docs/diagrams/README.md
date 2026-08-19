# Bộ sơ đồ hệ thống Vũ Thoại

Các sơ đồ trong thư mục này được dựng từ mã nguồn hiện tại của dự án.

| Tệp | Nội dung | Mục báo cáo đề xuất |
| --- | --- | --- |
| `01-use-case-tong-quat.puml` | Use case tổng quát | 3.4 Mô hình hệ thống |
| `02-use-case-xac-thuc.puml` | Use case chi tiết xác thực | 3.4 hoặc 3.5 |
| `03-use-case-ky-hieu.puml` | Use case chi tiết ký hiệu sang văn bản | 3.4 hoặc 3.5 |
| `04-use-case-giong-noi.puml` | Use case chi tiết giọng nói sang văn bản | 3.4 hoặc 3.5 |
| `05-activity-giao-tiep.mmd` | Hoạt động giao tiếp tổng quát | 3.7 Sơ đồ hoạt động |
| `06-activity-ghi-mau.mmd` | Trạng thái ghi mẫu ký hiệu | 3.7 Sơ đồ hoạt động |
| `07-co-so-du-lieu.mmd` | ERD Supabase | 5.1 Sơ đồ cơ sở dữ liệu |
| `08-kien-truc-he-thong.mmd` | Kiến trúc thành phần và triển khai | 4.1 Thiết kế kiến trúc |
| `09-thuat-toan-nhan-dien-dtw.mmd` | Luồng thuật toán nhận diện DTW | 4.3 Thuật toán |

## Lưu ý dữ liệu

- Bảng `auth.users` do Supabase Auth quản lý.
- Bảng `templates` lưu thư viện ký hiệu và được bảo vệ bằng Row Level Security.
- Nhật ký phiên không nằm trong PostgreSQL; ứng dụng lưu tối đa 20 mục tại `localStorage` của trình duyệt.
- Mỗi nhãn cần ít nhất hai mẫu mới được đưa vào nhận diện và giữ tối đa tám mẫu cho mỗi số lượng tay.

## Chỉnh sửa bằng draw.io

Với tệp `.mmd`, mở draw.io, chọn **Arrange > Insert > Advanced > Mermaid** rồi dán nội dung. Các tệp `.puml` dùng cú pháp PlantUML chuẩn. Tệp SVG và PNG xuất kèm có thể chèn trực tiếp vào Word hoặc Google Docs.
