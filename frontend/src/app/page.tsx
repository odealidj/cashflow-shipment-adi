"use client";

import { useState } from "react";
import { LogIn, Phone, Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("http://localhost:8080/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to login");
      }
      
      // Store token
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      
      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass-panel mb-4 shadow-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-purple-500 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Cashflow Control
          </h1>
          <p className="text-gray-300 text-sm">
            Log in to manage your shipments and finances.
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
          {/* Decorative glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-brand-500/20 blur-3xl rounded-full -z-10" />
          
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-sm p-3 rounded-xl flex items-center gap-2">
                <span className="shrink-0">⚠️</span> {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200 ml-1">
                Email or Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  {identifier.includes('@') ? (
                    <Mail className="h-5 w-5" />
                  ) : (
                    <Phone className="h-5 w-5" />
                  )}
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full glass-input rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-brand-500"
                  placeholder="admin@example.com or 0812..."
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-gray-200">
                  Password
                </label>
                <a href="#" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-brand-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl font-medium p-[1px]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-brand-500 via-purple-500 to-brand-500 rounded-xl opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center gap-2 bg-black/50 backdrop-blur-md px-6 py-3 rounded-xl transition-all duration-300 group-hover:bg-black/20 text-white">
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Sign In
                  </>
                )}
              </div>
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <a href="#" className="text-white hover:underline transition-all">
              Contact Admin
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
