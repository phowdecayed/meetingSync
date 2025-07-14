# BPKAD Zoom Book

Aplikasi untuk melakukan pemesanan meeting room dan integrasi Zoom di BPKAD Jabar.

## Fitur Utama

- **Otentikasi Pengguna**: Sistem login untuk pengguna dan admin menggunakan NextAuth.js.
- **Penjadwalan Meeting**: Buat, lihat, perbarui, dan hapus jadwal meeting.
- **Integrasi Zoom**: Secara otomatis membuat meeting Zoom saat jadwal baru dibuat.
- **Tampilan Kalender**: Visualisasikan jadwal meeting dalam format kalender interaktif menggunakan FullCalendar.
- **Manajemen Pengguna**: Admin dapat mengelola pengguna.
- **Dasbor**: Tampilan ringkas statistik meeting menggunakan Recharts.
- **Desain Responsif**: Antarmuka yang dioptimalkan untuk desktop dan perangkat mobile.

## Teknologi yang Digunakan

- **Framework**: [Next.js](https://nextjs.org/) (dengan App Router & Turbopack)
- **Bahasa**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Otentikasi**: [NextAuth.js](https://next-auth.js.org/)
- **UI Komponen**: [Shadcn UI](https://ui.shadcn.com/), [FullCalendar](https://fullcalendar.io/), [Recharts](https://recharts.org/)
- **Validasi Form**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Manajemen State**: [Zustand](https://zustand-demo.pmnd.rs/)

## Prasyarat

- Node.js >= 18
- npm >= 9
- PostgreSQL >= 13
- Docker & Docker Compose (untuk penyebaran)

## Setup Environment
1. **Clone repository**
   ```bash
   git clone https://github.com/phowdecayed/meetingSync.git
   cd meetingSync
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


## Penyebaran dengan Docker

Proyek ini menyertakan konfigurasi Docker untuk penyebaran yang mudah di lingkungan yang berbeda. Anda dapat memilih antara menggunakan PostgreSQL untuk produksi atau SQLite untuk pengaturan yang ringan.

### Prasyarat

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Penyebaran Produksi (PostgreSQL)

Untuk pengaturan yang siap produksi, kami merekomendasikan penggunaan database PostgreSQL. Konfigurasi ini mencakup layanan untuk database, migrasi database, dan aplikasi utama.

1.  **Arahkan ke direktori `docker`:**
    ```bash
    cd docker
    ```

2.  **Buat File Lingkungan:**
    Buat file `pg.env` di direktori `docker` dan isi dengan variabel lingkungan yang diperlukan untuk PostgreSQL.
    ```
    POSTGRES_DB=nama_db_anda
    POSTGRES_USER=user_db_anda
    POSTGRES_PASSWORD=kata_sandi_db_anda
    DATABASE_URL="postgresql://user_db_anda:kata_sandi_db_anda@db:5432/nama_db_anda?schema=public"
    NEXTAUTH_SECRET=rahasia_nextauth_anda
    NEXTAUTH_URL=http://localhost:3000
    ```

3.  **Jalankan Docker Compose:**
    ```bash
    docker-compose -f docker-compose-pg.yml up -d --build
    ```
    Perintah ini akan membangun image dan memulai layanan dalam mode detached. Database akan diinisialisasi, migrasi akan diterapkan, dan aplikasi akan dimulai pada port 3000.

Untuk instruksi lebih detail tentang penyebaran produksi, silakan merujuk ke dokumen `docs/production-deployment.md`.

### 2. Penyebaran Ringan (SQLite)

Untuk tujuan pengembangan atau pengujian, Anda dapat menggunakan konfigurasi SQLite. Ini lebih sederhana dan tidak memerlukan server database terpisah.

1.  **Arahkan ke direktori `docker`:**
    ```bash
    cd docker
    ```

2.  **Buat File Lingkungan:**
    Buat file `.env` di direktori `docker`. Variabel utama yang harus diatur adalah `DATABASE_URL` untuk menunjuk ke file SQLite.
    ```
    DATABASE_URL="file:/app/data/sqlite.db"
    NEXTAUTH_SECRET=rahasia_nextauth_anda
    NEXTAUTH_URL=http://localhost:3000
    ```
    Data akan disimpan di direktori `docker/data` pada host.

3.  **Jalankan Docker Compose:**
    ```bash
    docker-compose -f docker-compose-sq.yml up -d --build
    ```
    Ini akan memulai aplikasi dan layanan migrasi. Aplikasi akan dapat diakses di port 3000.

### Menghentikan Aplikasi

Untuk menghentikan layanan, jalankan perintah `docker-compose down` yang sesuai dari direktori `docker`:

-   Untuk PostgreSQL: `docker-compose -f docker-compose-pg.yml down`
-   Untuk SQLite: `docker-compose -f docker-compose-sq.yml down`