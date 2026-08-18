# Vũ Thoại - Thiết kế giao diện

## Mục tiêu

Giao diện web thuần theo [ảnh tham chiếu](docs/design-reference.png), không có khung trình duyệt hoặc desktop. Phong cách thương mại, ấm, rõ ràng và tập trung vào ba luồng giao tiếp realtime.

## Bố cục

- Header gọn ở giữa: biểu tượng tay, tên `Vũ Thoại`, mô tả sản phẩm và nhãn `Community Edition` bên phải.
- Desktop gồm ba cột mở: `Sign-to-Text` rộng nhất, `Speech-to-Text` ở giữa và `Session History` hẹp bên phải.
- Camera tỷ lệ 16:9 có landmark, phụ đề realtime và bảng Diagnostics phủ phía trên.
- Bên dưới camera là bốn cụm: điều khiển camera, kết quả cử chỉ, câu đọc nhanh và điều khiển âm thanh.
- Micro là tiêu điểm thị giác của cột giữa; transcript và các lệnh nằm ngay bên dưới.
- Nhật ký có chiều cao cố định và cuộn bên trong.
- Dưới 1120px chuyển thành hai cột; dưới 760px xếp một cột.

## Hệ thị giác

- Nền ivory `#f8f4eb`; bề mặt `#fffdf8`.
- Chữ chính `#171513`; chữ phụ `#6f6961`.
- Coral `#ff765f` dùng cho thao tác đang hoạt động; xanh `#315bd8`, cyan và tím dùng cho nhận diện giọng nói.
- Card radius 10-13px, camera 18px; viền ấm mảnh và bóng ngắn, không dùng glassmorphism hoặc gradient nền trang.
- Font Aptos/Segoe UI, tiêu đề 19-31px, nội dung 10-14px.

## Chức năng

- Bật/tắt camera, hiển thị landmark và trạng thái Diagnostics.
- Phụ đề trên camera chỉ phản ánh trạng thái/cử chỉ realtime, không dùng kết quả cũ.
- Nhận diện ký hiệu một tay hoặc hai tay từ các mẫu do người dùng ghi trong thư viện.
- Có thư viện ký hiệu hai tay để nhập nhãn, câu tiếng Việt và ghi nhiều mẫu được tự động tách theo chuyển động trực tiếp từ camera.
- Chuỗi hai tay được chuẩn hóa, lưu bằng IndexedDB và phân loại bằng DTW; mỗi nhãn cần tối thiểu hai mẫu.
- Giữ một cử chỉ chỉ ghi nhận một lần; đổi động tác hoặc bấm `Làm mới cử chỉ` để nhận lại.
- Đọc kết quả, đọc lại, dừng đọc, tắt tự động đọc và xóa kết quả.
- Bật/dừng nhận diện giọng nói, hiển thị confirmed/interim text, sao chép và lưu nhật ký.
- Nhật ký lưu tối đa 20 mục trong `localStorage`, cuộn độc lập và có thể xóa toàn bộ.
- Có trạng thái lỗi/unsupported và hỗ trợ `prefers-reduced-motion`.
