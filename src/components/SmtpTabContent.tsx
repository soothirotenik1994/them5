import React, { useState } from "react";
import { WebSettings, SmtpSettings } from "../context/SettingsContext";
import { 
  Mail, Server, Key, Send, CheckCircle, AlertCircle, 
  HelpCircle, Eye, EyeOff, Loader2, Save
} from "lucide-react";

interface SmtpTabContentProps {
  settings: WebSettings;
  updateSettings: (newSettings: WebSettings) => Promise<boolean>;
  smtpEdit: SmtpSettings;
  setSmtpEdit: React.Dispatch<React.SetStateAction<SmtpSettings>>;
}

export default function SmtpTabContent({ settings, updateSettings, smtpEdit, setSmtpEdit }: SmtpTabContentProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  
  // Test SMTP state
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveStatus("idle");

    try {
      const updatedSettings: WebSettings = {
        ...settings,
        smtp: {
          ...smtpEdit,
          port: Number(smtpEdit.port)
        }
      };
      
      const success = await updateSettings(updatedSettings);
      if (success) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (err) {
      console.error("Error saving SMTP settings:", err);
      setSaveStatus("error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTestSend = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      setTestStatus("error");
      setTestMessage("กรุณาระบุอีเมลผู้รับทดสอบให้ถูกต้อง");
      return;
    }

    setTestLoading(true);
    setTestStatus("idle");
    setTestMessage("");

    try {
      const res = await fetch("/api/smtp/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          smtp: {
            ...smtpEdit,
            port: Number(smtpEdit.port)
          },
          testEmail
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus("success");
        setTestMessage(data.message || "ส่งอีเมลทดสอบเรียบร้อยแล้ว! กรุณาเช็คอินบ็อกซ์หรือกล่องสแปมของคุณ");
      } else {
        setTestStatus("error");
        setTestMessage(data.error || "ไม่สามารถเชื่อมต่อ SMTP หรือส่งข้อความได้");
      }
    } catch (err: any) {
      console.error("Error sending test email:", err);
      setTestStatus("error");
      setTestMessage(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเน็ตเวิร์ก");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-neutral-200">
      
      {/* Title */}
      <div className="border-b border-neutral-850 pb-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Mail className="h-5 w-5 text-amber-500" />
          <span>ตั้งค่าความปลอดภัยอีเมล SMTP (SMTP Server Configuration)</span>
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          กำหนดเซิร์ฟเวอร์ส่งข้อความ SMTP สำหรับส่งอีเมลแจ้งเตือนยอดจองห้องพักใหม่ไปยังลูกค้า และส่งเมลรายงานไปยังผู้บริหารของโรงแรมโดยตรง
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form (8 columns) */}
        <form onSubmit={handleSave} className="lg:col-span-8 space-y-5">
          
          <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
            
            <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-neutral-850 pb-2.5">
              <Server className="h-4 w-4 text-neutral-400" />
              <span>การเชื่อมต่อเซิร์ฟเวอร์ SMTP (Server Credentials)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-neutral-450 font-mono flex items-center justify-between">
                  <span>เซิร์ฟเวอร์ผู้ให้บริการ (SMTP Host)</span>
                  <span className="text-[10px] text-neutral-500">เช่น smtp.gmail.com</span>
                </label>
                <input 
                  type="text"
                  required
                  value={smtpEdit.host}
                  onChange={(e) => setSmtpEdit({ ...smtpEdit, host: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50 font-mono"
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-450 font-mono">พอร์ตเชื่อมต่อ (Port)</label>
                <input 
                  type="number"
                  required
                  value={smtpEdit.port}
                  onChange={(e) => setSmtpEdit({ ...smtpEdit, port: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50 font-mono"
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-neutral-450 font-mono">ชื่อบัญชีผู้ใช้ (SMTP Username)</label>
                <input 
                  type="text"
                  value={smtpEdit.user}
                  onChange={(e) => setSmtpEdit({ ...smtpEdit, user: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50 font-mono"
                  placeholder="your-email@gmail.com"
                />
              </div>

              <div className="space-y-1 relative">
                <label className="text-xs text-neutral-450 font-mono flex justify-between items-center">
                  <span>รหัสผ่าน / แอฟพาสเวิร์ด (SMTP Password)</span>
                  <span className="text-[9px] text-amber-500 font-sans italic">แนะนำ Gmail App Password</span>
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={smtpEdit.pass}
                    onChange={(e) => setSmtpEdit({ ...smtpEdit, pass: e.target.value })}
                    className="w-full pl-3 pr-10 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50 font-mono"
                    placeholder="••••••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input 
                type="checkbox"
                id="secure-toggle"
                checked={smtpEdit.secure}
                onChange={(e) => setSmtpEdit({ ...smtpEdit, secure: e.target.checked })}
                className="rounded border-neutral-800 bg-neutral-900 text-amber-500 focus:ring-0 cursor-pointer h-4 w-4"
              />
              <label htmlFor="secure-toggle" className="text-xs text-neutral-350 cursor-pointer font-sans select-none">
                เปิดใช้งานการเชื่อมต่อแบบปลอดภัย SSL/TLS (Secure Connection) 
                <span className="text-[10px] text-neutral-500 block">เลือกเป็น "เปิด" หากใช้ Port 465 และ "ปิด (TSL/STARTTLS)" หากใช้ Port 587</span>
              </label>
            </div>

          </div>

          <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
            
            <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-neutral-850 pb-2.5">
              <Mail className="h-4 w-4 text-neutral-400" />
              <span>ข้อมูลหัวจดหมายอีเมล (Sender Info & Target Emails)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-neutral-450">ชื่อผู้ส่งหัวข้ออีเมล (Sender Name)</label>
                <input 
                  type="text"
                  required
                  value={smtpEdit.fromName}
                  onChange={(e) => setSmtpEdit({ ...smtpEdit, fromName: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none"
                  placeholder="The M5 Residence"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-450">อีเมลทางการผู้ส่ง (Sender Email Address)</label>
                <input 
                  type="email"
                  value={smtpEdit.fromEmail}
                  onChange={(e) => setSmtpEdit({ ...smtpEdit, fromEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none"
                  placeholder="your-email@gmail.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-450 flex justify-between">
                <span>อีเมลหลักของแอดมินโรงแรม (Admin Notification Email)</span>
                <span className="text-[10px] text-neutral-500 italic">ส่งแจ้งเตือนจองใหม่เข้าที่เมลนี้</span>
              </label>
              <input 
                type="email"
                required
                value={smtpEdit.adminNotifyEmail}
                onChange={(e) => setSmtpEdit({ ...smtpEdit, adminNotifyEmail: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none font-mono"
                placeholder="admin@m5residence.com"
              />
            </div>

          </div>

          {/* Save Status and buttons */}
          <div className="flex items-center justify-between">
            <div>
              {saveStatus === "success" && (
                <div className="text-emerald-400 text-xs font-bold flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  <span>บันทึกข้อมูลการตั้งค่าสำเร็จเรียบร้อยแล้ว!</span>
                </div>
              )}
              {saveStatus === "error" && (
                <div className="text-red-400 text-xs font-bold flex items-center space-x-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span>เกิดข้อผิดพลาดในการบันทึกข้อมูล โปรดตรวจสอบฟอร์ม</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saveLoading}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-lg transition-all shadow-lg flex items-center space-x-2 cursor-pointer select-none disabled:opacity-50"
            >
              {saveLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>บันทึกการตั้งค่า SMTP 💾</span>
                </>
              )}
            </button>
          </div>

        </form>

        {/* Right Sandbox Test (4 columns) */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
            
            <div className="flex items-center space-x-2 border-b border-neutral-850 pb-2.5">
              <Send className="h-4 w-4 text-amber-500" />
              <h3 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                ทดสอบส่งอีเมลทันที (SMTP Mail sandbox)
              </h3>
            </div>

            <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
              จำลองกล่องส่งเมลความปลอดภัย คุณสามารถระบุเมลส่วนตัวของคุณหรือเมลโรงแรมข้างล่าง แล้วกดส่งเมลทดสอบเพื่อเช็คดูว่าระบบทำงานได้หรือไม่
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] text-neutral-450">อีเมลปลายทางที่จะรับ (Test Receiver Email)</label>
              <input 
                type="email"
                required
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50 font-mono"
                placeholder="test@example.com"
              />
            </div>

            <button
              type="button"
              onClick={handleTestSend}
              disabled={testLoading || !testEmail}
              className="w-full py-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-750 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {testLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                  <span>กำลังดำเนินการส่งเมลทดสอบ...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 text-amber-500" />
                  <span>ส่งอีเมลทดสอบความพร้อม 🚀</span>
                </>
              )}
            </button>

            {testStatus !== "idle" && (
              <div className={`p-3 rounded-lg border text-[10px] leading-relaxed font-sans ${
                testStatus === "success" 
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" 
                  : "bg-red-950/20 border-red-500/30 text-red-450"
              }`}>
                <div className="flex items-start space-x-1.5">
                  {testStatus === "success" ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <span>{testMessage}</span>
                </div>
              </div>
            )}

          </div>

          {/* Quick Help Guidelines */}
          <div className="bg-neutral-950/40 border border-neutral-900 p-4 rounded-xl text-[10px] leading-relaxed text-neutral-450 space-y-2">
            <h4 className="font-bold text-neutral-350 flex items-center space-x-1">
              <HelpCircle className="h-3.5 w-3.5 text-neutral-500" />
              <span>แนะนำเพิ่มเติมสำหรับความปลอดภัย</span>
            </h4>
            <ul className="list-disc pl-4 space-y-1 font-sans">
              <li>กรณีใช้ <strong className="text-white">Gmail</strong>: แนะนำให้เปิด Two-Factor Authentication และตั้งค่าสร้าง <strong className="text-amber-500">App Password (รหัสผ่านแอป)</strong> 16 หลัก เพื่อป้อนในช่องรหัสผ่าน</li>
              <li>การเลือกใช้ <strong className="text-white font-mono">Port 587</strong> มีประสิทธิภาพและปลอดภัยสูงสำหรับ TLS แนะนำปิด SSL secure checkbox</li>
              <li>หากจองสำเร็จ ระบบจะเริ่มส่งจดหมายแจ้งไปลูกค้าและแอดมินอัตโนมัติแบบ Async ทันที</li>
            </ul>
          </div>
          
        </div>

      </div>

    </div>
  );
}
