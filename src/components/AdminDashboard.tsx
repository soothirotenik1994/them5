import React, { useState } from "react";
import { 
  X, LayoutDashboard, Hotel, Bed, Gift, Calendar, 
  DollarSign, Plus, Trash2, Check, RefreshCw, Key, LogOut,
  Sparkles, ShieldCheck, Mail, Phone, MapPin, User, Edit2, AlertCircle, Clock,
  Coffee, HelpCircle, MessageSquare, Images, ShieldAlert, Tag, Ticket, Wallpaper,
  Search, Home, Bell, Sun, Moon, Database
} from "lucide-react";
import { useSettings, BookingRecord, WebSettings, defaultGallery } from "../context/SettingsContext";
import { RoomType } from "../types";
import CalendarTabContent from "./CalendarTabContent";
import SmtpTabContent from "./SmtpTabContent";
import BlockedDatesTabContent from "./BlockedDatesTabContent";
import CouponsTabContent from "./CouponsTabContent";
import BackgroundsTabContent from "./BackgroundsTabContent";
import SeoTabContent from "./SeoTabContent";
import ImageUploadButton from "./ImageUploadButton";
import ImpactEventsTab from "./ImpactEventsTab";
import DirectusTabContent from "./DirectusTabContent";

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  isFullPage?: boolean;
}

export default function AdminDashboard({ isOpen, onClose, isFullPage = false }: AdminDashboardProps) {
  const { 
    settings, 
    bookings, 
    updateSettings, 
    updateBookingStatus, 
    updateBooking, 
    deleteBooking, 
    addBooking, 
    reseedDatabase,
    members,
    updateMemberOnServer,
    deleteMemberOnServer,
    addMemberOnServer,
    refreshSettings,
    dbStatus
  } = useSettings();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("m5_admin_authed") === "true";
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [adminUsers, setAdminUsers] = useState<any[]>(() => {
    try {
      const backup = localStorage.getItem("m5_admins_backup");
      return backup ? JSON.parse(backup) : [];
    } catch (e) {
      return [];
    }
  });
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<"dashboard" | "general" | "rooms" | "promotions" | "bookings" | "amenities" | "faqs" | "reviews" | "gallery" | "members" | "calendar" | "smtp" | "blocked" | "coupons" | "backgrounds" | "seo" | "admins" | "impact" | "directus">("dashboard");

  // Admin Theme state (defaulting to "light" loft clean theme per user picture mockup)
  const [adminTheme, setAdminTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("m5_admin_theme") as "light" | "dark") || "light";
  });

  const toggleAdminTheme = () => {
    const nextVal = adminTheme === "light" ? "dark" : "light";
    setAdminTheme(nextVal);
    localStorage.setItem("m5_admin_theme", nextVal);
  };

  const getTabTitleName = (tab: string) => {
    switch(tab) {
      case "dashboard": return "Dashboard (สรุปภาพรวม)";
      case "general": return "Hotel Settings (ตั้งค่าโรงแรม)";
      case "rooms": return "Room Types (จัดการประเภทห้องพัก)";
      case "promotions": return "Promotions (โปรโมชั่นแคมเปญ)";
      case "bookings": return "Booking List (รายการจอง)";
      case "calendar": return "Bookings Calendar (ปฏิทินการจอง)";
      case "amenities": return "Amenities (สิ่งอำนวยความสะดวก)";
      case "faqs": return "FAQs (คำถามที่พบบ่อย)";
      case "reviews": return "Reviews (บทวิจารณ์ลูกค้า)";
      case "gallery": return "Gallery (คลังรูปภาพ)";
      case "members": return "Members (จัดการระบบสมาชิก)";
      case "admins": return "Admin Users (จัดการสิทธิ์แอดมินหลังบ้าน)";
      case "blocked": return "Blackout Dates (วันปิดรับจอง)";
      case "coupons": return "Coupons (ส่วนลดคูปอง)";
      case "backgrounds": return "Backgrounds (พื้นหลังเว็บไซต์)";
      case "seo": return "SEO Settings (จัดการคีย์เวิร์ดกูเกิล)";
      case "smtp": return "SMTP Settings (ระบบส่งอีเมล)";
      default: return "Control Center";
    }
  };

  // Dynamic text size readability state ("ขยายดูหนังสือ")
  const [textLarge, setTextLarge] = useState(() => {
    return localStorage.getItem("m5_admin_text_large") === "true";
  });

  const handleToggleTextSize = () => {
    const newVal = !textLarge;
    setTextLarge(newVal);
    localStorage.setItem("m5_admin_text_large", String(newVal));
  };


  // Member management states
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memName, setMemName] = useState("");
  const [memEmail, setMemEmail] = useState("");
  const [memPhone, setMemPhone] = useState("");
  const [memTier, setMemTier] = useState<"Silver" | "Gold" | "Elite">("Silver");
  const [memPoints, setMemPoints] = useState(0);
  const [memBookingsCount, setMemBookingsCount] = useState(0);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  // Admin user management states
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [admUsername, setAdmUsername] = useState("");
  const [admPassword, setAdmPassword] = useState("");
  const [admName, setAdmName] = useState("");
  const [admRole, setAdmRole] = useState("General Admin");
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [deletingAmenityIdx, setDeletingAmenityIdx] = useState<number | null>(null);
  const [deletingPromoIdx, setDeletingPromoIdx] = useState<number | null>(null);
  const [deletingRoomIdx, setDeletingRoomIdx] = useState<number | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Edit states for forms
  const [generalEdit, setGeneralEdit] = useState({ ...settings.general });
  const [roomsEdit, setRoomsEdit] = useState<RoomType[]>(JSON.parse(JSON.stringify(settings.rooms)));
  const [promotionsEdit, setPromotionsEdit] = useState(JSON.parse(JSON.stringify(settings.promotions)));
  const [amenitiesEdit, setAmenitiesEdit] = useState(JSON.parse(JSON.stringify(settings.amenities || [])));
  const [faqsEdit, setFaqsEdit] = useState(JSON.parse(JSON.stringify(settings.faqs || [])));
  const [reviewsEdit, setReviewsEdit] = useState(JSON.parse(JSON.stringify(settings.reviews || [])));
  const [galleryEdit, setGalleryEdit] = useState(() => {
    const list = settings.gallery;
    return JSON.parse(JSON.stringify(Array.isArray(list) && list.length > 0 ? list : defaultGallery));
  });

  // Google Reviews Integration state
  const [googlePlaceIdEdit, setGooglePlaceIdEdit] = useState(settings.googlePlaceId || "ChIJXWlJMC-e4jARLqX9OidpWjY");
  const [googleReviewsEnabledEdit, setGoogleReviewsEnabledEdit] = useState(settings.googleReviewsEnabled !== undefined ? settings.googleReviewsEnabled : true);
  const [customApiKeyEdit, setCustomApiKeyEdit] = useState(settings.general?.googleReviewsApiKey || "");
  const [googleReviewsSyncIntervalEdit, setGoogleReviewsSyncIntervalEdit] = useState<"manual" | "daily" | "weekly" | "monthly">(settings.general?.googleReviewsSyncInterval || "manual");
  const [isSyncingReviews, setIsSyncingReviews] = useState(false);

  // SMTP Edit State
  const [smtpEdit, setSmtpEdit] = useState(() => {
    return settings.smtp || {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      user: "",
      pass: "",
      fromName: "The M5 Residence",
      fromEmail: "",
      adminNotifyEmail: "admin@m5residence.com"
    };
  });

  React.useEffect(() => {
    if (settings.smtp) {
      setSmtpEdit(settings.smtp);
    }
  }, [settings.smtp]);

  // Manual Booking Form state
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null);
  const [newBkGuestName, setNewBkGuestName] = useState("");
  const [newBkGuestEmail, setNewBkGuestEmail] = useState("");
  const [newBkGuestPhone, setNewBkGuestPhone] = useState("");
  const [newBkRoomType, setNewBkRoomType] = useState("deluxe");
  const [newBkCheckIn, setNewBkCheckIn] = useState("");
  const [newBkCheckOut, setNewBkCheckOut] = useState("");
  const [newBkGuests, setNewBkGuests] = useState(2);
  const [newBkSpecialRequest, setNewBkSpecialRequest] = useState("");

  // Add Room form state
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomId, setNewRoomId] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomThaiName, setNewRoomThaiName] = useState("");
  const [newRoomPrice, setNewRoomPrice] = useState(1500);
  const [newRoomSize, setNewRoomSize] = useState(35);
  const [newRoomCapacity, setNewRoomCapacity] = useState(2);
  const [newRoomBedType, setNewRoomBedType] = useState("เตียงคิงไซส์ 6 ฟุต (1 King Bed)");
  const [newRoomDesc, setNewRoomDesc] = useState("");
  const [newRoomLongDesc, setNewRoomLongDesc] = useState("");
  const [newRoomImageUrl, setNewRoomImageUrl] = useState("");
  const [newRoomAmenities, setNewRoomAmenities] = useState("Wi-Fi ความเร็วสูง, เครื่องปรับอากาศ, สมาร์ททีวี, ตู้เย็นมินิบาร์, เครื่องทำน้ำอุ่น");
  const [newRoomMatterportUrl, setNewRoomMatterportUrl] = useState("");

  // Helper to handle new room creation
  const handleAddNewRoomType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomId.trim()) {
      alert("กรุณาระบุรหัสอ้างอิงห้องพัก (Room ID เช่น royal_suite)");
      return;
    }
    if (!newRoomName.trim()) {
      alert("กรุณาระบุชื่อประเภทห้องพัก (EN)");
      return;
    }

    // Check duplicate ID
    const formattedId = newRoomId.trim().toLowerCase().replace(/\s+/g, "_");
    if (roomsEdit.some(r => r.id === formattedId)) {
      alert("รหัสห้องพัก (Room ID) นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น");
      return;
    }

    const newRoomObj: RoomType = {
      id: formattedId,
      name: newRoomName.trim(),
      thaiName: newRoomThaiName.trim() || newRoomName.trim(),
      price: Number(newRoomPrice) || 0,
      size: Number(newRoomSize) || 0,
      capacity: Number(newRoomCapacity) || 0,
      bedType: newRoomBedType.trim(),
      description: newRoomDesc.trim(),
      longDescription: newRoomLongDesc.trim(),
      imageUrl: newRoomImageUrl.trim(),
      amenities: newRoomAmenities.split(",").map(a => a.trim()).filter(Boolean),
      matterportUrl: newRoomMatterportUrl.trim() || undefined
    };

    setRoomsEdit([...roomsEdit, newRoomObj]);
    
    // Clear states
    setNewRoomId("");
    setNewRoomName("");
    setNewRoomThaiName("");
    setNewRoomPrice(1500);
    setNewRoomSize(35);
    setNewRoomCapacity(2);
    setNewRoomBedType("เตียงคิงไซส์ 6 ฟุต (1 King Bed)");
    setNewRoomDesc("");
    setNewRoomLongDesc("");
    setNewRoomImageUrl("");
    setNewRoomMatterportUrl("");
    setShowAddRoom(false);

    alert("เพิ่มชื่อร่างประเภทห้องพักสำเร็จ! กรุณากดปุ่ม 'บันทึกข้อมูลห้องพักทั้งหมด' ที่อยู่ด้านล่าง เพื่อยืนยันการเซฟเข้าระบบฐานข้อมูล");
  };

  // Refresh editing values on open or update
  React.useEffect(() => {
    if (isOpen) {
      setGeneralEdit({ ...settings.general });
      setRoomsEdit(JSON.parse(JSON.stringify(settings.rooms)));
      setPromotionsEdit(JSON.parse(JSON.stringify(settings.promotions)));
      setAmenitiesEdit(JSON.parse(JSON.stringify(settings.amenities || [])));
      setFaqsEdit(JSON.parse(JSON.stringify(settings.faqs || [])));
      setReviewsEdit(JSON.parse(JSON.stringify(settings.reviews || [])));
      setGalleryEdit(JSON.parse(JSON.stringify(settings.gallery && settings.gallery.length > 0 ? settings.gallery : defaultGallery)));
      setGooglePlaceIdEdit(settings.googlePlaceId || "ChIJXWlJMC-e4jARLqX9OidpWjY");
      setGoogleReviewsEnabledEdit(settings.googleReviewsEnabled !== undefined ? settings.googleReviewsEnabled : true);
      setGoogleReviewsSyncIntervalEdit(settings.general?.googleReviewsSyncInterval || "manual");
      setCustomApiKeyEdit(settings.general?.googleReviewsApiKey || "");
    }
  }, [isOpen, settings]);

  // Load admin accounts on mount
  React.useEffect(() => {
    const loadAdmins = async () => {
      try {
        const res = await fetch("/api/admins");
        const data = await res.json();
        if (data.success && data.admins) {
          let finalAdmins = [...data.admins];
          let localBackup: any[] = [];
          try {
            const backupStr = localStorage.getItem("m5_admins_backup");
            localBackup = backupStr ? JSON.parse(backupStr) : [];
          } catch (e) {}

          const adminsToRegister: any[] = [];
          const adminsToUpdate: any[] = [];

          if (Array.isArray(localBackup) && localBackup.length > 0) {
            localBackup.forEach((localAd: any) => {
              const serverAdIdx = finalAdmins.findIndex((sa: any) => 
                String(sa.username).toLowerCase().trim() === String(localAd.username).toLowerCase().trim()
              );
              
              if (serverAdIdx === -1) {
                // Admin is missing on server database (e.g. server reset). Register back.
                adminsToRegister.push(localAd);
                finalAdmins.push(localAd);
              } else {
                const serverAd = finalAdmins[serverAdIdx];
                const isServerDefaultPassword = serverAd.password === "password123";
                const isLocalCustomPassword = localAd.password && localAd.password !== "password123";
                
                if (isServerDefaultPassword && isLocalCustomPassword) {
                  // Restore custom password back to the server
                  serverAd.password = localAd.password;
                  if (localAd.name) serverAd.name = localAd.name;
                  if (localAd.role) serverAd.role = localAd.role;
                  adminsToUpdate.push(serverAd);
                }
              }
            });
          }

          setAdminUsers(finalAdmins);
          localStorage.setItem("m5_admins_backup", JSON.stringify(finalAdmins));

          const storedUser = sessionStorage.getItem("m5_admin_username");
          if (storedUser) {
            const matched = finalAdmins.find((a: any) => a.username.toLowerCase() === storedUser.toLowerCase());
            if (matched) {
              setCurrentAdmin(matched);
            }
          } else {
            const matched = finalAdmins.find((a: any) => a.username.toLowerCase() === "admin");
            if (matched) setCurrentAdmin(matched);
          }

          // Async sync actions
          if (adminsToRegister.length > 0) {
            adminsToRegister.forEach((adm) => {
              fetch("/api/admins/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ admin: adm })
              }).catch(e => console.error("Error syncing missing admin back to server:", e));
            });
          }

          if (adminsToUpdate.length > 0) {
            adminsToUpdate.forEach((adm) => {
              fetch(`/api/admins/${adm.id || adm.adminId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ admin: adm })
              }).catch(e => console.error("Error syncing updated admin back to server:", e));
            });
          }
        }
      } catch (err) {
        console.error("Failed to load admin accounts", err);
      }
    };
    if (isOpen) {
      loadAdmins();
    }
  }, [isOpen]);

  // Sync state changes back to localStorage backup
  React.useEffect(() => {
    if (adminUsers && adminUsers.length > 0) {
      localStorage.setItem("m5_admins_backup", JSON.stringify(adminUsers));
    }
  }, [adminUsers]);

  if (!isOpen) return null;

  // Handle Auth Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();
    
    // Validate against dynamic list
    let matched = adminUsers.find((a: any) => a.username.toLowerCase() === cleanUsername && a.password === password);
    
    // Hardcoded fallback for default account
    if (!matched && cleanUsername === "admin" && (password === "admin123" || password === "m5loft")) {
      matched = {
        id: "admin-1",
        adminId: "admin-1",
        username: "admin",
        password: "password123",
        name: "System Chief Manager",
        role: "Super Admin"
      };
    }

    if (matched) {
      setIsAuthenticated(true);
      sessionStorage.setItem("m5_admin_authed", "true");
      sessionStorage.setItem("m5_admin_username", matched.username);
      setCurrentAdmin(matched);
      setAuthError("");
    } else {
      setAuthError("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("m5_admin_authed");
    sessionStorage.removeItem("m5_admin_username");
    setCurrentAdmin(null);
  };

  // Save General settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateSettings({
      ...settings,
      general: generalEdit
    });
    if (success) {
      alert("บันทึกข้อมูลหลักของโรงแรมสำเร็จเรียบร้อยแล้ว!");
    } else {
      alert("เกิดข้อขัดข้องในการบันทึกข้อมูล ลองใหม่อีกครั้ง");
    }
  };

  // Save Rooms settings
  const handleSaveRooms = async () => {
    const success = await updateSettings({
      ...settings,
      rooms: roomsEdit
    });
    if (success) {
      alert("บันทึกข้อมูลห้องพักทั้งหมด (รูปภาพ/ราคา/รายละเอียด) สำเร็จเรียบร้อยแล้ว! ✨🎨");
    } else {
      alert("เกิดข้อขัดข้องในการบันทึกข้อมูลห้องพัก กรุณาลองใหม่อีกครั้ง");
    }
  };

  // Save Promotions settings
  const handleSavePromotions = async () => {
    const success = await updateSettings({
      ...settings,
      promotions: promotionsEdit
    });
    if (success) {
      alert("บันทึกข้อมูลแคมเปญโปรโมชั่นเรียบร้อยแล้ว!");
    } else {
      alert("เกิดข้อขัดข้อง");
    }
  };

  // Save Amenities settings
  const handleSaveAmenities = async () => {
    const success = await updateSettings({
      ...settings,
      amenities: amenitiesEdit
    });
    if (success) {
      alert("บันทึกสิ่งอำนวยความสะดวกสำเร็จเรียบร้อยแล้ว!");
    } else {
      alert("เกิดข้อขัดข้อง");
    }
  };

  // Save FAQs settings
  const handleSaveFaqs = async () => {
    const success = await updateSettings({
      ...settings,
      faqs: faqsEdit
    });
    if (success) {
      alert("บันทึกข้อมูลคำถามที่พบบ่อย (FAQs) สำเร็จเรียบร้อยแล้ว!");
    } else {
      alert("เกิดข้อขัดข้อง");
    }
  };

  // Save Reviews settings
  const handleSaveReviews = async () => {
    const success = await updateSettings({
      ...settings,
      reviews: reviewsEdit,
      googlePlaceId: googlePlaceIdEdit,
      googleReviewsEnabled: googleReviewsEnabledEdit,
      general: {
        ...(settings.general || {}),
        googleReviewsSyncInterval: googleReviewsSyncIntervalEdit,
        googleReviewsApiKey: customApiKeyEdit
      }
    });
    if (success) {
      alert("บันทึกข้อมูลรีวิวและตั้งค่า Google Reviews สำเร็จเรียบร้อยแล้ว!");
    } else {
      alert("เกิดข้อขัดข้อง");
    }
  };

  // Save Gallery settings
  const handleSaveGallery = async () => {
    const success = await updateSettings({
      ...settings,
      gallery: galleryEdit
    });
    if (success) {
      alert("บันทึกข้อมูลรูปภาพแกลเลอรีสำเร็จเรียบร้อยแล้ว!");
    } else {
      alert("เกิดข้อขัดข้อง");
    }
  };

  // Handle Manual Reservation creation
  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBkGuestName || !newBkGuestEmail || !newBkGuestPhone || !newBkCheckIn || !newBkCheckOut) {
      alert("กรุณากรอกข้อมูลสำคัญให้ครบถ้วน");
      return;
    }

    const selectedRoom = settings.rooms.find(r => r.id === newBkRoomType) || settings.rooms[0];
    const d1 = new Date(newBkCheckIn);
    const d2 = new Date(newBkCheckOut);
    const nights = Math.max(1, Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)));
    const totalPrice = selectedRoom.price * nights;

    const result = await addBooking({
      roomType: newBkRoomType,
      roomName: selectedRoom.name,
      checkIn: newBkCheckIn,
      checkOut: newBkCheckOut,
      guests: newBkGuests,
      guestName: newBkGuestName,
      guestEmail: newBkGuestEmail,
      guestPhone: newBkGuestPhone,
      totalPrice: totalPrice,
      specialRequest: newBkSpecialRequest
    });

    if (result) {
      alert(`ทำรายการจองสำเร็จรหัสอ้างอิง: ${result.id}`);
      setShowAddBooking(false);
      // reset form
      setNewBkGuestName("");
      setNewBkGuestEmail("");
      setNewBkGuestPhone("");
      setNewBkSpecialRequest("");
    } else {
      alert("เกิดข้อผิดพลาด");
    }
  };

  const handleReseed = async () => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการคืนค่าระบบ กลับไปเป็นค่าตั้งต้นจากโรงงานลอฟท์ข้อมูลการจองปัจจุบันจะถูกจัดรีเซ็ต?")) {
      await reseedDatabase();
      alert("รีเซ็ตระบบและเติมตัวอย่างข้อมูลความปลอดภัยเรียบร้อย!");
    }
  };

  // Calculations for Stats Overview
  const totalRevenue = bookings
    .filter(b => b.status !== "Cancelled")
    .reduce((sum, b) => sum + b.totalPrice, 0);

  const pendingBookings = bookings.filter(b => b.status === "Pending").length;
  const confirmedBookings = bookings.filter(b => b.status === "Confirmed" || b.status === "Paid" || b.status === "Checked-In").length;
  const occupancyRate = bookings.length > 0 ? ((confirmedBookings / (bookings.length)) * 100).toFixed(0) : "0";

  const isLight = adminTheme === "light";

  const outerContainerClass = isFullPage
    ? `min-h-screen ${isLight ? "bg-neutral-100 text-neutral-800 m5-light-theme" : "bg-[#050505] text-neutral-250"} font-sans p-0 flex flex-col w-full h-screen overflow-hidden`
    : `fixed inset-0 z-50 overflow-y-auto ${isLight ? "bg-black/30" : "bg-neutral-950/80"} backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans ${isLight ? "text-neutral-800 m5-light-theme" : "text-neutral-200"}`;

  const cardContainerClass = isFullPage
    ? `${isLight ? "bg-white border-neutral-200 text-neutral-800 m5-light-theme" : "bg-neutral-900 border-neutral-800"} border-none rounded-none w-full max-w-none h-screen flex flex-col overflow-hidden shadow-none relative`
    : `${isLight ? "bg-white border-neutral-200 text-neutral-800 m5-light-theme" : "bg-neutral-900 border-neutral-800"} border rounded-lg w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl relative`;

  return (
    <div className={outerContainerClass}>
      <div id="m5-admin-card-container" className={cardContainerClass}>
        <style>{`
          /* COMPACT SIDEBAR AND LAYOUT */
          #m5-admin-sidebar {
            max-height: 100%;
          }
          #m5-admin-sidebar::-webkit-scrollbar {
            width: 4px;
            height: 4px;
          }
          #m5-admin-sidebar::-webkit-scrollbar-thumb {
            background: rgba(120, 120, 120, 0.2) !important;
            border-radius: 2px;
          }
          #m5-admin-sidebar nav button {
            padding-top: 5px !important;
            padding-bottom: 5px !important;
            padding-left: 10px !important;
            padding-right: 10px !important;
            font-size: 11px !important;
          }
          #m5-admin-sidebar nav {
            gap: 1px !important;
          }

          /* LIGHT THEME OVERRIDES */
          .m5-light-theme {
            background-color: #f6f6f9 !important;
            color: #18181b !important;
          }
          .m5-light-theme .flex-1.p-6.overflow-y-auto {
            background-color: #f3f3f6 !important;
            color: #18181b !important;
          }
          .m5-light-theme #m5-admin-sidebar {
            background-color: #ffffff !important;
            border-color: #e4e4e7 !important;
          }
          .m5-light-theme #m5-admin-sidebar .border-b,
          .m5-light-theme #m5-admin-sidebar .border-t,
          .m5-light-theme #m5-admin-sidebar .border-neutral-800,
          .m5-light-theme #m5-admin-sidebar .border-neutral-850 {
            border-color: #e4e4e7 !important;
          }
          .m5-light-theme #m5-admin-sidebar nav button {
            color: #4b5563 !important;
          }
          .m5-light-theme #m5-admin-sidebar nav button:hover {
            background-color: #f3f4f6 !important;
            color: #111827 !important;
          }
          .m5-light-theme #m5-admin-sidebar nav button.bg-neutral-850 {
            background-color: #f3f4f6 !important;
            color: #b84100 !important;
            border-left-color: #b84100 !important;
          }
          .m5-light-theme #m5-admin-sidebar span.text-neutral-200 {
            color: #1f2937 !important;
          }
          .m5-light-theme #m5-admin-sidebar span.text-neutral-500 {
            color: #9ca3af !important;
          }
          .m5-light-theme .p-5.border-b.border-neutral-800.bg-neutral-950 {
            background-color: #ffffff !important;
            border-color: #e4e4e7 !important;
            color: #111827 !important;
          }
          .m5-light-theme .p-5.border-b.border-neutral-800.bg-neutral-950 h2,
          .m5-light-theme .p-5.border-b.border-neutral-800.bg-neutral-950 p {
            color: #111827 !important;
          }
          .m5-light-theme .p-5.border-b.border-neutral-800.bg-neutral-950 .text-neutral-400 {
            color: #4b5563 !important;
          }
          .m5-light-theme h3, 
          .m5-light-theme h3.text-xl.font-bold {
            color: #111827 !important;
          }
          .m5-light-theme .bg-neutral-950,
          .m5-light-theme .bg-neutral-900,
          .m5-light-theme .bg-neutral-900\\/90,
          .m5-light-theme .bg-neutral-900\\/60,
          .m5-light-theme .bg-neutral-900\\/50,
          .m5-light-theme .bg-black,
          .m5-light-theme .bg-neutral-950\\/80 {
            background-color: #ffffff !important;
            color: #111827 !important;
            border-color: #e4e4e7 !important;
          }
          .m5-light-theme .border,
          .m5-light-theme .border-b,
          .m5-light-theme .border-t,
          .m5-light-theme .border-r,
          .m5-light-theme .border-l,
          .m5-light-theme .border-neutral-800,
          .m5-light-theme .border-neutral-850,
          .m5-light-theme .border-neutral-900 {
            border-color: #e4e4e7 !important;
          }
          .m5-light-theme .text-white,
          .m5-light-theme .text-neutral-100,
          .m5-light-theme .text-neutral-200,
          .m5-light-theme .text-neutral-250,
          .m5-light-theme .text-neutral-300 {
            color: #1f2937 !important;
          }
          .m5-light-theme .text-neutral-400,
          .m5-light-theme .text-neutral-450 {
            color: #4b5563 !important;
          }
          .m5-light-theme .text-neutral-500 {
            color: #6b7280 !important;
          }
          .m5-light-theme input,
          .m5-light-theme select,
          .m5-light-theme textarea {
            background-color: #ffffff !important;
            color: #111827 !important;
            border-color: #d1d5db !important;
          }
          .m5-light-theme input:focus,
          .m5-light-theme select:focus,
          .m5-light-theme textarea:focus {
            border-color: #b84100 !important;
            outline: none !important;
          }
          .m5-light-theme input::placeholder,
          .m5-light-theme textarea::placeholder {
            color: #9ca3af !important;
          }
          .m5-light-theme label {
            color: #374151 !important;
          }
          .m5-light-theme th {
            background-color: #f9fafb !important;
            color: #374151 !important;
            border-color: #e5e7eb !important;
          }
          .m5-light-theme td {
            border-color: #e5e7eb !important;
            color: #1f2937 !important;
          }
          .m5-light-theme tr:hover td {
            background-color: #f9fafb !important;
          }
          .m5-light-theme .bg-neutral-800,
          .m5-light-theme .hover\\:bg-neutral-800:hover {
            background-color: #f3f4f6 !important;
            color: #1f2937 !important;
            border-color: #e5e7eb !important;
          }
          .m5-light-theme .hover\\:text-white:hover {
            color: #111827 !important;
          }
          .m5-light-theme .text-emerald-400 {
            color: #10b981 !important;
          }
          .m5-light-theme .bg-emerald-950\\/20 {
            background-color: #ecfdf5 !important;
          }
          .m5-light-theme .text-red-400 {
            color: #ef4444 !important;
          }
          .m5-light-theme .bg-red-950\\/20 {
            background-color: #fef2f2 !important;
          }
          .m5-light-theme .fixed.inset-0.z-50 {
            background-color: rgba(0, 0, 0, 0.4) !important;
          }
          .m5-light-theme .bg-[#050505] {
            background-color: #f4f4f5 !important;
          }
        `}</style>
        
        {/* Header decoration */}
        <div className="absolute top-1 left-2 w-1.5 h-1.5 rounded-full bg-neutral-700 shadow-sm"></div>
        <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-neutral-700 shadow-sm"></div>

        {/* Dashboard Title Bar */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-brick text-white rounded">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white font-mono uppercase">M5_ADMIN_CONTROL_CENTER</h2>
              <p className="text-[11px] text-neutral-400 font-light">ระบบหลังบ้านส่วนควบคุมและตั้งค่าข้อมูลโครงสร้างทั้งหมดของโรงแรมเดอะ เอ็มไฟว์ ({isFullPage ? "ลิงก์ตรง /admin" : "โหมดหน้าต่างลอย"})</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleAdminTheme}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs rounded border transition-all cursor-pointer font-mono ${
                isLight 
                  ? "bg-amber-100 border-amber-300 text-amber-800 font-medium" 
                  : "bg-neutral-900/50 border-neutral-800 text-neutral-450 hover:text-white"
              }`}
              title="สลับโหมดแสงสีสว่าง/มืด (Toggle Bright Light / Premium Dark Theme)"
            >
              {isLight ? (
                <>
                  <Moon className="h-3.5 w-3.5 text-indigo-500" />
                  <span>โหมดสว่าง (Light)</span>
                </>
              ) : (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  <span>โหมดมืด (Dark)</span>
                </>
              )}
            </button>

            {/* Accessibility Readability Font Size Toggler */}
            <button
              onClick={handleToggleTextSize}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs rounded border transition-all cursor-pointer font-mono ${
                textLarge 
                  ? "bg-brick/20 border-brick/50 text-brick-light font-bold shadow-md" 
                  : "bg-neutral-900/50 border-neutral-800 text-neutral-450 hover:text-white hover:border-neutral-700"
              }`}
              title="สลับขนาดตัวหนังสือเพื่อให้อ่านง่ายขึ้น (Enlarge Text Readable Mode)"
            >
              <span>🔍 ขนาดหนังสือ: {textLarge ? "ตัวใหญ่ (A+)" : "ปกติ (A)"}</span>
            </button>

            <button 
              onClick={onClose}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-brick border border-neutral-800 hover:border-brick/40 rounded bg-neutral-900/50 hover:bg-neutral-900 cursor-pointer transition-all font-mono"
            >
              <X className="h-4 w-4" />
              <span>{isFullPage ? "กลับหน้าหลัก [HOME]" : "ปิดหน้าต่าง"}</span>
            </button>
          </div>
        </div>

        {!isAuthenticated ? (
          /* Authentication Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-radial-gradient from-brick/5 to-transparent">
            <form onSubmit={handleLogin} className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-8 max-w-md w-full space-y-6 shadow-xl relative">
              <div className="absolute top-2 right-3 font-mono text-[9px] text-neutral-600">SECURE_GATEWAY_V2</div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-full mx-auto flex items-center justify-center text-brick shadow-md">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase font-mono tracking-widest">Admin Authorization</h3>
                <p className="text-xs text-neutral-400 font-light">เจ้าหน้าที่กรุณาป้อนรักษารวมเพื่อเข้าพอร์ตดูแลระบบ</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-400 uppercase font-mono tracking-wider block">Username (ชื่อผู้ใช้งาน)</label>
                  <input 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ระบุชื่อผู้ใช้งาน"
                    className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-850 rounded text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-brick font-mono"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-400 uppercase font-mono tracking-wider block">Password (รหัสผ่านสิทธิ์)</label>
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ระบุรหัสผ่านแอดมิน"
                    className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-850 rounded text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-brick font-mono"
                    required
                  />
                </div>


              </div>

              {authError && (
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded flex items-center space-x-2 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded bg-brick hover:bg-brick-dark text-white font-semibold text-xs tracking-widest uppercase cursor-pointer shadow-md shadow-brick/15 transition-all text-center"
              >
                เข้าสู่ระบบส่วนควบคุม (Login to Portal)
              </button>
            </form>
          </div>
        ) : (
          /* Main Dashboard Workspace */
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
            
            {/* Sidebar Controller Tab Controls */}
            <div id="m5-admin-sidebar" className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-800 bg-neutral-950 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto md:overflow-x-hidden shrink-0 md:h-full">
              <div className="hidden md:block p-4 border-b border-neutral-800/60">
                <span className="text-[9px] text-brick font-bold tracking-widest uppercase block mb-1">Authenticated user</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <div>
                    <span className="text-xs font-mono text-neutral-200 block font-semibold">{currentAdmin?.name || "System Chief Manager"}</span>
                    <span className="text-[10px] text-neutral-500 font-mono block">Role: {currentAdmin?.role || "Super Admin"}</span>
                  </div>
                </div>
              </div>

              {/* Database Connection Status Block */}
              <div className="hidden md:block p-4 border-b border-neutral-800/60">
                <span className="text-[9px] text-neutral-500 font-bold tracking-widest uppercase block mb-1.5 font-mono">DATABASE CONNECTION</span>
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${dbStatus?.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`}></div>
                    <span className="text-[11px] font-mono font-medium text-neutral-200 leading-tight">
                      {dbStatus?.connected ? "Directus Cloud Connected" : "Local db.json (Offline)"}
                    </span>
                  </div>
                  {dbStatus && !dbStatus.connected && (
                    <div className="text-[9px] text-amber-500/90 font-mono leading-normal mt-1 bg-amber-950/20 border border-amber-900/30 p-1.5 rounded">
                      <span className="block font-semibold">Status: Offline Fallback</span>
                      <span className="block text-neutral-400 mt-0.5 truncate" title={dbStatus.reason}>Reason: {dbStatus.reason || "Server 502 Bad Gateway"}</span>
                    </div>
                  )}
                  {dbStatus && dbStatus.connected && (
                    <span className="text-[9px] text-neutral-500 font-mono block truncate">
                      Host: data.them5residence.com
                    </span>
                  )}
                </div>
              </div>
              
              <nav className="flex flex-row md:flex-col p-2 md:space-y-1.5 flex-1 min-w-max md:min-w-0">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "dashboard" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>แดชบอร์ดสรุป (Summary)</span>
                </button>
                <button
                  onClick={() => setActiveTab("general")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "general" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <Hotel className="h-4 w-4" />
                  <span>ตั้งค่าโรงแรมหลัก</span>
                </button>
                <button
                  onClick={() => setActiveTab("rooms")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "rooms" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <Bed className="h-4 w-4" />
                  <span>จัดการประเภทห้องพัก</span>
                </button>
                <button
                  onClick={() => setActiveTab("promotions")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "promotions" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <Gift className="h-4 w-4" />
                  <span>แคมเปญโปรโมชั่น</span>
                </button>
                <button
                  onClick={() => setActiveTab("bookings")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "bookings" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <Calendar className="h-4 w-4" />
                  <span className="flex-1 text-left">รายการจองห้องพัก</span>
                  {pendingBookings > 0 && (
                    <span className="px-1.5 py-0.5 bg-brick text-[9px] text-white font-mono rounded-full font-bold">
                      {pendingBookings}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("amenities")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "amenities" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <Coffee className="h-4 w-4" />
                  <span>สิ่งอำนวยความสะดวก</span>
                </button>
                <button
                  onClick={() => setActiveTab("faqs")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "faqs" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>คำถามที่พบบ่อย (FAQs)</span>
                </button>
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "reviews" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>รีวิวจำลองคุณลูกค้า</span>
                </button>
                <button
                  onClick={() => setActiveTab("gallery")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "gallery" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <Images className="h-4 w-4" />
                  <span>รูปภาพแกลเลอรี</span>
                </button>
                <button
                  onClick={() => setActiveTab("members")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "members" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <User className="h-4 w-4" />
                  <span className="flex-1 text-left">จัดการระบบสมาชิก</span>
                  <span className="px-1.5 py-0.5 bg-neutral-950 text-[9px] text-neutral-400 font-mono rounded font-bold border border-neutral-850">
                    {members ? members.length : 0}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("admins")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "admins" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span className="flex-1 text-left">จัดการสิทธิ์แอดมิน</span>
                  <span className="px-1.5 py-0.5 bg-neutral-950 text-[9px] text-neutral-400 font-mono rounded font-bold border border-neutral-850">
                    {adminUsers.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("calendar")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "calendar" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <Calendar className="h-4 w-4" />
                  <span className="flex-1 text-left">ปฏิทินการจองห้อง</span>
                </button>
                <button
                  onClick={() => setActiveTab("impact")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "impact" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                  <span className="flex-1 text-left font-semibold text-amber-300">ตารางงาน IMPACT</span>
                  <span className="px-1.5 py-0.5 bg-amber-950/40 border border-amber-900/50 text-[9px] text-amber-400 font-mono rounded font-bold uppercase tracking-wider">
                    API
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("blocked")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "blocked" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span className="flex-1 text-left">กำหนดวันปิดรับจอง</span>
                </button>
                <button
                  onClick={() => setActiveTab("coupons")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "coupons" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <Ticket className="h-4 w-4" />
                  <span className="flex-1 text-left">จัดการส่วนลดคูปอง</span>
                </button>
                <button
                  onClick={() => setActiveTab("backgrounds")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "backgrounds" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <Wallpaper className="h-4 w-4" />
                  <span className="flex-1 text-left">จัดการพื้นหลังเว็บ</span>
                </button>
                <button
                  onClick={() => setActiveTab("seo")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "seo" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="flex-1 text-left">ตั้งค่า SEO / คีย์เวิร์ด</span>
                </button>
                <button
                  onClick={() => setActiveTab("directus")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "directus" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <Database className="h-4 w-4" />
                  <span className="flex-1 text-left">ตั้งค่าเชื่อมต่อ Directus</span>
                </button>
                <button
                  onClick={() => setActiveTab("smtp")}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded text-xs font-medium cursor-pointer transition-colors w-full ${activeTab === "smtp" ? "bg-neutral-850 text-white border-l-2 border-brick font-semibold" : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"}`}
                >
                  <Mail className="h-4 w-4" />
                  <span className="flex-1 text-left">ตั้งค่าอีเมล SMTP</span>
                </button>
              </nav>

              <div className="p-3 border-t border-neutral-850 space-y-2 mt-auto">
                <button
                  onClick={handleReseed}
                  className="w-full py-2 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-[10px] uppercase font-mono text-neutral-400 hover:text-brick rounded transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Reseed Defaults</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full py-2 bg-neutral-950 hover:bg-neutral-900 border border-neutral-850 text-[10px] uppercase font-mono text-neutral-400 hover:text-red-400 rounded transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Log Out (ออกจากระบบ)</span>
                </button>
              </div>
            </div>

            {/* Scrollable Workspace Panels */}
            <div className={`flex-1 p-6 overflow-y-auto bg-neutral-900/90 flex flex-col space-y-6 ${textLarge ? "admin-large-text" : ""}`}>
              
              {/* TAB 1: EXECUTIVE SUMMARY */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold font-sans text-white">รายงานสรุปสารสนเทศระบบ</h3>
                      <p className="text-xs text-neutral-450 font-light">ข้อมูลประมวลผลสรุปยอดคำสั่งซื้อยอดจองโรงแรมแบบเรียลไทม์</p>
                    </div>
                    <span className="font-mono text-xs text-neutral-400 uppercase bg-neutral-950 px-3 py-1.5 rounded border border-neutral-850">SYSTEM_UPTIME_OK</span>
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-lg relative overflow-hidden">
                      <div className="absolute right-2 top-2 p-1 bg-brick/10 text-brick rounded">
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider block">ยอดรวมตั๋วชำระ</span>
                      <span className="text-2xl font-bold font-mono tracking-tight text-white block mt-1">
                        {totalRevenue.toLocaleString()} <span className="text-xs text-neutral-400">บาท</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 block mt-1">จากรายการจองทั้งหมดที่ยืนยันแล้ว</span>
                    </div>

                    <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-lg relative overflow-hidden">
                      <div className="absolute right-2 top-2 p-1 bg-yellow-500/10 text-yellow-500 rounded">
                        <Clock className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider block">รอการยืนยันจดหมาย</span>
                      <span className="text-2xl font-bold font-mono tracking-tight text-white block mt-1">
                        {pendingBookings} <span className="text-xs text-neutral-400">ห้อง</span>
                      </span>
                      <span className="text-[10px] text-yellow-400 block mt-1">ยอดผู้ใช้แนบสลิปชำระรอตรวจ</span>
                    </div>

                    <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-lg relative overflow-hidden">
                      <div className="absolute right-2 top-2 p-1 bg-emerald-500/10 text-emerald-500 rounded">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider block">ผู้เข้าพักยืนยัน</span>
                      <span className="text-2xl font-bold font-mono tracking-tight text-white block mt-1">
                        {confirmedBookings} <span className="text-xs text-neutral-400">รายการ</span>
                      </span>
                      <span className="text-[10px] text-green-400 block mt-1">ได้รับการชำระเงินและเข้าพัก</span>
                    </div>

                    <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-lg relative overflow-hidden">
                      <div className="absolute right-2 top-2 p-1 bg-pink-500/10 text-pink-500 rounded">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider block">อัตราเข้าพักเฉลี่ย</span>
                      <span className="text-2xl font-bold font-mono tracking-tight text-white block mt-1">
                        {occupancyRate}%
                      </span>
                      <span className="text-[10px] text-neutral-400 block mt-1">อัตรายืนยันห้องต่อการกดจอง</span>
                    </div>
                  </div>

                  {/* Room Overview quick stats */}
                  <div className="p-5 bg-neutral-950 border border-neutral-850 rounded-lg space-y-4">
                    <span className="text-[11px] font-mono text-brick uppercase tracking-widest font-bold block">ROOM TYPE QUICK OVERVIEW // ประเภทห้องในระบบ</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {settings.rooms.map(room => (
                        <div key={room.id} className="p-3 bg-neutral-900 border border-neutral-800 rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-white block text-sm">{room.name}</span>
                              <span className="text-neutral-450 font-mono text-[10px]">{room.bedType}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-neutral-800 border border-neutral-750 font-mono text-xs text-amber-500 font-bold rounded">
                              {room.price.toLocaleString()} THB
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick recent reservations checklist */}
                  <div className="p-5 bg-neutral-950 border border-neutral-850 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-mono text-brick uppercase tracking-widest font-bold block">RECENT ACTIVITY // รายงานการจองล่าสุด</span>
                      <button onClick={() => setActiveTab("bookings")} className="text-xs text-brick hover:underline">ดูทั้งหมด</button>
                    </div>
                    {bookings.length === 0 ? (
                      <div className="text-center py-6 text-xs text-neutral-500">ไม่มีข้อมูลการจองในระบบ</div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {bookings.slice(0, 4).map(b => (
                          <div key={b.id} className="p-3 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/80 rounded flex justify-between items-center text-xs font-mono">
                            <div className="space-y-0.5 text-neutral-300">
                              <span className="text-white font-semibold">{b.guestName}</span> • <span className="text-neutral-450">{b.roomName}</span> • {b.checkIn} ถึง {b.checkOut}
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="font-bold text-emerald-400">{b.totalPrice.toLocaleString()} THB</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] text-white ${
                                b.status === "Pending" ? "bg-amber-600" :
                                b.status === "Paid" ? "bg-blue-600" :
                                b.status === "Confirmed" ? "bg-emerald-600" :
                                b.status === "Cancelled" ? "bg-neutral-600" : "bg-purple-600"
                              }`}>
                                {b.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: GENERAL HOTEL INFORMATION */}
              {activeTab === "general" && (
                <form onSubmit={handleSaveGeneral} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">ตั้งค่าประวัติและข้อมูลหลักของโรงแรม</h3>
                    <p className="text-xs text-neutral-450 font-light font-mono text-[10px]">CONFIG_FILE: /db.json#general</p>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-850 rounded-lg p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-neutral-400 font-mono">ชื่อโรงแรมภาษาอังกฤษ (Hotel Name EN)</label>
                        <input 
                          type="text"
                          value={generalEdit.hotelName}
                          onChange={(e) => setGeneralEdit({ ...generalEdit, hotelName: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-brick"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-neutral-400 font-mono">ชื่อโรงแรมภาษาไทย (Hotel Name TH)</label>
                        <input 
                          type="text"
                          value={generalEdit.thaiName}
                          onChange={(e) => setGeneralEdit({ ...generalEdit, thaiName: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-brick"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-mono flex items-center justify-between">
                        <span>ที่อยู่ลิงก์โลโก้โรงแรม (Custom Logo URL)</span>
                        <span className="text-[10px] text-neutral-500 font-light font-sans">*หากเว้นว่าง ระบบจะแสดงแบรนด์ป้าย M5 และโมเดลเครื่องหมาย Landmark ของระบบดั้งเดิม</span>
                      </label>
                      <div className="flex gap-2 items-center">
                        <input 
                          type="text"
                          value={generalEdit.logoUrl || ""}
                          onChange={(e) => setGeneralEdit({ ...generalEdit, logoUrl: e.target.value })}
                          placeholder="ระบุที่อยู่ลิงก์รูปภาพโลโก้ เช่น https://example.com/logo.png"
                          className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-brick font-mono placeholder-neutral-600"
                        />
                        <ImageUploadButton
                          onUploadSuccess={(url) => setGeneralEdit({ ...generalEdit, logoUrl: url })}
                          label="อัปโหลดโลโก้ 📤"
                        />
                        {generalEdit.logoUrl && (
                          <div className="h-10 w-16 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center overflow-hidden p-1 shrink-0">
                            <img 
                              src={generalEdit.logoUrl} 
                              alt="Logo Preview" 
                              className="h-full object-contain" 
                              onError={(e) => { 
                                e.currentTarget.style.border = '1px solid #d97706'; 
                                e.currentTarget.src = "https://img1.pic.in.th/images/295079578_426868706124356_9036405660640211732_n.jpg";
                              }} 
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-mono">คำขวัญหน้าแรกนเตสะสไตล์ (Hero Title)</label>
                      <input 
                        type="text"
                        value={generalEdit.heroTitle}
                        onChange={(e) => setGeneralEdit({ ...generalEdit, heroTitle: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-brick"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-mono">คำบรรยายหลัก (Hero Subtitle / Tagline)</label>
                      <textarea 
                        rows={3}
                        value={generalEdit.heroSubtitle}
                        onChange={(e) => setGeneralEdit({ ...generalEdit, heroSubtitle: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-brick font-light"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-neutral-400 font-mono">เบอร์โทรศัพท์ติดต่อ (Phone)</label>
                        <input 
                          type="text"
                          value={generalEdit.contactPhone}
                          onChange={(e) => setGeneralEdit({ ...generalEdit, contactPhone: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-brick font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-neutral-400 font-mono">พิกัดทางภูมิศาสตร์ GDP GPS (Coordinates)</label>
                        <input 
                          type="text"
                          value={generalEdit.gps}
                          onChange={(e) => setGeneralEdit({ ...generalEdit, gps: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-brick font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-neutral-400 font-mono">ช่องติดต่อ Line ID</label>
                        <input 
                          type="text"
                          value={generalEdit.lineId}
                          onChange={(e) => setGeneralEdit({ ...generalEdit, lineId: e.target.value })}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-brick font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-mono">ที่อยู่พิกัดในการเดินทางเช็คอิน (Contact Address)</label>
                      <input 
                        type="text"
                        value={generalEdit.contactAddress}
                        onChange={(e) => setGeneralEdit({ ...generalEdit, contactAddress: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-brick"
                      />
                    </div>

                    <div className="pt-4 border-t border-neutral-900 space-y-4">
                      <h4 className="text-xs font-bold text-brick uppercase tracking-wider font-mono">
                        🔍 ตั้งค่าหัวข้อเว็บและการค้นหา (SEO & Web Browser Title Settings)
                      </h4>
                      
                      <div className="space-y-1">
                        <label className="text-xs text-neutral-400 font-mono">ชื่อหัวข้อเว็บเบราว์เซอร์ (Web Page Title - seoTitle)</label>
                        <input 
                          type="text"
                          value={generalEdit.seoTitle || ""}
                          onChange={(e) => setGeneralEdit({ ...generalEdit, seoTitle: e.target.value })}
                          placeholder="เช่น The M5 Residence | ที่พักสุดชิคสไตล์ Loft ย่านปากเกร็ด นนทบุรี"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-brick font-sans placeholder-neutral-600"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono">คำค้นหาหลัก / คีย์เวิร์ด (SEO Keywords - seoKeywords)</label>
                          <textarea 
                            rows={3}
                            value={generalEdit.seoKeywords || ""}
                            onChange={(e) => setGeneralEdit({ ...generalEdit, seoKeywords: e.target.value })}
                            placeholder="เช่น ที่พักปากเกร็ด, โรงแรมใกล้อิมแพ็ค, โรงแรมเมืองทองธานี, m5 residence"
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-brick font-sans placeholder-neutral-600"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono">คำอธิบายหน้าเว็บสั้นๆ (SEO Description - seoDescription)</label>
                          <textarea 
                            rows={3}
                            value={generalEdit.seoDescription || ""}
                            onChange={(e) => setGeneralEdit({ ...generalEdit, seoDescription: e.target.value })}
                            placeholder="รายละเอียดสั้นๆ แสดงเมื่อค้นหาบน Google หรือแชร์ลิงก์..."
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-brick font-sans placeholder-neutral-600"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-900 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-white block">ระบบรับสมัครสมาชิก (User Registration)</span>
                        <span className="text-[10px] text-neutral-400 block font-light">เปิดหรือปิดให้ผู้เข้าพักทั่วไปสมัครสมาชิกผ่านหน้าเว็บไซต์หลักและหน้าต่างการจอง</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGeneralEdit({ 
                          ...generalEdit, 
                          allowRegistration: (generalEdit.allowRegistration !== false) ? false : true 
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer outline-none ${
                          (generalEdit.allowRegistration !== false) ? "bg-brick" : "bg-neutral-800"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            (generalEdit.allowRegistration !== false) ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="pt-4 border-t border-neutral-900 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-white block">ระบบจองห้องพักออนไลน์ (Online Room Booking)</span>
                        <span className="text-[10px] text-neutral-400 block font-light">เปิดหรือปิดระบบการจองห้องพักออนไลน์ทั้งหมดบนหน้าเว็บไซต์</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGeneralEdit({ 
                          ...generalEdit, 
                          bookingEnabled: (generalEdit.bookingEnabled !== false) ? false : true 
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer outline-none ${
                          (generalEdit.bookingEnabled !== false) ? "bg-brick" : "bg-neutral-800"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            (generalEdit.bookingEnabled !== false) ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {generalEdit.bookingEnabled === false && (
                      <div className="pt-4 border-t border-neutral-900 space-y-1">
                        <label className="text-xs text-amber-500 font-mono font-semibold">ข้อความแจ้งเตือนเมื่อปิดระบบจอง (Booking Disabled Message)</label>
                        <textarea 
                          rows={2}
                          value={generalEdit.bookingDisabledMessage || ""}
                          onChange={(e) => setGeneralEdit({ ...generalEdit, bookingDisabledMessage: e.target.value })}
                          placeholder="เช่น ขออภัยในความไม่สะดวก ขณะนี้ทางโรงแรมปิดปรับปรุงระบบจองห้องพักชั่วคราว..."
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm text-white focus:outline-none focus:border-brick"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-brick hover:bg-brick-dark text-white rounded text-xs font-semibold uppercase font-mono tracking-widest cursor-pointer shadow-lg shadow-brick/20"
                    >
                      บันทึกข้อมูลหลักโรงแรม (Save General Info)
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: MANAGE ROOMS PRICING AND DATA */}
              {activeTab === "rooms" && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">จัดการประเภทห้องพักทั้งหมด</h3>
                      <p className="text-xs text-neutral-450 font-light">ตั้งราคา พื้นที่ ขนาดเตียง คำบรรยาย รวมถึงการเพิ่มหรือลบประเภทห้องพัก</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        type="button"
                        onClick={() => setShowAddRoom(!showAddRoom)}
                        className={`px-4 py-2 rounded text-xs uppercase font-mono tracking-wider font-semibold cursor-pointer border shadow transition-all ${
                          showAddRoom 
                            ? "bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-750" 
                            : "bg-neutral-900 border-neutral-800 hover:bg-neutral-850 text-brick-light hover:text-white"
                        }`}
                      >
                        {showAddRoom ? "✕ ปิดฟอร์มเพิ่ม" : "+ เพิ่มประเภทห้องพักใหม่"}
                      </button>
                      <button 
                        onClick={handleSaveRooms}
                        className="px-4 py-2 bg-brick hover:bg-brick-dark text-white rounded text-xs uppercase font-mono tracking-wider font-semibold cursor-pointer shadow transition-all"
                      >
                        บันทึกข้อมูลห้องพักทั้งหมด
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Form for Adding a Room Type */}
                  {showAddRoom && (
                    <form onSubmit={handleAddNewRoomType} className="p-6 bg-neutral-950 border-2 border-brick/40 rounded-lg space-y-4 animate-fadeIn">
                      <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                        <div className="flex items-center space-x-2 text-brick">
                          <Plus className="h-4 w-4" />
                          <h4 className="text-sm font-bold font-mono uppercase tracking-wider">ADDNEW_ROOM_SPEC // สร้างประเภทห้องพักใหม่</h4>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono">DRAFT_MODE</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono block">รหัสอ้างอิงห้อง (Room ID - ห้ามซ้ำ)*</label>
                          <input 
                            type="text"
                            required
                            placeholder="เช่น royal_suite"
                            value={newRoomId}
                            onChange={(e) => setNewRoomId(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono block">ชื่อประเภทห้องพัก EN*</label>
                          <input 
                            type="text"
                            required
                            placeholder="เช่น Royal Penthouse Loft"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono block">ชื่อไทย TH*</label>
                          <input 
                            type="text"
                            required
                            placeholder="เช่น รอยัล เพนท์เฮาส์ ลอฟท์"
                            value={newRoomThaiName}
                            onChange={(e) => setNewRoomThaiName(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono block">ราคาเริ่มต้นต่อคืน (THB)*</label>
                          <input 
                            type="number"
                            required
                            min={0}
                            value={newRoomPrice}
                            onChange={(e) => setNewRoomPrice(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-amber-500 font-mono font-bold focus:outline-none focus:border-brick"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono block">ขนาดห้อง (ตร.ม.)*</label>
                          <input 
                            type="number"
                            required
                            min={1}
                            value={newRoomSize}
                            onChange={(e) => setNewRoomSize(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white font-mono focus:outline-none focus:border-brick"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono block">จำนวนผู้เข้าพักสูงสุด*</label>
                          <input 
                            type="number"
                            required
                            min={1}
                            value={newRoomCapacity}
                            onChange={(e) => setNewRoomCapacity(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white font-mono focus:outline-none focus:border-brick"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono block">การจัดสเปคเตียงนอน*</label>
                          <input 
                            type="text"
                            required
                            placeholder="เช่น เตียงคู่ใหญ่ (1 King Bed)"
                            value={newRoomBedType}
                            onChange={(e) => setNewRoomBedType(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-neutral-400 font-mono block">รูปถ่ายประจำห้องพัก (Image Link address OR Upload Image File)</label>
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-neutral-900/60 p-3 rounded-lg border border-neutral-850">
                          <div className="flex-1 w-full flex flex-col space-y-2">
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="ระบุลิงก์รูปภาพ เช่น https://images.unsplash.com/photo-..."
                                value={newRoomImageUrl}
                                onChange={(e) => setNewRoomImageUrl(e.target.value)}
                                className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick font-mono placeholder-neutral-600"
                              />
                              <ImageUploadButton
                                onUploadSuccess={(url) => setNewRoomImageUrl(url)}
                                label="อัปโหลดรูป 📤"
                              />
                            </div>
                          </div>
                          
                          <div className="h-16 w-24 bg-neutral-950 border border-neutral-800 rounded flex items-center justify-center overflow-hidden p-1 shrink-0 relative">
                            {newRoomImageUrl ? (
                              <img 
                                src={newRoomImageUrl} 
                                alt="New Room Preview" 
                                className="h-full w-full object-cover rounded" 
                                onError={(e) => {
                                  e.currentTarget.style.border = '1px solid #d97706';
                                  e.currentTarget.src = "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=400&q=80";
                                }}
                              />
                            ) : (
                              <span className="text-[10px] text-neutral-600 font-mono text-center">ยังไม่มีไฟล์ภาพ <br />(No Image)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-neutral-400 font-mono block">สรุปใจความสำคัญหน้าร้าน (Short Description)*</label>
                        <input 
                          type="text"
                          required
                          placeholder="เช่น ห้องทริปเปิลลอฟท์วิวสวน ตกแต่งผนังปูนเปลือยและเหล็กกล้าสีดำ..."
                          value={newRoomDesc}
                          onChange={(e) => setNewRoomDesc(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-neutral-400 font-mono block">คำอธิบายรายละเอียดห้องพักเต็มเม็ดเต็มหน่วย (Long Description)*</label>
                        <textarea 
                          rows={3}
                          required
                          placeholder="รายละเอียดของระบบการจัดวางเฟอร์นิเจอร์ วิวภายนอกหน้าต่าง บรรยากาศของห้องพักและสิ่งอำนวยความสะดวกแบบเจาะลึก..."
                          value={newRoomLongDesc}
                          onChange={(e) => setNewRoomLongDesc(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-neutral-400 font-mono block">สิ่งอำนวยความสะดวกในห้อง (Amenities - คั่นด้วยเครื่องหมายจุลภาค ,)</label>
                        <input 
                          type="text"
                          value={newRoomAmenities}
                          onChange={(e) => setNewRoomAmenities(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white font-mono focus:outline-none focus:border-brick"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-neutral-400 font-mono block">ลิงก์ดูห้อง 360 องศาของ Matterport (Matterport Virtual Tour 360° URL)</label>
                        <input 
                          type="text"
                          placeholder="ระบุลิงก์หรือรหัส Matterport เช่น https://my.matterport.com/show/?m=Pcjj9wmA98W"
                          value={newRoomMatterportUrl}
                          onChange={(e) => setNewRoomMatterportUrl(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick font-mono placeholder-neutral-600"
                        />
                        <p className="text-[10px] text-neutral-500 font-sans leading-relaxed">
                          รองรับรูปแบบลิงก์ของ Matterport เช่น <span className="font-mono text-neutral-400">https://my.matterport.com/show/?m=Pcjj9wmA98W</span> หรือ URL พอร์ทัล <span className="font-mono text-neutral-400">https://discover.matterport.com/space/Pcjj9wmA98W</span>
                        </p>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-brick hover:bg-brick-dark text-white rounded text-xs font-bold uppercase font-mono tracking-wider cursor-pointer shadow-lg shadow-brick/20"
                        >
                          + เพิ่มประเภทห้องพักใหม่ลงในร่างด้านล่าง
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-6">
                    {roomsEdit.map((room, idx) => (
                      <div key={room.id} className="p-5 bg-neutral-950 border border-neutral-850 rounded-lg space-y-4">
                        <div className="flex flex-wrap gap-2 justify-between items-center border-b border-neutral-800 pb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono text-brick font-bold uppercase">{room.id.toUpperCase()}_ROOM_SPEC</span>
                            <h4 className="text-sm font-bold text-white font-sans">{room.name}</h4>
                          </div>
                          <div className="flex items-center space-x-3 text-xs">
                            <span className="text-xs text-neutral-500 font-mono">ดัชนีห้อง: #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteModal({
                                  title: "ยืนยันการลบประเภทห้องพัก",
                                  message: `คุณแน่ใจหรือไม่ว่าต้องการลบประเภทห้องพัก "${room.thaiName || room.name}" ออกจากฐานข้อมูลถาวรโดยตรง? การลบจะมีผลทันทีและไม่สามารถกู้คืนได้`,
                                  onConfirm: async () => {
                                    const copy = roomsEdit.filter((_, i) => i !== idx);
                                    setRoomsEdit(copy);
                                    const success = await updateSettings({
                                      ...settings,
                                      rooms: copy
                                    });
                                    if (success) {
                                      alert(`ลบประเภทห้องพัก "${room.thaiName || room.name}" ออกจากฐานข้อมูลเรียบร้อยแล้ว! ✨`);
                                    } else {
                                      alert("เกิดข้อขัดข้องในการบันทึกข้อมูลการลบลงฐานข้อมูล");
                                    }
                                  }
                                });
                              }}
                              className="flex items-center space-x-1 px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 hover:border-red-500/50 rounded text-red-400 hover:text-white transition-all cursor-pointer font-sans font-bold"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>ลบประเภทนี้</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">ชื่อประเภทห้องพัก (EN)</label>
                            <input 
                              type="text"
                              value={room.name}
                              onChange={(e) => {
                                const copy = [...roomsEdit];
                                copy[idx].name = e.target.value;
                                setRoomsEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">ชื่อภาษาไทย (TH)</label>
                            <input 
                              type="text"
                              value={room.thaiName}
                              onChange={(e) => {
                                const copy = [...roomsEdit];
                                copy[idx].thaiName = e.target.value;
                                setRoomsEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">ราคาต่อคืน (THB/คืน)</label>
                            <input 
                              type="number"
                              value={room.price}
                              onChange={(e) => {
                                const copy = [...roomsEdit];
                                copy[idx].price = Number(e.target.value);
                                setRoomsEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-amber-500 font-mono font-bold focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">ขนาดห้อง (ตร.ม.)</label>
                            <input 
                              type="number"
                              value={room.size}
                              onChange={(e) => {
                                const copy = [...roomsEdit];
                                copy[idx].size = Number(e.target.value);
                                setRoomsEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white font-mono focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">รองรับผู้เข้าพักสูงสุด (คน)</label>
                            <input 
                              type="number"
                              value={room.capacity}
                              onChange={(e) => {
                                const copy = [...roomsEdit];
                                copy[idx].capacity = Number(e.target.value);
                                setRoomsEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white font-mono focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-xs text-neutral-400 font-mono">รายละเอียดเตียงนอน (Bed config)</label>
                            <input 
                              type="text"
                              value={room.bedType}
                              onChange={(e) => {
                                const copy = [...roomsEdit];
                                copy[idx].bedType = e.target.value;
                                setRoomsEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono">สรุปสั้นๆ (Short Description)</label>
                          <input 
                            type="text"
                            value={room.description}
                            onChange={(e) => {
                              const copy = [...roomsEdit];
                              copy[idx].description = e.target.value;
                              setRoomsEdit(copy);
                            }}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono">รายละเอียดอย่างเต็มค่ำคืนคลาสสิก (Long Description)</label>
                          <textarea 
                            rows={3}
                            value={room.longDescription}
                            onChange={(e) => {
                              const copy = [...roomsEdit];
                              copy[idx].longDescription = e.target.value;
                              setRoomsEdit(copy);
                            }}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white font-light focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-neutral-400 font-mono block">สิ่งอำนวยความสะดวกย่อยของห้อง (Amenities - คั่นด้วยเครื่องหมายจุลภาค ,)</label>
                          <input 
                            type="text"
                            value={room.amenities.join(", ")}
                            onChange={(e) => {
                              const copy = [...roomsEdit];
                              copy[idx].amenities = e.target.value.split(",").map(item => item.trim()).filter(Boolean);
                              setRoomsEdit(copy);
                            }}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white font-mono focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1 mt-2">
                          <label className="text-xs text-neutral-400 font-mono block">
                            รูปภาพของประเภทห้องนี้ (Image URL or Local Upload File)
                            <span className="text-[10px] text-neutral-500 font-normal ml-2 font-sans block mt-0.5">
                              *หากรูปภาพเก่าแสดงภาพแตก ขอความกรุณากดปุ่ม <b>"อัปโหลด"</b> รูปภาพใหม่อีกครั้งเพื่อเปลี่ยนระบบไปบันทึกบน Cloud อย่างมั่นคงถาวรตลอดไป
                            </span>
                          </label>
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-neutral-900 p-3 rounded border border-neutral-850">
                            <div className="flex-1 w-full flex gap-2">
                              <input 
                                type="text"
                                placeholder="ระบุที่อยู่ลิงก์รูปภาพ เช่น https://images.unsplash.com/..."
                                value={room.imageUrl || ""}
                                onChange={(e) => {
                                  const copy = [...roomsEdit];
                                  copy[idx].imageUrl = e.target.value;
                                  setRoomsEdit(copy);
                                }}
                                className="flex-1 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick font-mono"
                              />
                              <ImageUploadButton
                                onUploadSuccess={(url) => {
                                  const copy = [...roomsEdit];
                                  copy[idx].imageUrl = url;
                                  setRoomsEdit(copy);
                                  alert("📸 อัปโหลดรูปภาพห้องสำเร็จแล้ว! เพื่อไม่ให้ข้อมูลสูญหาย กรุณากดปุ่มสีส้มอิฐ 'บันทึกข้อมูลห้องพักทั้งหมด (รูปภาพ/ราคา/รายละเอียด)' ที่อยู่ด้านล่างสุดของหน้านี้ด้วยนะครับ เพื่อเซฟข้อมูลลงฐานข้อมูลหลัก");
                                }}
                                label="อัปโหลด 📤"
                              />
                            </div>
                            
                            <div className="h-16 w-24 bg-neutral-950 border border-neutral-800 rounded flex items-center justify-center overflow-hidden p-1 shrink-0 relative">
                              <img 
                                src={room.imageUrl || "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=400&q=80"} 
                                alt={room.name} 
                                className="h-full w-full object-cover rounded" 
                                onError={(e) => {
                                  e.currentTarget.style.border = '1px solid #d97706'; 
                                  e.currentTarget.src = "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=400&q=80";
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1 mt-3">
                          <label className="text-xs text-neutral-400 font-mono block">ลิงก์ดูห้อง 360 องศาของ Matterport (Matterport Virtual Tour 360° URL)</label>
                          <input 
                            type="text"
                            placeholder="ระบุลิงก์หรือรหัส Matterport เช่น https://my.matterport.com/show/?m=Pcjj9wmA98W"
                            value={room.matterportUrl || ""}
                            onChange={(e) => {
                                const copy = [...roomsEdit];
                                copy[idx].matterportUrl = e.target.value;
                                setRoomsEdit(copy);
                            }}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick font-mono"
                          />
                          <p className="text-[10px] text-neutral-500 font-sans leading-relaxed">
                            รองรับรูปแบบลิงก์ของ Matterport เช่น <span className="font-mono text-neutral-400">https://my.matterport.com/show/?m=Pcjj9wmA98W</span> หรือ URL พอร์ทัล <span className="font-mono text-neutral-400">https://discover.matterport.com/space/Pcjj9wmA98W</span>
                          </p>
                        </div>

                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveRooms}
                      className="px-6 py-2.5 bg-brick hover:bg-brick-dark text-white rounded text-xs font-semibold uppercase font-mono tracking-widest cursor-pointer shadow-lg shadow-brick/20"
                    >
                      บันทึกข้อมูลห้องพักทั้งหมด (รูปภาพ/ราคา/รายละเอียด) 💾
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: CAMPAIGN PROMOTIONS EDIT */}
              {activeTab === "promotions" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">จัดการข้อมูลโปรโมชั่นในหน้าแรก</h3>
                      <p className="text-xs text-neutral-455 font-light">ข้อมูลแคมเปญคอนเสิร์ตและข้อเสนอสุดคุ้มเพื่อคอเพลง</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const newPromoId = "promo_" + Math.floor(1000 + Math.random() * 9000);
                          setPromotionsEdit([...promotionsEdit, {
                            id: newPromoId,
                            badge: "ข้อเสนอพิเศษ 🏷️",
                            title: "แคมเปญใหม่ / ส่วนลดคุ้มค่า",
                            desc: "ระบุเงื่อนไข ส่วนลดพิเศษ หรือรายละเอียดงานคอนเสิร์ตที่ใกล้เคียงเพื่อดึงดูดผู้พัก",
                            highlight: "สิทธิประโยชน์จัดเต็ม!",
                            active: true
                          }]);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-mono font-bold cursor-pointer flex items-center space-x-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>เพิ่มแคมเปญโปรโมชั่น</span>
                      </button>
                      <button 
                        onClick={handleSavePromotions}
                        className="px-4 py-2 bg-brick hover:bg-brick-dark text-white rounded text-xs uppercase font-mono tracking-wider font-semibold cursor-pointer shadow"
                      >
                        บันทึกโปรโมชั่น
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {promotionsEdit.map((p: any, idx: number) => (
                      <div key={p.id} className="p-5 bg-neutral-950 border border-neutral-850 rounded-lg space-y-4 relative">
                        <button
                          onClick={() => {
                            setConfirmDeleteModal({
                              title: "ยืนยันการลบโปรโมชั่น",
                              message: `คุณแน่ใจหรือไม่ว่าต้องการลบโปรโมชั่น "${p.title}" ออกจากฐานข้อมูลถาวรโดยตรง? การลบจะมีผลทันทีและไม่สามารถกู้คืนได้`,
                              onConfirm: async () => {
                                const copy = promotionsEdit.filter((_, i) => i !== idx);
                                setPromotionsEdit(copy);
                                const success = await updateSettings({
                                  ...settings,
                                  promotions: copy
                                });
                                if (success) {
                                  alert(`ลบโปรโมชั่น "${p.title}" ออกจากฐานข้อมูลเรียบร้อยแล้ว! ✨`);
                                } else {
                                  alert("เกิดข้อขัดข้องในการบันทึกข้อมูลการลบลงฐานข้อมูล");
                                }
                              }
                            });
                          }}
                          className="absolute top-4 right-4 p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer z-10"
                          title="ลบโปรโมชั่นนี้"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="flex justify-between items-center pb-2 border-b border-neutral-900">
                          <div className="text-xs font-mono text-brick font-bold uppercase">{p.id.toUpperCase()}_PROMO_SPEC</div>
                          <div className="flex items-center space-x-2 mr-8">
                            <span className="text-xs text-neutral-400 font-mono">สถานะ (Status):</span>
                            <button
                              type="button"
                              onClick={async () => {
                                const copy = [...promotionsEdit];
                                const nextActiveState = p.active !== false ? false : true;
                                copy[idx].active = nextActiveState;
                                setPromotionsEdit(copy);
                                
                                // Save immediately to database
                                const success = await updateSettings({
                                  ...settings,
                                  promotions: copy
                                });
                                if (success) {
                                  alert(`ปรับเปลี่ยนสถานะแคมเปญเป็น ${nextActiveState ? "เปิดใช้งาน" : "ปิดใช้งาน"} และบันทึกลงฐานข้อมูลสำเร็จเรียบร้อยแล้ว! ✨`);
                                } else {
                                  alert("เกิดข้อขัดข้องในการบันทึกสถานะ กรุณาลองใหม่อีกครั้ง");
                                }
                              }}
                              className={`px-3 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                p.active !== false 
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20" 
                                  : "bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20"
                              }`}
                            >
                              {p.active !== false ? "● เปิดใช้งานอยู่ (Active)" : "○ ปิดใช้งาน (Disabled)"}
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">ป้ายกำกับโปรโมชั่น (Promotion Badge)</label>
                            <input 
                              type="text"
                              value={p.badge}
                              onChange={(e) => {
                                const copy = [...promotionsEdit];
                                copy[idx].badge = e.target.value;
                                setPromotionsEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">หัวข้อแคมเปญ (Promotion Title)</label>
                            <input 
                              type="text"
                              value={p.title}
                              onChange={(e) => {
                                const copy = [...promotionsEdit];
                                copy[idx].title = e.target.value;
                                setPromotionsEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-bold"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono">คำบรรยายส่วนลดและรายละเอียดเต็ม (Description)</label>
                          <textarea 
                            rows={3}
                            value={p.desc}
                            onChange={(e) => {
                              const copy = [...promotionsEdit];
                              copy[idx].desc = e.target.value;
                              setPromotionsEdit(copy);
                            }}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white font-light focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono">ไฮไลท์สลากของแถม (Highlight Spec)</label>
                          <input 
                            type="text"
                            value={p.highlight}
                            onChange={(e) => {
                              const copy = [...promotionsEdit];
                              copy[idx].highlight = e.target.value;
                              setPromotionsEdit(copy);
                            }}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                    {promotionsEdit.length === 0 && (
                      <div className="p-8 text-center text-xs text-neutral-500 font-mono">ไม่มีรายการโปรโมชั่นที่บันทึกไว้ในระบบ</div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSavePromotions}
                      className="px-6 py-2.5 bg-brick hover:bg-brick-dark text-white rounded text-xs font-semibold uppercase font-mono tracking-widest cursor-pointer shadow-lg shadow-brick/20"
                    >
                      บันทึกปรับข้อมูลโปรโมชั่น
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: AMENITIES EDIT */}
              {activeTab === "amenities" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-white">สิ่งอำนวยความสะดวก (Core Amenities)</h3>
                      <p className="text-xs text-neutral-450 font-light">แก้ไขลักษณะเด่นและสิ่งอำนวยความสะดวกหลักที่แสดงผลเด่นชัดหน้าเว็บไซต์</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setAmenitiesEdit([...amenitiesEdit, {
                            iconName: "Coffee",
                            title: "สิ่งอำนวยความสะดวกใหม่",
                            desc: "พิมพ์รายละเอียดสิ่งอำนวยความสะดวกสั้นๆ เพื่อให้ผู้เข้าพักทราบสิทธิประโยชน์เพิ่มเติม"
                          }]);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-mono font-bold cursor-pointer flex items-center space-x-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>เพิ่มสิ่งอำนวยความสะดวก</span>
                      </button>
                      <button
                        onClick={handleSaveAmenities}
                        className="px-4 py-2 bg-brick hover:bg-brick-dark text-white rounded text-xs uppercase font-mono tracking-wider font-semibold cursor-pointer shadow"
                      >
                        บันทึกสิ่งอำนวยความสะดวก
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {amenitiesEdit.map((amenity: any, idx: number) => (
                      <div key={idx} className="p-5 bg-neutral-950 border border-neutral-850 rounded-lg space-y-4 relative">
                        <button
                          onClick={() => {
                            setConfirmDeleteModal({
                              title: "ยืนยันการลบสิ่งอำนวยความสะดวก",
                              message: `คุณแน่ใจหรือไม่ว่าต้องการลบสิ่งอำนวยความสะดวก "${amenity.title}" ออกจากฐานข้อมูลถาวรโดยตรง? การลบจะมีผลทันทีและไม่สามารถกู้คืนได้`,
                              onConfirm: async () => {
                                const copy = amenitiesEdit.filter((_, i) => i !== idx);
                                setAmenitiesEdit(copy);
                                const success = await updateSettings({
                                  ...settings,
                                  amenities: copy
                                });
                                if (success) {
                                  alert(`ลบสิ่งอำนวยความสะดวก "${amenity.title}" ออกจากฐานข้อมูลเรียบร้อยแล้ว! ✨`);
                                } else {
                                  alert("เกิดข้อขัดข้องในการบันทึกข้อมูลการลบลงฐานข้อมูล");
                                }
                              }
                            });
                          }}
                          className="absolute top-4 right-4 p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer z-10"
                          title="ลบสิ่งอำนวยความสะดวกนี้"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="text-xs font-mono text-brick font-bold uppercase">AMENITY_CARD #{idx + 1}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">ชื่อไอคอนจาก Lucide (เช่น Wifi, Coffee, Dumbbell, ShieldCheck, Car)</label>
                            <input 
                              type="text"
                              value={amenity.iconName}
                              onChange={(e) => {
                                const copy = [...amenitiesEdit];
                                copy[idx].iconName = e.target.value;
                                setAmenitiesEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">ชื่อหัวข้อสิ่งอำนวยความสะดวก (Title)</label>
                            <input 
                              type="text"
                              value={amenity.title}
                              onChange={(e) => {
                                const copy = [...amenitiesEdit];
                                copy[idx].title = e.target.value;
                                setAmenitiesEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-bold"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono">คำบรรยายรายละเอียด (Description)</label>
                          <textarea 
                            rows={2}
                            value={amenity.desc}
                            onChange={(e) => {
                              const copy = [...amenitiesEdit];
                              copy[idx].desc = e.target.value;
                              setAmenitiesEdit(copy);
                            }}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white font-light focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                    {amenitiesEdit.length === 0 && (
                      <div className="p-8 text-center text-xs text-neutral-500 font-mono">ไม่มีรายการสิ่งอำนวยความสะดวกที่บันทึกไว้ในระบบ</div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveAmenities}
                      className="px-6 py-2.5 bg-brick hover:bg-brick-dark text-white rounded text-xs font-semibold uppercase font-mono tracking-widest cursor-pointer shadow-lg shadow-brick/20"
                    >
                      บันทึกสิ่งอำนวยความสะดวกทั้งหมด
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: REVIEWS EDIT */}
              {activeTab === "reviews" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-neutral-900 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                        <span>จัดการรีวิวและเสียงตอบรับ (Reviews & Testimonials)</span>
                      </h3>
                      <p className="text-xs text-neutral-450 font-light">ตั้งค่าเชื่อมต่อ Google Reviews เพื่อดึงรีวิวจริงจาก Google Maps หรือจัดการเขียนรีวิวด้วยตนเอง</p>
                    </div>
                  </div>

                  {/* GOOGLE REVIEWS INTEGRATION CONTROL BOX */}
                  <div className="p-6 bg-neutral-950 border border-neutral-900 rounded-xl space-y-6">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white font-sans">การรวมระบบ Google Reviews (Google Maps Integration)</h4>
                          <p className="text-[11px] text-neutral-400">ดึงความคิดเห็นสดๆ ของโรงแรม The M5 Residence Hotel จาก Google Maps</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={googleReviewsEnabledEdit} 
                          onChange={(e) => setGoogleReviewsEnabledEdit(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white peer-checked:after:border-emerald-600"></div>
                        <span className="ml-2 text-xs font-mono font-bold text-neutral-300 uppercase">
                          {googleReviewsEnabledEdit ? "ENABLED" : "DISABLED"}
                        </span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono text-neutral-400 flex justify-between">
                          <span>Google Maps Place ID</span>
                          <span className="text-[10px] text-neutral-500 font-light font-sans">รหัสสถานที่</span>
                        </label>
                        <input 
                          type="text"
                          value={googlePlaceIdEdit}
                          onChange={(e) => setGooglePlaceIdEdit(e.target.value)}
                          placeholder="เช่น ChIJXWlJMC-e4jARLqX9OidpWjY"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                        />
                        <p className="text-[10px] text-neutral-500 leading-normal">
                          *รหัสค่าเริ่มต้น `ChIJXWlJMC-e4jARLqX9OidpWjY` เป็นรหัสอย่างเป็นทางการสำหรับ <strong>The M5 Residence Hotel</strong>
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-mono text-neutral-400 flex justify-between">
                          <span>Google Maps API Key (หากต้องการระบุเอง)</span>
                          <span className="text-[10px] text-neutral-500 font-light font-sans">ระบุคีย์ครอบทับ</span>
                        </label>
                        <input 
                          type="password"
                          value={customApiKeyEdit}
                          onChange={(e) => setCustomApiKeyEdit(e.target.value)}
                          placeholder="AIzaSy... (เว้นว่างเพื่อใช้คีย์ส่วนกลางของระบบ)"
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                        />
                        <p className="text-[10px] text-neutral-500 leading-normal">
                          หากเว้นว่างไว้ ระบบจะใช้ <strong>GOOGLE_MAPS_PLATFORM_KEY</strong> จากส่วนจัดเก็บ Secrets ของแอปพลิเคชันโดยอัตโนมัติ
                        </p>
                      </div>
                    </div>

                    {/* AUTO SYNC SCHEDULER SECTION */}
                    <div className="p-4 bg-neutral-900/60 border border-neutral-850 rounded-xl space-y-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold text-neutral-200">ตั้งค่าการดึงรีวิวอัตโนมัติ (Google Reviews Auto-Sync Scheduler)</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 font-light leading-normal">
                        เลือกรอบระยะเวลาที่ต้องการให้ระบบเบื้องหลังทำการติดต่อสื่อสารกับ Google Maps API เพื่อตรวจสอบและดึงรีวิวใหม่ๆ เข้ามาบันทึกในระบบโดยอัตโนมัติ
                      </p>

                      <div className="flex flex-wrap gap-1.5 justify-start">
                        {[
                          { value: "manual", label: "จัดการซิงค์เอง (Manual)" },
                          { value: "daily", label: "ดึงอัตโนมัติทุกวัน (Daily)" },
                          { value: "weekly", label: "ดึงอัตโนมัติทุกสัปดาห์ (Weekly)" },
                          { value: "monthly", label: "ดึงอัตโนมัติทุกเดือน (Monthly)" }
                        ].map((item) => {
                          const isSelected = googleReviewsSyncIntervalEdit === item.value;
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => setGoogleReviewsSyncIntervalEdit(item.value as any)}
                              className={`px-3 py-2 rounded text-xs font-medium cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/35 font-semibold shadow-inner" 
                                  : "bg-neutral-950 text-neutral-400 border border-neutral-850 hover:text-white hover:border-neutral-800"
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="text-left text-[11px] text-neutral-400 space-y-1 font-light border-t border-neutral-850/60 pt-3 flex flex-col sm:flex-row sm:justify-between sm:items-center font-sans">
                        <div>
                          สถานะออโต้ซิงค์:{" "}
                          <span className={`font-bold ${
                            googleReviewsSyncIntervalEdit === "manual" ? "text-neutral-500" : "text-emerald-400"
                          }`}>
                            {googleReviewsSyncIntervalEdit === "manual" ? "● ปิดใช้งาน (แมนนวล)" : "● เปิดใช้งาน (อัตโนมัติ)"}
                          </span>
                        </div>
                        <div>
                          ซิงค์อัตโนมัติล่าสุดเมื่อ: <span className="font-mono text-neutral-300 font-semibold">{
                            settings.general?.lastGoogleReviewsSyncTime
                              ? new Date(settings.general.lastGoogleReviewsSyncTime).toLocaleString("th-TH", {
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

                    {/* SEARCH QUERY PLACE FINDER */}
                    <div className="p-4 bg-neutral-900/40 border border-neutral-850 rounded-lg space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300">
                        <Search className="h-4 w-4 text-brick" />
                        <span>ค้นหารหัสสถานที่ด่วน (Place Lookup by Name Search)</span>
                      </div>
                      <div className="flex space-x-2">
                        <input 
                          id="placeSearchQuery"
                          type="text"
                          placeholder="ระบุชื่อโรงแรม เช่น: The M5 Residence Hotel Pak Kret"
                          className="flex-1 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const qInput = document.getElementById("placeSearchQuery") as HTMLInputElement;
                            const query = qInput ? qInput.value.trim() : "";
                            if (!query) {
                              alert("กรุณากรอกชื่อโรงแรมก่อนค้นหา");
                              return;
                            }
                            setIsSyncingReviews(true);
                            try {
                              const res = await fetch("/api/reviews/sync-google", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ 
                                  apiKey: customApiKeyEdit, 
                                  searchQuery: query
                                })
                              });
                              const data = await res.json();
                              if (data.success) {
                                setGooglePlaceIdEdit(data.placeId);
                                alert(`พบสถานที่สำเร็จ!\nชื่อสถานที่: ${data.placeName}\nที่อยู่: ${data.address}\nPlace ID: ${data.placeId}\n\nระบบดึงและสลับรหัสให้ท่านเรียบร้อยแล้ว!`);
                                setReviewsEdit(data.reviews);
                                await refreshSettings();
                              } else {
                                alert(`การค้นหาล้มเหลว: ${data.error}`);
                              }
                            } catch (e: any) {
                              alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${e.message}`);
                            } finally {
                              setIsSyncingReviews(false);
                            }
                          }}
                          disabled={isSyncingReviews}
                          className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs font-mono font-bold cursor-pointer disabled:opacity-50"
                        >
                          ค้นหา Place ID
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsSyncingReviews(true);
                          try {
                            const res = await fetch("/api/reviews/sync-google", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ 
                                apiKey: customApiKeyEdit, 
                                placeId: googlePlaceIdEdit 
                              })
                            });
                            const data = await res.json();
                            if (data.success) {
                              setReviewsEdit(data.reviews);
                              alert(data.message || "ซิงค์ดึงข้อมูลรีวิวล่าสุดจาก Google สำเร็จ!");
                              await refreshSettings();
                            } else {
                              alert(`เกิดข้อผิดพลาด: ${data.error}`);
                            }
                          } catch (e: any) {
                            alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${e.message}`);
                          } finally {
                            setIsSyncingReviews(false);
                          }
                        }}
                        disabled={isSyncingReviews}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 text-white rounded-lg text-xs font-bold font-sans flex items-center space-x-2 shadow-lg shadow-blue-900/20 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`h-4 w-4 ${isSyncingReviews ? "animate-spin" : ""}`} />
                        <span>{isSyncingReviews ? "กำลังซิงค์ดึงข้อมูลจาก Google Maps..." : "ดึงรีวิวล่าสุดสดๆ จาก Google (Sync Google Reviews)"}</span>
                      </button>
                    </div>
                  </div>

                  {/* MANUAL OVERRIDES / REVIEWS LISTING */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pt-2">
                      <div>
                        <h4 className="text-sm font-bold text-white font-sans">รายการรีวิวที่มีผลในการแสดงผล (Active Reviews List)</h4>
                        <p className="text-[11px] text-neutral-400">ท่านสามารถแก้ไขรายละเอียดหรือลบรีวิวบางรายการเพื่อคุมหน้าร้านได้โดยตรงที่นี่</p>
                      </div>
                      <button
                        onClick={() => {
                          setReviewsEdit([...reviewsEdit, { name: "ชื่อลูกค้าคนใหม่", role: "Verified Guest 🌐", review: "เนื้อหารีวิวความเห็นจากการเข้าพักสไมล์ลอฟท์", rating: 5, date: "เมื่อเร็วๆ นี้", avatarUrl: "" }]);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-mono font-bold cursor-pointer flex items-center space-x-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>เพิ่มบทวิจารณ์เอง (Add Manual)</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {reviewsEdit.map((rev: any, idx: number) => (
                        <div key={idx} className="p-5 bg-neutral-950 border border-neutral-850 rounded-lg space-y-4 relative">
                          <button
                            onClick={() => {
                              const copy = reviewsEdit.filter((_: any, i: number) => i !== idx);
                              setReviewsEdit(copy);
                            }}
                            className="absolute top-4 right-4 p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="ลบบทวิจารณ์นี้"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          
                          <div className="text-xs font-mono text-brick font-bold uppercase flex items-center space-x-1.5">
                            <span>REVIEW BUBBLE #{idx + 1}</span>
                            {rev.avatarUrl && <span className="text-[9px] text-blue-400 bg-blue-900/20 border border-blue-900/40 px-1 py-0.5 rounded">HAS_AVATAR</span>}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-8">
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs text-neutral-400 font-mono">ชื่อของผู้รีวิว (Reviewer Name)</label>
                              <input 
                                type="text"
                                value={rev.name}
                                onChange={(e) => {
                                  const copy = [...reviewsEdit];
                                  copy[idx].name = e.target.value;
                                  setReviewsEdit(copy);
                                }}
                                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-400 font-mono">บทบาท/ป้าย (Role/Badge)</label>
                              <input 
                                type="text"
                                value={rev.role || ""}
                                onChange={(e) => {
                                  const copy = [...reviewsEdit];
                                  copy[idx].role = e.target.value;
                                  setReviewsEdit(copy);
                                }}
                                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-400 font-mono">คะแนนระดับ (Rating 1-5)</label>
                              <input 
                                type="number"
                                min={1}
                                max={5}
                                value={rev.rating || 5}
                                onChange={(e) => {
                                  const copy = [...reviewsEdit];
                                  copy[idx].rating = parseInt(e.target.value) || 5;
                                  setReviewsEdit(copy);
                                }}
                                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs text-neutral-400 font-mono">เนื้อความรีวิวเต็ม (Review text)</label>
                              <textarea 
                                rows={2}
                                value={rev.review}
                                onChange={(e) => {
                                  const copy = [...reviewsEdit];
                                  copy[idx].review = e.target.value;
                                  setReviewsEdit(copy);
                                }}
                                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white font-light focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-400 font-mono">ลิงก์รูปโปรไฟล์ (Avatar URL)</label>
                              <input 
                                type="text"
                                value={rev.avatarUrl || ""}
                                onChange={(e) => {
                                  const copy = [...reviewsEdit];
                                  copy[idx].avatarUrl = e.target.value;
                                  setReviewsEdit(copy);
                                }}
                                placeholder="ลิงก์รูปภาพ (เว้นว่างไว้เพื่อแสดงอักษรย่อ)"
                                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-400 font-mono">ช่วงเวลาที่รีวิว/เข้าพัก (Date Info)</label>
                              <input 
                                type="text"
                                value={rev.date || ""}
                                onChange={(e) => {
                                  const copy = [...reviewsEdit];
                                  copy[idx].date = e.target.value;
                                  setReviewsEdit(copy);
                                }}
                                placeholder="3 เดือนที่แล้ว"
                                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {reviewsEdit.length === 0 && (
                        <div className="p-8 text-center text-xs text-neutral-500 font-mono">ไม่มีรายการบทวิจารณ์รีวิวในระบบ</div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-neutral-900">
                    <span className="text-neutral-500 text-[11px] font-mono">*กรุณากดปุ่ม บันทึกรีวิวทั้งหมด เพื่อจัดเก็บสถานะระบบและเปิดใช้งานการเปลี่ยนแปลง</span>
                    <button
                      onClick={handleSaveReviews}
                      className="px-6 py-2.5 bg-brick hover:bg-brick-dark text-white rounded-lg text-xs font-semibold uppercase font-mono tracking-widest cursor-pointer shadow-lg shadow-brick/20"
                    >
                      บันทึกรีวิวและการตั้งค่าทั้งหมด
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: FAQS EDIT */}
              {activeTab === "faqs" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-white">คำถามที่พบบ่อย (Dynamic FAQs Accordion)</h3>
                      <p className="text-xs text-neutral-450 font-light">เพิ่ม ลบ หรือแก้ไขข้อคำถามพบบ่อยที่จะช่วยตอบลูกค้าได้ทันที</p>
                    </div>
                    <button
                      onClick={() => {
                        setFaqsEdit([...faqsEdit, { q: "พิมพ์คำถามของคุณที่นี่?", a: "พิมพ์คำตอบของคำถามของคุณเพื่อบริการลูกค้าที่นี่" }]);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-mono font-bold cursor-pointer flex items-center space-x-1"
                    >
                      <Plus className="h-4 w-4" />
                      <span>เพิ่มข้อคำถาม (Add FAQ)</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {faqsEdit.map((faq: any, idx: number) => (
                      <div key={idx} className="p-5 bg-neutral-950 border border-neutral-850 rounded-lg space-y-4 relative">
                        <button
                          onClick={() => {
                            setConfirmDeleteModal({
                              title: "ยืนยันการลบข้อคำถาม",
                              message: `คุณแน่ใจหรือไม่ว่าต้องการลบคำถามที่พบบ่อย "${faq.q || ''}" ออกจากฐานข้อมูลถาวรโดยตรง? การลบจะมีผลทันทีและไม่สามารถกู้คืนได้`,
                              onConfirm: async () => {
                                const copy = faqsEdit.filter((_: any, i: number) => i !== idx);
                                setFaqsEdit(copy);
                                const success = await updateSettings({
                                  ...settings,
                                  faqs: copy
                                });
                                if (success) {
                                  alert("ลบข้อคำถามและบันทึกลงฐานข้อมูลเรียบร้อยแล้ว! ✨");
                                } else {
                                  alert("เกิดข้อขัดข้องในการบันทึกข้อมูลการลบลงฐานข้อมูล");
                                }
                              }
                            });
                          }}
                          className="absolute top-4 right-4 p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer z-10"
                          title="ลบคำถามนี้"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        
                        <div className="text-xs font-mono text-brick font-bold uppercase">QUESTION & ANSWER BLOCK #{idx + 1}</div>
                        
                        <div className="space-y-1 pr-8">
                          <label className="text-xs text-neutral-400 font-mono">ข้อคำถาม (Question)</label>
                          <input 
                            type="text"
                            value={faq.q}
                            onChange={(e) => {
                              const copy = [...faqsEdit];
                              copy[idx].q = e.target.value;
                              setFaqsEdit(copy);
                            }}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-neutral-400 font-mono">คำตอบ (Answer)</label>
                          <textarea 
                            rows={3}
                            value={faq.a}
                            onChange={(e) => {
                              const copy = [...faqsEdit];
                              copy[idx].a = e.target.value;
                              setFaqsEdit(copy);
                            }}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white font-light focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                    {faqsEdit.length === 0 && (
                      <div className="p-8 text-center text-xs text-neutral-500 font-mono">ไม่มีรายการคำถามที่บันทึกไว้ในระบบ</div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveFaqs}
                      className="px-6 py-2.5 bg-brick hover:bg-brick-dark text-white rounded text-xs font-semibold uppercase font-mono tracking-widest cursor-pointer shadow-lg shadow-brick/20"
                    >
                      บันทึกข้อคำถามคำตอบทั้งหมด
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: REVIEWS EDIT */}
              {activeTab === "reviews" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-white">รีวิวจากลูกค้า (Guest Experience Reviews)</h3>
                      <p className="text-xs text-neutral-450 font-light">จัดการรายละเอียดผู้รีวิว บทวิจารณ์ และคะแนนดาวเพื่อแสดงความมั่นใจ</p>
                    </div>
                    <button
                      onClick={() => {
                        setReviewsEdit([...reviewsEdit, { name: "ชื่อลูกค้าคนใหม่", role: "Concert Attendee 🎸", review: "เนื้อหารีวิวความเห็นจากการเข้าพักสไมล์ลอฟท์", rating: 5, date: "มิถุนายน 2026" }]);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-mono font-bold cursor-pointer flex items-center space-x-1"
                    >
                      <Plus className="h-4 w-4" />
                      <span>เพิ่มบทวิจารณ์ (Add Review)</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {reviewsEdit.map((rev: any, idx: number) => (
                      <div key={idx} className="p-5 bg-neutral-950 border border-neutral-850 rounded-lg space-y-4 relative">
                        <button
                          onClick={() => {
                            setConfirmDeleteModal({
                              title: "ยืนยันการลบบทวิจารณ์",
                              message: `คุณแน่ใจหรือไม่ว่าต้องการลบบทวิจารณ์ของ "${rev.name || ''}" ออกจากฐานข้อมูลถาวรโดยตรง? การลบจะมีผลทันทีและไม่สามารถกู้คืนได้`,
                              onConfirm: async () => {
                                const copy = reviewsEdit.filter((_: any, i: number) => i !== idx);
                                setReviewsEdit(copy);
                                const success = await updateSettings({
                                  ...settings,
                                  reviews: copy
                                });
                                if (success) {
                                  alert("ลบบทวิจารณ์และบันทึกลงฐานข้อมูลเรียบร้อยแล้ว! ✨");
                                } else {
                                  alert("เกิดข้อขัดข้องในการบันทึกข้อมูลการลบลงฐานข้อมูล");
                                }
                              }
                            });
                          }}
                          className="absolute top-4 right-4 p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer z-10"
                          title="ลบบทวิจารณ์นี้"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        
                        <div className="text-xs font-mono text-brick font-bold uppercase">GUEST REVIEW BUBBLE #{idx + 1}</div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-8">
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-xs text-neutral-400 font-mono">ชื่อของผู้รีวิว (Reviewer Name)</label>
                            <input 
                              type="text"
                              value={rev.name}
                              onChange={(e) => {
                                const copy = [...reviewsEdit];
                                copy[idx].name = e.target.value;
                                setReviewsEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">บทบาท/ป้าย (Role/Badge)</label>
                            <input 
                              type="text"
                              value={rev.role || ""}
                              onChange={(e) => {
                                const copy = [...reviewsEdit];
                                copy[idx].role = e.target.value;
                                setReviewsEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">คะแนนระดับ (Rating 1-5)</label>
                            <input 
                              type="number"
                              min={1}
                              max={5}
                              value={rev.rating || 5}
                              onChange={(e) => {
                                const copy = [...reviewsEdit];
                                copy[idx].rating = parseInt(e.target.value) || 5;
                                setReviewsEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-1 md:col-span-3">
                            <label className="text-xs text-neutral-400 font-mono">เนื้อความรีวิวเต็ม (Review text)</label>
                            <textarea 
                              rows={2}
                              value={rev.review}
                              onChange={(e) => {
                                const copy = [...reviewsEdit];
                                copy[idx].review = e.target.value;
                                setReviewsEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white font-light focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">ช่วงเวลาที่เข้าพัก (Date Info)</label>
                            <input 
                              type="text"
                              value={rev.date || ""}
                              onChange={(e) => {
                                const copy = [...reviewsEdit];
                                copy[idx].date = e.target.value;
                                setReviewsEdit(copy);
                              }}
                              placeholder="มิถุนายน 2026"
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {reviewsEdit.length === 0 && (
                      <div className="p-8 text-center text-xs text-neutral-500 font-mono">ไม่มีรายการบทวิจารณ์รีวิวในระบบ</div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveReviews}
                      className="px-6 py-2.5 bg-brick hover:bg-brick-dark text-white rounded text-xs font-semibold uppercase font-mono tracking-widest cursor-pointer shadow-lg shadow-brick/20"
                    >
                      บันทึกรีวิวทั้งหมด
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: GALLERY EDIT */}
              {activeTab === "gallery" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-white">รูปภาพแกลเลอรีรูปถ่าย (Lifestyle Gallery Images)</h3>
                      <p className="text-xs text-neutral-450 font-light">กำหนด URL รูปภาพ คำอธิบาย และหมวดหมู่หัวข้อเพื่อประชาสัมพันธ์แกลเลอรีแบบไดนามิก</p>
                    </div>
                    <button
                      onClick={() => {
                        setGalleryEdit([...galleryEdit, { url: "", title: "คำภาพจำลอง", cat: "Superior Suite" }]);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-mono font-bold cursor-pointer flex items-center space-x-1"
                    >
                      <Plus className="h-4 w-4" />
                      <span>เพิ่มรูปภาพ (Add Gallery Image)</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {galleryEdit.map((item: any, idx: number) => (
                      <div key={idx} className="p-5 bg-neutral-950 border border-neutral-850 rounded-lg space-y-4 relative">
                        <button
                          onClick={() => {
                            setConfirmDeleteModal({
                              title: "ยืนยันการลบรูปภาพแกลเลอรี",
                              message: `คุณแน่ใจหรือไม่ว่าต้องการลบรูปภาพแกลเลอรีลำดับที่ ${idx + 1} "${item.title || ''}" ออกจากฐานข้อมูลถาวรโดยตรง? การลบจะมีผลทันทีและไม่สามารถกู้คืนได้`,
                              onConfirm: async () => {
                                const copy = galleryEdit.filter((_: any, i: number) => i !== idx);
                                setGalleryEdit(copy);
                                const success = await updateSettings({
                                  ...settings,
                                  gallery: copy
                                });
                                if (success) {
                                  alert("ลบรูปภาพแกลเลอรีและบันทึกลงฐานข้อมูลเรียบร้อยแล้ว! ✨");
                                } else {
                                  alert("เกิดข้อขัดข้องในการบันทึกข้อมูลการลบลงฐานข้อมูล");
                                }
                              }
                            });
                          }}
                          className="absolute top-4 right-4 p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer z-20"
                          title="ลบรูปภาพนี้"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        
                        <div className="text-xs font-mono text-brick font-bold uppercase">GALLERY PHOTO BLOCK #{idx + 1}</div>
                        
                        <div className="space-y-1 pr-8">
                          <label className="text-xs text-neutral-400 font-mono font-bold text-amber-500">ที่อยู่ URL รูปภาพ (URL Link - หากเว้นว่างไว้จะใช้รูปประกอบภาพลอฟท์เริ่มต้น)</label>
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              value={item.url || ""}
                              onChange={(e) => {
                                const copy = [...galleryEdit];
                                copy[idx].url = e.target.value;
                                setGalleryEdit(copy);
                              }}
                              placeholder="https://images.unsplash.com/..."
                              className="flex-1 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-mono"
                            />
                            <ImageUploadButton
                              onUploadSuccess={(url) => {
                                const copy = [...galleryEdit];
                                copy[idx].url = url;
                                setGalleryEdit(copy);
                              }}
                              label="อัปโหลดรูป 📤"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">คำบรรยายหัวข้อย่อยรูปถ่าย (Title)</label>
                            <input 
                              type="text"
                              value={item.title}
                              onChange={(e) => {
                                const copy = [...galleryEdit];
                                copy[idx].title = e.target.value;
                                setGalleryEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">ชื่อป้ายหมวดหมู่ (Category Tag)</label>
                            <input 
                              type="text"
                              value={item.cat}
                              onChange={(e) => {
                                const copy = [...galleryEdit];
                                copy[idx].cat = e.target.value;
                                setGalleryEdit(copy);
                              }}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {galleryEdit.length === 0 && (
                      <div className="p-8 text-center text-xs text-neutral-500 font-mono">ไม่มีรูปภาพแสดงในส่วนแกลเลอรี</div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveGallery}
                      className="px-6 py-2.5 bg-brick hover:bg-brick-dark text-white rounded text-xs font-semibold uppercase font-mono tracking-widest cursor-pointer shadow-lg shadow-brick/20"
                    >
                      บันทึกรูปภาพทั้งหมด
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: MEMBERS MANAGEMENT */}
              {activeTab === "members" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">จัดการระบบฐานข้อมูลสมาชิก (Club M5 Member Management)</h3>
                      <p className="text-xs text-neutral-450 font-light">คุณสามารถ ค้นหา, เพิ่ม สมาชิกใหม่, ปรับแต่งแต้มสะสม, เลื่อนระดับระดับชนชั้นสมาชิก หรือ ลบข้อมูลสมาชิกออกจากระบบได้ทันที</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setEditingMemberId(null);
                        setMemName("");
                        setMemEmail("");
                        setMemPhone("");
                        setMemTier("Silver");
                        setMemPoints(0);
                        setMemBookingsCount(0);
                        setShowAddMember(!showAddMember);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-mono uppercase tracking-wider font-semibold cursor-pointer shadow flex items-center justify-center space-x-1.5 ml-auto sm:ml-0"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{showAddMember ? "ปิดแบบฟอร์ม" : "เพิ่มสมาชิกใหม่ (Add New Member)"}</span>
                    </button>
                  </div>

                  {/* Add / Edit Member Form Panel */}
                  {(showAddMember || editingMemberId) && (
                    <div className="p-5 bg-neutral-950 border-2 border-emerald-900/40 rounded-lg space-y-4">
                      <div className="text-xs font-mono text-emerald-400 uppercase font-bold tracking-widest flex items-center space-x-1.5">
                        <Sparkles className="h-4 w-4" />
                        <span>{editingMemberId ? "แก้ไขข้อมูลสมาชิก (Edit Member)" : "สมัครและสร้างบัญชีสมาชิกใหม่ (Register Member)"}</span>
                      </div>

                      <form 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!memName.trim() || !memEmail.trim()) {
                            alert("กรุณากรอกชื่อและอีเมลสมาชิก");
                            return;
                          }
                          if (editingMemberId) {
                            // Update
                            const success = await updateMemberOnServer(editingMemberId, {
                              name: memName.trim(),
                              email: memEmail.trim(),
                              phone: memPhone.trim(),
                              tier: memTier,
                              points: Number(memPoints) || 0,
                              joinedBookingsCount: Number(memBookingsCount) || 0
                            });
                            if (success) {
                              alert("อัปเดตข้อมูลสมาชิกเรียบร้อยแล้ว!");
                              setEditingMemberId(null);
                            } else {
                              alert("เกิดข้อผิดพลาดในการบันทึก");
                            }
                          } else {
                            // Add/Register
                            const success = await addMemberOnServer({
                              name: memName.trim(),
                              email: memEmail.trim(),
                              phone: memPhone.trim(),
                              password: "password123", // Default basic password
                              tier: memTier,
                              points: Number(memPoints) || 0,
                              joinedBookingsCount: Number(memBookingsCount) || 0
                            });
                            if (success) {
                              alert("สร้างบัญชีสมาชิกใหม่เข้าระบบสำเร็จ!");
                              setShowAddMember(false);
                            } else {
                              alert("อีเมลนี้ซ้ำในระบบ หรือ เกิดข้อผิดพลาดในการบันทึก");
                            }
                          }
                          // Clear states
                          setMemName("");
                          setMemEmail("");
                          setMemPhone("");
                          setMemTier("Silver");
                          setMemPoints(0);
                          setMemBookingsCount(0);
                        }} 
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400 font-mono">ชื่อ-นามสกุลสมาชิก</label>
                            <input 
                              type="text"
                              required
                              value={memName}
                              onChange={(e) => setMemName(e.target.value)}
                              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                              placeholder="เช่น คุณ มานะ ยินดี"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400 font-mono">อีเมลติดต่อ (ใช้ Login เข้าระบบ)</label>
                            <input 
                              type="email"
                              required
                              value={memEmail}
                              onChange={(e) => setMemEmail(e.target.value)}
                              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-mono"
                              placeholder="mana@example.com"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400 font-mono">เบอร์โทรศัพท์</label>
                            <input 
                              type="tel"
                              value={memPhone}
                              onChange={(e) => setMemPhone(e.target.value)}
                              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-mono"
                              placeholder="08X-XXX-XXXX"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400 font-mono">ระดับสิทธิสมาชิก (Tier)</label>
                            <select
                              value={memTier}
                              onChange={(e) => setMemTier(e.target.value as any)}
                              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-bold"
                            >
                              <option value="Silver">Silver (ส่วนลด 5%)</option>
                              <option value="Gold">Gold (ส่วนลด 10%)</option>
                              <option value="Elite">Elite (ส่วนลด 15%)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400 font-mono text-amber-500">พ้อยท์สะสม (Points Balance)</label>
                            <input 
                              type="number"
                              value={memPoints}
                              onChange={(e) => setMemPoints(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-mono font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400 font-mono">จำนวนรอบเข้าพัก (Bookings Count)</label>
                            <input 
                              type="number"
                              value={memBookingsCount}
                              onChange={(e) => setMemBookingsCount(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddMember(false);
                              setEditingMemberId(null);
                            }}
                            className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 rounded text-xs font-semibold cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer shadow-lg"
                          >
                            บันทึกข้อมูลสมาชิก
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Members Table */}
                  <div className="bg-neutral-950 border border-neutral-850 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-neutral-300">
                        <thead className="bg-[#0e0e0e] text-neutral-400 uppercase font-mono text-[10px] border-b border-neutral-850">
                          <tr>
                            <th className="px-5 py-3.5">ชื่อ-นามสกุล</th>
                            <th className="px-5 py-3.5">อีเมลบัญชี</th>
                            <th className="px-5 py-3.5">เบอร์โทรศัพท์</th>
                            <th className="px-5 py-3.5">ระดับคลาส (Tier)</th>
                            <th className="px-5 py-3.5 text-right">คะแนน (Points)</th>
                            <th className="px-5 py-3.5 text-center">เข้าพัก (ครั้ง)</th>
                            <th className="px-5 py-3.5 text-right">ดำเนินการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900">
                          {members && members.length > 0 ? (
                            members.map((member) => (
                              <tr key={member.id} className="hover:bg-neutral-900/50 transition-colors">
                                <td className="px-5 py-3.5 font-bold text-white">{member.name}</td>
                                <td className="px-5 py-3.5 font-mono text-neutral-400">{member.email}</td>
                                <td className="px-5 py-3.5 font-mono text-neutral-450">{member.phone || "-"}</td>
                                <td className="px-5 py-3.5">
                                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                                    member.tier === "Elite" ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" :
                                    member.tier === "Gold" ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                                    "bg-zinc-400/10 text-zinc-300 border border-zinc-400/20"
                                  }`}>
                                    {member.tier}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-right font-mono font-bold text-amber-500">
                                  {member.points.toLocaleString()} pts
                                </td>
                                <td className="px-5 py-3.5 text-center font-mono text-neutral-300">
                                  {member.joinedBookingsCount || 0}
                                </td>
                                <td className="px-5 py-3.5 text-right space-x-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      setEditingMemberId(member.id);
                                      setMemName(member.name);
                                      setMemEmail(member.email);
                                      setMemPhone(member.phone || "");
                                      setMemTier(member.tier);
                                      setMemPoints(member.points);
                                      setMemBookingsCount(member.joinedBookingsCount || 0);
                                      setShowAddMember(false);
                                    }}
                                    className="p-1 px-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700 rounded transition-all cursor-pointer font-mono text-[10px] uppercase font-semibold inline-flex items-center space-x-1"
                                    title="แก้ไขข้อมูลสมาชิก"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                    <span>แก้ไข</span>
                                  </button>
                                   {deletingMemberId === member.id ? (
                                     <div className="inline-flex items-center space-x-1 shrink-0 animate-fadeIn">
                                       <button
                                         onClick={async () => {
                                           try {
                                             const success = await deleteMemberOnServer(member.id);
                                             if (success) {
                                               // Success, no blocking popup needed
                                             } else {
                                               alert("เกิดข้อผิดพลาดในการลบข้อมูล");
                                             }
                                           } catch (ex: any) {
                                             alert(`ข้อผิดพลาดทางเทคนิค: ${ex.message}`);
                                           } finally {
                                             setDeletingMemberId(null);
                                           }
                                         }}
                                         className="p-1 px-2.5 bg-red-600 hover:bg-red-700 text-white rounded transition-all cursor-pointer font-mono text-[10px] uppercase font-bold inline-flex items-center"
                                         title="ยืนยันการลบสมาชิกนี้ถาวร"
                                       >
                                         <span>ยืนยันลบ</span>
                                       </button>
                                       <button
                                         onClick={() => setDeletingMemberId(null)}
                                         className="p-1 px-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded transition-all cursor-pointer font-mono text-[10px] uppercase font-bold inline-flex items-center"
                                         title="ยกเลิกการลบ"
                                       >
                                         <span>ยกเลิก</span>
                                       </button>
                                     </div>
                                   ) : (
                                     <button
                                       onClick={() => setDeletingMemberId(member.id)}
                                       className="p-1 px-2.5 bg-red-950/20 hover:bg-red-950/40 text-red-500 hover:text-red-400 border border-red-900/30 hover:border-red-900/55 rounded transition-all cursor-pointer font-mono text-[10px] uppercase font-semibold inline-flex items-center space-x-1"
                                       title="ลบสมาชิก"
                                     >
                                       <Trash2 className="h-3 w-3" />
                                       <span>ลบ</span>
                                     </button>
                                   )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-5 py-8 text-center text-neutral-500 font-mono">
                                ไม่พบสมาชิกรายใดลงทะเบียนในระบบ
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: ADMINS MANAGEMENT */}
              {activeTab === "admins" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                        <ShieldCheck className="h-5 w-5 text-brick animate-pulse" />
                        <span>จัดการบัญชีผู้ควบคุมระบบหลังบ้าน (Admin User Management)</span>
                      </h3>
                      <p className="text-xs text-neutral-450 font-light">คุณสามารถ ค้นหา, เพิ่มแอดมินใหม่, อัปเดตสิทธิ์ หรือ ลบข้อมูลผู้ใช้งานที่มีสิทธิ์เข้าหลังบ้าน เพื่อการใช้งานจริงได้อย่างปลอดภัยสูงสุด</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setEditingAdminId(null);
                        setAdmUsername("");
                        setAdmPassword("");
                        setAdmName("");
                        setAdmRole("General Admin");
                        setShowAddAdmin(!showAddAdmin);
                      }}
                      className="px-4 py-2 bg-brick hover:bg-brick-dark text-white rounded text-xs font-mono uppercase tracking-wider font-semibold cursor-pointer shadow flex items-center justify-center space-x-1.5 ml-auto sm:ml-0 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{showAddAdmin ? "ปิดแบบฟอร์ม" : "เพิ่มแอดมินใหม่ (Add New Admin)"}</span>
                    </button>
                  </div>

                  {/* Add / Edit Admin Form Panel */}
                  {(showAddAdmin || editingAdminId) && (
                    <div className="p-5 bg-neutral-950 border-2 border-brick/40 rounded-lg space-y-4">
                      <div className="text-xs font-mono text-brick uppercase font-bold tracking-widest flex items-center space-x-1.5">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        <span>{editingAdminId ? "แก้ไขสิทธิ์แอดมิน (Edit Admin)" : "สร้างบัญชีแอดมินคนใหม่ (Create Admin Account)"}</span>
                      </div>

                      <form 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!admUsername.trim() || !admPassword.trim() || !admName.trim()) {
                            alert("กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง");
                            return;
                          }

                          try {
                            if (editingAdminId) {
                              // Update Admin
                              const res = await fetch(`/api/admins/${editingAdminId}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  admin: {
                                    username: admUsername.trim(),
                                    password: admPassword.trim(),
                                    name: admName.trim(),
                                    role: admRole
                                  }
                                })
                              });
                              const data = await res.json();
                              if (data.success) {
                                alert("อัปเดตบัญชีแอดมินสำเร็จ!");
                                if (data.admin) {
                                  const currentUsername = sessionStorage.getItem("m5_admin_username") || "";
                                  if (currentUsername.toLowerCase() === admUsername.trim().toLowerCase() || currentAdmin?.id === editingAdminId) {
                                    sessionStorage.setItem("m5_admin_username", data.admin.username);
                                    setCurrentAdmin(data.admin);
                                  }
                                }
                                setEditingAdminId(null);
                              } else {
                                alert(`ไม่สามารถอัปเดตข้อมูลได้: ${data.error}`);
                              }
                            } else {
                              // Register New Admin
                              const res = await fetch("/api/admins/register", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  admin: {
                                    username: admUsername.trim(),
                                    password: admPassword.trim(),
                                    name: admName.trim(),
                                    role: admRole
                                  }
                                })
                              });
                              const data = await res.json();
                              if (data.success) {
                                alert("สร้างบัญชีแอดมินใหม่เข้าสู่ระบบเรียบร้อยแล้ว!");
                                setShowAddAdmin(false);
                              } else {
                                alert(`ไม่สามารถเพิ่มบัญชีแอดมินได้: ${data.error}`);
                              }
                            }

                            // Reload updated admin users list
                            const rLoad = await fetch("/api/admins");
                            const dLoad = await rLoad.json();
                            if (dLoad.success && dLoad.admins) {
                              setAdminUsers(dLoad.admins);
                            }
                          } catch (err: any) {
                            alert(`เกิดข้อผิดพลาด: ${err.message}`);
                          }
                        }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <div>
                          <label className="block text-xs font-mono uppercase text-neutral-400 mb-1.5 font-semibold">ชื่อผู้ใช้งานล็อกอิน (Username)</label>
                          <input 
                            type="text" 
                            value={admUsername}
                            onChange={(e) => setAdmUsername(e.target.value)}
                            placeholder="ตัวอย่างเช่น: loftmanager"
                            className="w-full bg-neutral-900 border border-neutral-800 focus:border-brick rounded px-3 py-2 text-xs text-white font-mono focus:outline-none transition-colors"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-mono uppercase text-neutral-400 mb-1.5 font-semibold">รหัสผ่านสำหรับใช้งาน (Password)</label>
                          <input 
                            type="password" 
                            value={admPassword}
                            onChange={(e) => setAdmPassword(e.target.value)}
                            placeholder="รหัสผ่านเข้าควบคุม..."
                            className="w-full bg-neutral-900 border border-neutral-800 focus:border-brick rounded px-3 py-2 text-xs text-white font-mono focus:outline-none transition-colors"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-mono uppercase text-neutral-400 mb-1.5 font-semibold">ชื่อผู้ดูแล (Full Name)</label>
                          <input 
                            type="text" 
                            value={admName}
                            onChange={(e) => setAdmName(e.target.value)}
                            placeholder="ตัวอย่างเช่น: คุณสุรศักดิ์ ใจดี"
                            className="w-full bg-neutral-900 border border-neutral-800 focus:border-brick rounded px-3 py-2 text-xs text-white focus:outline-none transition-colors"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-mono uppercase text-neutral-400 mb-1.5 font-semibold">สิทธิ์การควบคุมหลังบ้าน (Role Class)</label>
                          <select
                            value={admRole}
                            onChange={(e) => setAdmRole(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 focus:border-brick rounded px-3 py-2 text-xs text-white focus:outline-none transition-colors cursor-pointer"
                          >
                            <option value="Super Admin">Super Admin (ผู้ควบคุมระดับสูงสุด)</option>
                            <option value="Loft Admin">Loft Admin (ผู้ดูแลห้อง M5 Loft)</option>
                            <option value="General Admin">General Admin (เจ้าหน้าที่ต้อนรับทั่วไป)</option>
                          </select>
                        </div>

                        <div className="md:col-span-2 pt-2 flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddAdmin(false);
                              setEditingAdminId(null);
                            }}
                            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white rounded text-xs font-mono uppercase font-bold cursor-pointer transition-colors"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-brick hover:bg-brick-dark text-white rounded text-xs font-mono uppercase font-bold cursor-pointer shadow transition-colors flex items-center space-x-1"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>ยืนยันบันทึกข้อมูล (Save)</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Admins Table */}
                  <div className="bg-neutral-950 border border-neutral-850 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-neutral-300">
                        <thead className="bg-[#0e0e0e] text-neutral-400 uppercase font-mono text-[10px] border-b border-neutral-850">
                          <tr>
                            <th className="px-5 py-3.5">ชื่อผู้ใช้ (Username)</th>
                            <th className="px-5 py-3.5">ชื่อเต็มแอดมิน (Name)</th>
                            <th className="px-5 py-3.5">สิทธิ์บทบาทหน้าที่ (Role Class)</th>
                            <th className="px-5 py-3.5">รหัสผ่าน (สัญลักษณ์)</th>
                            <th className="px-5 py-3.5 text-right">การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900">
                          {adminUsers && adminUsers.length > 0 ? (
                            adminUsers.map((adm) => {
                              const isSelf = currentAdmin?.username?.toLowerCase() === adm.username?.toLowerCase() || 
                                             username?.trim()?.toLowerCase() === adm.username?.toLowerCase();
                              return (
                                <tr key={adm.id} className="hover:bg-neutral-900/50 transition-colors">
                                  <td className="px-5 py-3.5 font-mono text-brick font-bold flex items-center space-x-1.5">
                                    <Key className="h-3.5 w-3.5 text-neutral-500" />
                                    <span>{adm.username}</span>
                                    {isSelf && (
                                      <span className="text-[9px] bg-brick/10 text-brick border border-brick/20 rounded px-1.5 font-bold font-sans">บัญชีของคุณ</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 font-bold text-white">{adm.name}</td>
                                  <td className="px-5 py-3.5">
                                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                                      adm.role === "Super Admin" ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" :
                                      adm.role === "Loft Admin" ? "bg-cyan-500/10 text-cyan-500 border border-cyan-500/20" :
                                      "bg-zinc-400/10 text-zinc-300 border border-zinc-400/20"
                                    }`}>
                                      {adm.role}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 font-mono text-neutral-500">•••••••• (ซ่อนเพื่อความปลอดภัย)</td>
                                  <td className="px-5 py-3.5 text-right space-x-1 shrink-0">
                                    <button
                                      onClick={() => {
                                        setEditingAdminId(adm.id || adm.adminId);
                                        setAdmUsername(adm.username);
                                        setAdmPassword(adm.password);
                                        setAdmName(adm.name);
                                        setAdmRole(adm.role || "General Admin");
                                        setShowAddAdmin(false);
                                      }}
                                      className="p-1 px-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700 rounded transition-all cursor-pointer font-mono text-[10px] uppercase font-semibold inline-flex items-center space-x-1"
                                      title="แก้ไขบัญชีผู้ใช้"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                      <span>แก้ไข</span>
                                    </button>
                                    {deletingAdminId === adm.id ? (
                                      <div className="inline-flex items-center space-x-1 shrink-0">
                                        <button
                                          onClick={async () => {
                                            if (isSelf) {
                                              alert("คุณไม่สามารถลบบัญชีของคุณเองในขณะล็อกอินใช้งานได้!");
                                              setDeletingAdminId(null);
                                              return;
                                            }
                                            try {
                                              const res = await fetch(`/api/admins/${adm.id || adm.adminId}`, {
                                                method: "DELETE"
                                              });
                                              const data = await res.json();
                                              if (data.success) {
                                                // Reload list
                                                const rLoad = await fetch("/api/admins");
                                                const dLoad = await rLoad.json();
                                                if (dLoad.success && dLoad.admins) {
                                                  setAdminUsers(dLoad.admins);
                                                }
                                              } else {
                                                alert(`เกิดข้อผิดพลาดในการลบข้อมูล: ${data.error}`);
                                              }
                                            } catch (ex: any) {
                                              alert(`ข้อผิดพลาดทางเทคนิค: ${ex.message}`);
                                            } finally {
                                              setDeletingAdminId(null);
                                            }
                                          }}
                                          className="p-1 px-2 bg-red-600 hover:bg-red-700 text-white rounded transition-all cursor-pointer font-mono text-[10px] uppercase font-bold inline-flex items-center"
                                          title="ยืนยันลบบัญชีผู้ใช้นี้อย่างถาวร"
                                        >
                                          <span>ยืนยันลบ</span>
                                        </button>
                                        <button
                                          onClick={() => setDeletingAdminId(null)}
                                          className="p-1 px-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded transition-all cursor-pointer font-mono text-[10px] uppercase font-bold inline-flex items-center"
                                          title="ยกเลิกการลบ"
                                        >
                                          <span>ยกเลิก</span>
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          if (isSelf) {
                                            alert("คุณไม่สามารถลบบัญชีของคุณเองในขณะล็อกอินใช้งานได้!");
                                            return;
                                          }
                                          setDeletingAdminId(adm.id);
                                        }}
                                        className={`p-1 px-2.5 rounded transition-all font-mono text-[10px] uppercase font-semibold inline-flex items-center space-x-1 ${
                                          isSelf 
                                            ? "opacity-40 cursor-not-allowed bg-neutral-900 text-neutral-600 border border-neutral-850" 
                                            : "bg-red-950/20 hover:bg-red-950/40 text-red-500 hover:text-red-400 border border-red-900/30 hover:border-red-900/55 cursor-pointer"
                                        }`}
                                        disabled={isSelf}
                                        title="ลบบัญชีผู้ใช้"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        <span>ลบ</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-5 py-8 text-center text-neutral-500 font-mono">
                                ไม่พบข้อมูลผู้ใช้แอดมินในระบบ
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: MANAGING RESERVATIONS TABLE */}
              {activeTab === "bookings" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">รายการธุรกรรมและการจองห้องพัก</h3>
                      <p className="text-xs text-neutral-450 font-light">ตารางรายงานข้อมูลการจองใบแจ้งหนี้เพื่อควบคุมสถานะการชำระเงินของแขก</p>
                    </div>
                    
                    <button
                      onClick={() => setShowAddBooking(!showAddBooking)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-mono uppercase tracking-wider font-semibold cursor-pointer shadow flex items-center justify-center space-x-1.5 ml-auto sm:ml-0"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{showAddBooking ? "ปิดแบบฟอร์ม" : "สร้างรายการจองด้วยมือ (Walk-In)"}</span>
                    </button>
                  </div>

                  {/* Walk-In Form Overlay block */}
                  {showAddBooking && (
                    <form onSubmit={handleCreateManualBooking} className="p-5 bg-neutral-950 border-2 border-emerald-900/40 rounded-lg space-y-4">
                      <div className="text-xs font-mono text-emerald-400 uppercase font-bold tracking-widest flex items-center space-x-1.5">
                        <Plus className="h-4 w-4" />
                        <span>M5_OFFLINE_WALK_IN_RESERVATION // บันทึกจองแขกด้วยระบบเจ้าหน้าที่</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-450">ชื่อผู้เข้าพัก (Guest Name)</label>
                          <input 
                            type="text"
                            required
                            value={newBkGuestName}
                            onChange={(e) => setNewBkGuestName(e.target.value)}
                            placeholder="สมควร สุขสบาย"
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-450">อีเมล (Email)</label>
                          <input 
                            type="email"
                            required
                            value={newBkGuestEmail}
                            onChange={(e) => setNewBkGuestEmail(e.target.value)}
                            placeholder="guest@mail.com"
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-450">เบอร์โทรศัพท์ (Phone)</label>
                          <input 
                            type="text"
                            required
                            value={newBkGuestPhone}
                            onChange={(e) => setNewBkGuestPhone(e.target.value)}
                            placeholder="081-345-6789"
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-455">เลือกประเภทห้อง</label>
                          <select 
                            value={newBkRoomType}
                            onChange={(e) => setNewBkRoomType(e.target.value)}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-850 rounded text-xs text-white focus:outline-none block"
                          >
                            {settings.rooms.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.name} ({r.price.toLocaleString()} THB)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-455">วันเช็คอิน (Check-In)</label>
                          <input 
                            type="date"
                            required
                            value={newBkCheckIn}
                            onChange={(e) => setNewBkCheckIn(e.target.value)}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-455">วันเช็คเอาท์ (Check-Out)</label>
                          <input 
                            type="date"
                            required
                            value={newBkCheckOut}
                            onChange={(e) => setNewBkCheckOut(e.target.value)}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-455">จำนวนผู้พัก (Guests)</label>
                          <input 
                            type="number"
                            min={1}
                            max={5}
                            required
                            value={newBkGuests}
                            onChange={(e) => setNewBkGuests(Number(e.target.value))}
                            className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-neutral-455">ความต้องการพิเศษเสริม (Special Request)</label>
                        <input 
                          type="text"
                          value={newBkSpecialRequest}
                          onChange={(e) => setNewBkSpecialRequest(e.target.value)}
                          placeholder="เช่น ขอห้องมุมชั้นสูงสุด หรือจองที่จอดรถล่วงหน้าแคมป์..."
                          className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold uppercase tracking-wider cursor-pointer"
                        >
                          บันทึกทำรายการจองใหม่แบบออฟไลน์
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Main Bookings Table block */}
                  <div className="bg-neutral-950 border border-neutral-850 rounded-lg overflow-hidden">
                    {bookings.length === 0 ? (
                      <div className="text-center py-12 text-sm text-neutral-555">ยังไม่มียอดจองใดๆ ในฐานข้อมูลระบบของโรงแรมครับ</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs font-mono">
                          <thead>
                            <tr className="bg-neutral-900 text-neutral-400 border-b border-neutral-850">
                              <th className="p-3 uppercase">รหัสการจอง (ID)</th>
                              <th className="p-3 uppercase">ข้อมูลลูกค้า (Guest)</th>
                              <th className="p-3">ประเภทห้องโรม</th>
                              <th className="p-3 text-center">วันเข้าพัก (Dates)</th>
                              <th className="p-3 text-right">ยอดรวม (Price)</th>
                              <th className="p-3 text-center">สถานะธุรกรรม (Status)</th>
                              <th className="p-3 text-center">จัดการคำสั่ง (Actions)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-850">
                            {bookings.map((booking) => (
                              <tr key={booking.id} className="hover:bg-neutral-900/50 transition-colors">
                                <td className="p-3 font-bold text-white whitespace-nowrap">{booking.id}</td>
                                <td className="p-3 space-y-1">
                                  <div className="font-bold text-white text-xs">{booking.guestName}</div>
                                  <div className="text-[10px] text-neutral-450 flex flex-wrap gap-2">
                                    <span className="flex items-center space-x-0.5"><Mail className="h-3 w-3 inline text-brick" /><span>{booking.guestEmail}</span></span>
                                    <span className="flex items-center space-x-0.5"><Phone className="h-3 w-3 inline text-neutral-400" /><span>{booking.guestPhone}</span></span>
                                  </div>
                                  {booking.specialRequest && (
                                    <div className="text-[10px] bg-neutral-900 px-2 py-0.5 border border-neutral-800 rounded italic text-yellow-500 mt-1">
                                      *คำขอ: {booking.specialRequest}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-neutral-300">{booking.roomName}</td>
                                <td className="p-3 text-center whitespace-nowrap text-neutral-200">
                                  <div className="font-bold">{booking.checkIn} ถึง {booking.checkOut}</div>
                                  <div className="text-[9px] text-neutral-450 capitalize">ความหนา: {booking.guests} ท่าน</div>
                                </td>
                                <td className="p-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                                  {booking.totalPrice.toLocaleString()} THB
                                </td>
                                <td className="p-3 text-center">
                                  <select
                                    value={booking.status}
                                    onChange={(e) => updateBookingStatus(booking.id, e.target.value as any)}
                                    className={`px-2 py-1 rounded text-[10px] text-white font-mono uppercase bg-neutral-900 border focus:outline-none ${
                                      booking.status === "Pending" ? "border-amber-600 text-yellow-450" :
                                      booking.status === "Paid" ? "border-sky-600 text-sky-400" :
                                      booking.status === "Confirmed" ? "border-emerald-600 text-green-400" :
                                      booking.status === "Cancelled" ? "border-red-650 text-red-400" : "border-purple-600 text-purple-400"
                                    }`}
                                  >
                                    <option value="Pending">Pending (รอยืนยัน)</option>
                                    <option value="Paid">Paid (ชำระเงินแล้ว)</option>
                                    <option value="Confirmed">Confirmed (ยืนยันสิทธ์เข้าพัก)</option>
                                    <option value="Checked-In">Checked-In (เช็คอินแล้ว)</option>
                                    <option value="Completed">Completed (เช็คเอาท์แล้ว)</option>
                                    <option value="Cancelled">Cancelled (ยกเลิกรายการ)</option>
                                  </select>
                                </td>
                                <td className="p-3 text-center whitespace-nowrap space-x-1.5">
                                  <button
                                    onClick={() => setEditingBooking({ ...booking })}
                                    className="p-1 px-2.5 bg-emerald-950/20 border border-emerald-900/30 text-emerald-500 rounded hover:bg-emerald-900/20 hover:text-emerald-400 transition-all cursor-pointer font-sans text-[10px]"
                                    title="แก้ไขข้อมูลการจอง"
                                  >
                                    <Edit2 className="h-3.5 w-3.5 inline mr-1" />
                                    <span>แก้ไข</span>
                                  </button>
                                   {deletingBookingId === booking.id ? (
                                     <div className="inline-flex items-center space-x-1 shrink-0 animate-fadeIn">
                                       <button
                                         onClick={async () => {
                                           try {
                                             await deleteBooking(booking.id);
                                           } catch (ex: any) {
                                             alert(`ข้อผิดพลาด: ${ex.message}`);
                                           } finally {
                                             setDeletingBookingId(null);
                                           }
                                         }}
                                         className="p-1 px-2 bg-red-600 hover:bg-red-700 text-white rounded transition-all cursor-pointer font-sans text-[10px] font-bold"
                                         title="ยืนยันการลบรายการจองนี้ถาวร"
                                       >
                                         <span>ยืนยันลบ</span>
                                       </button>
                                       <button
                                         onClick={() => setDeletingBookingId(null)}
                                         className="p-1 px-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded transition-all cursor-pointer font-sans text-[10px] font-bold"
                                         title="ยกเลิกการลบ"
                                       >
                                         <span>ยกเลิก</span>
                                       </button>
                                     </div>
                                   ) : (
                                     <button
                                       onClick={() => setDeletingBookingId(booking.id)}
                                       className="p-1 px-2.5 bg-red-950/20 border border-red-900/30 text-red-500 rounded hover:bg-red-900/20 hover:text-red-400 transition-all cursor-pointer font-sans text-[10px]"
                                       title="ลบรายการจอง"
                                     >
                                       <Trash2 className="h-3.5 w-3.5 inline mr-1" />
                                       <span>ลบ</span>
                                     </button>
                                   )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* EDIT BOOKING MODAL */}
                  {editingBooking && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl p-6 relative">
                        <button 
                          onClick={() => setEditingBooking(null)}
                          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <X className="h-5 w-5" />
                        </button>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                          <Edit2 className="h-5 w-5 text-brick" />
                          <span>แก้ไขข้อมูลการจองห้องพัก (Edit Booking: {editingBooking.id})</span>
                        </h3>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const selectedRoom = settings.rooms.find(r => r.id === editingBooking.roomType);
                          const roomName = selectedRoom ? selectedRoom.name : editingBooking.roomName;
                          
                          let calculatedPrice = editingBooking.totalPrice;
                          if (selectedRoom && editingBooking.checkIn && editingBooking.checkOut) {
                            const date1 = new Date(editingBooking.checkIn);
                            const date2 = new Date(editingBooking.checkOut);
                            const diffTime = Math.abs(date2.getTime() - date1.getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                            calculatedPrice = selectedRoom.price * diffDays;
                          }

                          updateBooking(editingBooking.id, {
                            guestName: editingBooking.guestName,
                            guestEmail: editingBooking.guestEmail,
                            guestPhone: editingBooking.guestPhone,
                            checkIn: editingBooking.checkIn,
                            checkOut: editingBooking.checkOut,
                            guests: editingBooking.guests,
                            specialRequest: editingBooking.specialRequest,
                            roomType: editingBooking.roomType,
                            roomName: roomName,
                            totalPrice: calculatedPrice,
                            status: editingBooking.status
                          });
                          setEditingBooking(null);
                        }} className="space-y-4 text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-400">ชื่อลูกค้า (Guest Name)</label>
                              <input 
                                type="text"
                                required
                                value={editingBooking.guestName}
                                onChange={(e) => setEditingBooking({ ...editingBooking, guestName: e.target.value })}
                                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-400">อีเมล (Email)</label>
                              <input 
                                type="email"
                                required
                                value={editingBooking.guestEmail}
                                onChange={(e) => setEditingBooking({ ...editingBooking, guestEmail: e.target.value })}
                                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-400">เบอร์โทรศัพท์ (Phone)</label>
                              <input 
                                type="text"
                                required
                                value={editingBooking.guestPhone}
                                onChange={(e) => setEditingBooking({ ...editingBooking, guestPhone: e.target.value })}
                                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-1 col-span-2">
                              <label className="text-xs text-neutral-400 font-mono">เลือกประเภทห้อง (Room Type)</label>
                              <select 
                                value={editingBooking.roomType}
                                onChange={(e) => setEditingBooking({ ...editingBooking, roomType: e.target.value })}
                                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-850 rounded text-xs text-white focus:outline-none"
                              >
                                {settings.rooms.map(r => (
                                  <option key={r.id} value={r.id}>
                                    {r.name} ({r.price.toLocaleString()} THB/คืน)
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-400">จำนวนผู้เข้าพัก (Guests)</label>
                              <input 
                                type="number"
                                min={1}
                                max={10}
                                value={editingBooking.guests}
                                onChange={(e) => setEditingBooking({ ...editingBooking, guests: Number(e.target.value) })}
                                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-400">สถานะธุรกรรม (Status)</label>
                              <select 
                                value={editingBooking.status}
                                onChange={(e) => setEditingBooking({ ...editingBooking, status: e.target.value as any })}
                                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-850 rounded text-xs text-white focus:outline-none font-bold"
                              >
                                <option value="Pending">Pending (รอยืนยัน)</option>
                                <option value="Paid">Paid (ชำระเงินแล้ว)</option>
                                <option value="Confirmed">Confirmed (ยืนยันสิทธ์เข้าพัก)</option>
                                <option value="Checked-In">Checked-In (เช็คอินแล้ว)</option>
                                <option value="Completed">Completed (เช็คเอาท์แล้ว)</option>
                                <option value="Cancelled">Cancelled (ยกเลิกรายการ)</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-400">วันเช็คอิน (Check-In)</label>
                              <input 
                                type="date"
                                required
                                value={editingBooking.checkIn}
                                onChange={(e) => setEditingBooking({ ...editingBooking, checkIn: e.target.value })}
                                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-400">วันเช็คเอาท์ (Check-Out)</label>
                              <input 
                                type="date"
                                required
                                value={editingBooking.checkOut}
                                onChange={(e) => setEditingBooking({ ...editingBooking, checkOut: e.target.value })}
                                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs text-neutral-400 font-mono">ความต้องการพิเศษเสริม (Special Request)</label>
                            <input 
                              type="text"
                              value={editingBooking.specialRequest || ""}
                              onChange={(e) => setEditingBooking({ ...editingBooking, specialRequest: e.target.value })}
                              className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div className="pt-2 flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setEditingBooking(null)}
                              className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 rounded text-xs font-semibold cursor-pointer"
                            >
                              ยกเลิก
                            </button>
                            <button
                              type="submit"
                              className="px-5 py-2 bg-brick hover:bg-brick-dark text-white rounded text-xs font-semibold cursor-pointer shadow-lg"
                            >
                              บันทึกการแก้ไขข้อมูล
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* UNIFIED CONFIRM DELETE MODAL */}
                  {confirmDeleteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
                      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-lg p-6 shadow-2xl space-y-4">
                        <div className="flex items-center space-x-3 text-red-500">
                          <Trash2 className="h-6 w-6 shrink-0" />
                          <h4 className="text-md font-bold font-sans text-white">{confirmDeleteModal.title}</h4>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed font-sans">{confirmDeleteModal.message}</p>
                        <div className="flex justify-end space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteModal(null)}
                            className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-semibold cursor-pointer transition-colors"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const onConfirm = confirmDeleteModal.onConfirm;
                              setConfirmDeleteModal(null);
                              await onConfirm();
                            }}
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold cursor-pointer transition-colors shadow-lg shadow-red-900/20"
                          >
                            ยืนยันลบถาวร
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "calendar" && (
                <CalendarTabContent 
                  bookings={bookings} 
                  rooms={settings.rooms} 
                  isLight={adminTheme === "light"}
                  onAddBooking={() => {
                    setActiveTab("bookings");
                    setShowAddBooking(true);
                  }}
                />
              )}

              {activeTab === "blocked" && (
                <BlockedDatesTabContent settings={settings} updateSettings={updateSettings} />
              )}

              {activeTab === "coupons" && (
                <CouponsTabContent settings={settings} updateSettings={updateSettings} />
              )}

              {activeTab === "backgrounds" && (
                <BackgroundsTabContent settings={settings} updateSettings={updateSettings} />
              )}

              {activeTab === "seo" && (
                <SeoTabContent settings={settings} updateSettings={updateSettings} />
              )}

              {activeTab === "directus" && (
                <DirectusTabContent />
              )}

              {activeTab === "smtp" && (
                <SmtpTabContent settings={settings} updateSettings={updateSettings} smtpEdit={smtpEdit} setSmtpEdit={setSmtpEdit} />
              )}

              {activeTab === "impact" && (
                <ImpactEventsTab />
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
