# Standarisasi Respon API & Penanganan HTTP 409 Conflict

Dokumen ini mendefinisikan standar baku arsitektur respon REST API untuk sistem **Cashflow & Shipment Management System (PT. Adijayantara Logistics Indonesia)**. Standar ini berlaku seragam di seluruh endpoint backend (Go Chi Router) dan dikonsumsi secara konsisten oleh frontend (Next.js React & TypeScript).

---

## 1. Filosofi & Tujuan Desain

Sebelum standarisasi ini diterapkan, format pagination dan penanganan error memiliki variasi (beberapa endpoint menempatkan pagination di dalam map `data: { entries, total }`, sedangkan endpoint lain menggunakan `data: { users, meta }`). Selain itu, error duplikasi data database (seperti duplikasi email, nomor invoice, nama vendor/customer) sempat terlempar sebagai HTTP 500 atau 400 biasa yang terkesan sebagai "error sistem".

Standarisasi ini menetapkan 4 prinsip utama:
1. **Respon Deterministik**: Setiap respon API selalu membungkus payload dalam format seragam (`status`, `message`, `data`, opsional `meta` dan `errors`).
2. **Koleksi Paginated Murni**: Untuk seluruh endpoint berpaginasi, `data` selalu berupa **Array murni `[...]`**, sedangkan metadata halaman diletakkan di root level `meta: { ... }`.
3. **HTTP 409 Conflict untuk Duplikasi**: Setiap benturan integritas data (unique constraint violation seperti email ganda, nomor invoice kembar, atau nama vendor/customer yang sudah ada) wajib mengembalikan **HTTP 409 Conflict** dengan pesan ramah bisnis, bukan dianggap kegagalan sistem (500).
4. **Resilensi Frontend**: Frontend TypeScript memiliki tipe global `ApiResponse<T>` dan parser yang tangguh terhadap data array murni maupun fallback legacy.

---

## 2. Struktur Baku Respon API

### A. Respon Sukses Non-Paginated (Single Object / Action Result)
Digunakan untuk create, update, delete, detail item by ID, summary agregasi, atau list kecil tanpa paginasi.

```json
{
  "status": true,
  "message": "Detail invoice berhasil dimuat",
  "data": {
    "id": 12,
    "invoice_no": "INV-2026-001",
    "client_name": "PT Sumber Berkah",
    "amount": 25000000,
    "status": "UNPAID"
  }
}
```

---

### B. Respon Sukses Terpaginasi (Paginated Collection)
Digunakan untuk 6 endpoint utama: `/cashflow`, `/invoices`, `/users`, `/vendors`, `/customers`, dan `/activity-presets`.

```json
{
  "status": true,
  "message": "Daftar invoice berhasil dimuat",
  "data": [
    {
      "id": 12,
      "invoice_no": "INV-2026-001",
      "client_name": "PT Sumber Berkah",
      "amount": 25000000,
      "status": "UNPAID"
    },
    {
      "id": 13,
      "invoice_no": "INV-2026-002",
      "client_name": "CV Maju Terus",
      "amount": 14200000,
      "status": "PAID"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 15,
    "total_items": 128,
    "total_pages": 9,
    "has_next": true,
    "has_prev": false
  }
}
```

#### Spesifikasi Field `meta`:
| Field | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `page` | `int` | Nomor halaman saat ini (1-indexed). |
| `limit` | `int` | Jumlah maksimal data per halaman. |
| `total_items` | `int` | Total keseluruhan baris data yang cocok dengan filter. |
| `total_pages` | `int` | Jumlah total halaman: `ceil(total_items / limit)`. |
| `has_next` | `bool` | `true` jika masih ada halaman berikutnya (`page < total_pages`). |
| `has_prev` | `bool` | `true` jika ada halaman sebelumnya (`page > 1`). |

---

### C. Respon Error Standar (Client / Server Errors)
Digunakan saat terjadi validasi gagal (400), unauthorized (401), forbidden (403), tidak ditemukan (404), atau kesalahan internal server (500).

```json
{
  "status": false,
  "message": "Format parameter tidak valid",
  "data": null,
  "errors": [
    "Field 'amount' harus lebih besar dari 0"
  ]
}
```

---

### D. Spesialisasi HTTP 409 Conflict (Duplicate Key / Collision)
Sesuai standar RFC 9110 Section 15.5.10, **HTTP 409 Conflict** mengindikasikan bahwa permintaan tidak dapat diproses karena konflik dengan keadaan sumber daya saat ini (misal pelanggaran aturan keunikan database).

```json
{
  "status": false,
  "message": "Invoice dengan nomor 'INV-2026-001' sudah terdaftar di sistem",
  "data": null
}
```

#### Keuntungan Bisnis & UX:
1. **Tidak Terkesan Error Sistem**: Pengguna dan operator UI tidak melihat toast merah bertuliskan "Internal Server Error (500)" yang menimbulkan kepanikan atau kesan bug aplikasi.
2. **Instruksi Jelas**: Form input langsung menandai field spesifik (misal: "Email sudah digunakan, silakan gunakan email lain atau reset password").
3. **Observabilitas**: Log server mencatat 409 sebagai *business rejected*, bukan *server crash alert* di monitoring tool (Sentry / Datadog).

---

## 3. Implementasi di Backend Go (`pkg/response`)

File: [`services/core-go/pkg/response/response.go`](../../services/core-go/pkg/response/response.go)

### Struct Definisi
```go
type PaginationMeta struct {
    Page       int  `json:"page"`
    Limit      int  `json:"limit"`
    TotalItems int  `json:"total_items"`
    TotalPages int  `json:"total_pages"`
    HasNext    bool `json:"has_next"`
    HasPrev    bool `json:"has_prev"`
}

type APIResponse struct {
    Status  bool            `json:"status"`
    Message string          `json:"message"`
    Data    interface{}     `json:"data,omitempty"`
    Meta    *PaginationMeta `json:"meta,omitempty"`
    Errors  interface{}     `json:"errors,omitempty"`
}
```

### Helper Methods yang Tersedia
- `response.JSON(w, http.StatusOK, message, data)`: Mengirim respon objek/item tunggal atau aksi mutasi.
- `response.Paginated(w, http.StatusOK, message, items, page, limit, total)`: Menghitung metadata otomatis dan mengirim respon koleksi terpaginasi.
- `response.Conflict(w, message)`: Mengirim HTTP 409 Conflict untuk error benturan data/kunci unik.
- `response.Error(w, statusCode, message)`: Mengirim respon error standar.
- `response.ErrorWithDetails(w, statusCode, message, details)`: Mengirim respon error dengan rincian validasi field.
- `response.IsDuplicateKeyError(err)`: Mendeteksi secara cerdas apakah error disebabkan oleh benturan Postgres (kode `23505`, duplicate key, atau collision unique validation).

### Contoh Penggunaan di Handler
```go
// Di dalam Handler List:
response.Paginated(w, http.StatusOK, "Daftar pengguna berhasil dimuat", users, page, limit, total)

// Di dalam Handler Create/Update dengan proteksi 409:
user, err := h.userService.Create(r.Context(), input, currentUserRole)
if err != nil {
    if response.IsDuplicateKeyError(err) {
        response.Conflict(w, err.Error())
        return
    }
    response.Error(w, http.StatusBadRequest, err.Error())
    return
}
```

---

## 4. Implementasi di Frontend TypeScript & Next.js

File: [`apps/web-next/src/types/api.ts`](../../apps/web-next/src/types/api.ts)

### Kontrak Antarmuka TypeScript
```typescript
export interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
  errors?: any;
}
```

### Pola Konsumsi Data di Komponen React
Komponen mengonsumsi `data.data` (array murni) dan `data.meta?.total_items` dengan fallback kompatibilitas:

```typescript
const res = await fetchWithAuth(`http://localhost:8080/api/v1/cashflow?page=${page}&limit=${limit}`);
const data: ApiResponse<CashflowEntry[]> = await res.json();

if (data.status && data.data) {
  // data.data langsung berupa array murni
  setEntries(Array.isArray(data.data) ? data.data : (data.data as any).entries || []);
  setTotal(data.meta?.total_items ?? (data.data as any)?.total ?? 0);
}
```

---

## 5. Matriks Kasus HTTP 409 Conflict di Sistem

| Modul | Endpoint | Kunci / Field yang Diproteksi | Pesan Respon 409 |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST /api/v1/auth/register` | `users.email`, `users.phone` | `"Email atau nomor telepon sudah terdaftar di sistem"` |
| **Users** | `POST /api/v1/users`, `PUT /api/v1/users/{id}` | `users.email`, `users.phone` | `"Email atau nomor telepon sudah digunakan oleh akun lain"` |
| **Roles** | `POST /api/v1/roles` | `roles.code` | `"kode role sudah digunakan, silakan gunakan kode lain"` |
| **Invoices** | `POST /api/v1/invoices`, `PUT /api/v1/invoices/{id}` | `invoices.invoice_no` | `"invoice dengan nomor '...' sudah terdaftar"` |
| **Customers** | `POST /api/v1/customers`, `PUT /api/v1/customers/{id}` | `customers.name` | `"customer dengan nama ini sudah terdaftar"` |
| **Vendors** | `POST /api/v1/vendors`, `PUT /api/v1/vendors/{id}` | `vendors.name` | `"Nama vendor sudah terdaftar di sistem"` |

---

## 6. Sinkronisasi OpenAPI / Swagger

Setiap perubahan signature respon otomatis tercermin pada dokumentasi Swagger:
- Jalankan `make swagger-gen` dari root repository.
- Swagger OpenAPI file berada di [`services/core-go/docs/`](../../services/core-go/docs/).
- Model `response.APIResponse` dan `response.PaginationMeta` terdokumentasi lengkap dan dapat diuji langsung di UI Swagger (`/swagger/index.html`).
