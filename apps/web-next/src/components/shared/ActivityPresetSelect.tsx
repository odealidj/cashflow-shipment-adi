"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  ChevronDown, 
  Check, 
  Sparkles, 
  Route, 
  Truck, 
  X 
} from "lucide-react";
import { fetchWithAuth } from "@/lib/apiClient";

interface ActivityPreset {
  id: number;
  category: "ACT_INFO" | "ACT_EXPLAIN";
  name: string;
  description?: string;
  is_active: boolean;
}

interface ActivityPresetSelectProps {
  category: "ACT_INFO" | "ACT_EXPLAIN";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function ActivityPresetSelect({
  category,
  value,
  onChange,
  placeholder,
  required = false,
  className = ""
}: ActivityPresetSelectProps) {
  const [presets, setPresets] = useState<ActivityPreset[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isArmada = category === "ACT_INFO";

  const fetchPresets = async () => {
    try {
      const res = await fetchWithAuth(`/api/v1/activity-presets?category=${category}&limit=200`);
      const data = await res.json();
      if (data.status && data.data) {
        if (Array.isArray(data.data)) {
          setPresets(data.data);
        } else if (Array.isArray(data.data.entries)) {
          setPresets(data.data.entries);
        }
      }
    } catch (err) {
      console.error("Failed to load activity presets", err);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, [category]);

  // Handle Outside Click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter presets based on current input value (maksimal 10 item untuk menjaga keringkasan)
  const { filteredPresets, totalMatches } = useMemo(() => {
    const query = (value || "").toLowerCase().trim();
    const matches = !query 
      ? presets 
      : presets.filter(p => 
          p.name.toLowerCase().includes(query) || 
          (p.description && p.description.toLowerCase().includes(query))
        );
    return {
      filteredPresets: matches.slice(0, 10),
      totalMatches: matches.length
    };
  }, [presets, value]);

  // Handle Input Change according to user specification:
  // Mulai 3 karakter: jika ada match, munculkan listnya.
  // Jika huruf berikutnya tidak ada match: hilangkan listnya.
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onChange(text);

    const query = text.toLowerCase().trim();
    if (query.length >= 3) {
      const hasMatches = presets.some(p => 
        p.name.toLowerCase().includes(query) || 
        (p.description && p.description.toLowerCase().includes(query))
      );
      setIsOpen(hasMatches);
    } else {
      // Kurang dari 3 karakter: sembunyikan dropdown rekomendasi otomatis
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Input Field with Dropdown Toggle */}
      <div className="relative flex items-center">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {isArmada ? <Truck className="w-4 h-4 text-sky-700" /> : <Route className="w-4 h-4 text-emerald-600" />}
        </div>

        <input
          ref={inputRef}
          type="text"
          required={required}
          value={value}
          placeholder={
            placeholder || 
            (isArmada 
              ? "Pilih atau ketik armada (mis. Tronton)..." 
              : "Pilih atau ketik rute (mis. CIBITUNG - MEDAN)...")
          }
          onFocus={fetchPresets}
          onChange={handleInputChange}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-14 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none font-semibold transition-all shadow-2xs placeholder:text-slate-400"
        />

        {/* Action icons right */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
              title="Hapus"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const nextState = !isOpen;
              setIsOpen(nextState);
              if (nextState) {
                fetchPresets();
              }
            }}
            className="p-1 rounded-md text-slate-400 hover:text-sky-700 hover:bg-slate-200/60 transition cursor-pointer"
            title="Buka / Tutup Pilihan Preset"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180 text-sky-700" : ""}`} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown Suggestion List - Hanya tampil jika isOpen dan ada item yang cocok */}
      {isOpen && filteredPresets.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-64 flex flex-col">
          {/* Header Info Ringkas */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5 text-sky-800">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Daftar {isArmada ? "Armada" : "Rute"} Rekomendasi</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {totalMatches > 10 ? `10 dari ${totalMatches} pilihan` : `${totalMatches} pilihan`}
            </span>
          </div>

          {/* Preset Items List */}
          <div className="overflow-y-auto soft-scrollbar p-1 divide-y divide-slate-50 flex-1">
            {filteredPresets.map((preset) => {
              const isSelected = value.trim().toLowerCase() === preset.name.trim().toLowerCase();

              return (
                <button
                  key={preset.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(preset.name);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected 
                      ? "bg-sky-50 text-sky-950 font-black border border-sky-200/60 shadow-2xs" 
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-xs ${
                      isArmada ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {isArmada ? "🚛" : "📍"}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-slate-800">{preset.name}</div>
                      {preset.description && (
                        <div className="text-[10px] text-slate-400 truncate font-normal">{preset.description}</div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-sky-700 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
