/**
 * apiClient.ts - HTTP Request Helper dengan Otomatisasi Interceptor 401 Unauthorized
 * 
 * Jika backend mengembalikan status 401 (token expired / invalid):
 * 1. Menghapus sesi localStorage (token & user).
 * 2. Mengarahkan otomatis ke halaman login (/) agar user tidak terjebak di layar kosong.
 */

export const API_BASE_URL = "http://localhost:8080/api/v1";

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function fetchWithAuth(url: string, options: FetchOptions = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = new Headers(options.headers || {});
  
  if (!options.skipAuth && token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Tangani 401 Unauthorized secara global
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        console.warn("⚠️ Sesi berakhir (401 Unauthorized). Mengarahkan kembali ke halaman login...");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        
        // Jangan redirect jika sudah di halaman login
        if (window.location.pathname !== "/" && window.location.pathname !== "/m/pin") {
          window.location.href = "/?expired=true";
        }
      }
    }

    return response;
  } catch (error) {
    console.error("Fetch Network Error:", error);
    throw error;
  }
}
