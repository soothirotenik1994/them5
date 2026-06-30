import React, { useState } from "react";
import { WebSettings, BlockedDate } from "../context/SettingsContext";
import { 
  ShieldAlert, Calendar, Plus, Trash2, CheckCircle2, 
  AlertCircle, HelpCircle, Loader2, Info
} from "lucide-react";

interface BlockedDatesTabContentProps {
  settings: WebSettings;
  updateSettings: (newSettings: WebSettings) => Promise<boolean>;
}

export default function BlockedDatesTabContent({ settings, updateSettings }: BlockedDatesTabContentProps) {
  const [dateInput, setDateInput] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("all");
  const [noteInput, setNoteInput] = useState("");
  
  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const blockedList = settings.blockedDates || [];
  const rooms = settings.rooms || [];

  const handleAddBlockedDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateInput) {
      alert("กรุณาระบุวันที่ต้องการปิดจอง");
      return;
    }

    // Check if duplicate date and roomId combination exists
    const isDuplicate = blockedList.some(
      (b) => b.date === dateInput && b.roomId === roomIdInput
    );
    if (isDuplicate) {
      setStatus("error");
      setStatusMsg("วันที่และประเภทห้องนี้ถูกตั้งปิดรับจองไว้เรียบร้อยแล้วครับ");
      return;
    }

    setActionLoading(true);
    setStatus("idle");

    try {
      const newBlocked: BlockedDate = {
        id: "bd-" + Date.now(),
        date: dateInput,
        roomId: roomIdInput,
        note: noteInput || "ปิดการรับจองชั่วคราว"
      };

      const updatedSettings: WebSettings = {
        ...settings,
        blockedDates: [...blockedList, newBlocked]
      };

      const success = await updateSettings(updatedSettings);
      if (success) {
        setStatus("success");
        setStatusMsg("เพิ่มวันปิดการรับจองห้องพักสำเร็จเรียบร้อยแล้ว");
        // Clear inputs
        setDateInput("");
        setNoteInput("");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setStatusMsg("ไม่สามารถบันทึกข้อมูลไปยังเซิร์ฟเวอร์ได้");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setStatusMsg("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBlockedDate = async (id: string) => {
    if (!window.confirm("คุณต้องการเปิดรับการจองสำหรับวันนี้อีกครั้งใช่หรือไม่?")) {
      return;
    }

    setActionLoading(true);
    setStatus("idle");

    try {
      const updatedSettings: WebSettings = {
        ...settings,
        blockedDates: blockedList.filter((b) => b.id !== id)
      };

      const success = await updateSettings(updatedSettings);
      if (success) {
        setStatus("success");
        setStatusMsg("เปิดการจองห้องพักกลับมาสำเร็จแล้ว");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setStatusMsg("ไม่สามารถอัปเดตข้อมูลบนเซิร์ฟเวอร์ได้");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setStatusMsg("เกิดข้อผิดพลาดในการลบรายการ");
    } finally {
      setActionLoading(false);
    }
  };

  const getRoomName = (id: string) => {
    if (id === "all") return "ทุกประเภทห้องพัก (All Rooms)";
    const found = rooms.find((r) => r.id === id);
    return found ? `${found.thaiName} (${found.name})` : id;
  };

  return (
    <div className="space-y-6 animate-fade-in text-neutral-200">
      
      {/* Title */}
      <div className="border-b border-neutral-850 pb-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <ShieldAlert className="h-5 w-5 text-red-500 animate-pulse" />
          <span>ระบบกำหนดปิดรับจองตามวัน (Blocked Booking Dates Manager)</span>
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          ผู้ดูแลสามารถระบุวันที่ต้องการปิดรับจองในระบบ ไม่ว่าจะเป็นการปิดบำรุงรักษาอาคาร วันหยุดยาวของพนักงาน หรือปิดเพราะห้องพักเต็มในช่องทางอื่น
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form: Add Blocked Date (5 columns) */}
        <div className="lg:col-span-5 bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2 border-b border-neutral-850 pb-2.5">
            <Plus className="h-4 w-4 text-red-500" />
            <span>เพิ่มวันปิดรับจองใหม่ (Block New Date)</span>
          </h3>

          <form onSubmit={handleAddBlockedDate} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-xs text-neutral-450 font-mono">1. เลือกวันที่ต้องการปิดจอง (Date)</label>
              <input 
                type="date"
                required
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-450 font-mono">2. ห้องพักที่ได้รับผลกระทบ (Affected Room)</label>
              <select
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-red-500/50"
              >
                <option value="all" className="bg-neutral-900">ทุกประเภทห้องพัก (Block All Room Types)</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id} className="bg-neutral-900">
                    เฉพาะห้อง: {room.thaiName} ({room.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-450 font-mono">3. หมายเหตุ / เหตุผล (Reason / Note)</label>
              <textarea 
                rows={3}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-red-500/50"
                placeholder="เช่น ปิดซ่อมแซมสีห้องพัก, ปรับปรุงระบบน้ำชั่วคราว, จองเต็มนอกระบบแล้ว..."
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-2.5 bg-red-650 hover:bg-red-600 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer select-none disabled:opacity-50"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังดำเนินการ...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4" />
                  <span>ยืนยันเพิ่มวันปิดรับจอง 🚫</span>
                </>
              )}
            </button>

          </form>

          {status !== "idle" && (
            <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
              status === "success" 
                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" 
                : "bg-red-950/20 border-red-500/30 text-red-450"
            }`}>
              <div className="flex items-start space-x-1.5">
                {status === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                )}
                <span>{statusMsg}</span>
              </div>
            </div>
          )}

        </div>

        {/* Right List: Currently Blocked Dates (7 columns) */}
        <div className="lg:col-span-7 bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center justify-between border-b border-neutral-850 pb-2.5">
            <span className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-neutral-400" />
              <span>รายการวันปิดรับจองปัจจุบัน ({blockedList.length} วัน)</span>
            </span>
          </h3>

          {blockedList.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Info className="h-8 w-8 text-neutral-600 mx-auto" />
              <p className="text-xs text-neutral-500">
                ไม่มีการตั้งปิดรับจองวันใดๆ ในระบบครับ ลูกค้าสามารถจองห้องพักได้ตามปกติ
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
              {blockedList.map((blocked) => (
                <div 
                  key={blocked.id}
                  className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between hover:border-neutral-750 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-mono font-bold rounded">
                        📅 {blocked.date}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {getRoomName(blocked.roomId)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 font-sans pl-1">
                      <strong className="text-neutral-500">เหตุผล:</strong> {blocked.note}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteBlockedDate(blocked.id)}
                    disabled={actionLoading}
                    className="p-2 text-neutral-400 hover:text-red-500 bg-neutral-950 border border-neutral-850 rounded-lg hover:bg-neutral-900 transition-all cursor-pointer"
                    title="ลบวันปิดจองและเปิดรับจองปกติ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Guidelines */}
          <div className="p-3.5 bg-neutral-900 border border-neutral-850 rounded-lg text-[10px] text-neutral-450 space-y-1 leading-relaxed">
            <h4 className="font-bold text-neutral-350 flex items-center space-x-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-neutral-500" />
              <span>การประมวลผลของระบบ</span>
            </h4>
            <p>
              เมื่อมีการบล็อกวันที่ใดๆ บนระบบ ลูกค้าที่ทำจองผ่านหน้าบ้านและระบุวันเช็คอิน-เช็คเอาท์คาบเกี่ยวกับการปิดจอง จะไม่สามารถทำรายการขั้นตอนถัดไปได้ และระบบจะส่งสัญญาณเตือนอย่างชัดเจนเพื่อหลีกเลี่ยงการจองชนกัน (Overbooking)
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
