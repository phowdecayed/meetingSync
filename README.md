# BPKAD Zoom Book

Aplikasi untuk melakukan pemesanan meeting room dan integrasi Zoom di BPKAD Jabar.

## Fitur Utama
- Booking meeting room dengan integrasi Zoom
- Validasi double booking (maksimal 2 meeting bersamaan)
- Kalender meeting (list & calendar view)
- Manajemen akun Zoom (admin)

## Prasyarat
- Node.js >= 18
- npm >= 9
- PostgreSQL >= 13

## Setup Environment
1. **Clone repository**
   ```bash
   git clone https://github.com/phowdecayed/meetingSync.git
   cd bpkad-zoom-book
   ```

2. **Copy file environment**
   ```bash
   cp .env.example .env
   ```
   Lalu edit `.env` sesuai kebutuhan, contoh:
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/bpkad_zoom_book"
   NEXTAUTH_SECRET=your-random-secret
   ```

## Setup Database & Prisma
1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup database PostgreSQL**
   - Pastikan PostgreSQL sudah berjalan dan database sudah dibuat.
   - Update `DATABASE_URL` di `.env` sesuai database Anda.

3. **Migrasi database**
   ```bash
   npx prisma migrate deploy
   # atau untuk development
   npx prisma migrate dev
   ```

4. **(Opsional) Seed data awal**
   ```bash
   npx prisma db seed
   ```

5. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

## Menjalankan Aplikasi (Development)
```bash
npm run dev
```
Aplikasi akan berjalan di [http://localhost:3000](http://localhost:3000)

## Menjalankan di Production
1. Build aplikasi:
   ```bash
   npm run build
   ```
2. Start production server:
   ```bash
   npm start
   ```

## Migrasi dari SQLite ke PostgreSQL
Jika sebelumnya menggunakan SQLite, lakukan:
1. Update `DATABASE_URL` ke PostgreSQL di `.env`
2. Jalankan migrasi ulang:
   ```bash
   npx prisma migrate reset
   ```
   **Perhatian:** Ini akan menghapus semua data lama.

## Troubleshooting
- Jika ada error Prisma, pastikan database sudah berjalan dan `DATABASE_URL` benar.
- Untuk error Zoom API, cek kredensial Zoom di `.env`.

## Lisensi
MIT