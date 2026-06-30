import React, { useState } from "react";
import { BookingRecord } from "../context/SettingsContext";
import { RoomType } from "../types";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  User, Phone, Mail, Clock, ShieldCheck, CreditCard, Inbox, Plus
} from "lucide-react";

interface CalendarTabContentProps {
  bookings: BookingRecord[];
  rooms: RoomType[];
  isLight?: boolean;
  onAddBooking?: () => void;
}

export default function CalendarTabContent({ bookings, rooms, isLight = false, onAddBooking }: CalendarTabContentProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month names in Thai
  const THAI_MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const DAYS_OF_WEEK = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

  // Helper to check if a booking overlaps with a specific date
  const getBookingsOnDate = (d: Date) => {
    return bookings.filter(b => {
      if (b.status === "Cancelled") return false;
      
      const targetTime = d.getTime();
      
      // parse checkIn and checkOut dates
      const start = new Date(b.checkIn);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(b.checkOut);
      end.setHours(23, 59, 59, 999);
      
      return targetTime >= start.getTime() && targetTime <= end.getTime();
    });
  };

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // First day of week index (0-6)
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Days in previous month
  const prevMonthDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(1); // default to first day of new month
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(1); // default to first day of new month
  };

  const cells: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

  // Add prev month buffer
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const dateObj = new Date(year, month - 1, dayNum);
    cells.push({ day: dayNum, isCurrentMonth: false, date: dateObj });
  }

  // Add current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(year, month, i);
    cells.push({ day: i, isCurrentMonth: true, date: dateObj });
  }

  // Pad to multiple of 7
  const totalCells = Math.ceil(cells.length / 7) * 7;
  const nextDaysNeeded = totalCells - cells.length;
  for (let i = 1; i <= nextDaysNeeded; i++) {
    const dateObj = new Date(year, month + 1, i);
    cells.push({ day: i, isCurrentMonth: false, date: dateObj });
  }

  // Get selected date details
  const selectedDateObject = selectedDay ? new Date(year, month, selectedDay) : new Date();
  const selectedDateBookings = getBookingsOnDate(selectedDateObject);

  // Helper for room color themes
  const getRoomColorBadge = (roomType: string) => {
    const rLower = roomType.toLowerCase();
    if (rLower.includes("superior")) {
      return isLight 
        ? "bg-orange-100 text-orange-800 border border-orange-200/50"
        : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
    } else if (rLower.includes("deluxe")) {
      return isLight
        ? "bg-sky-100 text-sky-800 border border-sky-200/50"
        : "bg-sky-500/10 text-sky-400 border border-sky-500/20";
    } else {
      return isLight
        ? "bg-purple-100 text-purple-850 border border-purple-200/50"
        : "bg-purple-500/10 text-purple-400 border border-purple-500/20";
    }
  };

  // Helper for status styling
  const getStatusBadge = (status: BookingRecord["status"]) => {
    switch (status) {
      case "Pending":
        return isLight
          ? "bg-[#fef3c7] text-[#d97706] border border-[#fcd34d]"
          : "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      case "Paid":
        return isLight
          ? "bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd]"
          : "bg-sky-500/10 text-sky-400 border border-sky-500/20";
      case "Confirmed":
        return isLight
          ? "bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]"
          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "Checked-In":
        return isLight
          ? "bg-[#e0e7ff] text-[#4f46e5] border border-[#c7d2fe]"
          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
      case "Completed":
        return isLight
          ? "bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb]"
          : "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20";
      case "Cancelled":
        return isLight
          ? "bg-[#fef2f2] text-[#dc2626] border border-[#fca5a5]"
          : "bg-red-500/10 text-red-500 border border-red-500/20";
      default:
        return "bg-neutral-500/10 text-neutral-300";
    }
  };

  // Dynamic class generators
  const getCellClass = (cell: typeof cells[0], isSelected: boolean, isToday: boolean) => {
    if (!cell.isCurrentMonth) {
      return isLight
        ? "bg-slate-50/40 border-slate-100/50 opacity-20 text-slate-300 cursor-not-allowed min-h-[75px] md:min-h-[90px] p-1 border rounded-lg transition-all relative flex flex-col justify-between"
        : "bg-neutral-950 border-neutral-950 opacity-25 text-neutral-600 cursor-not-allowed min-h-[75px] md:min-h-[90px] p-1 border rounded-lg transition-all relative flex flex-col justify-between";
    }
    
    if (isSelected) {
      return isLight
        ? "bg-orange-50/70 border-[#ff6a00] shadow-sm shadow-orange-100 text-slate-800 min-h-[75px] md:min-h-[90px] p-1 border rounded-lg transition-all cursor-pointer relative flex flex-col justify-between"
        : "bg-emerald-950/20 border-emerald-500 shadow-emerald-500/10 shadow-sm min-h-[75px] md:min-h-[90px] p-1 border rounded-lg transition-all cursor-pointer relative flex flex-col justify-between";
    }
    
    if (isToday) {
      return isLight
        ? "bg-orange-50/30 border-orange-450 text-[#ff6a00] min-h-[75px] md:min-h-[90px] p-1 border rounded-lg transition-all cursor-pointer relative flex flex-col justify-between"
        : "bg-neutral-900 border-neutral-700 text-white min-h-[75px] md:min-h-[90px] p-1 border rounded-lg transition-all cursor-pointer relative flex flex-col justify-between";
    }
    
    return isLight
      ? "bg-white border-slate-200/80 text-slate-700 hover:border-slate-350 min-h-[75px] md:min-h-[90px] p-1 border rounded-lg transition-all cursor-pointer relative flex flex-col justify-between"
      : "bg-neutral-900/40 border-neutral-900 hover:border-neutral-800 min-h-[75px] md:min-h-[90px] p-1 border rounded-lg transition-all cursor-pointer relative flex flex-col justify-between";
  };

  const getCellPillStyle = (roomType: string) => {
    const rLower = roomType.toLowerCase();
    if (isLight) {
      if (rLower.includes("superior")) {
        return "bg-orange-100 text-orange-800 border-orange-200/40";
      } else if (rLower.includes("deluxe")) {
        return "bg-sky-50 text-sky-800 border-sky-100";
      } else {
        return "bg-purple-50 text-purple-800 border-purple-100";
      }
    } else {
      return "bg-neutral-950 border-neutral-900 text-neutral-300";
    }
  };

  return (
    <div className={`space-y-6 animate-fade-in ${isLight ? "text-slate-800" : "text-neutral-200"}`}>
      
      {/* Title section */}
      <div className={`flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 ${isLight ? "border-slate-200/80" : "border-neutral-850"}`}>
        <div>
          <h2 className={`text-lg font-bold flex items-center space-x-2 ${isLight ? "text-slate-800" : "text-white"}`}>
            <CalendarIcon className={`h-5 w-5 ${isLight ? "text-[#ff6a00]" : "text-emerald-400"}`} />
            <span>ปฏิทินแสดงตารางผู้เข้าพักหลัก (Bookings Calendar)</span>
          </h2>
          <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
            แสดงรายชื่อผู้จองและห้องพักที่ถูกจองเป็นรายวันอย่างชัดเจน คอความสะดวกสบายในการจัดการจอง
          </p>
        </div>

        {/* Legend */}
        <div className={`flex items-center space-x-3 mt-3 md:mt-0 text-[10px] px-3 py-1.5 rounded-lg border ${
          isLight ? "bg-white border-slate-200/80 text-slate-650 shadow-xs" : "bg-neutral-900 border border-neutral-800 text-neutral-300"
        }`}>
          <span className={`uppercase font-mono tracking-wider font-bold ${isLight ? "text-slate-450" : "text-neutral-450"}`}>ประเภทห้อง:</span>
          <div className="flex items-center space-x-1">
            <span className="h-2 w-2 rounded-full bg-[#ff6a00]"></span>
            <span className={`${isLight ? "text-slate-700" : "text-neutral-300"}`}>SUPERIOR</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="h-2 w-2 rounded-full bg-sky-500"></span>
            <span className={`${isLight ? "text-slate-700" : "text-neutral-300"}`}>DELUXE</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="h-2 w-2 rounded-full bg-purple-500"></span>
            <span className={`${isLight ? "text-slate-700" : "text-neutral-300"}`}>SUITE</span>
          </div>
        </div>
      </div>

      {/* Grid Layout (Calendar Left, Details Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Calendar Grid (8 cols) */}
        <div className={`lg:col-span-8 p-5 rounded-xl shadow-xs space-y-4 border ${
          isLight ? "bg-white border-slate-200/80 text-slate-800" : "bg-neutral-950 border border-neutral-850 text-neutral-200"
        }`}>
          
          {/* Calendar Header Navigator */}
          <div className={`flex items-center justify-between pb-3 border-b ${isLight ? "border-slate-100" : "border-neutral-850"}`}>
            <button 
              onClick={handlePrevMonth}
              className={`p-1.5 border rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                isLight 
                  ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900" 
                  : "bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[10px] ml-1 hidden md:inline">เดือนก่อน</span>
            </button>
            
            <span className={`text-sm font-bold tracking-tight uppercase ${isLight ? "text-slate-800" : "text-white"}`}>
              {THAI_MONTHS[month]} {year + 543}
            </span>

            <button 
              onClick={handleNextMonth}
              className={`p-1.5 border rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                isLight 
                  ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900" 
                  : "bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <span className="text-[10px] mr-1 hidden md:inline">เดือนถัดไป</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Days of Week Headers */}
          <div className={`grid grid-cols-7 gap-1 text-center font-bold text-[11px] uppercase ${isLight ? "text-slate-500" : "text-neutral-450"}`}>
            {DAYS_OF_WEEK.map((d, index) => (
              <div 
                key={index} 
                className={`py-1.5 font-mono ${
                  index === 0 ? "text-red-500" : index === 6 ? "text-sky-500" : isLight ? "text-slate-600" : "text-neutral-400"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((cell, idx) => {
              const bookingsOnCell = getBookingsOnDate(cell.date);
              const isSelected = cell.isCurrentMonth && selectedDay === cell.day;
              
              // highlight today's actual date
              const today = new Date();
              const isToday = today.getDate() === cell.day && today.getMonth() === cell.date.getMonth() && today.getFullYear() === cell.date.getFullYear();

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (cell.isCurrentMonth) {
                      setSelectedDay(cell.day);
                    } else {
                      // navigate to that month and set day
                      setCurrentDate(cell.date);
                      setSelectedDay(cell.day);
                    }
                  }}
                  className={getCellClass(cell, isSelected, isToday)}
                >
                  {/* Day number header */}
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                    <span className={`${
                      cell.isCurrentMonth 
                        ? isSelected 
                          ? isLight ? "text-[#ff6a00] text-xs font-bold" : "text-emerald-400 text-xs" 
                          : isToday
                            ? "text-[#ff6a00]"
                            : isLight ? "text-slate-700" : "text-neutral-400"
                        : isLight ? "text-slate-300" : "text-neutral-600"
                    }`}>
                      {cell.day}
                    </span>
                    {isToday && cell.isCurrentMonth && (
                      <span className={`text-[8px] px-1 font-sans rounded font-bold ${
                        isLight ? "bg-[#ff6a00] text-white" : "bg-brick text-white"
                      }`}>TODAY</span>
                    )}
                  </div>

                  {/* Booking mini list block */}
                  <div className="flex-1 mt-1 space-y-1 overflow-hidden">
                    {bookingsOnCell.slice(0, 3).map((b, bIdx) => {
                      const isSuperior = b.roomType.toLowerCase().includes("superior");
                      const isDeluxe = b.roomType.toLowerCase().includes("deluxe");
                      let dotColor = "bg-purple-500";
                      if (isSuperior) dotColor = "bg-[#ff6a00]";
                      else if (isDeluxe) dotColor = "bg-sky-500";

                      return (
                        <div 
                          key={bIdx}
                          className={`text-[8px] leading-tight flex items-center space-x-0.5 truncate px-1 py-0.5 rounded border ${getCellPillStyle(b.roomType)}`}
                          title={`${b.guestName} (${b.roomName}) - ${b.status}`}
                        >
                          <span className={`h-1 w-1 rounded-full shrink-0 ${dotColor}`}></span>
                          <span className="truncate max-w-[45px] md:max-w-[70px] font-sans">{b.guestName}</span>
                        </div>
                      );
                    })}
                    {bookingsOnCell.length > 3 && (
                      <div className={`text-[7px] font-mono text-right font-bold ${isLight ? "text-slate-400" : "text-neutral-500"}`}>
                        +{bookingsOnCell.length - 3} รายการ
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed list on selected date (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className={`border rounded-xl p-5 shadow-xs ${
            isLight ? "bg-white border-slate-200/80 text-slate-800" : "bg-neutral-950 border border-neutral-850 text-neutral-200"
          }`}>
            <div className={`flex items-center space-x-2 border-b pb-3 mb-4 ${isLight ? "border-slate-100" : "border-neutral-850"}`}>
              <Clock className={`h-4 w-4 ${isLight ? "text-[#ff6a00]" : "text-emerald-400"}`} />
              <h3 className={`font-bold text-xs uppercase tracking-wider font-mono ${isLight ? "text-slate-800" : "text-white"}`}>
                รายการจองวันที่ {selectedDay} {THAI_MONTHS[month]} {year + 543}
              </h3>
            </div>

            {selectedDateBookings.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Inbox className={`h-8 w-8 mx-auto ${isLight ? "text-slate-300" : "text-neutral-600"}`} />
                <p className={`text-xs font-sans ${isLight ? "text-slate-400" : "text-neutral-500"}`}>ไม่มีการจองเข้าพักใดๆ ในวันที่เลือกนี้ครับ</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                {selectedDateBookings.map((b) => (
                  <div 
                    key={b.id} 
                    className={`p-3 border rounded-lg transition-all space-y-2.5 ${
                      isLight 
                        ? "bg-[#f8fafc]/60 border-slate-200/80 hover:border-slate-300" 
                        : "bg-neutral-900 border border-neutral-800 hover:border-neutral-750"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[9px] font-mono block font-bold ${isLight ? "text-[#ff6a00]" : "text-brick"}`}>BOOKING #{b.id}</span>
                        <span className={`text-xs font-bold block mt-0.5 ${isLight ? "text-slate-800" : "text-white"}`}>{b.guestName}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase font-bold ${getStatusBadge(b.status)}`}>
                        {b.status}
                      </span>
                    </div>

                    <div className={`text-[10px] space-y-1 font-mono ${isLight ? "text-slate-550" : "text-neutral-400"}`}>
                      <div className="flex items-center space-x-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isLight ? "bg-[#ff6a00]" : "bg-brick"}`}></span>
                        <span className={`font-bold ${isLight ? "text-slate-700" : "text-neutral-300"}`}>{b.roomName}</span>
                      </div>
                      <div className="pl-3 space-y-1 font-sans">
                        <div className="flex items-center space-x-1">
                          <span className="opacity-70">📅</span>
                          <span>{b.checkIn} ถึง {b.checkOut}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="opacity-70">👥</span>
                          <span>ผู้เข้าพัก: {b.guests} ท่าน</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="opacity-70">📞</span>
                          <span>{b.guestPhone}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="opacity-70">✉️</span>
                          <span className="break-all">{b.guestEmail}</span>
                        </div>
                        {b.specialRequest && (
                          <div className={`italic text-[11px] mt-2 p-3 rounded-xl border relative pl-7 font-sans leading-relaxed ${
                            isLight 
                              ? "bg-orange-50/70 text-orange-800 border-orange-100" 
                              : "bg-neutral-950 text-yellow-500 border-neutral-850"
                          }`}>
                            <span className={`absolute left-2 top-2 text-lg font-serif ${isLight ? "text-orange-300" : "text-neutral-700"}`}>“</span>
                            {b.specialRequest}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={`pt-2 border-t flex justify-between items-center text-[10px] ${isLight ? "border-slate-100" : "border-neutral-850"}`}>
                      <span className={`${isLight ? "text-slate-400" : "text-neutral-500"}`}>ยอดชำระเงิน</span>
                      <span className={`font-bold font-mono text-xs ${isLight ? "text-[#ff6a00]" : "text-emerald-400"}`}>
                        {b.totalPrice.toLocaleString()} THB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Floating Action Button (สร้างรายการจองใหม่) */}
          {onAddBooking && (
            <button
              onClick={onAddBooking}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-[#ff6a00] hover:bg-orange-600 active:scale-98 text-white font-bold rounded-full text-xs shadow-md shadow-orange-500/10 cursor-pointer transition-all uppercase tracking-wider"
            >
              <Plus className="h-4 w-4" />
              <span>สร้างรายการจองใหม่</span>
            </button>
          )}

        </div>

      </div>

    </div>
  );
}

