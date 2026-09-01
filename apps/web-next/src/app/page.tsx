"use client";

import { useState, useEffect } from "react";
import { 
  LogIn, 
  UserPlus, 
  Phone, 
  Mail, 
  Lock, 
  User, 
  Loader2, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type AuthMode = "login" | "register" | "register_success";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");

  // Login form state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Status & error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [successInfo, setSuccessInfo] = useState<{ fullName: string; email: string } | null>(null);

  useEffect(() => {
    // Check for session expired query param
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("expired") === "true") {
        setError("Sesi Anda telah berakhir demi keamanan. Silakan login kembali.");
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setWarningMessage("");

    try {
      const res = await fetch("http://localhost:8080/api/v1/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.message || "Gagal masuk";
        if (msg.toLowerCase().includes("menunggu persetujuan") || msg.toLowerCase().includes("tidak aktif")) {
          setWarningMessage(msg);
          return;
        }
        throw new Error(msg);
      }

      if (data.data?.token) {
        localStorage.setItem("token", data.data.token);
      }
      if (data.data?.user) {
        localStorage.setItem("user", JSON.stringify(data.data.user));
      }

      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat masuk");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setWarningMessage("");

    if (regPassword !== regConfirmPassword) {
      setError("Konfirmasi password tidak cocok");
      setLoading(false);
      return;
    }

    if (regPassword.length < 6) {
      setError("Password minimal 6 karakter");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:8080/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: regFullName,
          email: regEmail,
          phone: regPhone || undefined,
          password: regPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal mendaftarkan akun");
      }

      setSuccessInfo({
        fullName: regFullName,
        email: regEmail,
      });
      setMode("register_success");

      // Reset register inputs
      setRegFullName("");
      setRegEmail("");
      setRegPhone("");
      setRegPassword("");
      setRegConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat pendaftaran");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#1b2838] via-[#223249] to-[#0f172a] relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-fade-in my-auto">
        {/* Banner Logo Section (Identik dengan Menu Sidebar) */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-3.5 border border-white/20 flex items-center justify-center gap-3.5 shadow-2xl mb-6 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-white p-1 flex items-center justify-center shrink-0 shadow-lg">
            <Image
              src="/logo.png"
              alt="Logo PT. Adijayantara Logistics Indonesia"
              width={70}
              height={70}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="text-left min-w-0">
            <h1 className="text-base font-black text-white leading-tight tracking-tight uppercase truncate">
              Adijayantara
            </h1>
            <p className="text-xs text-sky-200 font-bold leading-tight mt-0.5 truncate">
              Logistics Indonesia
            </p>
            <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-sky-950/60 text-sky-300 text-[10px] font-black tracking-widest rounded-md border border-sky-400/30">
              CASHFLOW & SHIPMENT
            </span>
          </div>
        </div>

        {/* Main Form Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100/90 relative overflow-hidden">
          
          {/* TAB SWITCHER (Jika bukan mode success) */}
          {mode !== "register_success" && (
            <div className="flex bg-slate-100/90 p-1 rounded-2xl mb-6 border border-slate-200/70">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setWarningMessage("");
                }}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "login"
                    ? "bg-[#223249] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk Akun</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                  setWarningMessage("");
                }}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "register"
                    ? "bg-[#223249] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Daftar Akun Baru</span>
              </button>
            </div>
          )}

          {/* ALERT ERROR */}
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-2xl flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ALERT WARNING (Menunggu Approval) */}
          {warningMessage && (
            <div className="mb-4 bg-amber-50 border border-amber-300 text-amber-900 text-xs p-3.5 rounded-2xl flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-950">Akun Menunggu Persetujuan</p>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  {warningMessage}
                </p>
              </div>
            </div>
          )}

          {/* 1. FORM LOGIN */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1">
                  Email atau Nomor Telepon
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    {identifier.includes("@") ? (
                      <Mail className="h-4 w-4 text-sky-600" />
                    ) : (
                      <Phone className="h-4 w-4 text-sky-600" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="nama@email.com / 0812..."
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-slate-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4 text-sky-600" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-10 text-slate-900 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Masuk ke Dashboard</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. FORM REGISTER (SIGN UP) */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 ml-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4 text-sky-600" />
                  </div>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-slate-900 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="Contoh: Budi Santoso"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 ml-1">
                  Email Perusahaan / Akun <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4 text-sky-600" />
                  </div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-slate-900 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="budi@adijayantara.co.id"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 ml-1">
                  Nomor WhatsApp / HP <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-4 w-4 text-sky-600" />
                  </div>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-slate-900 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="08123456789"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 ml-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-900 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                      placeholder="Min. 6 karakter"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 ml-1">
                    Konfirmasi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-900 text-sm focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                      placeholder="Ulangi password"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRegPassword}
                    onChange={(e) => setShowRegPassword(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Tampilkan password</span>
                </label>
              </div>

              <div className="bg-sky-50/80 border border-sky-200 text-sky-950 p-2.5 rounded-xl text-[11px] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                <span>
                  Akun baru berstatus <strong>Menunggu Persetujuan</strong> dan akan diverifikasi oleh Administrator sebelum dapat digunakan.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Mendaftarkan Akun...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Daftar Akun Baru</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* 3. REGISTER SUCCESS STATE */}
          {mode === "register_success" && (
            <div className="text-center py-2 space-y-4 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Pendaftaran Berhasil!
                </h3>
                <p className="text-xs text-slate-600">
                  Akun atas nama <strong className="text-slate-900">{successInfo?.fullName}</strong> ({successInfo?.email}) telah terdaftar dalam sistem.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-300 text-amber-950 p-4 rounded-2xl text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Status: Menunggu Persetujuan Admin</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Demi keamanan finansial perusahaan, akun Anda perlu diaktifkan dan ditetapkan hak akses perannya oleh <strong>Administrator</strong> sebelum Anda dapat masuk ke Dashboard.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  if (successInfo?.email) {
                    setIdentifier(successInfo.email);
                  }
                }}
                className="w-full py-3 rounded-xl bg-[#223249] hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>Kembali ke Halaman Masuk</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Footer Subtext */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              PT. Adijayantara Logistics Indonesia
            </p>
            <p className="text-[10px] text-slate-400/80 mt-0.5">
              Sistem Pengendalian Arus Kas & Ekspedisi Terpadu
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
