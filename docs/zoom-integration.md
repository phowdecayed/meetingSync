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
   - Account ID
   - Client ID
   - Client Secret

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
4. Masukkan kredensial yang sudah Anda dapatkan:
   - Account ID
   - Client ID
   - Client Secret
5. Klik "Save Credentials"

## Pengaturan Akun

Secara default, aplikasi akan menggunakan kredensial yang Anda berikan untuk membuat meeting atas nama akun utama. Anda tidak perlu menentukan User ID secara spesifik karena otentikasi Server-to-Server OAuth beroperasi di tingkat akun.



## Cara Kerja Integrasi

Setelah konfigurasi selesai:

1. Saat Anda membuat meeting baru di aplikasi, secara otomatis akan dibuat meeting Zoom
2. Link Zoom meeting akan ditampilkan di detail meeting
3. Saat Anda mengedit meeting, informasi meeting Zoom juga akan diperbarui
4. Saat Anda menghapus meeting, meeting Zoom juga akan dihapus

## Troubleshooting

Jika Anda mengalami masalah dengan integrasi Zoom:

1. Pastikan Account ID, Client ID, dan Client Secret sudah benar.
2. Pastikan aplikasi Server-to-Server OAuth Anda sudah diaktifkan.
3. Pastikan scopes yang diperlukan sudah ditambahkan dan diizinkan di aplikasi Zoom Anda.