import React, { useState, useEffect } from "react";
import { 
  Database, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Save, 
  ShieldAlert, 
  Terminal, 
  Play,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  DatabaseBackup,
  Info,
  Server,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";

export default function DirectusTabContent() {
  const { dbStatus, refreshSettings } = useSettings();
  const [url, setUrl] = useState("");
  const [internalUrl, setInternalUrl] = useState("");
  const [token, setToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    connected: boolean;
    database: string;
    reason?: string;
    url?: string;
    internalUrl?: string;
    token?: string;
  } | null>(null);

  // Diagnostics Schema state
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<{
    success: boolean;
    connected: boolean;
    collections: Array<{
      name: string;
      exists: boolean;
      directusCount: number;
      localCount: number;
      fieldsChecked: Record<string, boolean>;
      status: "OK" | "MISSING_COLLECTION" | "MISSING_FIELDS" | "PENDING";
      error?: string;
    }>;
    errors?: string[];
  } | null>(null);

  const [expandedCol, setExpandedCol] = useState<string | null>(null);
  const [repairStatus, setRepairStatus] = useState<{
    running: boolean;
    message: string;
    success?: boolean;
  } | null>(null);

  // Load settings on mount or when dbStatus changes
  useEffect(() => {
    if (dbStatus) {
      setUrl(dbStatus.url || "https://data.them5residence.com");
      setInternalUrl(dbStatus.internalUrl || dbStatus.url || "https://data.them5residence.com");
      setToken(dbStatus.token || "ibtpkr40rF1BkNCEA4plXirxaDfn07S5");
    }
  }, [dbStatus]);

  // Run diagnostics automatically when DB is connected
  useEffect(() => {
    if (dbStatus?.connected) {
      handleRunDiagnostics();
    }
  }, [dbStatus?.connected]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch("/api/directus-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, internalUrl, token }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      const data = await response.json();
      alert(data.message || "บันทึกการตั้งค่าเชื่อมต่อสำเร็จ!");
      await refreshSettings();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // First save current inputs temporarily to test
      const saveResponse = await fetch("/api/directus-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, internalUrl, token }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to configure temporary connection settings for test");
      }

      // Then check connection
      const response = await fetch("/api/db-status");
      if (response.ok) {
        const data = await response.json();
        setTestResult(data);
        await refreshSettings();
      } else {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        connected: false,
        database: "Error",
        reason: err.message || "Failed to communicate with test route",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setIsDiagnosing(true);
    setDiagnosticReport(null);
    try {
      const response = await fetch("/api/debug-directus");
      if (response.ok) {
        const data = await response.json();
        setDiagnosticReport(data);
      } else {
        throw new Error(`เซิร์ฟเวอร์ตอบกลับรหัสสถานะ: ${response.status}`);
      }
    } catch (err: any) {
      setDiagnosticReport({
        success: false,
        connected: false,
        collections: [],
        errors: [err.message || "ไม่สามารถเรียกใช้ Diagnostic API ได้"]
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleRepairSchema = async (force: boolean) => {
    const confirmMsg = force 
      ? "⚠️ คำเตือนระบบล้างข้อมูลใหม่หมด (Destructive Reset):\nคุณต้องการล้างโครงสร้างตารางเดิมทิ้งทั้งหมดและนำเข้าสัญญะตั้งต้นใหม่ใช่หรือไม่? ข้อมูลการจอง, รีวิว, สมาชิก และแอดมินทั้งหมดใน Directus จะสูญหาย!"
      : "⚙️ การซ่อมแซมโครงสร้างแบบปลอดภัย (Safe Auto-Repair):\nระบบจะตรวจสอบตารางและเพิ่มฟิลด์คอลัมน์ส่วนที่ขาดหายไปใน Directus ให้ตรงตามอัปเดตล่าสุด โดยจะไม่ทำลาย/ลบข้อมูลที่มีอยู่เดิมใน Directus 100% คุณต้องการเริ่มดำเนินการหรือไม่?";
    
    if (!confirm(confirmMsg)) return;

    setRepairStatus({ running: true, message: "กำลังเริ่มต้นรันกระบวนการซิงค์สัญญะฐานข้อมูล..." });
    try {
      const response = await fetch("/api/reseed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force })
      });

      if (response.ok) {
        const data = await response.json();
        setRepairStatus({
          running: false,
          success: true,
          message: force 
            ? "ล้างข้อมูลตารางและเขียนโครงสร้างตั้งต้นใหม่หมด (Destructive Re-seed) เสร็จสิ้น!" 
            : "ซ่อมแซมและเพิ่มเติมตาราง/ฟิลด์โครงสร้าง (Safe Schema Repair) เรียบร้อยแล้ว!"
        });
        await refreshSettings();
        await handleRunDiagnostics();
      } else {
        const txt = await response.text();
        throw new Error(txt);
      }
    } catch (err: any) {
      setRepairStatus({
        running: false,
        success: false,
        message: "เกิดข้อผิดพลาดในการทำงาน: " + err.message
      });
    }
  };

  // Helper to trigger the directus setup script bootstrap sequence
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const handleBootstrapToken = async () => {
    if (!confirm("คุณต้องการเริ่มกระบวนการตั้งค่าสิทธิ์ Directus Token หรือไม่? ระบบจะลองเข้าสู่ระบบ Directus ของคุณด้วยบัญชีผู้ดูแลระบบเพื่อแก้ไข token ให้โดยอัตโนมัติ")) {
      return;
    }
    setIsBootstrapping(true);
    try {
      const response = await fetch("/api/reseed", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (response.ok) {
        alert("รันสคริปต์แก้ไข/เตรียมฐานข้อมูลเสร็จสิ้น กรุณาเช็คผลลัพธ์การเชื่อมต่อ");
        await refreshSettings();
        handleTestConnection();
      } else {
        const txt = await response.text();
        alert("ไม่สามารถรันระบบได้: " + txt);
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsBootstrapping(false);
    }
  };

  const toggleExpand = (colName: string) => {
    if (expandedCol === colName) {
      setExpandedCol(null);
    } else {
      setExpandedCol(colName);
    }
  };

  return (
    <div id="directus-settings-tab" className="space-y-6 max-w-5xl mx-auto">
      
      {/* 1. Header & Quick Status */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-brick" />
            <div>
              <h2 className="text-lg font-bold text-neutral-100">ระบบตั้งค่าฐานข้อมูล Directus</h2>
              <p className="text-xs text-neutral-400 mt-0.5 font-mono">ENDPOINT CONFIGURATION & SCHEMA INTEGRITY CONTROL PANEL</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2.5 h-2.5 rounded-full ${dbStatus?.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">
              {dbStatus?.connected ? "Directus Connected" : "Local db.json (Offline Mode)"}
            </span>
          </div>
        </div>

        {/* Current Connection Status Panel */}
        <div className={`p-4 rounded-lg border ${dbStatus?.connected ? "bg-emerald-950/15 border-emerald-500/20 text-emerald-400" : "bg-amber-950/20 border-amber-500/20 text-amber-500"}`}>
          <div className="flex items-start space-x-3">
            {dbStatus?.connected ? (
              <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-semibold font-mono">
                สถานะปัจจุบัน: {dbStatus?.connected ? "เชื่อมต่อคลาวด์สำเร็จ (Online)" : "ตัดการทำงานเชื่อมต่อ/กำลังทำงานแบบออฟไลน์ (Offline Fallback)"}
              </h4>
              <p className="text-xs text-neutral-300 font-mono">
                ฐานข้อมูลทำงาน: <span className="font-semibold text-white">{dbStatus?.database}</span>
              </p>
              {dbStatus?.url && (
                <p className="text-xs text-neutral-400 font-mono">
                  ลิงก์ Directus: <span className="text-neutral-200">{dbStatus.url}</span>
                </p>
              )}
              {dbStatus?.reason && (
                <div className="mt-2 bg-black/40 border border-neutral-800 rounded p-3 font-mono text-xs text-red-400 space-y-1">
                  <p className="font-bold text-neutral-300 flex items-center space-x-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-brick shrink-0" />
                    <span>สาเหตุข้อผิดพลาด (Directus Error Log):</span>
                  </p>
                  <div className="bg-neutral-950 p-2 rounded text-[11px] select-text overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-40">
                    {dbStatus.reason}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Troubleshooting tips */}
        <div className="bg-neutral-950 border border-neutral-850 rounded-lg p-4 space-y-2">
          <h3 className="text-xs font-semibold text-neutral-300 font-mono flex items-center space-x-2">
            <Terminal className="h-3.5 w-3.5 text-brick" />
            <span>คำแนะนำในการเชื่อมต่อ (Directus Troubleshooting Steps):</span>
          </h3>
          <ul className="text-xs text-neutral-400 list-disc list-inside space-y-1 pl-1">
            <li>ตรวจสอบสิทธิ์เข้าถึงคอลเลกชันใน Directus (ต้องตั้งค่าสิทธิ์ให้ Admin มีโทเค็นตรงกับด้านล่าง)</li>
            <li>กรอก <span className="text-neutral-200">Static Token</span> ให้ถูกต้อง (ไม่ใช่ชั่วคราว) โดยต้องนำไปตั้งค่าไว้ที่บัญชีแอดมินหรือผู้ใช้ Directus</li>
            <li>หาก Directus แจ้งสิทธิ์ <span className="text-brick font-semibold">401 Unauthorized</span> หมายความว่า API Key/Token ไม่ตรง หรือยังไม่ได้เซ็ตลงใน Directus Admin Profile</li>
          </ul>
          <div className="pt-2">
            <button
              onClick={handleBootstrapToken}
              disabled={isBootstrapping}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Play className={`h-3 w-3 ${isBootstrapping ? "animate-spin" : ""}`} />
              <span>{isBootstrapping ? "กำลังรันสคริปต์สิทธิ์..." : "รันระบบตั้งค่าสิทธิ์ Admin Static Token อัตโนมัติ (Bootstrap Directus Token)"}</span>
            </button>
          </div>
        </div>

        {/* Form Settings */}
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 font-mono">
                DIRECTUS URL (Public API URL)
              </label>
              <input
                type="url"
                required
                placeholder="https://data.them5residence.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-brick"
              />
              <span className="text-[10px] text-neutral-500 block">
                ที่อยู่ลิงก์ Directus ที่ใช้งานสำหรับการโหลดรูปภาพ/Asset บนหน้าเว็บ (ฝั่งเบราว์เซอร์)
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 font-mono">
                DIRECTUS INTERNAL URL (สำหรับการสื่อสารฝั่ง Backend)
              </label>
              <input
                type="url"
                required
                placeholder="https://data.them5residence.com"
                value={internalUrl}
                onChange={(e) => setInternalUrl(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-brick"
              />
              <span className="text-[10px] text-neutral-500 block">
                หากรันอยู่ในเซิร์ฟเวอร์ร่วม สามารถใช้ Docker Local Link ได้ (ส่วนใหญ่ใส่เหมือนด้านซ้าย)
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 font-mono">
              DIRECTUS STATIC TOKEN (คีย์เข้าถึงสิทธิ์แอดมิน)
            </label>
            <input
              type="text"
              required
              placeholder="ibtpkr40rF1BkNCEA4plXirxaDfn07S5"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-brick"
            />
            <span className="text-[10px] text-neutral-500 block">
              โทเค็นส่วนตัวสำหรับการเรียกใช้ Directus API (Static Access Token) เพื่อดึงข้อมูลห้องพัก การจอง และอื่นๆ
            </span>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-brick hover:bg-brick-dark text-white rounded text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "กำลังบันทึก..." : "บันทึกและอัปเดตระบบ"}</span>
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 text-neutral-200 rounded text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isTesting ? "animate-spin" : ""}`} />
              <span>{isTesting ? "กำลังทดสอบ..." : "ทดสอบการเชื่อมต่อ (Test Connection)"}</span>
            </button>
          </div>
        </form>

        {/* Connection Test Result */}
        {testResult && (
          <div className={`p-4 rounded-lg border ${testResult.connected ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" : "bg-brick/10 border-brick/30 text-brick-light"}`}>
            <div className="flex items-start space-x-3">
              {testResult.connected ? (
                <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-brick shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-mono text-xs space-y-1.5">
                <h4 className="font-bold">
                  ผลการทดสอบการเชื่อมต่อ: {testResult.connected ? "สำเร็จ (CONNECTED!)" : "ไม่สำเร็จ (CONNECTION FAILED)"}
                </h4>
                <p className="text-neutral-300">
                  ฐานข้อมูลที่เชื่อมต่อ: {testResult.database}
                </p>
                {testResult.reason && (
                  <div className="bg-black/50 p-2.5 rounded border border-neutral-850 mt-1">
                    <p className="text-neutral-400 text-[10px] mb-1 font-bold">RAW DIRECTUS RESPONSE:</p>
                    <p className="text-brick-light select-all text-[11px] whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                      {testResult.reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Schema Diagnostic & Integrity Checker Tab */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-800 pb-4 gap-4">
          <div className="flex items-center space-x-3">
            <Wrench className="h-6 w-6 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-neutral-100">แผงตรวจสอบความถูกต้องของสัญญะตารางและฟิลด์</h2>
              <p className="text-xs text-neutral-400 mt-0.5 font-mono">DIRECTUS SCHEMA INTEGRITY & DATA DIAGNOSTIC CENTER</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isDiagnosing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-semibold rounded text-xs transition-all flex items-center space-x-2 cursor-pointer self-start md:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isDiagnosing ? "animate-spin" : ""}`} />
            <span>{isDiagnosing ? "กำลังวิเคราะห์..." : "วิเคราะห์สัญญะฐานข้อมูล (Analyze Directus)"}</span>
          </button>
        </div>

        {/* Description of what this does */}
        <p className="text-xs text-neutral-300 leading-relaxed font-sans">
          เครื่องมือนี้ช่วยเช็คว่า <strong>ตาราง (Collections) ทั้งหมด 14 เมนูหลักย่อย</strong> รวมถึงฟิลด์รับข้อมูลแต่ละช่อง มีอยู่จริงบน Directus หรือไม่ 
          และแสดงจำนวนรายการเปรียบเทียบระหว่างฐานข้อมูลในเครื่อง (Local) กับคลาวด์ (Directus) 
          เพื่อให้แน่ใจว่า<strong>ทุกช่องที่กรอกจะถูกบันทึกและซิงก์สู่ระบบคลาวด์ได้อย่างถูกต้อง 100%</strong>
        </p>

        {/* Repair Status Alert banner */}
        {repairStatus && (
          <div className={`p-4 rounded-lg border ${repairStatus.success === true ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" : repairStatus.success === false ? "bg-brick/10 border-brick/30 text-brick-light" : "bg-neutral-850 border-neutral-750 text-neutral-200"}`}>
            <div className="flex items-center space-x-3">
              {repairStatus.success === true ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : repairStatus.success === false ? (
                <AlertTriangle className="h-5 w-5 text-brick shrink-0" />
              ) : (
                <RefreshCw className="h-5 w-5 text-neutral-400 shrink-0 animate-spin" />
              )}
              <span className="font-mono text-xs font-semibold">{repairStatus.message}</span>
            </div>
          </div>
        )}

        {/* Action Buttons for Repair */}
        {dbStatus?.connected && (
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-bold text-neutral-200 font-mono uppercase tracking-wider flex items-center space-x-2">
              <DatabaseBackup className="h-4 w-4 text-emerald-400" />
              <span>เครื่องมือบำรุงรักษาและซ่อมแซมโครงสร้าง (Database Repair Actions)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded space-y-2">
                <span className="text-[10px] font-bold font-mono text-emerald-400 block uppercase">1. SAFE AUTO-REPAIR (แนะนำ)</span>
                <p className="text-[11px] text-neutral-400 leading-normal">
                  สร้างตารางและฟิลด์อินพุตเฉพาะส่วนที่ยังขาดหายไปใน Directus เพื่ออัปเดตระบบให้สมบูรณ์ โดย<strong>รักษาข้อมูลที่มีอยู่เดิมไว้ทั้งหมด ไม่เกิดการสูญเสียข้อมูล</strong>
                </p>
                <button
                  type="button"
                  onClick={() => handleRepairSchema(false)}
                  disabled={repairStatus?.running}
                  className="w-full mt-1.5 py-1.5 bg-emerald-700/85 hover:bg-emerald-600 border border-emerald-600 text-white font-semibold rounded text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>เริ่มซ่อมแซมตารางและฟิลด์ (Safe Repair)</span>
                </button>
              </div>

              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded space-y-2">
                <span className="text-[10px] font-bold font-mono text-brick block uppercase">2. DESTRUCTIVE RESET & SEED</span>
                <p className="text-[11px] text-brick-light/80 leading-normal">
                  ล้างตารางทั้งหมดและเขียนโครงสร้างพร้อมสร้างข้อมูลจำลองตั้งต้นใหม่หมด (เสมือนการติดตั้งระบบใหม่ครั้งแรก) <strong>*ข้อมูลเดิมในคลาวด์จะถูกลบทั้งหมด*</strong>
                </p>
                <button
                  type="button"
                  onClick={() => handleRepairSchema(true)}
                  disabled={repairStatus?.running}
                  className="w-full mt-1.5 py-1.5 bg-brick/10 hover:bg-brick/20 border border-brick/40 text-brick-light font-semibold rounded text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>ล้างตารางและนำเข้าข้อมูลตั้งต้น (Destructive Reset)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Diagnostics Report View */}
        {isDiagnosing && (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
            <p className="text-xs text-neutral-400 font-mono animate-pulse">กำลังสื่อสารและตรวจสอบฟิลด์ตารางทั้งหมดจาก Directus Cloud...</p>
          </div>
        )}

        {diagnosticReport && (
          <div className="space-y-4">
            {/* Summary Block */}
            <div className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
              <span className="text-xs font-semibold text-neutral-300">ผลการประเมินตารางทั้งหมด (14 ตารางหลัก):</span>
              <span className="flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${diagnosticReport.success ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                <span className={`text-xs font-mono font-bold uppercase ${diagnosticReport.success ? "text-emerald-400" : "text-amber-400"}`}>
                  {diagnosticReport.success ? "สมบูรณ์ดี (ALL SCHEMAS MATCH)" : "พบส่วนที่ต้องปรับปรุง (ISSUES DETECTED)"}
                </span>
              </span>
            </div>

            {diagnosticReport.errors && diagnosticReport.errors.length > 0 && (
              <div className="p-3 bg-brick/10 border border-brick/30 rounded text-brick-light text-xs font-mono">
                <strong>ข้อผิดพลาดจากการเชื่อมต่อ:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {diagnosticReport.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                </ul>
              </div>
            )}

            {/* Collections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {diagnosticReport.collections.map((col) => {
                const isExpanded = expandedCol === col.name;
                const totalFields = Object.keys(col.fieldsChecked || {}).length;
                const okFields = Object.values(col.fieldsChecked || {}).filter(Boolean).length;
                const hasMissingFields = col.status === "MISSING_FIELDS";

                return (
                  <div 
                    key={col.name} 
                    className="bg-neutral-950 border border-neutral-850 rounded-lg overflow-hidden flex flex-col justify-between"
                  >
                    {/* Item header */}
                    <div className="p-3 flex items-center justify-between border-b border-neutral-900/60 bg-neutral-900/40">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-neutral-500 shrink-0" />
                        <div>
                          <span className="text-xs font-mono font-bold text-neutral-200 block">{col.name}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            Directus: {col.exists ? `${col.directusCount} รายการ` : "ไม่พบตาราง"} | ในเครื่อง: {col.localCount} รายการ
                          </span>
                        </div>
                      </div>

                      {/* Status pill */}
                      <div className="flex items-center space-x-2">
                        {col.status === "OK" && (
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-mono font-bold uppercase">
                            OK
                          </span>
                        )}
                        {col.status === "MISSING_COLLECTION" && (
                          <span className="px-2 py-0.5 bg-red-950/70 text-red-400 border border-red-500/20 rounded text-[9px] font-mono font-bold uppercase">
                            MISSING TABLE
                          </span>
                        )}
                        {col.status === "MISSING_FIELDS" && (
                          <span className="px-2 py-0.5 bg-amber-950 text-amber-500 border border-amber-500/20 rounded text-[9px] font-mono font-bold uppercase">
                            MISSING FIELDS
                          </span>
                        )}
                        
                        <button
                          onClick={() => toggleExpand(col.name)}
                          className="p-1 hover:bg-neutral-800 rounded transition-colors text-neutral-400 hover:text-neutral-200"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable fields section */}
                    {isExpanded && (
                      <div className="p-3 bg-neutral-950/80 border-b border-neutral-900 text-[11px] font-mono space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-neutral-400 border-b border-neutral-900 pb-1">
                          <span>รายชื่อช่องกรอกข้อมูล (Field Name)</span>
                          <span>การตรวจสอบในฐานข้อมูล (Directus Field OK)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 max-h-48 overflow-y-auto pr-1">
                          {Object.entries(col.fieldsChecked || {}).map(([fName, ok]) => (
                            <div key={fName} className="flex items-center justify-between py-0.5 border-b border-neutral-900/40">
                              <span className="text-neutral-300 truncate pr-1" title={fName}>{fName}</span>
                              <span className="flex items-center shrink-0">
                                {ok ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                        {col.error && (
                          <div className="p-2 bg-neutral-900 border border-neutral-850 text-red-400 text-[10px] select-all max-h-16 overflow-y-auto">
                            Directus Error: {col.error}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Table Summary Footer */}
                    <div className="p-2 px-3 bg-neutral-950 border-t border-neutral-900/60 flex items-center justify-between text-[10px] text-neutral-500">
                      <span>ตรวจสอบคอลัมน์แล้ว:</span>
                      <span className="font-mono text-neutral-300">
                        {okFields} / {totalFields} ฟิลด์สมบูรณ์
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
