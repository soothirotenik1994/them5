import React, { useState } from "react";
import { WebSettings } from "../context/SettingsContext";
import { Handshake, Plus, Trash2, Edit2, Link, Globe, Check, Save, Upload, AlertCircle, RefreshCw } from "lucide-react";
import ImageUploadButton from "./ImageUploadButton";

interface PartnersTabContentProps {
  settings: WebSettings;
  updateSettings: (newSettings: WebSettings) => Promise<boolean>;
}

interface PartnerFormState {
  id: string;
  name: string;
  logoUrl: string;
  link: string;
  active: boolean;
}

export default function PartnersTabContent({ settings, updateSettings }: PartnersTabContentProps) {
  const currentPartners = settings.partners || [];

  const [partners, setPartners] = useState<any[]>(currentPartners);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for Add/Edit
  const [form, setForm] = useState<PartnerFormState>({
    id: "",
    name: "",
    logoUrl: "",
    link: "",
    active: true
  });

  const resetForm = () => {
    setForm({
      id: "",
      name: "",
      logoUrl: "",
      link: "",
      active: true
    });
    setEditingId(null);
  };

  const handleEdit = (partner: any) => {
    setEditingId(partner.id);
    setForm({
      id: partner.id,
      name: partner.name || "",
      logoUrl: partner.logoUrl || "",
      link: partner.link || "",
      active: partner.active !== false
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("คุณต้องการลบพาร์ทเนอร์นี้ใช่หรือไม่?")) return;

    const updatedList = partners.filter(p => p.id !== id);
    setPartners(updatedList);

    const updatedSettings: WebSettings = {
      ...settings,
      partners: updatedList
    };

    setIsSaving(true);
    const success = await updateSettings(updatedSettings);
    setIsSaving(false);

    if (success) {
      alert("ลบพาร์ทเนอร์สำเร็จ!");
    } else {
      alert("เกิดข้อขัดข้องในการลบ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("กรุณากรอกชื่อพาร์ทเนอร์");
      return;
    }

    let updatedList = [...partners];

    if (editingId) {
      // Edit mode
      updatedList = updatedList.map(p => p.id === editingId ? { ...p, ...form } : p);
    } else {
      // Add mode
      const newPartner = {
        ...form,
        id: "partner_" + Date.now()
      };
      updatedList.push(newPartner);
    }

    setPartners(updatedList);

    const updatedSettings: WebSettings = {
      ...settings,
      partners: updatedList
    };

    setIsSaving(true);
    const success = await updateSettings(updatedSettings);
    setIsSaving(false);

    if (success) {
      alert(editingId ? "แก้ไขพาร์ทเนอร์เรียบร้อย!" : "เพิ่มพาร์ทเนอร์ใหม่สำเร็จ!");
      resetForm();
    } else {
      alert("เกิดข้อขัดข้องในการบันทึก กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left text-sm md:text-base leading-relaxed">
      {/* Header */}
      <div className="border-b border-neutral-850 pb-4">
        <h3 className="text-xl md:text-2xl font-bold text-white flex items-center space-x-2">
          <Handshake className="h-6 w-6 text-emerald-400" />
          <span>ระบบจัดการข้อมูลพาร์ทเนอร์ (Partners / ผู้สนับสนุน)</span>
        </h3>
        <p className="text-xs md:text-sm text-neutral-450 font-light mt-1">
          คุณสามารถจัดการพาร์ทเนอร์ โลโก้ และลิงก์ปลายทาง โดยระบบจะนำไปแสดงผลที่ส่วนท้าย (Footer) ของหน้าเว็บไซต์หลักโดยอัตโนมัติ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-5">
          <form onSubmit={handleFormSubmit} className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 md:p-6 space-y-5 shadow-xl">
            <h4 className="text-base font-bold text-white border-b border-neutral-900 pb-2.5 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                {editingId ? <Edit2 className="h-5 w-5 text-amber-500" /> : <Plus className="h-5 w-5 text-emerald-500" />}
                <span>{editingId ? "แก้ไขพาร์ทเนอร์" : "เพิ่มพาร์ทเนอร์ใหม่"}</span>
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-mono text-neutral-400 hover:text-white underline cursor-pointer"
                >
                  ยกเลิกการแก้ไข
                </button>
              )}
            </h4>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs md:text-sm font-semibold text-neutral-300">ชื่อพาร์ทเนอร์ <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="เช่น IMPACT Arena, AirAsia"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-brick"
                required
              />
            </div>

            {/* Link URL */}
            <div className="space-y-1.5">
              <label className="text-xs md:text-sm font-semibold text-neutral-300 flex items-center space-x-1">
                <Link className="h-3.5 w-3.5 text-neutral-450" />
                <span>ลิงก์ของพาร์ทเนอร์ (Link URL - ไม่บังคับ)</span>
              </label>
              <input
                type="url"
                placeholder="เช่น https://www.impact.co.th"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-brick"
              />
            </div>

            {/* Logo Image URL & Upload */}
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-semibold text-neutral-300 block">รูปภาพโลโก้พาร์ทเนอร์ (Logo Image URL OR Upload)</label>
              
              {/* Preview of current logo upload */}
              {form.logoUrl && (
                <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-850 flex items-center justify-center h-20 relative overflow-hidden group">
                  <img
                    src={form.logoUrl}
                    alt="Logo Preview"
                    className="h-14 object-contain max-w-full"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, logoUrl: "" })}
                    className="absolute top-1 right-1 p-1 bg-red-950 text-red-400 hover:text-white rounded border border-red-900/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px]"
                  >
                    ลบรูป
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="URL รูปภาพโลโก้ หรืออัปโหลดไฟล์ด้านขวา"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-md px-3.5 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-brick"
                />
                <ImageUploadButton
                  onUploadSuccess={(url) => setForm({ ...form, logoUrl: url })}
                  label="อัปโหลด"
                />
              </div>
              <p className="text-[10px] text-neutral-500">แนะนำ: ใช้ภาพโลโก้พื้นหลังโปร่งใส (PNG) ขนาดความสูงประมาณ 50px-100px</p>
            </div>

            {/* Status active */}
            <div className="flex items-center space-x-2.5 pt-1">
              <input
                type="checkbox"
                id="partner-active"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="rounded border-neutral-800 bg-neutral-900 text-brick focus:ring-brick cursor-pointer h-4 w-4"
              />
              <label htmlFor="partner-active" className="text-xs md:text-sm text-neutral-300 font-medium cursor-pointer select-none">
                เปิดแสดงผลพาร์ทเนอร์นี้บนเว็บไซต์หลัก
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center space-x-2 py-2 bg-brick hover:bg-brick-dark text-white text-xs md:text-sm font-semibold rounded-md transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{editingId ? "บันทึกการแก้ไขพาร์ทเนอร์" : "เพิ่มพาร์ทเนอร์ใหม่"}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* List Panel */}
        <div className="lg:col-span-7">
          <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 md:p-6 space-y-4 shadow-xl">
            <h4 className="text-base font-bold text-white border-b border-neutral-900 pb-2.5 flex items-center justify-between">
              <span>รายชื่อพาร์ทเนอร์ทั้งหมด ({partners.length})</span>
            </h4>

            {partners.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-neutral-850 rounded-lg space-y-2">
                <Handshake className="h-8 w-8 text-neutral-600 mx-auto" />
                <p className="text-xs text-neutral-400 font-light">ยังไม่มีรายชื่อพาร์ทเนอร์ในระบบ</p>
                <p className="text-[10px] text-neutral-500">กรอกข้อมูลที่ฟอร์มด้านซ้ายเพื่อเพิ่มโลโก้พาร์ทเนอร์แรกของคุณ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {partners.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      editingId === p.id 
                        ? "bg-amber-950/20 border-amber-800/60 shadow-lg shadow-amber-950/10" 
                        : "bg-neutral-900 border-neutral-850 hover:border-neutral-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Logo Preview */}
                      <div className="h-12 w-20 flex items-center justify-center bg-neutral-950/80 rounded border border-neutral-800 p-1 shrink-0 overflow-hidden">
                        {p.logoUrl ? (
                          <img
                            src={p.logoUrl}
                            alt={p.name}
                            className="h-full object-contain max-h-10 max-w-full"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-[9px] font-mono text-neutral-500 font-medium text-center line-clamp-2">ไม่มีโลโก้</span>
                        )}
                      </div>

                      {/* Detail */}
                      <div className="flex-1 min-w-0 text-left">
                        <h5 className="text-xs md:text-sm font-semibold text-white truncate">{p.name}</h5>
                        {p.link ? (
                          <a
                            href={p.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-brick hover:underline flex items-center space-x-1.5 mt-0.5"
                          >
                            <Link className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[120px]">{p.link}</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-neutral-500 block mt-0.5">ไม่มีลิงก์</span>
                        )}
                      </div>

                      {/* Status badge */}
                      <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded-md font-bold uppercase shrink-0 ${
                        p.active !== false 
                          ? "bg-emerald-950/60 border border-emerald-900/60 text-emerald-400" 
                          : "bg-neutral-950 border border-neutral-800 text-neutral-500"
                      }`}>
                        {p.active !== false ? "ACTIVE" : "HIDDEN"}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-850 flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(p)}
                        className="px-2 py-1 bg-neutral-950 hover:bg-neutral-850 hover:text-white border border-neutral-800 text-[10px] text-neutral-400 font-mono rounded duration-150 cursor-pointer flex items-center space-x-1"
                        title="แก้ไขพาร์ทเนอร์"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>EDIT</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="px-2 py-1 bg-red-950/40 hover:bg-red-950 hover:text-red-300 border border-red-900/40 text-[10px] text-red-400 font-mono rounded duration-150 cursor-pointer flex items-center space-x-1"
                        title="ลบพาร์ทเนอร์"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>DELETE</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
