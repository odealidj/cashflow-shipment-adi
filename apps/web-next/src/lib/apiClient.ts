/**
 * apiClient.ts - HTTP Request Helper dengan Two-Tier Session via HttpOnly Cookie
 * 
 * Menggunakan credentials: "include" secara default agar HttpOnly Cookie (auth_session)
 * otomatis terkirim pada setiap request ke Backend Go.
 * Jika status 401 Unauthorized diterima, otomatis mengarahkan ke halaman login (/?expired=true).
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
      credentials: "include", // Pastikan HttpOnly Cookie selalu terkirim
      headers,
    });

    // Tangani 401 Unauthorized secara global
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        console.warn("⚠️ Sesi berakhir (401 Unauthorized). Mengarahkan kembali ke halaman login...");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        
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
