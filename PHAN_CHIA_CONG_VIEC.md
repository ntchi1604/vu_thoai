# Phân chia công việc — Dự án Vũ Thoại

Chia **toàn bộ dự án** (mọi file, mọi thư mục) cho **5 người** theo các mô-đun trong mã nguồn. Mỗi người sở hữu một nhánh rõ ràng, ít chồng chéo. Cuối tài liệu có danh sách **file chưa phân chia trong bản cũ** (để biết phần mới bổ sung), bảng **điểm giao** và **quy trình làm việc chung**.

---

## 1. Thảo — Trách nhiệm: Xác thực & tài khoản (Auth)

**Khu vực code:**

- `src/lib/supabase.js` — client Supabase (sở hữu và bảo trì)
- `src/hooks/useAuth.js` — quản lý phiên đăng nhập
- `src/components/AuthPage.jsx` — giao diện đăng nhập/đăng ký
- `src/App.jsx` — **phần gating** (điều hướng landing → auth → tool; xem phần Hiệp để biết ranh giới)
- `src/components/Header.jsx` — **phần user chip** + nút đăng xuất (layout do Hiệp giữ)
- `.env` / `.env.example` — biến môi trường Supabase; bạn giữ chuẩn tên biến, người khác không tự ý đổi
- `scripts/` — bạn **giám sát** (không sở hữu): mọi thay đổi chạm tới auth/RLS phải xác nhận với bạn trước khi merge

**Giải thích code của bạn:**

- `src/lib/supabase.js`: tạo client Supabase từ biến môi trường `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (hỗ trợ tên cũ `VITE_SUPABASE_ANON_KEY`). Nếu thiếu biến → trả về `null` để app không crash.
- `src/hooks/useAuth.js`:
  - `useState(session)` giữ phiên; `loading` báo đang kiểm tra phiên lưu.
  - `getSession()` lấy phiên khi mount; subscribe `onAuthStateChange` để mọi thay đổi phiên (đăng nhập/đăng xuất/token refresh) tự cập nhật UI. Cleanup `unsubscribe` khi unmount.
  - `signIn`/`signUp`/`signOut` gọi trực tiếp `supabase.auth.*`, trả `{ error }` để UI xử lý lỗi.
- `src/components/AuthPage.jsx`: card trung tâm với 2 tab Đăng nhập/Đăng ký. `handleSubmit` chọn `signIn` hoặc `signUp` theo tab; map lỗi tiếng Việt ("Invalid login credentials" → "Email hoặc mật khẩu không đúng.", "User already registered" → "Email đã được đăng ký.", "Email not confirmed" → "Vui lòng xác nhận email...").
- `src/App.jsx` (phần của bạn): `if (loading) hiện màn chờ`; `if (view === 'tool' && session) hiện công cụ`; `if (view === 'auth' && !session) hiện AuthPage`; còn lại hiện landing. Effect: khi `session` xuất hiện → gọi `navigateToTool(true)` (replaceState để không tạo lịch sử dư) và xóa IndexedDB cũ.
- `src/components/Header.jsx` (phần của bạn): user chip hiện avatar (chữ cái đầu email) + email; click mở dropdown "Đăng xuất" → gọi `onLogout`.

---

## 2. Đoàn Anh — Trách nhiệm: Thư viện ký hiệu + database (Library & DB)

**Khu vực code:**

- `src/hooks/useTwoHandSequenceLibrary.js` — hook thư viện (đã chuyển sang Supabase)
- `scripts/db-init.js` — script tự tạo bảng + RLS
- Bảng `templates` trong Supabase (schema bạn quản lý)
- `src/components/SignToTextPanel.jsx` — **phần UI thư viện** (khu vực "Thư viện ký hiệu")
- `.env` / `.env.example` — bạn sở hữu `DATABASE_URL` (chạy db-init); các biến Supabase khác do Lượng giữ
- `package.json` — bạn giữ script `db:init`; mọi script mới phải báo cả nhóm

**Giải thích code của bạn:**

- `src/hooks/useTwoHandSequenceLibrary.js`:
  - Giữ API cũ: `addTemplate({frames, handCount, label, phrase})`, `removeLabel(label, handCount)`, `clearAll()`, `templates`, `labels`.
  - Mount → `supabase.auth.getUser()` → `select * from templates` (chỉ row của user nhờ RLS) → lọc `isValidTemplate` → đưa vào state.
  - `addTemplate`: chuẩn hóa label (`normalizeLabel`: hoa, thay ký tự đặc biệt bằng `_`), xóa mẫu cũ nhất nếu vượt `maxTemplatesPerLabel: 8`, update state optimistic, ghi Supabase qua `insert` với `user_id`, `hand_count`, `created_at`, `frames` (JSON 130 số/frame).
  - `removeLabel`: filter state + `delete().eq('label').eq('hand_count')`; `clearAll`: `delete().eq('user_id', user.id)`.
- `scripts/db-init.js`: đọc `DATABASE_URL` từ `.env`, chạy SQL tạo bảng `templates` (uuid id, user_id FK auth.users, label, phrase, hand_count check 1/2, frames jsonb, created_at), index `(user_id, label)`, bật RLS, tạo 3 policy `templates_select_own`/`templates_insert_own`/`templates_delete_own` (drop rồi create vì Postgres không có `CREATE POLICY IF NOT EXISTS`). Chạy bằng `npm run db:init`.
- `package.json`: script `"db:init": "node scripts/db-init.js"` nối tới file bạn quản lý.

---

## 3. Chí — Trách nhiệm: Nhận diện ký hiệu (Hand landmark & classifier)

**Khu vực code:**

- `src/hooks/useHandLandmarker.js` — vòng lặp phát hiện + ghi mẫu
- `src/hooks/useCamera.js` — quyền camera + stream (bạn sở hữu vì Chí là người dùng duy nhất, qua `SignToTextPanel`)
- `src/services/twoHandSequenceClassifier.js` — DTW + bộ nhận diện chuỗi
- `src/services/twoHandSequenceClassifier.test.js` — 12 test (duy nhất trong dự án)
- `src/services/landmarkNormalizer.js`, `src/services/handLandmarkerService.js` — chuẩn hóa + load MediaPipe
- `src/utils/handDrawing.js` — vẽ landmark lên canvas
- `src/config/twoHandSequenceConfig.js` — 34 tham số tinh chỉnh

**Giải thích code của bạn:**

- `src/hooks/useCamera.js`: `startCamera` dùng `getUserMedia` (facingMode `user`, 1280×720, không audio); tự kết nối lại sau 2 giây nếu track bị ngắt ngoài ý muốn (`track.onended` + `AUTO_RECONNECT_MS`); map lỗi tiếng Việt (`NotAllowedError`/`SecurityError` → chưa cấp quyền); `stopCamera` dừng mọi track + xóa `srcObject`; cleanup khi unmount.
- `src/hooks/useHandLandmarker.js`:
  - `detectFrame` chạy qua `requestAnimationFrame`; đồng bộ kích thước canvas với video (`syncCanvasToVideo`), gọi `landmarker.detectForVideo(video, timestamp)`, vẽ landmark, cập nhật state.
  - `updateHandState`: đếm tay, chuẩn hóa frame (`normalizeGestureFrame`), đưa vào `TwoHandSequenceRecognizer.update(...)`; nếu nhận diện khớp (`shouldEmit`) → gọi `onGestureRecognized({gesture, phrase})`. Cập nhật `gestureInfo` + `debugInfo`.
  - Ghi mẫu: `startSequenceRecording({label, phrase})` trả Promise; máy trạng thái ghi: positioning (giữ tay ổn định) → countdown (3 giây) → ready → recording → hoàn tất. Dùng `twoHandFrameMotionDistance` để phát hiện bắt đầu/kết thúc động tác; `resampleSequence` về 20 frame.
  - `rearmRecognition`: cho phép nhận cùng cử chỉ lặp lại.
- `src/services/twoHandSequenceClassifier.js`:
  - `normalizeGestureFrame`: chuẩn hóa 2 tay về vector 130 số (126 tọa độ landmark + anchor x/y + scale + khoảng cách giữa 2 tay).
  - `dynamicTimeWarpingDistance`: DTW với ma trận 2 hàng (Float64Array) để tiết kiệm bộ nhớ; trả khoảng cách trung bình.
  - `classifyTwoHandSequence`: lọc mẫu đủ 2 bản (`getReadyLabels`), tạo mô tả thô (`createSequenceDescriptor`: mean/variance/first/last), giữ 24 ứng viên gần nhất (`dtwCandidateLimit`), DTW chính xác, cộng dồn theo nhãn, lấy 3 mẫu gần nhất có trọng số (0.65/0.25/0.1), kiểm tra ngưỡng distance/margin/completion.
  - `TwoHandSequenceRecognizer`: giữ trạng thái giữa các frame — lọc trước (preRoll), phát hiện cử chỉ tĩnh/động, cần 3 lần đồng thuận (`confirmationCount`), chống lặp (`blockedGesture`), `latch` giữ kết quả tới khi động tác mới.
- `src/services/handLandmarkerService.js` + `landmarkNormalizer.js`: load model MediaPipe (single cache), `getBoundingBox`/`getPalmScale` phục vụ chuẩn hóa tọa độ trước khi vào DTW.
- `src/utils/handDrawing.js`: `drawHandLandmarks` + `clearHandCanvas` — vẽ skeleton 2 tay lên canvas phủ lên video.

---

## 4. Lượng — Trách nhiệm: Giọng nói + âm thanh (Speech & Audio)

**Khu vực code:**

- `src/hooks/useSpeechRecognition.js` — nhận diện giọng nói
- `src/hooks/useSpeechSynthesis.js` — đọc tiếng Việt
- `src/services/speechSynthesisService.js`, `src/services/vietnameseAudioService.js`
- `src/components/SpeechToTextPanel.jsx` — giao diện giọng nói

**Giải thích code của bạn:**

- `src/hooks/useSpeechRecognition.js`:
  - Kiểm tra hỗ trợ `window.SpeechRecognition || window.webkitSpeechRecognition` (Chrome/Edge).
  - Khởi tạo `recognition` với `lang = 'vi-VN'`, `continuous = true`, `interimResults = true`.
  - `onresult`: duyệt từ `event.resultIndex`, tách final vs interim; gộp final vào `finalText`, interim hiển thị tạm.
  - Tự khởi động lại khi `onend` nếu `shouldRestartRef.current` (ngắt ngoài ý muốn); map lỗi tiếng Việt: `not-allowed` → "Bạn chưa cấp quyền micro...", `audio-capture` → "Không tìm thấy micro...", `no-speech` → "Chưa nghe thấy giọng nói...".
  - `startListening`/`stopListening`/`clearTranscript`; cleanup dừng recognition khi unmount.
- `src/components/SpeechToTextPanel.jsx`: nút micro là tiêu điểm thị giác; hiển thị interim + confirmed text; nút sao chép (qua `src/utils/clipboard.js`), xóa, lưu vào nhật ký (`onAddHistory`).

---

## 5. Hiệp — Trách nhiệm: Giao diện tổng thể & trải nghiệm (UI/UX)

**Khu vực code:**

- `src/App.jsx` — **phần layout** (khung 3 cột, history, điều hướng view; gating auth do Lượng giữ)
- `src/main.jsx` — entry point render App (bạn quản lý vì là khung ứng dụng)
- `src/components/LandingPage.jsx` — trang chủ
- `src/components/Header.jsx` — **phần layout** (brand/back button; user chip do Lượng thêm)
- `src/components/ConversationHistory.jsx` — nhật ký phiên
- `src/components/SignToTextPanel.jsx` — **cấu trúc panel + các control** (khu vực không phải thư viện, không phải camera)
- `src/components/StatusMessage.jsx` — thông báo trạng thái dùng chung (3 panel cùng dùng)
- `src/utils/clipboard.js` — sao chép clipboard (Thảo dùng trong SpeechToTextPanel)
- `src/utils/formatters.js` — `formatTime`/`formatConfidence` (History + SignToText dùng)
- `src/index.css` — hệ thống token CSS
- `design.md` — tài liệu thiết kế tham chiếu
- `public/favicon.svg`, `public/icons.svg`, `public/images/` — icon + ảnh landing
- `src/assets/` — ảnh hero/logo dùng trong landing

**Giải thích code của bạn:**

- `src/App.jsx` (phần layout): `workspace-grid` 3 cột (Sign-to-Text rộng nhất, Speech ở giữa, History hẹp phải). `history` lưu localStorage `signbridge.conversationHistory`, tối đa 20 mục; `addHistoryItem` thêm mới lên đầu. `useReducedMotion` tắt animation cho người nhạy cảm chuyển động.
- `src/main.jsx`: tạo root React, render `<App />` trong `StrictMode`, import `./index.css`. Hiệp giữ vì là điểm vào của toàn bộ layout; không cần sửa thường xuyên nhưng mọi thay đổi ở đây đều do bạn.
- `src/components/LandingPage.jsx`: brand nav, hero, các section sứ mệnh/cộng đồng/cách hoạt động, footer. `RevealSection` dùng `whileInView` của framer-motion để lộ dần khi cuộn; CTA "Mở công cụ" gọi `onOpenTool`.
- `src/components/ConversationHistory.jsx`: danh sách cuộn độc lập, hiển thị thời gian (qua `src/utils/formatters.js`), nguồn (ký hiệu/giọng nói), nút xóa toàn bộ.
- `src/components/StatusMessage.jsx`: component nhỏ hiển thị thông báo theo tone (`info`/`error`...); được AuthPage, SignToTextPanel, SpeechToTextPanel dùng chung — đổi giao diện phải kiểm tra cả 3 nơi.
- `src/index.css`: hệ thống token CSS (ivory `#f8f4eb`, surface `#fffdf8`, text `#171513`, coral `#ff765f`, blue `#315bd8`), card radius 10–13px, responsive 3→2→1 cột (breakpoint 1120px, 760px).
