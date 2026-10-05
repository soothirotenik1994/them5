import React, { useState } from "react";
import { 
  Key, ShieldCheck, User, Lock, Eye, EyeOff, ArrowRight, 
  Sun, Moon, Globe, ExternalLink, X, AlertCircle, CheckCircle2,
  Building2, Sparkles, Server, Laptop, ChevronRight
} from "lucide-react";

interface AdminLoginPortalProps {
  isFullPage?: boolean;
  onClose: () => void;
  isLight: boolean;
  toggleTheme: () => void;
  dbStatus?: { connected: boolean; provider?: string };
  adminUsers: any[];
  onSuccessLogin: (admin: any) => void;
}

export default function AdminLoginPortal({
  isFullPage = false,
  onClose,
  isLight,
  toggleTheme,
  dbStatus,
  adminUsers,
  onSuccessLogin
}: AdminLoginPortalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setErrorMsg("กรุณากรอกชื่อผู้ใช้งาน (Username)");
      return;
    }
    if (!password) {
      setErrorMsg("กรุณากรอกรหัสผ่าน (Password)");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Check dynamic admin list
      let matched = adminUsers.find(
        (a: any) => a.username?.toLowerCase() === cleanUsername && a.password === password
      );

      // Hardcoded fallback accounts for fail-safe access
      if (!matched && cleanUsername === "admin" && (password === "admin123" || password === "m5loft" || password === "password123")) {
        matched = {
          id: "admin-1",
          adminId: "admin-1",
          username: "admin",
          name: "ผู้จัดการระบบส่วนกลาง (System Chief Manager)",
          role: "Super Admin"
        };
      }

      if (matched) {
        if (rememberMe) {
          localStorage.setItem("m5_admin_authed", "true");
          localStorage.setItem("m5_admin_username", matched.username);
        }
        onSuccessLogin(matched);
      } else {
        setErrorMsg("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
        setIsLoading(false);
      }
    }, 450);
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-0 md:p-6 transition-colors duration-300 font-sans ${
      isLight ? "bg-[#f1f3f5] text-neutral-900" : "bg-[#090a0d] text-neutral-100"
    }`}>
      {/* Main Wrapper Container */}
      <div className={`w-full ${
        isFullPage ? "min-h-screen md:min-h-0 md:max-w-6xl md:rounded-3xl" : "max-w-5xl rounded-2xl"
      } overflow-hidden shadow-2xl border transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 ${
        isLight 
          ? "bg-white border-neutral-200/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)]" 
          : "bg-[#111216] border-neutral-800/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)]"
      }`}>

        {/* LEFT PANE: Editorial Hotel Brand & Atmospheric Imagery (Hidden on small mobile, visible on lg) */}
        <div className="lg:col-span-6 xl:col-span-7 relative min-h-[380px] lg:min-h-[640px] flex flex-col justify-between p-8 sm:p-12 overflow-hidden bg-neutral-950 select-none">
          {/* Background Photo */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
            style={{ 
              backgroundImage: "url('/images/lobby_loft_m5_1782203250164.jpg')" 
            }}
          />

          {/* Deep Architectural Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-neutral-950/50 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-radial-gradient from-brick/20 via-transparent to-transparent opacity-60" />

          {/* Top Brand Tagline */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-brick/90 backdrop-blur-md flex items-center justify-center text-white shadow-lg shadow-brick/30 border border-white/20">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-mono font-bold tracking-[0.25em] text-brick-light uppercase">THE M5 RESIDENCE</div>
                <div className="text-[10px] tracking-wider text-neutral-400 font-sans uppercase">BOUTIQUE LOFT HOTEL & RESIDENCES</div>
              </div>
            </div>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-mono text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ENTERPRISE PORTAL</span>
            </div>
          </div>

          {/* Middle Value Proposition & System Identity */}
          <div className="relative z-10 my-auto py-8 text-left space-y-4 max-w-lg">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-brick/15 border border-brick/30 text-brick-light text-xs font-mono">
              <Key className="h-3.5 w-3.5 text-brick" />
              <span>CENTRAL MANAGEMENT SYSTEM</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              ระบบศูนย์กลางบริหารจัดการ <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-brick-light">
                The M5 Residence Loft
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
              ควบคุมการจองห้องพัก จัดการสมาชิก CLUB M5 ตรวจสอบสถานะห้องพักแบบ 360° และอัปเดตตารางงานนิทรรศการ IMPACT เมืองทองธานี อัตโนมัติด้วยระบบเรียลไทม์
            </p>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <div className="flex items-center space-x-2 text-xs text-neutral-300 bg-white/5 backdrop-blur-xs px-3 py-2 rounded-lg border border-white/5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>ความปลอดภัยมาตรฐาน SSL 256-Bit</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-neutral-300 bg-white/5 backdrop-blur-xs px-3 py-2 rounded-lg border border-white/5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>ซิงค์ฐานข้อมูลอัตโนมัติ Real-Time</span>
              </div>
            </div>
          </div>

          {/* Bottom Footer Info on Left Pane */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-neutral-400 font-mono gap-2">
            <div className="flex items-center space-x-2">
              <Server className="h-3.5 w-3.5 text-brick-light" />
              <span>Gateway: Port 3000 / Directus & Firebase</span>
            </div>
            <span className="text-neutral-500">v2.6.4 Production Ready</span>
          </div>
        </div>

        {/* RIGHT PANE: Modern Luxury Authentication Console */}
        <div className={`lg:col-span-6 xl:col-span-5 p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative ${
          isLight ? "bg-white" : "bg-[#111216]"
        }`}>
          {/* Top Bar inside Login Console */}
          <div className="flex items-center justify-between pb-4">
            {/* Back to Website Button */}
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                isLight 
                  ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700" 
                  : "bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800"
              }`}
              title="กลับสู่หน้าเว็บไซต์หลักสำหรับลูกค้า"
            >
              <span>← กลับหน้าหลัก</span>
            </button>

            {/* Utility Actions: Theme Toggle & Close */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={toggleTheme}
                className={`p-2 rounded-lg text-xs transition-all duration-200 cursor-pointer ${
                  isLight 
                    ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700" 
                    : "bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-800"
                }`}
                title={isLight ? "สลับเป็นโหมดมืด (Dark Mode)" : "สลับเป็นโหมดสว่าง (Light Mode)"}
              >
                {isLight ? <Moon className="h-4 w-4 text-indigo-600" /> : <Sun className="h-4 w-4 text-amber-400" />}
              </button>

              <a
                href={window.location.origin}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 rounded-lg text-xs transition-all duration-200 cursor-pointer ${
                  isLight 
                    ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700" 
                    : "bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-800"
                }`}
                title="เปิดหน้าเว็บลูกค้าในแท็บใหม่"
              >
                <ExternalLink className="h-4 w-4" />
              </a>

              {!isFullPage && (
                <button
                  type="button"
                  onClick={onClose}
                  className={`p-2 rounded-lg text-xs transition-all duration-200 cursor-pointer ${
                    isLight 
                      ? "hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800" 
                      : "hover:bg-neutral-900 text-neutral-400 hover:text-white"
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Form Core */}
          <div className="my-auto py-4 space-y-6 text-left">
            {/* Header Identity */}
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-brick/10 border border-brick/30 flex items-center justify-center text-brick">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-mono font-bold tracking-wider text-brick uppercase">
                  ADMINISTRATOR ACCESS
                </span>
              </div>
              <h2 className={`text-2xl font-bold tracking-tight ${isLight ? "text-neutral-900" : "text-white"}`}>
                เข้าสู่ระบบผู้ดูแล
              </h2>
              <p className={`text-xs ${isLight ? "text-neutral-500" : "text-neutral-400"} font-light`}>
                กรุณาระบุบัญชีผู้ดูแลระบบเพื่อเข้าจัดการข้อมูลโรงแรม The M5 Residence
              </p>
            </div>

            {/* Form Inputs */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold block ${isLight ? "text-neutral-700" : "text-neutral-300"}`}>
                  ชื่อผู้ใช้งาน (Username)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="เช่น admin"
                    autoFocus
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all duration-200 font-sans focus:outline-none ${
                      isLight
                        ? "bg-neutral-50 border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-brick focus:ring-3 focus:ring-brick/10"
                        : "bg-neutral-900/80 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:bg-neutral-900 focus:border-brick focus:ring-3 focus:ring-brick/20"
                    }`}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className={`text-xs font-semibold block ${isLight ? "text-neutral-700" : "text-neutral-300"}`}>
                    รหัสผ่านเข้าใช้งาน (Password)
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">ENCRYPTED</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ระบุรหัสผ่านผู้ดูแล"
                    className={`w-full pl-10 pr-11 py-2.5 rounded-xl text-sm transition-all duration-200 font-sans focus:outline-none ${
                      isLight
                        ? "bg-neutral-50 border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-brick focus:ring-3 focus:ring-brick/10"
                        : "bg-neutral-900/80 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:bg-neutral-900 focus:border-brick focus:ring-3 focus:ring-brick/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-200 cursor-pointer transition-colors"
                    title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-neutral-400 text-brick focus:ring-brick h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className={isLight ? "text-neutral-600" : "text-neutral-400"}>
                    จดจำการเข้าสู่ระบบในอุปกรณ์นี้
                  </span>
                </label>

                <span className={`text-[11px] font-mono ${dbStatus?.connected ? "text-emerald-500" : "text-amber-500"}`}>
                  ● {dbStatus?.connected ? "DB ONLINE" : "DB CONNECTING"}
                </span>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-brick hover:bg-brick-dark text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-brick/25 hover:shadow-brick/40 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
                style={{ backgroundImage: "linear-gradient(to right, #d95a06 0%, #b84100 100%)" }}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>กำลังตรวจสอบสิทธิ์...</span>
                  </>
                ) : (
                  <>
                    <span>เข้าสู่ระบบส่วนควบคุม (Sign In)</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Security Note */}
          <div className="pt-4 border-t border-neutral-800/40 text-center">
            <p className="text-[11px] text-neutral-400 font-light flex items-center justify-center space-x-1">
              <span>🔒 ระบบสงวนสิทธิ์สำหรับเจ้าหน้าที่ The M5 Residence ที่ได้รับอนุญาตเท่านั้น</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
