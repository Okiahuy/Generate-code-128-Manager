# Code128 Manager

Ứng dụng ReactJS + Vite để tạo mã vạch Code 128, quét bằng camera hoặc máy quét USB, kiểm tra trùng, quản lý danh sách và xuất Excel.

## Cài đặt và chạy

Yêu cầu Node.js 18 trở lên.

```bash
npm install
npm run dev
```

Mở địa chỉ local mà Vite hiển thị (thường là http://localhost:5173).

## Build production

```bash
npm run build
npm run preview
```

## Hướng dẫn sử dụng

- **Tạo mã:** Nhập nội dung ở khung Tạo mã Code 128. Mã vạch xem trước được cập nhật tự động. Nhấn “Thêm vào DS” để thêm mã vào danh sách.
- **Quét bằng USB:** Kết nối máy quét barcode USB, nhấp vào ô “Nhập mã / Máy quét USB”, quét mã. Máy quét thường gửi Enter sau khi quét; nếu không, nhấn “Ghi nhận”.
- **Quét bằng camera:** Nhấn “Bật camera quét mã” và cấp quyền camera. Trình duyệt yêu cầu HTTPS hoặc localhost để truy cập camera.
- **Kiểm tra trùng:** Mã trùng (không phân biệt chữ hoa/chữ thường) sẽ được cảnh báo và không thêm lần nữa.
- **Xuất Excel:** Nhấn “Xuất Excel” để tải file `.xlsx`.

## Lưu ý

Dữ liệu danh sách hiện được lưu trong state của trình duyệt, nên sẽ mất khi tải lại trang hoặc đóng phiên. Nếu cần lưu lâu dài, có thể bổ sung localStorage hoặc backend/database ở bước tiếp theo. Camera chỉ hoạt động trên localhost hoặc website đã bật HTTPS.