# Zoom API Integration

Aplikasi ini terintegrasi dengan Zoom API untuk membuat, mengedit, dan menghapus meeting Zoom secara otomatis saat Anda mengelola meeting di aplikasi.

## Cara Mendapatkan Kredensi Zoom API

Untuk menggunakan fitur integrasi Zoom, Anda perlu membuat aplikasi Server-to-Server OAuth (JWT) di Zoom Marketplace. Berikut langkah-langkahnya:

### 1. Buat Zoom App di Marketplace

1. Masuk ke [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Klik "Develop" di pojok kanan atas, lalu pilih "Build App"
3. Pilih "Server-to-Server OAuth" sebagai tipe aplikasi
4. Isi informasi dasar aplikasi:
   - Nama Aplikasi
   - Company Name
   - Developer Contact Information

### 2. Dapatkan Kredensial API

1. Setelah aplikasi dibuat, Anda akan diarahkan ke halaman App Credentials
2. Catat informasi berikut:
   - API Key (Account ID)
   - API Secret

### 3. Aktifkan Scopes yang Diperlukan

1. Pada menu kiri, pilih "Scopes"
2. Tambahkan scopes berikut:
   - `meeting:write:admin`
   - `meeting:read:admin`
   - `user:read:admin`

### 4. Tambahkan Kredensial di Aplikasi

1. Masuk ke aplikasi sebagai admin
2. Buka halaman Settings
3. Pada bagian "Zoom Integration", klik "Add Zoom Credentials"
4. Masukkan API Key dan API Secret yang sudah didapatkan
5. (Opsional) Masukkan Account ID/User ID jika Anda ingin menggunakan akun tertentu
6. Klik "Save Credentials"

## User ID / Account ID

Secara default, API Zoom akan menggunakan akun yang terkait dengan API Key Anda. Jika Anda ingin menggunakan akun spesifik, Anda dapat mendapatkan User ID dengan cara berikut:

1. Masuk ke [Zoom Developer Console](https://developers.zoom.us/)
2. Pilih aplikasi yang telah Anda buat
3. Pilih "Testing" di menu kiri
4. Di panel kanan, klik "List Users" dan catat user ID yang ingin Anda gunakan

## Cara Kerja Integrasi

Setelah konfigurasi selesai:

1. Saat Anda membuat meeting baru di aplikasi, secara otomatis akan dibuat meeting Zoom
2. Link Zoom meeting akan ditampilkan di detail meeting
3. Saat Anda mengedit meeting, informasi meeting Zoom juga akan diperbarui
4. Saat Anda menghapus meeting, meeting Zoom juga akan dihapus

## Troubleshooting

Jika Anda mengalami masalah dengan integrasi Zoom:

1. Pastikan API Key dan API Secret sudah benar
2. Pastikan akun yang terkait dengan API Key memiliki izin untuk membuat meeting
3. Jika menggunakan User ID tertentu, pastikan ID tersebut valid
4. Periksa apakah scopes yang diperlukan sudah diaktifkan di Zoom App 