import React, { useEffect, useRef, useState } from 'react';
import bwipjs from 'bwip-js';
import { BrowserMultiFormatReader } from '@zxing/browser';
import * as XLSX from 'xlsx';
import {
  Barcode, Camera, CameraOff, CheckCircle2, CircleAlert, Download,
  Eraser, Hash, Plus, ScanLine, Search, Trash2, X, Copy
} from 'lucide-react';

export default function App() {
  const [barcodeText, setBarcodeText] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [items, setItems] = useState(() => {
    try {
      const savedItems = localStorage.getItem('barcode_items');

      if (!savedItems) return [];

      return JSON.parse(savedItems).map(item => ({
        ...item,
        scannedAt: new Date(item.scannedAt)
      }));
    } catch (error) {
      console.error('Lỗi đọc danh sách mã vạch:', error);
      return [];
    }
  });
  const itemsRef = useRef(items);

  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const barcodeCanvas = useRef(null);
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const lastScanRef = useRef({ value: '', time: 0 });


  useEffect(() => {
      const canvas = barcodeCanvas.current;

      if (!canvas) return;

      if (!barcodeText.trim()) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      try {
        bwipjs.toCanvas(canvas, {
          bcid: 'code128',
          text: barcodeText.trim(),
          scale: 3,
          height: 16,
          includetext: true,
          textxalign: 'center',
          padding: 12,
          backgroundcolor: 'FFFFFF'
        });
      } catch (error) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }, [barcodeText]);

  useEffect(() => () => stopCamera(), []);

  const updateItems = (newItems) => {
    itemsRef.current = newItems;
    setItems(newItems);

    try {
      localStorage.setItem(
        'barcode_items',
        JSON.stringify(newItems)
      );
    } catch (error) {
      console.error('Không thể lưu danh sách mã vạch:', error);
      notify('error', 'Không thể lưu dữ liệu vào trình duyệt.');
    }
  };

  const notify = (type, text) => {
    setMessage({ type, text });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setMessage(null), 3200);
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      notify('success', `Đã sao chép mã ${code}.`);
    } catch (error) {
      notify('error', 'Không thể sao chép mã. Vui lòng thử lại.');
    }
  };


  const addCode = (raw) => {
    const value = String(raw ?? '').trim();

    if (!value) return;

    // Kiểm tra trên danh sách mới nhất
    const isDuplicate = itemsRef.current.some(
      item => item.code.trim().toLowerCase() === value.toLowerCase()
    );

    if (isDuplicate) {
      notify('warning', `Mã "${value}" đã tồn tại, không thể thêm lần nữa.`);
      setScanInput('');
      return false;
    }

    const newItem = {
      id: `${Date.now()}-${Math.random()}`,
      code: value,
      scannedAt: new Date()
    };

    // Cập nhật ref ngay lập tức để camera không thể thêm trùng
    const updatedItems = [...itemsRef.current, newItem];

    // Cập nhật và lưu vào localStorage
    updateItems(updatedItems);

    setScanInput('');

    notify('success', `Đã thêm mã ${value} vào danh sách.`);

    return true;
  };
  const handleScanSubmit = (e) => {
    e.preventDefault();
    addCode(scanInput);
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      lastScanRef.current = { value: '', time: 0 };

      setCameraOn(true);

      await new Promise(resolve => setTimeout(resolve, 100));

      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (!result) return;

          const value = result.getText().trim();
          const now = Date.now();

          if (!value) return;

          // Chống nhận diện liên tục cùng một mã
          if (
            lastScanRef.current.value === value &&
            now - lastScanRef.current.time < 1800
          ) {
            return;
          }

          lastScanRef.current = {
            value,
            time: now
          };

          // addCode tự kiểm tra trùng bằng itemsRef
          addCode(value);
        }
      );

    } catch (err) {
      setCameraError(
        err?.message || 'Không thể mở camera. Hãy kiểm tra quyền truy cập camera.'
      );

      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    try {
      controlsRef.current?.stop();
    } catch (error) {
      console.error('Lỗi khi dừng camera:', error);
    }

    controlsRef.current = null;
    readerRef.current = null;

    lastScanRef.current = {
      value: '',
      time: 0
    };

    setCameraOn(false);
  };


  const removeItem = (id) => {
    const updatedItems = itemsRef.current.filter(
      item => item.id !== id
    );

    updateItems(updatedItems);

    notify('success', 'Đã xóa mã khỏi danh sách.');
  };

  const clearItems = () => {
    updateItems([]);
    notify('success', 'Đã xóa toàn bộ danh sách mã vạch.');
  };


  const exportExcel = () => {
    if (!items.length) return notify('warning', 'Danh sách đang trống, chưa thể xuất Excel.');
    const rows = items.map((item, index) => ({
      'STT': index + 1,
      'Mã Code 128': item.code,
      'Thời gian quét': item.scannedAt.toLocaleString('vi-VN')
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = [{ wch: 8 }, { wch: 32 }, { wch: 24 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Danh sach ma vach');
    XLSX.writeFile(book, `Danh_sach_Code128_${new Date().toISOString().slice(0,10)}.xlsx`);
    notify('success', 'Đã xuất file Excel thành công.');
  };

  const filteredItems = items.filter(item =>
    item.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#">
            <span className="brand-icon"><Barcode size={25} /></span>
            <span>Tạo <span className="brand-accent">Code </span>128</span>
          </a>
          <div className="topbar-tag"><span className="status-dot" /> HỆ THỐNG TẠO VÀ QUẢN LÝ</div>
        </div>
      </header>

      <main className="main-content">
        <section className="welcome">
          <div>
            <div className="eyebrow">CÔNG CỤ QUẢN LÝ & KIỂM KÊ TÀI SẢN</div>
            <h1>Quản lý mã vạch <span>Code 128</span></h1>
            <p>Tạo mã, quét barcode và quản lý danh sách tập trung một cách nhanh chóng.</p>
          </div>
          <div className="welcome-mark"><Barcode size={64} strokeWidth={1.2} /></div>
        </section>

        <section className="workspace">
          <div className="panel generator-panel">
            <div className="panel-heading">
              <div className="heading-icon purple"><Barcode size={20}/></div>
              <div><h2>Tạo mã Code 128</h2><p>Nhập nội dung để tạo mã vạch</p></div>
            </div>
            <label htmlFor="barcodeText">Nội dung mã</label>
            <div className="input-with-button">
                  <input
                    id="barcodeText"
                    value={barcodeText}
                    onChange={e => setBarcodeText(e.target.value)}
                    placeholder="Ví dụ: SP001234567"
                    maxLength={80}
                    onKeyDown={e =>
                      e.key === 'Enter' && addCode(barcodeText)
                    }
                  />
                  <button
                    className="clear-input-button"
                    onClick={() => setBarcodeText('')}
                    disabled={!barcodeText.trim()}
                    type="button"
                  >
                    <X size={16} />
                    Xóa
                  </button> 
                <button className="primary-button compact" onClick={() => addCode(barcodeText)} disabled={!barcodeText.trim()}>
                <Plus size={17}/> Thêm vào DS
              </button>
            </div>
            <div className="barcode-preview">
              {barcodeText.trim() ? <canvas ref={barcodeCanvas} aria-label="Mã vạch Code 128 được tạo" /> :
                <div className="empty-preview"><Barcode size={35}/><span>Mã vạch sẽ hiển thị tại đây</span></div>}
            </div>
            <div className="preview-caption"><span><CheckCircle2 size={14}/> Chuẩn Code 128</span><span>Hỗ trợ chữ và số</span></div>
          </div>

          <div className="panel scanner-panel">
            <div className="panel-heading">
              <div className="heading-icon blue"><ScanLine size={20}/></div>
              <div><h2>Quét mã vạch</h2><p>Dùng camera hoặc máy quét USB</p></div>
            </div>
            <form onSubmit={handleScanSubmit}>
              <label htmlFor="scanInput">Nhập mã / Máy quét USB</label>
              <div className="input-with-button">
                <input id="scanInput" autoComplete="off" value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  placeholder="Đưa con trỏ vào đây và quét mã..." />
                <button className="primary-button compact" type="submit" disabled={!scanInput.trim()}>
                  <Plus size={17}/> Ghi nhận
                </button>
              </div>
            </form>
            <div className="camera-box">
              {cameraOn ? <video ref={videoRef} className="camera-video" muted playsInline /> :
                <div className="camera-placeholder"><Camera size={34}/><strong>Quét bằng camera</strong><span>Cho phép trình duyệt truy cập camera để bắt đầu</span></div>}
            </div>
            {cameraError && <p className="error-text">{cameraError}</p>}
            <button className={cameraOn ? 'secondary-button stop-button' : 'secondary-button'} onClick={cameraOn ? stopCamera : startCamera}>
              {cameraOn ? <><CameraOff size={17}/> Tắt camera</> : <><Camera size={17}/> Bật camera quét mã</>}
            </button>
            <p className="helper-text">Máy quét barcode USB thường hoạt động như bàn phím: quét mã vào ô nhập liệu rồi nhấn Enter.</p>
          </div>
        </section>

        <section className="panel list-panel">
          <div className="list-heading">
            <div className="panel-heading">
              <div className="heading-icon green"><Hash size={20}/></div>
              <div><h2>Danh sách mã đã quét</h2><p>Kiểm tra, tìm kiếm và quản lý các mã đã ghi nhận</p></div>
            </div>
            <div className="list-actions">
              <button className="export-button" onClick={exportExcel}><Download size={17}/> Xuất Excel</button>
              <button className="clear-button" onClick={() => {
                if (items.length && window.confirm('Bạn có chắc muốn xóa toàn bộ danh sách?')) {
                  clearItems(); 
                }
              }} disabled={!items.length}><Eraser size={16}/> Xóa tất cả</button>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-card"><span>TỔNG SỐ MÃ</span><strong>{items.length}</strong><Barcode size={23}/></div>
            <div className="stat-card"><span>MÃ DUY NHẤT</span><strong>{new Set(items.map(x => x.code.toLowerCase())).size}</strong><CheckCircle2 size={23}/></div>
            <div className="stat-card"><span>TRẠNG THÁI</span><strong className="ready-text">{items.length ? 'Đang hoạt động' : 'Chưa có dữ liệu'}</strong><span className="status-dot"/></div>
          </div>

          <div className="table-toolbar">
            <div className="table-title">Dữ liệu đã ghi nhận <span>{items.length}</span></div>
            <div className="search-box"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã vạch..."/></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th className="stt-col">STT</th><th>NỘI DUNG MÃ CODE 128</th><th>THỜI GIAN QUÉT</th><th className="action-col">THAO TÁC</th></tr></thead>
              <tbody>
                {filteredItems.length ? filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="stt-cell">{items.findIndex(x => x.id === item.id) + 1}</td>
                    <td><div className="code-cell"><span className="mini-barcode"><Barcode size={17}/></span><strong>{item.code}</strong></div></td>
                    <td className="time-cell">{item.scannedAt.toLocaleString('vi-VN')}</td>
                    <td>
                        <div className="action-buttons">
                          {/* Nút Copy */}
                          <button
                            className="copy-button"
                            title="Sao chép mã"
                            onClick={() => copyCode(item.code)}
                          >
                            <Copy size={16} />
                          </button>

                          {/* Nút Xóa */}
                          <button
                            className="delete-button"
                            title="Xóa mã"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                  </tr>
                )) : <tr><td colSpan="4"><div className="table-empty"><Barcode size={32}/><strong>{items.length ? 'Không tìm thấy mã phù hợp' : 'Chưa có mã vạch nào'}</strong><span>{items.length ? 'Thử tìm kiếm với nội dung khác.' : 'Quét mã hoặc nhập mã để bắt đầu danh sách.'}</span></div></td></tr>}
              </tbody>
            </table>
          </div>
          <div className="table-footer"><span>Hiển thị {filteredItems.length} / {items.length} mã</span><span><span className="status-dot"/> Dữ liệu lưu trong phiên làm việc hiện tại</span></div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner"><div className="footer-brand"><Barcode size={19}/>Tạo Code128 </div><span>© {new Date().getFullYear()} Code128 Manager. Công cụ tạo và quản lý mã vạch - HUYDT84</span><span className="footer-version">VERSION 1.0</span></div>
      </footer>

      {message && <div className={`toast ${message.type}`}><span>{message.type === 'success' ? <CheckCircle2 size={19}/> : <CircleAlert size={19}/>}</span>{message.text}<button onClick={() => setMessage(null)}><X size={16}/></button></div>}
    </div>
  );
}