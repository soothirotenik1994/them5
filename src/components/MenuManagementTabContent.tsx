import React, { useState } from "react";
import { 
  ArrowUp, ArrowDown, Eye, EyeOff, Plus, Trash2, Edit2, Check, X,
  Save, RotateCcw, Shield, SlidersHorizontal, CheckSquare, Square,
  LayoutDashboard, Hotel, Bed, Gift, Calendar, Coffee, HelpCircle, 
  MessageSquare, Images, User, ShieldCheck, Sparkles, ShieldAlert, 
  Ticket, Wallpaper, Handshake, Database, Bell, Settings, ExternalLink,
  Layers, Tag, Info, AlertTriangle, FileText, Receipt, Printer, Calculator, Building
} from "lucide-react";
import { AdminMenuItemConfig, AdminRoleConfig } from "../types";
import { useSettings, defaultAdminMenuConfig, defaultAdminRoles } from "../context/SettingsContext";

interface MenuManagementTabContentProps {
  currentAdminRole?: string;
  theme?: "light" | "dark";
}

// Available icon options for user to pick
export const AVAILABLE_ICONS: { [key: string]: { label: string; component: React.ComponentType<{ className?: string }> } } = {
  LayoutDashboard: { label: "แดชบอร์ดสรุป", component: LayoutDashboard },
  Hotel: { label: "โรงแรม", component: Hotel },
  Bed: { label: "ห้องพัก", component: Bed },
  Gift: { label: "โปรโมชั่น/ของขวัญ", component: Gift },
  Calendar: { label: "ปฏิทิน/การจอง", component: Calendar },
  FileText: { label: "ใบกำกับภาษี/ใบเสนอราคา", component: FileText },
  Receipt: { label: "ใบเสร็จรับเงิน", component: Receipt },
  Calculator: { label: "การคำนวณ/การเงิน", component: Calculator },
  Printer: { label: "การพิมพ์/เอกสาร", component: Printer },
  Building: { label: "บริษัท/อาคาร", component: Building },
  Coffee: { label: "สิ่งอำนวยความสะดวก", component: Coffee },
  HelpCircle: { label: "คำถามที่พบบ่อย", component: HelpCircle },
  MessageSquare: { label: "รีวิว/ข้อความ", component: MessageSquare },
  Images: { label: "รูปภาพแกลเลอรี", component: Images },
  User: { label: "สมาชิก/ผู้ใช้", component: User },
  ShieldCheck: { label: "ความปลอดภัย/สิทธิ์", component: ShieldCheck },
  Sparkles: { label: "อีเวนต์/พิเศษ", component: Sparkles },
  ShieldAlert: { label: "การปิดกั้น/เตือน", component: ShieldAlert },
  Ticket: { label: "คูปอง/ตั๋ว", component: Ticket },
  Wallpaper: { label: "พื้นหลัง/ตกแต่ง", component: Wallpaper },
  Handshake: { label: "พาร์ทเนอร์/พันธมิตร", component: Handshake },
  Database: { label: "ฐานข้อมูล", component: Database },
  Bell: { label: "การแจ้งเตือน", component: Bell },
  SlidersHorizontal: { label: "การตั้งค่า/จัดการเมนู", component: SlidersHorizontal },
  Settings: { label: "ตั้งค่าทั่วไป", component: Settings },
  Layers: { label: "ชั้นข้อมูล", component: Layers }
};

export function renderDynamicIcon(iconName: string, className = "h-4 w-4") {
  const IconItem = AVAILABLE_ICONS[iconName]?.component || LayoutDashboard;
  return <IconItem className={className} />;
}

export default function MenuManagementTabContent({ currentAdminRole = "Super Admin", theme = "light" }: MenuManagementTabContentProps) {
  const { settings, updateSettings, showToast } = useSettings();

  // Active view: "menus" | "roles"
  const [subTab, setSubTab] = useState<"menus" | "roles">("menus");

  // Local editable copies
  const [menuItems, setMenuItems] = useState<AdminMenuItemConfig[]>(() => {
    const list = settings.adminMenuConfig && settings.adminMenuConfig.length > 0 
      ? settings.adminMenuConfig 
      : defaultAdminMenuConfig;
    return [...list].sort((a, b) => a.order - b.order);
  });

  const [roles, setRoles] = useState<AdminRoleConfig[]>(() => {
    return settings.adminRoles && settings.adminRoles.length > 0
      ? settings.adminRoles
      : defaultAdminRoles;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Edit / Add modal state for Menu Item
  const [editingItem, setEditingItem] = useState<AdminMenuItemConfig | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);

  // Edit / Add modal state for Role Class
  const [editingRole, setEditingRole] = useState<AdminRoleConfig | null>(null);
  const [isNewRole, setIsNewRole] = useState(false);

  // Filter state for searching
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const isDark = theme === "dark";

  // Reorder: Move item up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...menuItems];
    const temp = newItems[index - 1];
    newItems[index - 1] = newItems[index];
    newItems[index] = temp;

    // Re-assign order indices
    const updated = newItems.map((item, idx) => ({ ...item, order: idx + 1 }));
    setMenuItems(updated);
    setHasChanges(true);
  };

  // Reorder: Move item down
  const handleMoveDown = (index: number) => {
    if (index === menuItems.length - 1) return;
    const newItems = [...menuItems];
    const temp = newItems[index + 1];
    newItems[index + 1] = newItems[index];
    newItems[index] = temp;

    // Re-assign order indices
    const updated = newItems.map((item, idx) => ({ ...item, order: idx + 1 }));
    setMenuItems(updated);
    setHasChanges(true);
  };

  // Toggle visible
  const handleToggleVisible = (id: string) => {
    setMenuItems(prev => prev.map(m => m.id === id ? { ...m, visible: !m.visible } : m));
    setHasChanges(true);
  };

  // Quick toggle role access directly from row
  const handleToggleRoleAccess = (menuId: string, roleName: string) => {
    setMenuItems(prev => prev.map(m => {
      if (m.id !== menuId) return m;

      let currentRoles = [...(m.allowedRoles || [])];
      
      // If currently all ("*"), expanding to specific
      if (currentRoles.includes("*")) {
        currentRoles = roles.map(r => r.name);
      }

      if (currentRoles.includes(roleName)) {
        currentRoles = currentRoles.filter(r => r !== roleName);
      } else {
        currentRoles.push(roleName);
      }

      // If all roles are included, can normalize or keep
      return { ...m, allowedRoles: currentRoles };
    }));
    setHasChanges(true);
  };

  // Toggle "All Roles" for an item
  const handleToggleAllRoles = (menuId: string) => {
    setMenuItems(prev => prev.map(m => {
      if (m.id !== menuId) return m;
      const isAll = (m.allowedRoles || []).includes("*");
      return { ...m, allowedRoles: isAll ? ["Super Admin"] : ["*"] };
    }));
    setHasChanges(true);
  };

  // Save changes to Database (Firestore & server)
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updatedSettings = {
        ...settings,
        adminMenuConfig: menuItems,
        adminRoles: roles
      };

      const success = await updateSettings(updatedSettings);
      if (success) {
        setHasChanges(false);
        if (showToast) {
          showToast("บันทึกการจัดลำดับเมนูและกำหนดสิทธิ์ Role Class สำเร็จแล้ว", "success");
        }
      } else {
        if (showToast) {
          showToast("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง", "error");
        }
      }
    } catch (err: any) {
      console.error("Save menu config failed", err);
      if (showToast) {
        showToast("เกิดข้อผิดพลาด: " + err.message, "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (confirm("คุณต้องการรีเซ็ตลำดับเมนูและสิทธิ์การเข้าถึงทั้งหมดกลับเป็นค่าเริ่มต้นหรือไม่?")) {
      setMenuItems([...defaultAdminMenuConfig]);
      setRoles([...defaultAdminRoles]);
      setHasChanges(true);
    }
  };

  // Delete custom menu item
  const handleDeleteMenuItem = (id: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเมนูนี้ออกจากระบบ?")) {
      const filtered = menuItems.filter(m => m.id !== id).map((m, idx) => ({ ...m, order: idx + 1 }));
      setMenuItems(filtered);
      setHasChanges(true);
    }
  };

  // Save single menu item from modal
  const handleSaveModalItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!editingItem.label.trim()) {
      alert("กรุณาระบุชื่อเมนู");
      return;
    }
    if (!editingItem.id.trim()) {
      alert("กรุณาระบุรหัสเมนู (Key ID)");
      return;
    }

    const cleanId = editingItem.id.trim().toLowerCase().replace(/\s+/g, "_");

    if (isNewItem) {
      // Check duplicate
      if (menuItems.some(m => m.id === cleanId)) {
        alert("รหัสเมนูนี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น");
        return;
      }
      const newItem: AdminMenuItemConfig = {
        ...editingItem,
        id: cleanId,
        order: menuItems.length + 1,
        allowedRoles: editingItem.allowedRoles.length > 0 ? editingItem.allowedRoles : ["*"],
        visible: editingItem.visible !== false,
        isSystem: false
      };
      setMenuItems([...menuItems, newItem]);
    } else {
      setMenuItems(prev => prev.map(m => m.id === editingItem.id ? editingItem : m));
    }

    setEditingItem(null);
    setIsNewItem(false);
    setHasChanges(true);
  };

  // Save single role from modal
  const handleSaveModalRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    if (!editingRole.name.trim()) {
      alert("กรุณาระบุชื่อ Role Class");
      return;
    }

    if (isNewRole) {
      const cleanId = `role_${editingRole.name.trim().toLowerCase().replace(/\s+/g, "_")}`;
      if (roles.some(r => r.name.toLowerCase() === editingRole.name.trim().toLowerCase())) {
        alert("ชื่อ Role นี้มีอยู่แล้ว");
        return;
      }
      const newRole: AdminRoleConfig = {
        ...editingRole,
        id: cleanId,
        name: editingRole.name.trim(),
        badgeColor: editingRole.badgeColor || "amber",
        isSystem: false
      };
      setRoles([...roles, newRole]);
    } else {
      setRoles(prev => prev.map(r => r.id === editingRole.id ? editingRole : r));
    }

    setEditingRole(null);
    setIsNewRole(false);
    setHasChanges(true);
  };

  // Delete custom role
  const handleDeleteRole = (id: string, name: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสิทธิ์ Role: "${name}"?`)) {
      setRoles(prev => prev.filter(r => r.id !== id));
      // Remove this role from allowedRoles of all menus
      setMenuItems(prev => prev.map(m => ({
        ...m,
        allowedRoles: (m.allowedRoles || []).filter(r => r !== name)
      })));
      setHasChanges(true);
    }
  };

  // Filtered menu items
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (roleFilter === "all") return true;
    if ((item.allowedRoles || []).includes("*")) return true;
    return (item.allowedRoles || []).includes(roleFilter);
  });

  const getRoleBadgeClass = (color?: string) => {
    switch (color) {
      case "amber": return isDark ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-amber-100 text-amber-800 border-amber-300";
      case "cyan": return isDark ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-cyan-100 text-cyan-800 border-cyan-300";
      case "emerald": return isDark ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "purple": return isDark ? "bg-purple-500/20 text-purple-300 border-purple-500/40" : "bg-purple-100 text-purple-800 border-purple-300";
      case "rose": return isDark ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-rose-100 text-rose-800 border-rose-300";
      case "blue": return isDark ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-blue-100 text-blue-800 border-blue-300";
      default: return isDark ? "bg-zinc-700/40 text-zinc-300 border-zinc-600/40" : "bg-zinc-100 text-zinc-800 border-zinc-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border ${isDark ? "bg-neutral-900/90 border-neutral-800" : "bg-white border-neutral-200"} shadow-sm`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-[#cb5a1a]/15 text-[#cb5a1a]">
                <SlidersHorizontal className="h-5 w-5" />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#cb5a1a]">
                ADMIN MENU & ACCESS CONTROL
              </span>
            </div>
            <h2 className={`text-xl sm:text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-neutral-900"}`}>
              จัดลำดับเมนูและกำหนดสิทธิ์ Role Class
            </h2>
            <p className={`text-sm mt-1 max-w-3xl ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
              สามารถกดเลื่อนตำแหน่งเมนูขึ้น-ลง (Move Up / Down) กำหนดสิทธิ์ให้แต่ละ Role Class (เช่น Super Admin, Loft Admin, Front Desk) เห็นเฉพาะเมนูที่ได้รับอนุญาต และบันทึกข้อมูลจริงลงฐานข้อมูลได้ทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetToDefault}
              className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center space-x-1.5 transition-colors cursor-pointer ${
                isDark 
                  ? "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700" 
                  : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`}
              title="รีเซ็ตค่าเริ่มต้น"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>รีเซ็ตค่าเริ่มต้น</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg flex items-center space-x-2 transition-all cursor-pointer ${
                hasChanges 
                  ? "bg-[#cb5a1a] hover:bg-[#b04a12] text-white shadow-[#cb5a1a]/25 animate-pulse" 
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20"
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>บันทึกข้อมูลจริงสู่ระบบ {hasChanges ? "(มีข้อมูลรอเซฟ)" : ""}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Change reminder indicator */}
        {hasChanges && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-500">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>คุณมีการเปลี่ยนแปลงลำดับเมนูหรือสิทธิ์เข้าถึง อย่าลืมกด <strong>"บันทึกข้อมูลจริงสู่ระบบ"</strong> เพื่อให้มีผลถาวร</span>
            </div>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-3 py-1 bg-amber-500 text-neutral-950 font-bold rounded-lg hover:bg-amber-400 transition-colors"
            >
              บันทึกเดี๋ยวนี้
            </button>
          </div>
        )}

        {/* Sub-tab Navigation */}
        <div className="flex items-center space-x-3 mt-6 border-b border-neutral-200 dark:border-neutral-800 pb-2">
          <button
            type="button"
            onClick={() => setSubTab("menus")}
            className={`pb-2 px-3 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
              subTab === "menus"
                ? "border-[#cb5a1a] text-[#cb5a1a]"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>จัดการลำดับและสิทธิ์เมนู ({menuItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("roles")}
            className={`pb-2 px-3 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
              subTab === "roles"
                ? "border-[#cb5a1a] text-[#cb5a1a]"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>กำหนดกลุ่มสิทธิ์ Role Classes ({roles.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: MENU ITEMS REORDERING & ROLE VISIBILITY                        */}
      {/* ========================================================================= */}
      {subTab === "menus" && (
        <div className="space-y-4">
          {/* Controls toolbar */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
            isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
          }`}>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <input
                type="text"
                placeholder="ค้นหาชื่อเมนู หรือ ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`px-3 py-2 rounded-lg text-xs border focus:outline-none focus:border-[#cb5a1a] w-48 sm:w-64 ${
                  isDark ? "bg-neutral-950 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-200 text-neutral-900"
                }`}
              />

              {/* Role filter dropdown */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={`px-3 py-2 rounded-lg text-xs border focus:outline-none focus:border-[#cb5a1a] cursor-pointer ${
                  isDark ? "bg-neutral-950 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-200 text-neutral-900"
                }`}
              >
                <option value="all">กรองดูทุกสิทธิ์ (All Roles)</option>
                {roles.map(r => (
                  <option key={r.id} value={r.name}>เฉพาะสิทธิ์: {r.name}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingItem({
                  id: `menu_${Date.now().toString().slice(-4)}`,
                  label: "",
                  iconName: "LayoutDashboard",
                  order: menuItems.length + 1,
                  allowedRoles: ["*"],
                  visible: true,
                  badgeType: "none",
                  isSystem: false
                });
                setIsNewItem(true);
              }}
              className="px-4 py-2 bg-[#cb5a1a] hover:bg-[#b04a12] text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>+ เพิ่มเมนูใหม่ (Add Menu)</span>
            </button>
          </div>

          {/* Menu Items Table Card */}
          <div className={`rounded-xl border overflow-hidden shadow-sm ${
            isDark ? "bg-neutral-950 border-neutral-850" : "bg-white border-neutral-200"
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase font-mono text-[10px] border-b ${
                  isDark ? "bg-neutral-900/70 text-neutral-400 border-neutral-850" : "bg-neutral-100 text-neutral-600 border-neutral-200"
                }`}>
                  <tr>
                    <th className="px-4 py-3.5 text-center w-28">ลำดับ / เลื่อนตำแหน่ง</th>
                    <th className="px-4 py-3.5">ไอคอน & ชื่อเมนู (Sidebar Label)</th>
                    <th className="px-4 py-3.5">แท็บ ID</th>
                    <th className="px-4 py-3.5">สิทธิ์ Role Class ที่อนุญาตให้เห็น</th>
                    <th className="px-4 py-3.5 text-center">สถานะแสดงผล</th>
                    <th className="px-4 py-3.5 text-right">การจัดการ</th>
                  </tr>
                </thead>

                <tbody className={`divide-y ${isDark ? "divide-neutral-900" : "divide-neutral-100"}`}>
                  {filteredMenuItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-neutral-400 text-xs">
                        ไม่พบรายการเมนูที่ตรงกับคำค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredMenuItems.map((item, index) => {
                      const isFirst = index === 0;
                      const isLast = index === filteredMenuItems.length - 1;
                      const isAllRoles = (item.allowedRoles || []).includes("*");

                      return (
                        <tr 
                          key={item.id} 
                          className={`transition-colors ${
                            isDark ? "hover:bg-neutral-900/60" : "hover:bg-neutral-50"
                          } ${!item.visible ? "opacity-50" : ""}`}
                        >
                          {/* Reorder Buttons (Move Up / Down) */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <span className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs ${
                                isDark ? "bg-neutral-900 text-neutral-300" : "bg-neutral-100 text-neutral-700"
                              }`}>
                                {item.order}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleMoveUp(index)}
                                disabled={isFirst}
                                title="เลื่อนขึ้นบน"
                                className={`w-7 h-7 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                                  isFirst 
                                    ? "opacity-30 cursor-not-allowed border-transparent text-neutral-500" 
                                    : isDark 
                                      ? "bg-neutral-900 hover:bg-[#cb5a1a] hover:text-white border-neutral-800 text-neutral-300" 
                                      : "bg-white hover:bg-[#cb5a1a] hover:text-white border-neutral-300 text-neutral-700"
                                }`}
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMoveDown(index)}
                                disabled={isLast}
                                title="เลื่อนลงล่าง"
                                className={`w-7 h-7 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                                  isLast 
                                    ? "opacity-30 cursor-not-allowed border-transparent text-neutral-500" 
                                    : isDark 
                                      ? "bg-neutral-900 hover:bg-[#cb5a1a] hover:text-white border-neutral-800 text-neutral-300" 
                                      : "bg-white hover:bg-[#cb5a1a] hover:text-white border-neutral-300 text-neutral-700"
                                }`}
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* Menu Icon and Label */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                isDark ? "bg-neutral-900 border-neutral-800 text-[#cb5a1a]" : "bg-neutral-100 border-neutral-200 text-[#cb5a1a]"
                              }`}>
                                {renderDynamicIcon(item.iconName, "h-4 w-4")}
                              </div>
                              <div>
                                <span className={`font-semibold block ${isDark ? "text-white" : "text-neutral-900"}`}>
                                  {item.label}
                                </span>
                                {item.customUrl && (
                                  <span className="text-[10px] text-blue-500 flex items-center space-x-1 mt-0.5">
                                    <ExternalLink className="h-3 w-3" />
                                    <span className="truncate max-w-xs">{item.customUrl}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Tab Key ID */}
                          <td className="px-4 py-3.5 font-mono text-[11px] text-neutral-400">
                            <code>{item.id}</code>
                          </td>

                          {/* Role Checkbox & Tags */}
                          <td className="px-4 py-3.5">
                            <div className="space-y-1.5">
                              {/* Quick toggle for all */}
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleAllRoles(item.id)}
                                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border transition-colors cursor-pointer flex items-center space-x-1 ${
                                    isAllRoles 
                                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
                                      : isDark ? "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white" : "bg-neutral-100 text-neutral-600 border-neutral-200"
                                  }`}
                                >
                                  {isAllRoles ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                                  <span>ทุกสิทธิ์ (All Roles)</span>
                                </button>
                              </div>

                              {/* Interactive badges for specific roles */}
                              <div className="flex flex-wrap gap-1">
                                {roles.map(r => {
                                  const hasAccess = isAllRoles || (item.allowedRoles || []).includes(r.name);
                                  return (
                                    <button
                                      key={r.id}
                                      type="button"
                                      onClick={() => handleToggleRoleAccess(item.id, r.name)}
                                      className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition-all cursor-pointer ${
                                        hasAccess 
                                          ? getRoleBadgeClass(r.badgeColor)
                                          : isDark 
                                            ? "bg-neutral-900/40 text-neutral-500 border-neutral-850 hover:border-neutral-700" 
                                            : "bg-neutral-100/60 text-neutral-400 border-neutral-200 hover:border-neutral-300"
                                      }`}
                                      title={hasAccess ? `คลิกเพื่อนำสิทธิ์ของ ${r.name} ออก` : `คลิกเพื่อให้ ${r.name} เข้าถึงเมนูนี้`}
                                    >
                                      {hasAccess ? "✓ " : "+ "}{r.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </td>

                          {/* Visibility status */}
                          <td className="px-4 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleVisible(item.id)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer inline-flex items-center space-x-1 ${
                                item.visible 
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" 
                                  : "bg-rose-500/10 text-rose-500 border-rose-500/30"
                              }`}
                              title={item.visible ? "เมนูกำลังแสดงผล (คลิกเพื่อซ่อน)" : "เมนูกำลังถูกซ่อน (คลิกเพื่อแสดง)"}
                            >
                              {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              <span className="text-[10px] font-medium hidden sm:inline">
                                {item.visible ? "แสดง" : "ซ่อน"}
                              </span>
                            </button>
                          </td>

                          {/* Action Buttons */}
                          <td className="px-4 py-3.5 text-right space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem({ ...item });
                                setIsNewItem(false);
                              }}
                              className={`p-1.5 px-2.5 rounded text-[11px] font-medium border transition-all cursor-pointer inline-flex items-center space-x-1 ${
                                isDark 
                                  ? "bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800" 
                                  : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 border-neutral-200"
                              }`}
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>แก้ไข</span>
                            </button>

                            {!item.isSystem && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMenuItem(item.id)}
                                className="p-1.5 px-2 rounded text-[11px] font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer inline-flex items-center space-x-1"
                                title="ลบเมนูนี้"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: ROLE CLASSES MANAGEMENT                                        */}
      {/* ========================================================================= */}
      {subTab === "roles" && (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
            isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"
          }`}>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>
                รายชื่อสิทธิ์ Role Class ทั้งหมดในระบบ
              </h3>
              <p className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                Role Classes เหล่านี้จะนำไปกำหนดในการจัดการสิทธิ์แอดมิน (Admin Users) และใช้กรองการมองเห็นเมนู
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingRole({
                  id: `role_${Date.now()}`,
                  name: "",
                  description: "",
                  badgeColor: "amber",
                  isSystem: false
                });
                setIsNewRole(true);
              }}
              className="px-4 py-2 bg-[#cb5a1a] hover:bg-[#b04a12] text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>+ เพิ่ม Role Class ใหม่</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(r => {
              // Count how many menus this role can access
              const accessibleMenuCount = menuItems.filter(m => 
                m.visible && ((m.allowedRoles || []).includes("*") || (m.allowedRoles || []).includes(r.name))
              ).length;

              return (
                <div 
                  key={r.id}
                  className={`p-5 rounded-xl border relative flex flex-col justify-between transition-all ${
                    isDark ? "bg-neutral-950 border-neutral-850 hover:border-neutral-750" : "bg-white border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-md font-mono font-bold text-xs border ${getRoleBadgeClass(r.badgeColor)}`}>
                        {r.name}
                      </span>

                      {r.isSystem && (
                        <span className="text-[10px] font-mono uppercase bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">
                          System Role
                        </span>
                      )}
                    </div>

                    <p className={`text-xs mt-3 line-clamp-2 ${isDark ? "text-neutral-300" : "text-neutral-600"}`}>
                      {r.description || "ไม่มีคำอธิบายเพิ่มเติม"}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800 dark:border-neutral-850 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400 font-mono">
                      เห็นได้ <strong className="text-[#cb5a1a]">{accessibleMenuCount}</strong> เมนู
                    </span>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRole({ ...r });
                          setIsNewRole(false);
                        }}
                        className={`p-1 px-2 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                          isDark ? "bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white" : "bg-neutral-100 border-neutral-200 text-neutral-700 hover:text-neutral-900"
                        }`}
                      >
                        แก้ไข
                      </button>

                      {!r.isSystem && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(r.id, r.name)}
                          className="p-1 px-2 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer"
                          title="ลบ Role"
                        >
                          ลบ
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / ADD MENU ITEM                                              */}
      {/* ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
            isDark ? "bg-[#141518] text-white border-neutral-800" : "bg-white text-neutral-900 border-neutral-200"
          }`}>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="h-5 w-5 text-[#cb5a1a]" />
                <h3 className="text-base font-bold">
                  {isNewItem ? "เพิ่มเมนูใหม่เข้าสู่ระบบ (Add Menu)" : "แก้ไขข้อมูลเมนู (Edit Menu)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1 font-medium">ชื่อเมนู (Display Label) *</label>
                <input
                  type="text"
                  required
                  value={editingItem.label}
                  onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                  placeholder="เช่น ตรวจสอบสต็อก, รายการแม่บ้าน, เมนูลัด..."
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-[#cb5a1a] ${
                    isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-neutral-900"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">รหัสเมนู / Tab ID *</label>
                  <input
                    type="text"
                    required
                    disabled={!isNewItem && editingItem.isSystem}
                    value={editingItem.id}
                    onChange={(e) => setEditingItem({ ...editingItem, id: e.target.value })}
                    placeholder="เช่น custom_reports"
                    className={`w-full px-3 py-2 rounded-lg border font-mono focus:outline-none focus:border-[#cb5a1a] ${
                      !isNewItem && editingItem.isSystem ? "opacity-50 cursor-not-allowed" : ""
                    } ${isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-neutral-900"}`}
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">ลำดับตำแหน่ง (Order)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingItem.order}
                    onChange={(e) => setEditingItem({ ...editingItem, order: parseInt(e.target.value) || 1 })}
                    className={`w-full px-3 py-2 rounded-lg border font-mono focus:outline-none focus:border-[#cb5a1a] ${
                      isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-neutral-900"
                    }`}
                  />
                </div>
              </div>

              {/* Icon selector */}
              <div>
                <label className="block text-neutral-400 mb-1 font-medium">เลือกไอคอน (Menu Icon)</label>
                <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 max-h-36 overflow-y-auto p-2 rounded-lg border border-neutral-800 bg-neutral-950">
                  {Object.entries(AVAILABLE_ICONS).map(([key, item]) => {
                    const isSelected = editingItem.iconName === key;
                    const IconCmp = item.component;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEditingItem({ ...editingItem, iconName: key })}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-[#cb5a1a]/20 border-[#cb5a1a] text-[#cb5a1a]" 
                            : "border-neutral-850 hover:border-neutral-700 text-neutral-400 hover:text-white"
                        }`}
                        title={item.label}
                      >
                        <IconCmp className="h-5 w-5" />
                        <span className="text-[8px] truncate max-w-full font-mono">{key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Role permissions selection */}
              <div>
                <label className="block text-neutral-400 mb-1 font-medium">กำหนดสิทธิ์ Role Classes ที่เข้าถึงได้</label>
                <div className="space-y-2 p-3 rounded-lg border border-neutral-800 bg-neutral-950">
                  <label className="flex items-center space-x-2 cursor-pointer pb-2 border-b border-neutral-850">
                    <input
                      type="checkbox"
                      checked={(editingItem.allowedRoles || []).includes("*")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingItem({ ...editingItem, allowedRoles: ["*"] });
                        } else {
                          setEditingItem({ ...editingItem, allowedRoles: ["Super Admin"] });
                        }
                      }}
                      className="rounded accent-[#cb5a1a]"
                    />
                    <span className="font-semibold text-emerald-400">ทุกสิทธิ์สามารถเข้าถึงได้ (* All Roles)</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {roles.map(r => {
                      const isAll = (editingItem.allowedRoles || []).includes("*");
                      const checked = isAll || (editingItem.allowedRoles || []).includes(r.name);

                      return (
                        <label key={r.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={isAll}
                            checked={checked}
                            onChange={(e) => {
                              let list = [...(editingItem.allowedRoles || [])];
                              if (list.includes("*")) {
                                list = roles.map(role => role.name);
                              }
                              if (e.target.checked) {
                                if (!list.includes(r.name)) list.push(r.name);
                              } else {
                                list = list.filter(name => name !== r.name);
                              }
                              setEditingItem({ ...editingItem, allowedRoles: list });
                            }}
                            className="rounded accent-[#cb5a1a]"
                          />
                          <span className={checked ? "text-white" : "text-neutral-400"}>{r.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Optional Custom URL (for external links) */}
              <div>
                <label className="block text-neutral-400 mb-1 font-medium">ลิงก์ภายนอก / เว็บไซต์เชื่อมโยง (ถ้ามี - ปล่อยว่างถ้าเป็นแท็บระบบ)</label>
                <input
                  type="text"
                  value={editingItem.customUrl || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, customUrl: e.target.value })}
                  placeholder="เช่น https://cctv.m5residence.com หรือ https://pos.example.com"
                  className={`w-full px-3 py-2 rounded-lg border font-mono focus:outline-none focus:border-[#cb5a1a] ${
                    isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-neutral-900"
                  }`}
                />
              </div>

              {/* Toggle visible */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-neutral-300 font-medium">สถานะแสดงผลบนเมนู (Visible)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.visible !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, visible: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#cb5a1a]"></div>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#cb5a1a] hover:bg-[#b04a12] text-white font-bold rounded-lg shadow cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>บันทึกการแก้ไขเมนู</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / ADD ROLE CLASS                                              */}
      {/* ========================================================================= */}
      {editingRole && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
            isDark ? "bg-[#141518] text-white border-neutral-800" : "bg-white text-neutral-900 border-neutral-200"
          }`}>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-[#cb5a1a]" />
                <h3 className="text-base font-bold">
                  {isNewRole ? "เพิ่ม Role Class สิทธิ์ใหม่" : "แก้ไขข้อมูล Role Class"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRole(null)}
                className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalRole} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1 font-medium">ชื่อ Role Class (เช่น Front Desk, Manager) *</label>
                <input
                  type="text"
                  required
                  value={editingRole.name}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  placeholder="เช่น Front Desk / Reception"
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-[#cb5a1a] ${
                    isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-neutral-900"
                  }`}
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-medium">คำอธิบายหน้าที่ความรับผิดชอบ</label>
                <textarea
                  rows={2}
                  value={editingRole.description || ""}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  placeholder="เช่น ดูแลรับส่งแขก ดูแลปฏิทิน และเช็คอินห้องพัก"
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-[#cb5a1a] ${
                    isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-neutral-900"
                  }`}
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-medium">สีป้ายสัญลักษณ์ (Badge Color)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "amber", label: "สีส้มทอง (Amber)" },
                    { id: "cyan", label: "สีฟ้าลอฟต์ (Cyan)" },
                    { id: "emerald", label: "สีเขียว (Emerald)" },
                    { id: "purple", label: "สีม่วง (Purple)" },
                    { id: "rose", label: "สีชมพูแดง (Rose)" },
                    { id: "blue", label: "สีน้ำเงิน (Blue)" },
                    { id: "zinc", label: "สีเทาคลาสสิก (Zinc)" }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setEditingRole({ ...editingRole, badgeColor: c.id as any })}
                      className={`p-2 rounded-lg border text-center font-mono text-[10px] font-bold transition-all cursor-pointer ${
                        editingRole.badgeColor === c.id 
                          ? "ring-2 ring-[#cb5a1a] border-white" 
                          : "border-neutral-800"
                      } ${getRoleBadgeClass(c.id)}`}
                    >
                      {c.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#cb5a1a] hover:bg-[#b04a12] text-white font-bold rounded-lg shadow cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>บันทึก Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
