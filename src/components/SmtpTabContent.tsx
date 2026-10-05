import React, { useState, useEffect } from "react";
import { WebSettings, SmtpSettings, defaultLine, defaultSmtp, useSettings } from "../context/SettingsContext";
import { LineSettings, NotificationLog } from "../types";
import { 
  Mail, Server, Key, Send, CheckCircle, AlertCircle, 
  HelpCircle, Eye, EyeOff, Loader2, Save, MessageSquare,
  Bell, Smartphone, ShieldCheck, RefreshCw, Clock, ExternalLink,
  Check, Copy, Terminal, Radio, Plus, Trash2, X, Sparkles
} from "lucide-react";

interface SmtpTabContentProps {
  settings: WebSettings;
  updateSettings: (newSettings: WebSettings) => Promise<boolean>;
  smtpEdit: SmtpSettings;
  setSmtpEdit: React.Dispatch<React.SetStateAction<SmtpSettings>>;
}

export default function SmtpTabContent({ settings, updateSettings, smtpEdit, setSmtpEdit }: SmtpTabContentProps) {
  const { notifications, refreshNotifications, testLineNotification, testEmailNotification, testBookingEmailNotification, showToast } = useSettings();
  
  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<"line" | "email" | "history">("line");

  // Multi-recipient state for incoming booking notifications
  const [newRecipientInput, setNewRecipientInput] = useState("");
  const [testBookingLoading, setTestBookingLoading] = useState(false);
  const [testBookingStatus, setTestBookingStatus] = useState<"idle" | "success" | "error">("idle");
  const [testBookingMessage, setTestBookingMessage] = useState("");
  const [showRawEmailInput, setShowRawEmailInput] = useState(false);

  // LINE settings state
  const [lineEdit, setLineEdit] = useState<LineSettings>(() => {
    return settings.line || defaultLine;
  });

  // Keep lineEdit updated if settings change
  useEffect(() => {
    if (settings.line) {
      setLineEdit(settings.line);
    }
  }, [settings.line]);

  // Passwords toggle
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showSmtpApiKey, setShowSmtpApiKey] = useState(false);
  const [showLineToken, setShowLineToken] = useState(false);

  // Save states
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  
  // Test states
  const [testEmail, setTestEmail] = useState(smtpEdit.adminNotifyEmail || "soothirote.nik@gmail.com");
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<"idle" | "success" | "error">("idle");
  const [testEmailMessage, setTestEmailMessage] = useState("");

  const [testLineMessageText, setTestLineMessageText] = useState("");
  const [testLineLoading, setTestLineLoading] = useState(false);
  const [testLineStatus, setTestLineStatus] = useState<"idle" | "success" | "error">("idle");
  const [testLineMessage, setTestLineMessage] = useState("");

  const [copiedTokenHelper, setCopiedTokenHelper] = useState(false);

  // Global save handler
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaveLoading(true);
    setSaveStatus("idle");

    try {
      const updatedSettings: WebSettings = {
        ...settings,
        smtp: {
          ...smtpEdit,
          port: Number(smtpEdit.port) || 587
        },
        line: {
          ...lineEdit
        }
      };
      
      const success = await updateSettings(updatedSettings);
      if (success) {
        setSaveStatus("success");
        if (showToast) showToast("บันทึกการตั้งค่าการแจ้งเตือน LINE และอีเมลเรียบร้อยแล้ว", "success");
        setTimeout(() => setSaveStatus("idle"), 3500);
      } else {
        setSaveStatus("error");
        if (showToast) showToast("เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
      }
    } catch (err) {
      console.error("Error saving notification settings:", err);
      setSaveStatus("error");
    } finally {
      setSaveLoading(false);
    }
  };

  // Test LINE notification
  const handleTestLine = async () => {
    setTestLineLoading(true);
    setTestLineStatus("idle");
    setTestLineMessage("");

    try {
      const res = await testLineNotification(
        lineEdit,
        testLineMessageText || "🔔 ทดสอบระบบแจ้งเตือน LINE สำหรับการจองโรงแรม The M5 Residence"
      );

      if (res.success) {
        setTestLineStatus("success");
        setTestLineMessage(res.message);
        if (showToast) showToast("ส่งข้อความทดสอบเข้า LINE เรียบร้อยแล้ว!", "success");
      } else {
        setTestLineStatus("error");
        setTestLineMessage(res.message);
        if (showToast) showToast(res.message || "ไม่สามารถส่งข้อความเข้า LINE ได้", "error");
      }
    } catch (err: any) {
      setTestLineStatus("error");
      setTestLineMessage(err.message || "เกิดข้อผิดพลาดในการส่งข้อความ LINE");
    } finally {
      setTestLineLoading(false);
    }
  };

  // Test Email notification
  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      setTestEmailStatus("error");
      setTestEmailMessage("กรุณาระบุอีเมลผู้รับทดสอบให้ถูกต้อง");
      return;
    }

    setTestEmailLoading(true);
    setTestEmailStatus("idle");
    setTestEmailMessage("");

    try {
      const res = await testEmailNotification(
        {
          ...smtpEdit,
          port: Number(smtpEdit.port) || 587
        },
        testEmail
      );

      if (res.success) {
        setTestEmailStatus("success");
        setTestEmailMessage(res.message);
        if (showToast) showToast("ส่งอีเมลทดสอบเรียบร้อยแล้ว!", "success");
      } else {
        setTestEmailStatus("error");
        setTestEmailMessage(res.message);
        if (showToast) showToast(res.message || "ไม่สามารถเชื่อมต่อ SMTP ได้", "error");
      }
    } catch (err: any) {
      setTestEmailStatus("error");
      setTestEmailMessage(err.message || "เกิดข้อผิดพลาดในการส่งอีเมล");
    } finally {
      setTestEmailLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-neutral-200">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-500/10 via-amber-500/5 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-1.5">
              <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                <Bell className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                ระบบแจ้งเตือนการจอง (LINE & Email Notifications)
              </h2>
            </div>
            <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
              เมื่อมีลูกค้าทำการจองห้องพักเข้ามาผ่านหน้าเว็บ ระบบจะส่งการแจ้งเตือนทันทีผ่าน 
              <strong className="text-emerald-400 ml-1">LINE (Notify / Official Bot)</strong> และ 
              <strong className="text-amber-400 ml-1">อีเมล (SMTP)</strong> ไปยังผู้ดูแลและส่งอีเมลยืนยันให้แก่ลูกค้าโดยอัตโนมัติ
            </p>
          </div>

          <button
            onClick={() => handleSave()}
            disabled={saveLoading}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium rounded-lg text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saveLoading ? "กำลังบันทึก..." : "บันทึกการตั้งค่าทั้งหมด"}</span>
          </button>
        </div>

        {/* Status notification */}
        {saveStatus === "success" && (
          <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-lg text-xs text-emerald-300 flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>บันทึกการตั้งค่าการแจ้งเตือนเรียบร้อยแล้ว ข้อมูลซิงค์กับฐานข้อมูล Cloud Firestore สำเร็จ</span>
          </div>
        )}
        {saveStatus === "error" && (
          <div className="mt-4 p-3 bg-red-950/60 border border-red-500/50 rounded-lg text-xs text-red-300 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span>เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-neutral-800 space-x-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveSubTab("line")}
          className={`flex items-center space-x-2.5 px-4 py-3 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
            activeSubTab === "line"
              ? "bg-neutral-900 text-emerald-400 border-emerald-500"
              : "text-neutral-400 hover:text-white border-transparent hover:bg-neutral-900/40"
          }`}
        >
          <Smartphone className="h-4 w-4" />
          <span>แจ้งเตือนผ่าน LINE</span>
          {lineEdit.token ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="ตั้งค่า Token แล้ว" />
          ) : (
            <span className="px-1.5 py-0.5 text-[9px] bg-neutral-800 text-neutral-400 rounded">ยังไม่ระบุ</span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("email")}
          className={`flex items-center space-x-2.5 px-4 py-3 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
            activeSubTab === "email"
              ? "bg-neutral-900 text-amber-400 border-amber-500"
              : "text-neutral-400 hover:text-white border-transparent hover:bg-neutral-900/40"
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>แจ้งเตือนผ่านอีเมล (SMTP)</span>
          {smtpEdit.adminNotifyEmail ? (
            <span className="w-2 h-2 rounded-full bg-amber-500" title="ตั้งค่าอีเมลแล้ว" />
          ) : null}
        </button>

        <button
          onClick={() => {
            setActiveSubTab("history");
            refreshNotifications();
          }}
          className={`flex items-center space-x-2.5 px-4 py-3 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
            activeSubTab === "history"
              ? "bg-neutral-900 text-cyan-400 border-cyan-500"
              : "text-neutral-400 hover:text-white border-transparent hover:bg-neutral-900/40"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>ประวัติการแจ้งเตือน (Audit Logs)</span>
          {notifications && notifications.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-cyan-950 text-cyan-400 rounded-full border border-cyan-800">
              {notifications.length}
            </span>
          )}
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TAB: LINE NOTIFICATION SETTINGS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "line" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main LINE Form (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* LINE Notify Box */}
            <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-5">
              
              <div className="flex items-center justify-between border-b border-neutral-850 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-[#06C755]/20 border border-[#06C755]/40 flex items-center justify-center text-[#06C755]">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      LINE Notify (แนะนำ - ติดตั้งง่ายที่สุด)
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#06C755]/20 text-[#06C755] font-normal border border-[#06C755]/30">
                        ยอดนิยมในไทย
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-400">
                      ส่งข้อความแจ้งเตือนเข้าห้องแชตส่วนตัว หรือกลุ่มแอดมินโรงแรม The M5 Residence ฟรี ไม่มีค่าบริการ
                    </p>
                  </div>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={lineEdit.enabled !== false}
                    onChange={(e) => setLineEdit({ ...lineEdit, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#06C755]"></div>
                  <span className="text-xs text-neutral-300 font-medium">เปิดใช้งาน</span>
                </label>
              </div>

              {/* LINE Notify Token Input */}
              <div className="space-y-2">
                <label className="text-xs text-neutral-300 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-[#06C755]" />
                    LINE Notify Personal Access Token
                  </span>
                  <a
                    href="https://notify-bot.line.me/my/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#06C755] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>สร้างโทเค็นที่ notify-bot.line.me</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </label>
                
                <div className="relative">
                  <input 
                    type={showLineToken ? "text" : "password"}
                    value={lineEdit.token || ""}
                    onChange={(e) => setLineEdit({ ...lineEdit, token: e.target.value.trim() })}
                    className="w-full pl-3 pr-10 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#06C755] font-mono tracking-wider"
                    placeholder="วาง LINE Notify Token ของคุณที่นี่ (เช่น 4d8fxxxxxxxx...)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLineToken(!showLineToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
                  >
                    {showLineToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  💡 <strong className="text-neutral-300">ขั้นตอน:</strong> เข้าเว็บไซต์ <span className="text-[#06C755]">notify-bot.line.me</span> &gt; ล็อกอินด้วยบัญชี LINE &gt; กด "Generate token" &gt; เลือกแชตของตนเองหรือกลุ่มแอดมินโรงแรม &gt; คัดลอกโทเค็นมาวางในช่องนี้ (อย่าลืมดึง <strong>@linenotify</strong> เข้ากลุ่ม)
                </p>
              </div>

              {/* Secondary Options: LINE Messaging API & Webhook */}
              <div className="pt-3 border-t border-neutral-900 space-y-4">
                <details className="group">
                  <summary className="text-xs text-neutral-400 font-medium cursor-pointer hover:text-neutral-200 select-none flex items-center justify-between py-1">
                    <span className="flex items-center gap-2">
                      <Terminal className="h-3.5 w-3.5 text-neutral-500" />
                      ตัวเลือกขั้นสูง: LINE Messaging API (LINE OA / Bot) หรือ Webhook URL
                    </span>
                    <span className="text-[10px] text-neutral-500 group-open:rotate-180 transition-transform">▼</span>
                  </summary>

                  <div className="mt-3 pl-2 border-l-2 border-neutral-800 space-y-3.5 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-450 font-mono">Channel Access Token (LINE Official Account)</label>
                      <input 
                        type="text"
                        value={lineEdit.channelAccessToken || ""}
                        onChange={(e) => setLineEdit({ ...lineEdit, channelAccessToken: e.target.value.trim() })}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                        placeholder="Long-lived Channel Access Token จาก LINE Developers Console"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-450 font-mono">Target User ID / Group ID (Optional)</label>
                      <input 
                        type="text"
                        value={lineEdit.targetId || ""}
                        onChange={(e) => setLineEdit({ ...lineEdit, targetId: e.target.value.trim() })}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                        placeholder="เว้นว่างไว้เพื่อส่งเป็น Broadcast หรือระบุ ID เช่น U12345..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-450 font-mono">Webhook URL (Discord / Slack / Make / Zapier)</label>
                      <input 
                        type="url"
                        value={lineEdit.webhookUrl || ""}
                        onChange={(e) => setLineEdit({ ...lineEdit, webhookUrl: e.target.value.trim() })}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                        placeholder="https://discord.com/api/webhooks/... หรือ https://hooks.slack.com/..."
                      />
                    </div>
                  </div>
                </details>
              </div>

              {/* Action buttons inside form */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={saveLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  {saveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>บันทึกการตั้งค่า LINE</span>
                </button>
              </div>
            </div>

            {/* Test LINE Notification Box */}
            <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-neutral-850 pb-2.5">
                <Send className="h-4 w-4 text-[#06C755]" />
                <span>ทดสอบการส่งข้อความเข้า LINE (Test LINE Alert)</span>
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400">ข้อความเพิ่มเติมในการทดสอบ (ไม่บังคับ)</label>
                  <input
                    type="text"
                    value={testLineMessageText}
                    onChange={(e) => setTestLineMessageText(e.target.value)}
                    placeholder="เช่น: ทดสอบส่งจากหน้าแดชบอร์ด The M5 Residence"
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#06C755]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestLine}
                    disabled={testLineLoading || (!lineEdit.token && !lineEdit.channelAccessToken && !lineEdit.webhookUrl)}
                    className="px-5 py-2.5 bg-[#06C755] hover:bg-[#05b34c] disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer shrink-0 shadow-lg shadow-[#06C755]/20"
                  >
                    {testLineLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span>{testLineLoading ? "กำลังส่งเข้า LINE..." : "กดทดสอบส่งข้อความเข้า LINE ทันที"}</span>
                  </button>

                  <span className="text-[11px] text-neutral-450 self-center">
                    {!lineEdit.token && !lineEdit.channelAccessToken && !lineEdit.webhookUrl ? (
                      <span className="text-amber-400">⚠️ กรุณากรอก LINE Notify Token ด้านบนก่อนกดทดสอบ</span>
                    ) : (
                      <span>ตรวจสอบข้อความในแอป LINE หลังกดส่ง</span>
                    )}
                  </span>
                </div>

                {testLineStatus === "success" && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-lg text-xs text-emerald-300 flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-200">ส่งข้อความเข้า LINE สำเร็จเรียบร้อยแล้ว!</p>
                      <p className="text-[11px] text-emerald-400/90 mt-0.5">{testLineMessage}</p>
                    </div>
                  </div>
                )}

                {testLineStatus === "error" && (
                  <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-lg text-xs text-red-300 flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-200">เกิดข้อผิดพลาดในการส่ง LINE:</p>
                      <p className="text-[11px] text-red-400/90 mt-0.5">{testLineMessage}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Preview Column (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* LINE Chat Preview Card */}
            <div className="bg-[#1f2937] border border-neutral-700/80 rounded-2xl p-4 shadow-2xl overflow-hidden relative">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-700">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-[#06C755] flex items-center justify-center text-white text-xs font-bold shadow">
                    L
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">LINE Notify</h4>
                    <p className="text-[10px] text-neutral-400">กลุ่มผู้บริหาร The M5</p>
                  </div>
                </div>
                <span className="text-[10px] text-neutral-400">14:02 น.</span>
              </div>

              {/* Chat Bubble Simulation */}
              <div className="mt-3.5 bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 text-neutral-200 text-xs shadow-inner space-y-2 font-sans">
                <div className="flex items-center space-x-1.5 text-[#06C755] font-bold text-xs pb-1 border-b border-neutral-800">
                  <span>🏨 [THE M5 RESIDENCE] การจองใหม่!</span>
                </div>
                <div className="text-[11px] space-y-1 font-mono leading-relaxed text-neutral-300">
                  <p>🔖 หมายเลขจอง: <span className="text-amber-400 font-bold">#B-8392</span></p>
                  <p>🛏️ ห้องพัก: Superior Loft Suite</p>
                  <p>📅 เช็คอิน: 2026-09-25 (หลัง 14:00)</p>
                  <p>📅 เช็คเอาท์: 2026-09-27 (ก่อน 12:00)</p>
                  <p>⏳ ระยะเวลา: 2 คืน (2 ท่าน)</p>
                  <p>💰 ยอดสุทธิ: <strong className="text-emerald-400">฿3,600 บาท</strong></p>
                  <p>🏷️ สถานะ: <span className="text-amber-300">รอชำระเงิน / ตรวจสอบ</span></p>
                  <div className="border-t border-neutral-800 pt-1 mt-1 text-neutral-400">
                    <p>👤 คุณ สมชาย ใจดี</p>
                    <p>📞 089-123-4567</p>
                    <p>✉️ somchai@example.com</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-center">
                <span className="text-[10px] text-neutral-400">
                  ตัวอย่างข้อความที่แอดมินโรงแรมจะได้รับทันทีที่ลูกค้ากดจอง
                </span>
              </div>
            </div>

            {/* Step-by-Step Helper Card */}
            <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 text-xs space-y-3">
              <h4 className="font-bold text-white flex items-center space-x-1.5">
                <HelpCircle className="h-4 w-4 text-amber-500" />
                <span>วิธีขอ LINE Notify Token ใน 3 นาที</span>
              </h4>
              <ol className="list-decimal pl-4 space-y-2 text-neutral-400 text-[11px] leading-relaxed">
                <li>ไปที่เว็บ <a href="https://notify-bot.line.me" target="_blank" rel="noreferrer" className="text-[#06C755] underline">notify-bot.line.me</a> แล้วล็อกอินด้วยอีเมล LINE ของท่าน</li>
                <li>คลิกชื่อโปรไฟล์มุมขวาบน เลือก <strong>"My page (หน้าของฉัน)"</strong></li>
                <li>เลื่อนลงมาด้านล่าง กดปุ่ม <strong>"Generate token (ออก Token)"</strong></li>
                <li>ตั้งชื่อโทเค็น (เช่น "The M5 Booking Alert") และเลือกห้องแชตที่ต้องการให้แจ้งเตือน</li>
                <li>กดตกลง แล้วคัดลอก Token มาวางในช่องด้านซ้าย</li>
                <li>
                  <strong className="text-amber-400">ข้อสำคัญ:</strong> หากเลือกส่งเข้ากลุ่ม อย่าลืมเชิญบัญชี 
                  <code className="mx-1 px-1 bg-neutral-800 text-white rounded">@linenotify</code> เข้ากลุ่มด้วย
                </li>
              </ol>
            </div>

          </div>

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. TAB: EMAIL SMTP / SMTP2GO SETTINGS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "email" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main SMTP Form (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* Protocol Provider Selection Pill */}
            <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-wider block">EMAIL DELIVERY ENGINE</span>
                <span className="text-xs text-neutral-300">เลือกโปรโตคอลการจัดส่งอีเมล</span>
              </div>
              <div className="flex items-center space-x-2 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSmtpEdit({ ...smtpEdit, provider: "smtp2go" })}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    (smtpEdit.provider || "smtp2go") === "smtp2go"
                      ? "bg-amber-600 text-white shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>SMTP2GO API (แนะนำ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSmtpEdit({ ...smtpEdit, provider: "standard" })}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    smtpEdit.provider === "standard"
                      ? "bg-neutral-800 text-white shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <Server className="h-3 w-3" />
                  <span>Custom SMTP Server</span>
                </button>
              </div>
            </div>

            {/* Enhanced Incoming Booking Notification Recipients Card */}
            <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-850 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>อีเมลรับข้อมูลการจองห้องพักต้นทาง (Incoming Booking Notification Emails)</span>
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      เมื่อลูกค้ากดจองห้องพักหรือขอใบเสนอราคาผ่านเว็บ ข้อมูลการจองจะถูกส่งไปยังอีเมลเหล่านี้ทันที
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                    ส่งแจ้งเตือน {
                      (smtpEdit.adminNotifyEmail || "")
                        .split(/[,;\s]+/)
                        .map(e => e.trim())
                        .filter(e => e && e.includes("@")).length
                    } อีเมล
                  </span>
                </div>
              </div>

              {/* Active Recipient Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-300 font-semibold flex items-center space-x-1.5">
                    <span>รายการอีเมลที่เปิดรับข้อมูลการจองในขณะนี้:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRawEmailInput(!showRawEmailInput)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline font-mono cursor-pointer"
                  >
                    {showRawEmailInput ? "สลับเป็นโหมดการ์ด (Visual Mode)" : "สลับเป็นกล่องพิมพ์ข้อความ (Raw Text)"}
                  </button>
                </div>

                {!showRawEmailInput ? (
                  <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
                    {(() => {
                      const emails = (smtpEdit.adminNotifyEmail || "")
                        .split(/[,;\s]+/)
                        .map(e => e.trim())
                        .filter(e => e && e.includes("@"));

                      if (emails.length === 0) {
                        return (
                          <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-md text-xs text-red-300 flex items-center space-x-2">
                            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                            <span>ยังไม่มีการระบุอีเมลรับการจอง กรุณาเพิ่มอย่างน้อย 1 อีเมลด้านล่างเพื่อให้ระบบส่งข้อมูลเมื่อมีคนจอง</span>
                          </div>
                        );
                      }

                      return (
                        <div className="flex flex-wrap gap-2">
                          {emails.map((email, idx) => {
                            const isHotelOfficial = email.toLowerCase().includes("them5residence.com");
                            return (
                              <div
                                key={idx}
                                className={`inline-flex items-center space-x-2 pl-3 pr-2 py-1.5 rounded-lg border text-xs font-mono shadow-sm transition-all ${
                                  isHotelOfficial
                                    ? "bg-amber-950/40 border-amber-600/50 text-amber-200"
                                    : "bg-neutral-800/90 border-neutral-700 text-neutral-200"
                                }`}
                              >
                                <Mail className={`h-3.5 w-3.5 ${isHotelOfficial ? "text-amber-400" : "text-neutral-400"}`} />
                                <span className="font-semibold">{email}</span>
                                {idx === 0 && (
                                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-sans font-bold">
                                    หลัก
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = emails.filter((_, i) => i !== idx).join(", ");
                                    setSmtpEdit({ ...smtpEdit, adminNotifyEmail: next });
                                    if (showToast) showToast(`ลบ ${email} ออกจากรายการรับแจ้งเตือนแล้ว`, "info");
                                  }}
                                  className="p-1 hover:bg-neutral-700/80 rounded-full text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                                  title={`ลบ ${email}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Quick Add Presets */}
                    <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-neutral-400 font-sans">แนะนำเพิ่มด่วน:</span>
                      {!(smtpEdit.adminNotifyEmail || "").includes("booking@them5residence.com") && (
                        <button
                          type="button"
                          onClick={() => {
                            const current = (smtpEdit.adminNotifyEmail || "")
                              .split(/[,;\s]+/)
                              .map(e => e.trim())
                              .filter(e => e && e.includes("@"));
                            setSmtpEdit({ ...smtpEdit, adminNotifyEmail: [...current, "booking@them5residence.com"].join(", ") });
                            if (showToast) showToast("เพิ่ม booking@them5residence.com เรียบร้อยแล้ว", "success");
                          }}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-amber-950/60 border border-neutral-700 hover:border-amber-600/60 text-neutral-300 hover:text-amber-200 rounded text-[11px] font-mono cursor-pointer flex items-center space-x-1 transition-all"
                        >
                          <Plus className="h-3 w-3" />
                          <span>booking@them5residence.com</span>
                        </button>
                      )}
                      {!(smtpEdit.adminNotifyEmail || "").includes("soothirote.nik@gmail.com") && (
                        <button
                          type="button"
                          onClick={() => {
                            const current = (smtpEdit.adminNotifyEmail || "")
                              .split(/[,;\s]+/)
                              .map(e => e.trim())
                              .filter(e => e && e.includes("@"));
                            setSmtpEdit({ ...smtpEdit, adminNotifyEmail: [...current, "soothirote.nik@gmail.com"].join(", ") });
                            if (showToast) showToast("เพิ่ม soothirote.nik@gmail.com เรียบร้อยแล้ว", "success");
                          }}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-amber-950/60 border border-neutral-700 hover:border-amber-600/60 text-neutral-300 hover:text-amber-200 rounded text-[11px] font-mono cursor-pointer flex items-center space-x-1 transition-all"
                        >
                          <Plus className="h-3 w-3" />
                          <span>soothirote.nik@gmail.com</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <textarea
                      rows={2}
                      value={smtpEdit.adminNotifyEmail || ""}
                      onChange={(e) => setSmtpEdit({ ...smtpEdit, adminNotifyEmail: e.target.value })}
                      placeholder="booking@them5residence.com, soothirote.nik@gmail.com"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <p className="text-[10px] text-neutral-400">
                      💡 สามารถระบุหลายอีเมลพร้อมกันได้ โดยคั่นด้วยเครื่องหมายจุลภาค <code>,</code> หรือเว้นวรรค
                    </p>
                  </div>
                )}
              </div>

              {/* Add New Email Input Row */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={newRecipientInput}
                    onChange={(e) => setNewRecipientInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newRecipientInput) {
                          const clean = newRecipientInput.trim();
                          if (clean && clean.includes("@")) {
                            const current = (smtpEdit.adminNotifyEmail || "")
                              .split(/[,;\s]+/)
                              .map(e => e.trim())
                              .filter(e => e && e.includes("@"));
                            if (!current.includes(clean)) {
                              setSmtpEdit({ ...smtpEdit, adminNotifyEmail: [...current, clean].join(", ") });
                              setNewRecipientInput("");
                              if (showToast) showToast(`เพิ่ม ${clean} เรียบร้อยแล้ว`, "success");
                            } else {
                              if (showToast) showToast("มีอีเมลนี้ในรายการแล้ว", "warning");
                            }
                          } else {
                            if (showToast) showToast("กรุณาระบุรูปแบบอีเมลให้ถูกต้อง", "error");
                          }
                        }
                      }
                    }}
                    placeholder="พิมพ์อีเมลใหม่ เช่น booking@them5residence.com หรือ your-email@gmail.com แล้วกดเพิ่ม"
                    className="w-full pl-3 pr-10 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const clean = newRecipientInput.trim();
                    if (!clean || !clean.includes("@")) {
                      if (showToast) showToast("กรุณาระบุรูปแบบอีเมลให้ถูกต้อง (เช่น name@example.com)", "error");
                      return;
                    }
                    const current = (smtpEdit.adminNotifyEmail || "")
                      .split(/[,;\s]+/)
                      .map(e => e.trim())
                      .filter(e => e && e.includes("@"));
                    if (!current.includes(clean)) {
                      setSmtpEdit({ ...smtpEdit, adminNotifyEmail: [...current, clean].join(", ") });
                      setNewRecipientInput("");
                      if (showToast) showToast(`เพิ่ม ${clean} เข้าระบบรับการจองแล้ว`, "success");
                    } else {
                      if (showToast) showToast("มีอีเมลนี้ในรายการแล้ว", "warning");
                    }
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ เพิ่มอีเมลรับการจอง</span>
                </button>
              </div>

              {/* Action Buttons: Save & Test Simulation */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-neutral-850">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={saveLoading}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>บันทึกอีเมลผู้รับการจอง</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const emails = (smtpEdit.adminNotifyEmail || "")
                        .split(/[,;\s]+/)
                        .map(e => e.trim())
                        .filter(e => e && e.includes("@"));

                      if (emails.length === 0) {
                        if (showToast) showToast("กรุณาระบุอีเมลผู้รับอย่างน้อย 1 อีเมลก่อนทดสอบ", "error");
                        return;
                      }

                      setTestBookingLoading(true);
                      setTestBookingStatus("idle");
                      setTestBookingMessage("");

                      try {
                        const res = await testBookingEmailNotification(
                          {
                            ...smtpEdit,
                            port: Number(smtpEdit.port) || 587
                          },
                          smtpEdit.adminNotifyEmail
                        );

                        if (res.success) {
                          setTestBookingStatus("success");
                          setTestBookingMessage(res.message);
                          if (showToast) showToast("ส่งอีเมลจำลองการจองห้องพักสำเร็จ! ตรวจสอบกล่องจดหมายของคุณได้เลยครับ 🚀", "success");
                        } else {
                          setTestBookingStatus("error");
                          setTestBookingMessage(res.message);
                          if (showToast) showToast(res.message || "เกิดข้อผิดพลาดในการส่งอีเมลทดสอบ", "error");
                        }
                      } catch (err: any) {
                        setTestBookingStatus("error");
                        setTestBookingMessage(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
                      } finally {
                        setTestBookingLoading(false);
                      }
                    }}
                    disabled={testBookingLoading}
                    className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-amber-600/50 text-amber-300 hover:text-amber-200 font-semibold rounded-lg text-xs flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {testBookingLoading ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <Send className="h-4 w-4 text-amber-400" />}
                    <span>{testBookingLoading ? "กำลังส่งเมลจำลอง..." : "ทดสอบส่งแจ้งเตือนการจองจำลอง (Test Booking Alert)"}</span>
                  </button>
                </div>

                <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 inline" />
                  รองรับหลายกล่องข้อความพร้อมกัน
                </span>
              </div>

              {/* Test Booking Alert Result Message */}
              {testBookingStatus === "success" && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-lg text-xs text-emerald-300 flex items-start space-x-2 animate-fade-in">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">ส่งอีเมลแจ้งเตือนการจองจำลองสำเร็จ!</p>
                    <p className="text-[11px] text-emerald-300/80 mt-0.5">{testBookingMessage}</p>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      💡 หากไม่พบในกล่องข้อความหลัก (Inbox) โปรดตรวจสอบในโฟลเดอร์ <em>จดหมายขยะ (Spam / Junk)</em>
                    </p>
                  </div>
                </div>
              )}

              {testBookingStatus === "error" && (
                <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-lg text-xs text-red-300 flex items-start space-x-2 animate-fade-in">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">ส่งอีเมลแจ้งเตือนการจองทดสอบไม่สำเร็จ</p>
                    <p className="text-[11px] text-red-300/80 mt-0.5">{testBookingMessage}</p>
                  </div>
                </div>
              )}

              {/* Helpful checklist box */}
              <div className="bg-neutral-900/60 border border-neutral-850/80 rounded-lg p-3 text-[11px] text-neutral-400 space-y-1">
                <span className="font-bold text-neutral-300 block">📋 ข้อมูลที่ระบบจะแนบไปในอีเมลเมื่อมีลูกค้าจองจริง:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 pt-0.5 text-neutral-400">
                  <div>• รหัสการจอง (#M5-XXXX) และสถานะการชำระเงิน</div>
                  <div>• วันที่เช็คอิน (Check-in) และเช็คเอาท์ (Check-out)</div>
                  <div>• ประเภทห้องพัก และจำนวนคืนที่เข้าพัก</div>
                  <div>• ยอดชำระเงินรวมสุทธิ (THB)</div>
                  <div>• ชื่อ-นามสกุล, เบอร์โทรศัพท์ และอีเมลผู้จอง</div>
                  <div>• คำขอพิเศษเพิ่มเติมจากลูกค้า (ถ้ามี)</div>
                </div>
              </div>
            </div>

            {/* SMTP2GO API Card (Default & Recommended) */}
            {(smtpEdit.provider || "smtp2go") === "smtp2go" ? (
              <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-850 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Key className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>SMTP2GO REST API</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Online
                        </span>
                      </h3>
                      <p className="text-[11px] text-neutral-400">ส่งอีเมลผ่าน HTTPS Port 443 ทำงานได้ทันที 100% ไม่ติดบล็อกพอร์ต</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSmtpEdit({
                        ...smtpEdit,
                        apiKey: "api-77AF153BDA6C4F7FB6DED66C6CC28802",
                        apiBaseUrl: "https://api.smtp2go.com/v3/",
                        user: "them5",
                        pass: "aOvdjB4hrp7W8ptQ",
                        host: "mail.smtp2go.com",
                        port: 2525,
                        secure: false,
                        fromName: "The M5 Residence Loft",
                        fromEmail: "no-reply@them5residence.com",
                        provider: "smtp2go"
                      });
                      if (showToast) showToast("กรอกข้อมูล SMTP2GO (User: them5 & API Key) เรียบร้อยแล้ว", "success");
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                  >
                    ⚡ รีเซ็ตคีย์แนะนำ
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-300 font-semibold flex items-center justify-between">
                      <span>SMTP2GO API Key</span>
                      <span className="text-[10px] text-neutral-500 font-mono">Format: api-XXXXXXXXXXXXXXXXXXXX</span>
                    </label>
                    <div className="relative">
                      <input 
                        type={showSmtpApiKey ? "text" : "password"}
                        value={smtpEdit.apiKey || ""}
                        onChange={(e) => setSmtpEdit({ ...smtpEdit, apiKey: e.target.value.trim() })}
                        className="w-full pl-3 pr-10 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono tracking-wider"
                        placeholder="api-77AF153BDA6C4F7FB6DED66C6CC28802"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpApiKey(!showSmtpApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
                      >
                        {showSmtpApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 font-mono">API Base URL</label>
                    <input 
                      type="text"
                      value={smtpEdit.apiBaseUrl || "https://api.smtp2go.com/v3/"}
                      onChange={(e) => setSmtpEdit({ ...smtpEdit, apiBaseUrl: e.target.value.trim() })}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none font-mono text-neutral-400"
                      placeholder="https://api.smtp2go.com/v3/"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Custom SMTP Server Credentials */
              <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-neutral-850 pb-2.5">
                  <Server className="h-4 w-4 text-neutral-400" />
                  <span>การเชื่อมต่อเซิร์ฟเวอร์ SMTP (Server Credentials)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs text-neutral-450 font-mono flex items-center justify-between">
                      <span>เซิร์ฟเวอร์ผู้ให้บริการ (SMTP Host)</span>
                      <span className="text-[10px] text-neutral-500">เช่น smtp.gmail.com หรือ mail.smtp2go.com</span>
                    </label>
                    <input 
                      type="text"
                      required
                      value={smtpEdit.host}
                      onChange={(e) => setSmtpEdit({ ...smtpEdit, host: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
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
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
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
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      placeholder="your-email@gmail.com"
                    />
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-xs text-neutral-450 font-mono flex justify-between items-center">
                      <span>รหัสผ่าน / แอฟพาสเวิร์ด (SMTP Password)</span>
                      <span className="text-[9px] text-amber-500 font-sans italic">แนะนำ App Password</span>
                    </label>
                    <div className="relative">
                      <input 
                        type={showSmtpPassword ? "text" : "password"}
                        value={smtpEdit.pass}
                        onChange={(e) => setSmtpEdit({ ...smtpEdit, pass: e.target.value })}
                        className="w-full pl-3 pr-10 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        placeholder="••••••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
                      >
                        {showSmtpPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
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
            )}

            {/* Sender Info */}
            <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-neutral-850 pb-2.5">
                <Mail className="h-4 w-4 text-neutral-400" />
                <span>ข้อมูลหัวจดหมายอีเมล (Sender Info)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-450">ชื่อผู้ส่งที่ลูกค้าจะเห็น (Sender Name)</label>
                  <input 
                    type="text"
                    required
                    value={smtpEdit.fromName || "The M5 Residence Loft"}
                    onChange={(e) => setSmtpEdit({ ...smtpEdit, fromName: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none"
                    placeholder="The M5 Residence Loft"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-450">อีเมลทางการผู้ส่ง (Sender Email Address)</label>
                  <input 
                    type="email"
                    value={smtpEdit.fromEmail || "no-reply@them5residence.com"}
                    onChange={(e) => setSmtpEdit({ ...smtpEdit, fromEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none"
                    placeholder="no-reply@them5residence.com"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    📌 <strong>ข้อสำคัญ:</strong> ควรตรงกับอีเมลหรือโดเมนที่ยืนยันไว้ใน <strong>Sending &gt; Verified Senders</strong> ของ SMTP2GO หากใช้โดเมนยังไม่ได้ผูก DKIM โปรดตรวจสอบในโฟลเดอร์ <em>จดหมายขยะ (Spam)</em>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={saveLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-xs flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  {saveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>บันทึกการตั้งค่าอีเมล</span>
                </button>
              </div>
            </div>

            {/* Test Email Box */}
            <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-neutral-850 pb-2.5">
                <Send className="h-4 w-4 text-amber-500" />
                <span>ทดสอบการส่งอีเมล (Send Test Email)</span>
              </h3>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <input 
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="ระบุอีเมลผู้รับทดสอบ เช่น your-email@gmail.com"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleTestEmail}
                    disabled={testEmailLoading}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer shrink-0"
                  >
                    {testEmailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span>{testEmailLoading ? "กำลังส่งเมล..." : "ส่งอีเมลทดสอบ"}</span>
                  </button>
                </div>

                {testEmailStatus === "success" && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-lg text-xs text-emerald-300 flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-200">ส่งอีเมลสำเร็จเรียบร้อยแล้ว!</p>
                      <p className="text-[11px] text-emerald-400/90 mt-0.5">{testEmailMessage}</p>
                    </div>
                  </div>
                )}

                {testEmailStatus === "error" && (
                  <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-lg text-xs text-red-300 flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-200">เกิดข้อผิดพลาดในการส่งอีเมล:</p>
                      <p className="text-[11px] text-red-400/90 mt-0.5">{testEmailMessage}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Guide Column (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* SMTP2GO Information Card */}
            <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-850 pb-2.5">
                <h4 className="text-xs font-mono font-bold text-white flex items-center space-x-1.5 uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>SMTP2GO API Info</span>
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  Online
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-1 text-[11px]">
                  <div className="text-neutral-400 text-[10px]">API Base URL:</div>
                  <div className="text-white font-mono break-all">https://api.smtp2go.com/v3/</div>
                </div>

                <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-1 text-[11px]">
                  <div className="text-neutral-400 text-[10px]">Default Rate Limit:</div>
                  <div className="text-emerald-400 font-bold">Unlimited</div>
                </div>

                <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-1 text-[11px]">
                  <div className="text-neutral-400 text-[10px]">API Status:</div>
                  <div className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Online & Ready</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-900 text-[11px] text-neutral-400 leading-relaxed font-sans">
                💡 <strong>ข้อดีของระบบ API:</strong> ทำงานผ่าน HTTPS Port 443 ทำให้การส่งอีเมลยืนยันการจอง และใบเสนอราคาออกได้รวดเร็วทันใจ ไม่มีปัญหาพอร์ต 25 หรือ 587 ถูกบล็อกโดยผู้ให้บริการคลาวด์
              </div>

              <div className="pt-2">
                <a
                  href="https://app-us.smtp2go.com/sending/apikeys/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <span>เปิดแดชบอร์ด SMTP2GO</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. TAB: AUDIT LOGS & NOTIFICATION HISTORY */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "history" && (
        <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-850 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <span>ประวัติและบันทึกการส่งแจ้งเตือน (Notification Audit Logs)</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                บันทึกรายการแจ้งเตือนที่ระบบจัดส่งผ่านช่องทาง LINE และอีเมลสำหรับแต่ละรายการจอง
              </p>
            </div>

            <button
              onClick={() => refreshNotifications()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>รีเฟรชรายการ</span>
            </button>
          </div>

          {(!notifications || notifications.length === 0) ? (
            <div className="py-12 text-center text-neutral-500 space-y-2">
              <Bell className="h-8 w-8 mx-auto text-neutral-600" />
              <p className="text-xs">ยังไม่มีบันทึกการแจ้งเตือน</p>
              <p className="text-[11px] text-neutral-600">
                เมื่อมีลูกค้าทำการจองหรือกดทดสอบส่งการแจ้งเตือน ประวัติจะแสดงขึ้นที่นี่โดยอัตโนมัติ
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => {
                const isLine = notif.channel === "line";
                const isEmail = notif.channel === "email";
                const isSent = notif.status === "sent";
                const isSimulated = notif.status === "simulated";
                const isFailed = notif.status === "failed";

                return (
                  <div 
                    key={notif.id}
                    className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors hover:border-neutral-750"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isLine ? "bg-[#06C755]/15 text-[#06C755] border border-[#06C755]/30" : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}>
                        {isLine ? <Smartphone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-xs font-bold text-white font-mono">
                            {notif.bookingId ? `Booking #${notif.bookingId}` : "Notification"}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            ไปยัง: <strong className="text-neutral-200">{notif.recipient}</strong>
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 font-sans line-clamp-2 max-w-2xl whitespace-pre-line">
                          {notif.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-end md:self-center shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        isSent 
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800" 
                          : isSimulated 
                            ? "bg-amber-950 text-amber-300 border-amber-800" 
                            : "bg-red-950 text-red-400 border-red-800"
                      }`}>
                        {isSent ? "🟢 ส่งสำเร็จ (Sent)" : isSimulated ? "🟡 บันทึกในระบบ (Simulated)" : "🔴 ล้มเหลว (Failed)"}
                      </span>

                      <span className="text-[11px] text-neutral-500 font-mono">
                        {new Date(notif.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
