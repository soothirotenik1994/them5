import React, { useState } from "react";
import { Info, UserCheck, Maximize2, Bed, CalendarCheck, Check } from "lucide-react";
import { motion } from "motion/react";
import { RoomType } from "../types";
import { useSettings } from "../context/SettingsContext";

const imageMap: Record<string, string> = {
  superior: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
  deluxe: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
  studio: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80"
};

const defaultRoomImg = "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80";

interface RoomsSectionProps {
  onSelectRoom: (roomId: string) => void;
}

export default function RoomsSection({ onSelectRoom }: RoomsSectionProps) {
  const [selectedDetail, setSelectedDetail] = useState<RoomType | null>(null);
  const { settings } = useSettings();
  const rooms = settings.rooms;

  return (
    <section id="rooms" className="py-24 bg-charcoal-medium border-t border-b border-charcoal-light relative">
      <div className="absolute inset-0 bg-radial from-brick/5 via-transparent to-transparent opacity-70 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Head Intro */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-brick font-semibold">
            // EXCLUSIVE ACCOMMODATION
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            ห้องพักสไตล์ลอฟท์สุดพิเศษ
          </h2>
          <div className="w-16 h-1 bg-brick mx-auto my-3 rounded-full"></div>
          <p className="text-sm sm:text-base text-neutral-300 font-light">
            ห้องพักทุกห้องผ่านการตกแต่งแบบประณีตในแนว Loft & Industrial โชว์วัสดุธรรมชาติแท้ 
            ใส่ใจทุกรายละเอียดด้านงานระบบแสงสว่างและการเก็บเสียง เพื่อการพักผ่อนอย่างเต็มประสิทธิภาพ
          </p>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {rooms.map((room) => {
            const displayImg = room.imageUrl || imageMap[room.id] || defaultRoomImg;
            return (
              <motion.div
                key={room.id}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
                className="bg-charcoal-deep border border-neutral-850 rounded-lg overflow-hidden shadow-xl hover:shadow-brick/5 hover:border-brick/40 group flex flex-col relative"
              >
                {/* Image Frame */}
                <div className="h-64 relative overflow-hidden bg-neutral-950">
                  <img
                    src={displayImg}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = imageMap[room.id] || defaultRoomImg;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent"></div>
                  
                  {/* Price tag over card */}
                  <div className="absolute top-4 right-4 px-3 py-1 bg-brick text-white text-xs font-mono font-bold rounded shadow-md border border-brick-light/20">
                    เริ่มต้น {room.price.toLocaleString()} THB / คืน
                  </div>

                  {/* Left indicators */}
                  <div className="absolute bottom-4 left-4 font-mono text-[11px] text-brick-light bg-black/70 px-2 py-0.5 rounded border border-neutral-850 uppercase tracking-widest font-semibold">
                    {room.id}_model
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-xl font-bold text-white group-hover:text-brick transition-colors font-sans">
                        {room.name}
                      </h3>
                    </div>
                    <span className="text-xs text-neutral-400 font-medium tracking-wide">({room.thaiName})</span>
                    <p className="text-xs text-neutral-300 font-light leading-relaxed">
                      {room.description}
                    </p>
                  </div>

                  {/* Specs list block */}
                  <div className="grid grid-cols-3 gap-1 py-3 border-t border-b border-neutral-800 font-mono text-[11px] text-neutral-350 bg-neutral-900 p-2 rounded">
                    <div className="flex items-center space-x-1 justify-center border-r border-neutral-800">
                      <Maximize2 className="h-3 w-3 text-brick" />
                      <span>{room.size} ตร.ม.</span>
                    </div>
                    <div className="flex items-center space-x-1 justify-center border-r border-neutral-800">
                      <UserCheck className="h-3 w-3 text-brick" />
                      <span>สูงสุด {room.capacity} ท่าน</span>
                    </div>
                    <div className="flex items-center space-x-1 justify-center" title={room.bedType}>
                      <Bed className="h-3 w-3 text-brick" />
                      <span className="truncate">{room.id === "studio" ? "5 ฟุต" : "6 ฟุต"}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setSelectedDetail(room)}
                      className="flex items-center justify-center space-x-1.5 py-2 px-3 border border-neutral-800 hover:border-neutral-700 rounded text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-all font-medium cursor-pointer"
                    >
                      <Info className="h-3.5 w-3.5 text-neutral-400" />
                      <span>ดูรายละเอียด</span>
                    </button>
                    <button
                      onClick={() => onSelectRoom(room.id)}
                      disabled={settings.general?.bookingEnabled === false}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded text-xs transition-all font-semibold ${
                        settings.general?.bookingEnabled === false
                          ? "bg-neutral-850 text-neutral-500 cursor-not-allowed border border-neutral-800"
                          : "bg-brick hover:bg-brick-dark text-white shadow-md shadow-brick/15 cursor-pointer"
                      }`}
                    >
                      <CalendarCheck className="h-3.5 w-3.5" />
                      <span>{settings.general?.bookingEnabled === false ? "ปิดรับจอง" : "จองห้องนี้"}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Detailed Room Feature Modal overlay */}
        {selectedDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div className="bg-charcoal-deep border border-neutral-800 rounded-lg max-w-2xl w-full relative max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Screw points */}
              <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-800"></div>
              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-800"></div>
              
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white font-sans">{selectedDetail.name}</h3>
                    <p className="text-sm text-brick font-medium mt-0.5">{selectedDetail.thaiName}</p>
                  </div>
                  <button
                    onClick={() => setSelectedDetail(null)}
                    className="h-7 w-7 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center font-bold duration-150 cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="h-60 rounded-md overflow-hidden bg-center bg-cover border border-neutral-800">
                  <img
                    src={selectedDetail.imageUrl || imageMap[selectedDetail.id] || defaultRoomImg}
                    alt={selectedDetail.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = imageMap[selectedDetail.id] || defaultRoomImg;
                    }}
                  />
                </div>

                <div className="space-y-4 text-neutral-250">
                  <p className="text-sm text-neutral-350 font-light leading-relaxed">
                    {selectedDetail.longDescription}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-4 border-t border-b border-neutral-800 text-xs text-neutral-350">
                    <div className="flex items-center space-x-2">
                      <Maximize2 className="h-4 w-4 text-brick" />
                      <span><strong>พื้นที่พักผ่อน:</strong> {selectedDetail.size} ตรม.</span>
                    </div>
                    <div className="flex items-center space-x-2">
                       <UserCheck className="h-4 w-4 text-brick" />
                      <span><strong>รองรับสูงสุด:</strong> {selectedDetail.capacity} ท่าน</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Bed className="h-4 w-4 text-brick" />
                      <span><strong>ระดับเตียง:</strong> {selectedDetail.bedType.split(" (")[0]}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wider">// สิ่งอำนวยความสะดวกภายในแผนผัง</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-neutral-350">
                      {selectedDetail.amenities.map((amenity, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <Check className="h-3.5 w-3.5 text-brick" />
                          <span>{amenity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-neutral-800">
                  <div className="font-mono">
                    <span className="text-xs text-neutral-450 block">ค่าบริการเฉลี่ย</span>
                    <span className="text-xl font-bold text-brick">{selectedDetail.price.toLocaleString()} THB</span>
                    <span className="text-xs text-neutral-450"> / คืน</span>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setSelectedDetail(null);
                      }}
                      className="px-4 py-2 text-xs font-semibold rounded border border-neutral-800 text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={() => {
                        if (settings.general?.bookingEnabled === false) return;
                        const rid = selectedDetail.id;
                        setSelectedDetail(null);
                        onSelectRoom(rid);
                      }}
                      disabled={settings.general?.bookingEnabled === false}
                      className={`px-5 py-2 text-xs font-bold rounded border transition-all ${
                        settings.general?.bookingEnabled === false
                          ? "bg-neutral-850 text-neutral-500 border-neutral-800 cursor-not-allowed"
                          : "bg-brick hover:bg-brick-dark text-white border-brick-light/10 shadow-lg shadow-brick/20 cursor-pointer"
                      }`}
                    >
                      {settings.general?.bookingEnabled === false ? "ปิดรับการจองชั่วคราว" : "จองห้องพักประเภทนี้"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
