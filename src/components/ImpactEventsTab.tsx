import React, { useState, useEffect } from "react";
import { 
  Plus, Trash2, Edit2, Check, RefreshCw, Search, X, 
  CalendarDays, MapPin, Clock, Sparkles, AlertCircle, HelpCircle
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";

export default function ImpactEventsTab() {
  const { settings, updateSettings, refreshSettings } = useSettings();
  const [events, setEvents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ทั้งหมด");
  
  // Loading & Action States
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);

  // Form states (Add/Edit)
  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [venue, setVenue] = useState("");
  const [desc, setDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("Exhibition");
  const [isActive, setIsActive] = useState(true);

  // Load events from context/API
  useEffect(() => {
    fetchEvents();
  }, [settings.impactEvents]);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/impact-events");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.events) {
          setEvents(data.events);
        }
      }
    } catch (err) {
      console.error("Error fetching impact events in tab:", err);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Sync Trigger
  const handleSync = async () => {
    setIsSyncing(true);
    showToast("กำลังเริ่มดึงข้อมูลตารางงานล่าสุดจาก IMPACT...", "success");
    try {
      const res = await fetch("/api/impact-events/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
        // Refresh global settings context to sync across all pages
        await refreshSettings();
        showToast(data.message || "ซิงค์ตารางงานจาก IMPACT สำเร็จเรียบร้อย!", "success");
      } else {
        showToast(data.error || "ไม่สามารถเชื่อมต่อระบบซิงค์ได้", "error");
      }
    } catch (err: any) {
      showToast(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูล", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. Active toggle (addresses exact requirement for saving on open/close campaigns instantly)
  const handleToggleActive = async (evt: any) => {
    const updatedActive = !evt.active;
    
    // Optimistic UI update
    setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, active: updatedActive } : e));

    try {
      const res = await fetch(`/api/impact-events/${evt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: { active: updatedActive } })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Immediately sync global settings to reflect on public landing page
          await refreshSettings();
          showToast(`บันทึกการ ${updatedActive ? "เปิด" : "ปิด"} อีเวนต์ลงฐานข้อมูลเสร็จสมบูรณ์`, "success");
        }
      } else {
        // Rollback on failure
        setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, active: evt.active } : e));
        showToast("ไม่สามารถอัปเดตสถานะได้ลงฐานข้อมูล", "error");
      }
    } catch (err) {
      setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, active: evt.active } : e));
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล", "error");
    }
  };

  // 3. Delete event
  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้ออกจากระบบ?")) return;

    try {
      const res = await fetch(`/api/impact-events/${id}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEvents(data.events);
          await refreshSettings();
          showToast("ลบกิจกรรมออกจากฐานข้อมูลเรียบร้อยแล้ว", "success");
        }
      }
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการลบ", "error");
    }
  };

  // 4. Create manual event
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return showToast("กรุณากรอกหัวข้อกิจกรรม", "error");

    try {
      const payload = {
        event: {
          title,
          date: dateStr,
          time: timeStr,
          venue: venue || "IMPACT Muang Thong Thani",
          description: desc,
          imageUrl: imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
          category,
          active: isActive
        }
      };

      const res = await fetch("/api/impact-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEvents(data.events);
          await refreshSettings();
          setShowAddModal(false);
          resetForm();
          showToast("สร้างกิจกรรมจำลองและบันทึกลงฐานข้อมูลสำเร็จ!", "success");
        }
      }
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  // 5. Update manual/scraped event
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !title) return;

    try {
      const payload = {
        event: {
          title,
          date: dateStr,
          time: timeStr,
          venue,
          description: desc,
          imageUrl,
          category,
          active: isActive
        }
      };

      const res = await fetch(`/api/impact-events/${editingEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEvents(data.events);
          await refreshSettings();
          setEditingEvent(null);
          resetForm();
          showToast("อัปเดตข้อมูลกิจกรรมและบันทึกฐานข้อมูลเรียบร้อยแล้ว", "success");
        }
      }
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการอัปเดต", "error");
    }
  };

  const startEdit = (evt: any) => {
    setEditingEvent(evt);
    setTitle(evt.title || "");
    setDateStr(evt.date || "");
    setTimeStr(evt.time || "");
    setVenue(evt.venue || "IMPACT Muang Thong Thani");
    setDesc(evt.description || "");
    setImageUrl(evt.imageUrl || "");
    setCategory(evt.category || "Exhibition");
    setIsActive(evt.active !== false);
  };

  const resetForm = () => {
    setTitle("");
    setDateStr("");
    setTimeStr("");
    setVenue("");
    setDesc("");
    setImageUrl("");
    setCategory("Exhibition");
    setIsActive(true);
  };

  const handleIntervalChange = async (newInterval: string) => {
    const updatedSettings = {
      ...settings,
      general: {
        ...settings.general,
        impactSyncInterval: newInterval as any
      }
    };
    const success = await updateSettings(updatedSettings);
    if (success) {
      showToast(`อัปเดตความถี่การซิงค์ข้อมูลเป็น: ${
        newInterval === "daily" ? "ทุกวัน" : 
        newInterval === "weekly" ? "ทุกสัปดาห์" : 
        newInterval === "monthly" ? "ทุกเดือน" : "เฉพาะแมนนวล"
      } สำเร็จเรียบร้อย!`, "success");
    } else {
      showToast("ไม่สามารถอัปเดตการตั้งค่าความถี่ได้", "error");
    }
  };

  // Filters
  const filteredEvents = events.filter((evt) => {
    const matchesSearch = String(evt.title).toLowerCase().includes(search.toLowerCase()) ||
                          String(evt.venue || "").toLowerCase().includes(search.toLowerCase()) ||
                          String(evt.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "ทั้งหมด" || evt.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert Header */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-xl flex items-center space-x-2 text-white text-xs ${
          toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
        }`}>
          <Check className="h-4 w-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hero Control Banner */}
      <div className="p-5 bg-gradient-to-r from-neutral-900 to-[#161616] border border-neutral-850 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-mono rounded-full font-bold uppercase tracking-wider">
              IMPACT API CONNECTED
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">// PORTAL_SYNC_V1</span>
          </div>
          <h2 className="text-base font-bold text-white uppercase font-sans flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brick animate-pulse" />
            ระบบซิงค์ตารางงานและสัมมนา IMPACT
          </h2>
          <p className="text-xs text-neutral-450 max-w-xl font-light">
            ดึงข้อมูลงานนิทรรศการ งานจำหน่ายสินค้า และตารางแสดงคอนเสิร์ตใหญ่จากเว็บไซต์หลักของ **IMPACT เมืองทองธานี** โดยระบบหลังบ้านจะดึงและซิงค์ข้อมูลลงฐานข้อมูลโดยตรงเพื่อให้ลูกค้าตรวจสอบหน้าเว็บได้ทันที
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded text-xs font-bold transition-all duration-300 flex items-center space-x-2 cursor-pointer shadow-lg shadow-amber-900/10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "กำลังซิงค์เชื่อมต่อ..." : "ซิงค์ตารางงานจากเว็บ IMPACT"}</span>
          </button>

          <button
            type="button"
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="px-4 py-2.5 bg-brick hover:bg-brick-dark text-white rounded text-xs font-bold transition-all duration-300 flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-brick/10"
          >
            <Plus className="h-4 w-4" />
            <span>สร้างกิจกรรมเพิ่มเอง</span>
          </button>
        </div>
      </div>

      {/* Sync Frequency Settings Row */}
      <div className="p-4 bg-gradient-to-r from-[#141414] to-neutral-900 border border-neutral-850 rounded-xl grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
            ตั้งค่าความถี่ในการดึงและซิงค์ข้อมูลอัตโนมัติ
          </h3>
          <p className="text-[11px] text-neutral-400 font-light">
            เลือกรอบระยะเวลาที่ต้องการให้ระบบดึงข้อมูลจากเว็บไซต์หลัก IMPACT มาเข้าระบบและอัปเดตลงฐานข้อมูลโดยอัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 justify-start lg:justify-center">
          {[
            { value: "manual", label: "จัดการซิงค์เอง" },
            { value: "daily", label: "ทุกวัน" },
            { value: "weekly", label: "ทุกสัปดาห์ (แนะนำ)" },
            { value: "monthly", label: "ทุกเดือน" }
          ].map((item) => {
            const currentInterval = settings.general?.impactSyncInterval || "manual";
            const isSelected = currentInterval === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => handleIntervalChange(item.value)}
                className={`px-3 py-2 rounded text-xs font-medium cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? "bg-amber-600/20 text-amber-400 border border-amber-500/35 font-semibold shadow-inner" 
                    : "bg-neutral-950 text-neutral-400 border border-neutral-850 hover:text-white hover:border-neutral-800"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="text-left lg:text-right text-[11px] text-neutral-400 space-y-0.5 font-light">
          <div>
            สถานะออโต้ซิงค์:{" "}
            <span className={`font-bold font-sans ${
              (settings.general?.impactSyncInterval || "manual") === "manual" ? "text-neutral-500" : "text-emerald-400"
            }`}>
              {(settings.general?.impactSyncInterval || "manual") === "manual" ? "ปิดใช้งาน (แมนนวล)" : "เปิดใช้งาน (อัตโนมัติ)"}
            </span>
          </div>
          <div>
            ซิงค์ล่าสุดเมื่อ: <span className="font-mono text-neutral-300 font-semibold">{
              settings.general?.lastImpactSyncTime
                ? new Date(settings.general.lastImpactSyncTime).toLocaleString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  }) + " น."
                : "ยังไม่มีการซิงค์"
            }</span>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="ค้นหาตามชื่อกิจกรรม สถานที่จัดงาน หรือรายละเอียด..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-850 hover:border-neutral-800 rounded px-10 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-brick/50 duration-200"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {["ทั้งหมด", "Concert", "Exhibition", "Other"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex-1 px-3 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                categoryFilter === cat 
                  ? "bg-brick text-white font-semibold" 
                  : "bg-neutral-900 text-neutral-450 border border-neutral-850 hover:text-white"
              }`}
            >
              {cat === "ทั้งหมด" ? "ทั้งหมด" : cat === "Concert" ? "คอนเสิร์ต" : cat === "Exhibition" ? "นิทรรศการ" : "อื่นๆ"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Events Table and Cards */}
      {filteredEvents.length === 0 ? (
        <div className="p-12 text-center bg-neutral-950 border border-neutral-900 rounded-lg space-y-3.5">
          <CalendarDays className="h-10 w-10 text-neutral-600 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white">ไม่พบข้อมูลตารางงาน</h4>
            <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
              ยังไม่มีกิจกรรมที่สอดคล้องกับคีย์เวิร์ดในขณะนี้ กดปุ่ม **\"ซิงค์ตารางงานจากเว็บ IMPACT\"** ด้านบนเพื่ออัปเดตข้อมูลอัตโนมัติ
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredEvents.map((evt) => (
            <div 
              key={evt.id} 
              className={`p-4 bg-neutral-900 border rounded-xl flex gap-4 transition-all duration-300 relative ${
                evt.active ? "border-neutral-850 hover:border-neutral-800" : "border-neutral-950 opacity-60 hover:opacity-80"
              }`}
            >
              {/* Event Image */}
              <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-neutral-950 border border-neutral-850 relative">
                <img 
                  src={evt.imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80"} 
                  alt={evt.title}
                  className="w-full h-full object-cover"
                />
                <span className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase text-white ${
                  evt.category === "Concert" ? "bg-purple-600" : evt.category === "Exhibition" ? "bg-blue-600" : "bg-neutral-600"
                }`}>
                  {evt.category}
                </span>
              </div>

              {/* Event Text detail */}
              <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-1">
                    <h4 className="text-xs font-bold text-white truncate pr-4" title={evt.title}>
                      {evt.title}
                    </h4>

                    {/* Active/Inactive Switch instantly saved into database */}
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`text-[9px] font-mono uppercase ${evt.active ? "text-emerald-400" : "text-neutral-500"}`}>
                        {evt.active ? "เปิดแสดง" : "ปิดแสดง"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(evt)}
                        className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none ${
                          evt.active ? "bg-emerald-500" : "bg-neutral-800"
                        }`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                          evt.active ? "translate-x-4" : "translate-x-0"
                        }`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5 text-[10px] font-mono text-neutral-400">
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      📅 {evt.date}
                    </span>
                    {evt.time && (
                      <span className="flex items-center gap-1">
                        🕒 {evt.time}
                      </span>
                    )}
                    <span className="flex items-center gap-1 truncate text-neutral-500">
                      📍 {evt.venue || "IMPACT Muang Thong Thani"}
                    </span>
                  </div>

                  <p className="text-[10px] text-neutral-500 leading-normal line-clamp-2 pt-0.5 font-light">
                    {evt.description || "ไม่มีรายละเอียดประกอบ"}
                  </p>
                </div>

                {/* Edit & Delete Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-neutral-950/60">
                  <span className="text-[9px] font-mono text-neutral-600">
                    ID: {evt.id}
                  </span>
                  
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(evt)}
                      className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-850 rounded transition-all cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(evt.id)}
                      className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-neutral-850 rounded transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD MODAL DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-neutral-850 flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-brick" />
                เพิ่มกิจกรรมและงานนิทรรศการด้วยตนเอง
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-850 rounded cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">หัวข้อชื่อกิจกรรม / ชื่องานคอนเสิร์ต *</label>
                <input
                  type="text"
                  required
                  placeholder="ตัวอย่าง: MAROON 5 Live in Bangkok 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-brick"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">วันที่จัดงาน *</label>
                  <input
                    type="text"
                    required
                    placeholder="ตัวอย่าง: 21 - 22 ก.พ. 2569"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-brick"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">เวลาเริ่มงาน</label>
                  <input
                    type="text"
                    placeholder="ตัวอย่าง: 19:00 น. เป็นต้นไป"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-brick"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">สถานที่จัดงาน / ฮอลล์จัดแสดง</label>
                <input
                  type="text"
                  placeholder="ตัวอย่าง: Challenger Hall 1-3 อิมแพ็ค เมืองทองธานี"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-brick"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">คำอธิบายรายละเอียด</label>
                <textarea
                  rows={3}
                  placeholder="รายละเอียดของงาน โปรโมชั่นดึงดูดลูกค้าเข้าจองห้องพัก..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-brick font-light"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">URL รูปภาพหน้าปกกิจกรรม (ภาพประกอบ)</label>
                <input
                  type="text"
                  placeholder="เช่น https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-brick"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">ประเภทกิจกรรม</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brick"
                  >
                    <option value="Concert">Concert (คอนเสิร์ต)</option>
                    <option value="Exhibition">Exhibition (นิทรรศการ/เอ็กซ์โป)</option>
                    <option value="Other">Other (กิจกรรมอื่นๆ)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-neutral-950 border border-neutral-850 rounded mt-5">
                  <span className="text-[10px] font-mono text-neutral-400">สถานะเปิดแสดงผล</span>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                      isActive ? "bg-emerald-500" : "bg-neutral-800"
                    }`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ${
                      isActive ? "translate-x-4" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-850 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 rounded text-xs cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brick hover:bg-brick-dark text-white rounded text-xs font-semibold cursor-pointer shadow-lg shadow-brick/20"
                >
                  บันทึกลงระบบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL DIALOG */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-neutral-850 flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Edit2 className="h-4 w-4 text-amber-500 animate-pulse" />
                แก้ไขข้อมูลกิจกรรม IMPACT
              </h3>
              <button 
                onClick={() => setEditingEvent(null)}
                className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-850 rounded cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">หัวข้อชื่อกิจกรรม / ชื่องานคอนเสิร์ต *</label>
                <input
                  type="text"
                  required
                  placeholder="ตัวอย่าง: MAROON 5 Live in Bangkok 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-brick"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">วันที่จัดงาน *</label>
                  <input
                    type="text"
                    required
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-brick"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">เวลาเริ่มงาน</label>
                  <input
                    type="text"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-brick"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">สถานที่จัดงาน / ฮอลล์จัดแสดง</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-brick"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">คำอธิบายรายละเอียด</label>
                <textarea
                  rows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-brick font-light"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">URL รูปภาพหน้าปกกิจกรรม (ภาพประกอบ)</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-brick"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">ประเภทกิจกรรม</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-brick"
                  >
                    <option value="Concert">Concert (คอนเสิร์ต)</option>
                    <option value="Exhibition">Exhibition (นิทรรศการ/เอ็กซ์โป)</option>
                    <option value="Other">Other (กิจกรรมอื่นๆ)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-neutral-950 border border-neutral-850 rounded mt-5">
                  <span className="text-[10px] font-mono text-neutral-400">สถานะเปิดแสดงผล</span>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                      isActive ? "bg-emerald-500" : "bg-neutral-800"
                    }`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ${
                      isActive ? "translate-x-4" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-850 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 rounded text-xs cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold cursor-pointer shadow-lg shadow-amber-900/10"
                >
                  บันทึกการปรับปรุง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
