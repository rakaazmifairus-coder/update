RAKA SANG ANALIS V5.2 — BACKEND GOOGLE SHEETS (PRODUKSI-SETUP)

Isi paket:
- index.html: antarmuka aplikasi, mode demo dimatikan
- Code.gs: backend Google Apps Script
- king_news_logo_transparent.webp

PENTING: Paket ini belum live sampai kamu melakukan setup/deployment di akun Google milikmu. Aku tidak bisa membuat spreadsheet di akunmu tanpa kamu menjalankan langkah Google berikut.

LANGKAH SETUP
1. Buka https://script.google.com/ lalu buat New project.
2. Buka file Code.gs di paket ini, salin seluruh isinya ke editor Apps Script (ganti isi Code.gs bawaan).
3. Di Project Settings > Script Properties, tambahkan:
   INITIAL_OWNER_PASSWORD = password kuat minimal 12 karakter (jangan kirim password ini ke siapa pun).
4. Pilih fungsi setupNewSpreadsheet lalu klik Run dan izinkan akses yang diminta. Lihat Execution log; URL spreadsheet baru akan muncul sebagai SPREADSHEET_URL.
5. Pilih fungsi createInitialOwner lalu klik Run. Akun owner dibuat dengan username `owner` dan password dari Script Property tadi. Property password akan dihapus setelah akun dibuat.
6. Deploy > New deployment > type Web app.
   Execute as: Me
   Who has access: Anyone (diperlukan agar frontend bisa memanggil API; endpoint tetap memeriksa sesi untuk aksi privat).
   Klik Deploy, otorisasi, lalu salin URL yang berakhir `/exec`.
7. Di index.html, cari CONFIG di bagian awal JavaScript dan ganti:
   SCRIPT_URL: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_EXEC_URL_HERE"
   menjadi URL /exec milikmu. Pastikan DEMO_MODE:false tetap begitu.
8. Upload index.html dan aset ke hosting HTTPS yang kamu kontrol. Buka aplikasinya dari URL hosting itu, lalu login menggunakan owner dan password yang kamu set. Pendaftaran user baru otomatis membuat role VIEWER.
9. Untuk layanan Pinjam Akun Valetax, Owner/Admin membuka panel antrean, klik Lihat bukti transfer, verifikasi mutasi rekening secara manual, lalu Approve/Tolak. Setelah status APPROVED, isi formulir pemberian akun Valetax. User melihat akun pada Permintaan Saya. Jangan memberikan akun sebelum verifikasi pembayaran.

DATA YANG DISIMPAN
- Pengguna dan role, sesi login, news, recap, pengaturan, permintaan layanan, video, data Valetax, jurnal trading, dan audit log disimpan di spreadsheet.
- Jurnal trading terhubung ke backend. Saat ini P&L diinput manual.
- Bukti pembayaran diunggah sebagai file ke folder Google Drive privat yang dibuat otomatis oleh setupNewSpreadsheet(). Owner dapat membuka tautan bukti dari antrean (Admin lain perlu diberi akses Drive secara terpisah). Pembayaran tetap diverifikasi manual; ini bukan payment gateway otomatis.
- Jangan menyimpan password akun broker sungguhan pada aplikasi web demo. Data sensitif Valetax yang disimpan di Sheets memerlukan pembatasan akses spreadsheet yang ketat.

CATATAN KEAMANAN DAN STATUS
- Ini paket integrasi backend yang perlu kamu deploy sendiri, bukan URL aplikasi live yang sudah aktif.
- Endpoint Web App yang diakses “Anyone” tetap memiliki batasan keamanan Apps Script; gunakan HTTPS hosting, batasi akses spreadsheet hanya ke owner tepercaya, gunakan password kuat, dan jangan bagikan spreadsheet publik.
- Jika ada perubahan kode setelah deploy, buka Deploy > Manage deployments > Edit > New version > Deploy.
- Untuk menguji API setelah deploy, buka URL /exec di browser; harus menampilkan {"ok":true,"app":"Raka Sang Analis",...}.


=== AKTIFKAN AI ANALISIS XAUUSD LIVE ===
1. Di Google Apps Script > Project Settings > Script Properties, tambahkan:
   TWELVE_DATA_API_KEY = API key akun Twelve Data
   GEMINI_API_KEY = API key Gemini dari Google AI Studio
2. Pastikan backend Web App sudah dideploy sebagai Execute as: Me, akses: Anyone.
3. Salin URL /exec deployment ke CONFIG.SCRIPT_URL pada index.html.
4. Untuk aplikasi memakai backend Sheets, CONFIG.DEMO_MODE harus false.
5. Deploy ulang sebagai New version setelah mengganti Code.gs.
6. Buka aplikasi, login, menu AI Analisis XAUUSD, pilih timeframe, tekan Analisis Data Live.

Catatan: koneksi baru aktif setelah API key valid dan paket penyedia data mengizinkan endpoint/simbol XAU/USD. API gratis memiliki batas kuota/latensi; jangan menyebutnya tick real-time terjamin. Chart TradingView tetap dipakai untuk tampilan. Jangan memasukkan API key ke HTML. Analisis AI bukan nasihat investasi dan tidak menjamin profit.

=== OPTIMASI KECEPATAN AI (UPDATE) ===
- Candle Twelve Data dikurangi dari 120 menjadi 80 (tetap >=55 untuk EMA50).
- Cache candle per timeframe selama 20 detik.
- Cache hasil analisis per timeframe selama 12 detik agar klik ulang tidak selalu memanggil Gemini.
- Payload candle ke Gemini dipangkas menjadi 8 candle terbaru.
- Gemini 2.5 Flash memakai maxOutputTokens 700 dan thinkingBudget 0 untuk mengurangi waktu berpikir/hasil terlalu panjang.
- TradingView dan UI utama tetap dipertahankan.

Setelah mengganti Code.gs, lakukan Deploy > Manage deployments > Edit > New version > Deploy. Uji dengan menekan Analisis Data Live. Cache singkat berarti analisis yang diminta berulang dalam 12 detik pada timeframe sama dapat menampilkan hasil yang sama; setelah itu permintaan baru akan mengambil data dan meminta Gemini lagi. Kecepatan akhir tetap bergantung pada latensi/kuota Twelve Data dan Gemini.


UPDATE JURNAL GOOGLE SHEETS + TITIP DANA
1. Di Apps Script yang terhubung ke database lama, ganti isi Code.gs dengan versi dari ZIP ini, lalu Save. Jangan buat spreadsheet baru; sheet Journal sudah ditambahkan dalam setup awal. Jika sheet Journal belum ada, jalankan setupNewSpreadsheet() hanya jika fungsi itu menggunakan SPREADSHEET_ID database lama yang benar.
2. Ganti index.html yang dihosting dengan versi dari ZIP ini. Pertahankan CONFIG.SCRIPT_URL yang menunjuk ke deployment aplikasi saat ini dan DEMO_MODE:false.
3. Deploy > Manage deployments > Edit > New version > Deploy.
4. Jurnal trade tersimpan per username di sheet Journal. Catatan lama yang masih ada di localStorage browser ini akan dicoba disalin ke Google Sheets saat halaman Tools dibuka jika jurnal server akun tersebut masih kosong.
5. Titip Dana kini memakai nominal + transfer DANA + upload bukti, sama seperti Pinjam Akun Valetax. Owner/Admin harus memverifikasi bukti dan Approve. Setelah itu pilih antrean TITIP_DANA di form pemberian akun/ID, masukkan ID akun, lalu simpan. User melihat ID setelah diterbitkan. Password tidak diminta untuk Titip Dana.
6. Pastikan pembayaran benar-benar masuk sebelum approve. Bukti upload sendiri bukan bukti pembayaran yang sudah terverifikasi.
