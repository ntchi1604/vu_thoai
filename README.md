# Vũ Thoại

Vũ Thoại là ứng dụng React chạy trên trình duyệt, hỗ trợ chuyển đổi giữa ngôn ngữ ký hiệu, giọng nói và văn bản tiếng Việt trong cùng một phiên giao tiếp.

## Chức năng

### Ký hiệu sang văn bản

- Bật hoặc tắt camera bằng `getUserMedia`.
- Hiển thị video trực tiếp và lớp landmark bàn tay trên canvas.
- Nhận diện tối đa hai bàn tay bằng MediaPipe Hand Landmarker.
- Chỉ nhận diện các ký hiệu một tay hoặc hai tay do người dùng ghi trong thư viện.
- Ghi mẫu cho nhiều ký hiệu hai tay, chuẩn hóa 42 landmark và nhận diện chuỗi bằng DTW.
- Thư viện ký hiệu hai tay lưu trong IndexedDB; mỗi nhãn cần tối thiểu hai mẫu và giữ tối đa tám mẫu.
- Ổn định cử chỉ trước khi ghi nhận, tránh phát lặp khi người dùng giữ nguyên động tác.
- Đổi sang cử chỉ khác sẽ tạo bản ghi mới.
- Nút `Nhận lại cử chỉ` cho phép ghi lại cùng một động tác khi cần.
- Nút `Đọc lại`, `Dừng đọc`, `Đọc kết quả` và `Không đọc` điều khiển âm thanh tiếng Việt.
- Hiển thị nhận diện realtime trên camera, kết quả chuyển đổi, trạng thái mô hình, số tay và dữ liệu chẩn đoán.

### Giọng nói sang văn bản

- Dùng Web Speech Recognition API với ngôn ngữ `vi-VN`.
- Hỗ trợ bắt đầu, dừng, xóa, sao chép và lưu văn bản vào nhật ký phiên.
- Hiển thị nội dung tạm thời và nội dung đã xác nhận.
- Tự khởi động lại khi phiên nghe bị ngắt ngoài ý muốn.
- Thông báo rõ lỗi thiếu quyền micro, không có thiết bị hoặc trình duyệt không hỗ trợ.

### Nhật ký phiên

- Lưu nội dung từ cả hai kênh ký hiệu và giọng nói.
- Lưu tối đa 20 mục mới nhất trong `localStorage`.
- Hiển thị thời gian, nguồn dữ liệu và xóa toàn bộ nhật ký.

## Công nghệ

- React 19 và Vite
- MediaPipe Tasks Vision
- Web Speech Recognition và Speech Synthesis
- Framer Motion
- Phosphor Icons
- Tailwind CSS v4 và CSS token tùy biến
- Dynamic Time Warping (DTW) chạy trực tiếp trong trình duyệt

Ứng dụng không có backend. Nhật ký được lưu trong `localStorage`; thư viện chuỗi hai tay được lưu trong IndexedDB của trình duyệt.

## Cài đặt và chạy

```bash
npm install
npm run dev
```

Mở URL Vite hiển thị trong terminal, thường là `http://localhost:5173`.

## Kiểm tra và build

```bash
npm run lint
npm test
npm run build
```

## Quyền trình duyệt

- Camera cần chạy trên `localhost` hoặc HTTPS và phải được cấp quyền truy cập.
- Nhận diện giọng nói hoạt động tốt nhất trên Chrome hoặc Edge bản desktop.
- MediaPipe tải WASM và model khi khởi động lần đầu, cần kết nối mạng.
- Nếu trình duyệt không hỗ trợ Web Speech Recognition, ứng dụng vẫn dùng được kênh camera.

## Cấu trúc chính

```text
src/
  components/   Giao diện camera, micro, trạng thái và nhật ký
  config/       Câu mẫu và cấu hình KNN
  hooks/        Camera, MediaPipe, nhận diện giọng nói và localStorage
  services/     Phân loại cử chỉ, âm thanh, MediaPipe và speech API
  utils/        Vẽ landmark, clipboard và format thời gian
```
