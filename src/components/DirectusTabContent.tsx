import React, { useState, useEffect } from "react";
import { Database, Check, AlertCircle, RefreshCw, Save, ShieldAlert, Terminal, Play } from "lucide-react";
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

  // Load settings on mount or when dbStatus changes
  useEffect(() => {
    if (dbStatus) {
      setUrl(dbStatus.url || "https://data.them5residence.com");
      setInternalUrl(dbStatus.internalUrl || dbStatus.url || "https://data.them5residence.com");
      setToken(dbStatus.token || "ibtpkr40rF1BkNCEA4plXirxaDfn07S5");
    }
  }, [dbStatus]);

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

  return (
    <div id="directus-settings-tab" className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div className="flex items-center space-x-3">
          <Database className="h-6 w-6 text-brick" />
          <div>
            <h2 className="text-lg font-bold text-neutral-100">ระบบตั้งค่าฐานข้อมูล Directus</h2>
            <p className="text-xs text-neutral-400 mt-0.5">กำหนดค่าความพึงพอใจการเชื่อมต่อ และทดสอบความปลอดภัยในการเข้าถึงข้อมูล</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2.5 h-2.5 rounded-full ${dbStatus?.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></div>
          <span className="text-xs font-mono font-medium text-neutral-300">
            {dbStatus?.connected ? "เชื่อมต่อคลาวด์แล้ว" : "ระบบทำตาม db.json ท้องถิ่น"}
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
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded text-xs font-mono transition-all flex items-center space-x-1.5"
          >
            <Play className={`h-3 w-3 ${isBootstrapping ? "animate-spin" : ""}`} />
            <span>{isBootstrapping ? "กำลังรันสคริปต์สิทธิ์..." : "รันระบบตั้งค่าสิทธิ์ Admin Static Token อัตโนมัติ (Bootstrap Directus Token)"}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
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
  );
}
