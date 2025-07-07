# To-Do: Membuat Rapat Zoom dengan Server-to-Server OAuth

Berikut adalah langkah-langkah yang perlu diikuti untuk membuat rapat di Zoom menggunakan aplikasi Server-to-Server OAuth, berdasarkan dokumentasi resmi Zoom.

## 1. Buat Aplikasi Server-to-Server OAuth

- Kunjungi [Zoom App Marketplace](https://marketplace.zoom.us/).
- Klik **Develop** > **Build App**.<mcreference link="https://developers.zoom.us/docs/integrations/create/" index="5">5</mcreference>
- Pilih tipe aplikasi **Server-to-Server OAuth**.<mcreference link="https://developers.zoom.us/docs/internal-apps/s2s-oauth/" index="2">2</mcreference>
- Beri nama aplikasi Anda dan lanjutkan.

## 2. Dapatkan Kredensial Aplikasi

- Setelah aplikasi dibuat, Anda akan mendapatkan **Account ID**, **Client ID**, dan **Client Secret**.<mcreference link="https://developers.zoom.us/docs/internal-apps/s2s-oauth/" index="2">2</mcreference>
- Simpan informasi ini dengan aman, karena akan digunakan untuk otentikasi.

## 3. Tambahkan Scopes (Cakupan Izin)

- Di pengaturan aplikasi Anda, buka tab **Scopes**.
- Tambahkan scope yang diperlukan untuk membuat rapat. Scope yang relevan adalah `meeting:write:admin` atau `meeting:write` (tergantung kebutuhan Anda, `admin` untuk mengelola semua rapat di akun tersebut).<mcreference link="https://github.com/zoom/server-to-server-oauth-starter-api" index="4">4</mcreference>
- Klik **Continue** dan aktifkan aplikasi Anda.

## 4. Hasilkan Access Token

Untuk berinteraksi dengan Zoom API, Anda memerlukan `access_token` yang berlaku selama satu jam.<mcreference link="https://developers.zoom.us/docs/internal-apps/s2s-oauth/" index="2">2</mcreference>

1.  **Encode Kredensial Anda**:
    - Gabungkan Client ID dan Client Secret Anda dengan titik dua (`client_id:client_secret`).
    - Encode string tersebut menggunakan Base64.

2.  **Buat Permintaan POST**:
    - **URL**: `https://zoom.us/oauth/token`
    - **Method**: `POST`
    - **Headers**:
        - `Authorization`: `Basic <Hasil_Encode_Base64_Anda>`
        - `Content-Type`: `application/x-www-form-urlencoded`
    - **Body** (form-urlencoded):
        - `grant_type`: `account_credentials`
        - `account_id`: `Account_ID_Anda`

3.  **Terima Respons**:
    - Jika berhasil, Zoom akan mengembalikan JSON yang berisi `access_token`.<mcreference link="https://developers.zoom.us/docs/internal-apps/s2s-oauth/" index="2">2</mcreference>

## 5. Buat Rapat (Create Meeting)

Setelah mendapatkan `access_token`, Anda dapat membuat rapat dengan melakukan panggilan ke API Zoom.

- **URL**: `https://api.zoom.us/v2/users/{userId}/meetings`
  - Ganti `{userId}` dengan ID pengguna atau email pengguna yang akan menjadi host. Anda juga bisa menggunakan `me` untuk merujuk pada pengguna pemilik aplikasi.<mcreference link="https://github.com/zoom/server-to-server-oauth-starter-api" index="4">4</mcreference>
- **Method**: `POST`
- **Headers**:
    - `Authorization`: `Bearer <Access_Token_Anda>`
    - `Content-Type`: `application/json`
- **Body** (JSON):
  ```json
  {
    "topic": "Rapat Diskusi Proyek",
    "type": 2,
    "start_time": "2024-08-15T10:00:00Z",
    "duration": 60,
    "timezone": "Asia/Jakarta",
    "settings": {
      "host_video": true,
      "participant_video": true,
      "join_before_host": false,
      "mute_upon_entry": true
    }
  }
  ```

Jika permintaan berhasil, API akan mengembalikan detail rapat yang baru dibuat, termasuk `join_url` dan `start_url`.