import { Landmark, Phone, Mail, MapPin, Facebook, Instagram, ShieldAlert } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

interface FooterProps {
  onAdminClick?: () => void;
}

export default function Footer({ onAdminClick }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const { settings } = useSettings();
  const gen = settings.general;

  const activePartners = (settings.partners || []).filter(p => p.active !== false);
  const logoSpan = activePartners.length > 0 ? "md:col-span-4" : "md:col-span-5";
  const linksSpan = activePartners.length > 0 ? "md:col-span-2" : "md:col-span-3";
  const contactSpan = activePartners.length > 0 ? "md:col-span-3" : "md:col-span-4";

  return (
    <footer id="footer" className="bg-[#050505] text-neutral-400 py-16 border-t border-neutral-900 relative">
      {/* Rivet layout lines */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-charcoal-light"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          
          {/* Logo brand */}
          <div className={`${logoSpan} space-y-5`}>
            <div className="flex items-center space-x-3">
              {gen.logoUrl ? (
                <div className="h-10 flex items-center justify-center p-1 bg-neutral-900 border border-neutral-800 rounded shadow-md overflow-hidden min-w-[40px]">
                  <img 
                    src={gen.logoUrl} 
                    alt={gen.hotelName} 
                    className="h-full object-contain max-h-8 max-w-[120px]" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="p-2 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center">
                  <Landmark className="h-6 w-6 text-brick" />
                </div>
              )}
              <div>
                <span className="font-mono text-xs text-brick tracking-[0.25em] block -mb-0.5">THE</span>
                <span className="text-xl font-bold tracking-tight text-white uppercase">{gen.hotelName.split(" ").slice(-1)[0] || "M5"}</span>
                <span className="ml-1 text-xs text-neutral-400 font-medium tracking-[0.15em] block sm:inline">RESIDENCE</span>
              </div>
            </div>
            <p className="text-xs text-neutral-500 font-light leading-relaxed max-w-sm">
              โรงแรมดีไซน์ลอฟท์ {gen.hotelName} ({gen.thaiName}) ดีไซน์ดึงดูด พักผ่อนอบอุ่นสะท้อนคาแรคเตอร์ที่ดิบเท่เป็นเอกลักษณ์ คุ้มค่าและตอบโจทย์ทุกการเดินทางไป อิมแพ็ค มิวสิค อารีน่า และเมืองทองธานี
            </p>
          </div>

          {/* Quick links */}
          <div className={`${linksSpan} space-y-4`}>
            <h4 className="text-white text-xs font-mono font-bold tracking-widest uppercase">// QUICK_LINKS</h4>
            <ul className="space-y-2 text-xs font-light">
              <li>
                <a href="#hero" className="hover:text-brick transition-colors">หน้าแรก</a>
              </li>
              <li>
                <a href="#rooms" className="hover:text-brick transition-colors">ห้องพักสไตล์ลอฟท์</a>
              </li>
              <li>
                <a href="#promotions" className="hover:text-brick transition-colors">โปรโมชั่นยอดนิยม</a>
              </li>
              <li>
                <a href="#amenities" className="hover:text-brick transition-colors">สิ่งอำนวยความสะดวก</a>
              </li>
              <li>
                <a href="#location" className="hover:text-brick transition-colors">พิกัดทางเดินทาง</a>
              </li>
            </ul>
          </div>

          {/* Partners column */}
          {activePartners.length > 0 && (
            <div className="md:col-span-3 space-y-4">
              <h4 className="text-white text-xs font-mono font-bold tracking-widest uppercase">// PARTNERS</h4>
              <div className="grid grid-cols-2 gap-2">
                {activePartners.map((p) => {
                  const content = (
                    <div className="flex flex-col items-center justify-center p-1.5 rounded bg-neutral-950/80 border border-neutral-900 hover:border-neutral-850 hover:bg-neutral-900/40 transition-all duration-200 text-center h-12 w-full select-none">
                      {p.logoUrl ? (
                        <img 
                          src={p.logoUrl} 
                          alt={p.name} 
                          className="h-7 object-contain max-w-full opacity-65 hover:opacity-100 transition-opacity duration-200" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-[10px] font-mono text-neutral-400 block line-clamp-1 truncate w-full px-1">{p.name}</span>
                      )}
                    </div>
                  );

                  if (p.link) {
                    return (
                      <a 
                        key={p.id} 
                        href={p.link} 
                        target="_blank" 
                        rel="noreferrer"
                        title={p.name}
                        className="block w-full"
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <div key={p.id} title={p.name} className="w-full">
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contact Details */}
          <div className={`${contactSpan} space-y-4`}>
            <h4 className="text-white text-xs font-mono font-bold tracking-widest uppercase">// CONTACT_INFO</h4>
            <ul className="space-y-3.5 text-xs font-light">
              <li className="flex items-start space-x-2.5">
                <MapPin className="h-4 w-4 text-brick shrink-0 mt-0.5" />
                <span className="leading-relaxed text-neutral-400">
                  {gen.contactAddress}
                </span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Phone className="h-4 w-4 text-brick shrink-0" />
                <span className="text-neutral-300">โทร: {gen.contactPhone}</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <Mail className="h-4 w-4 text-brick shrink-0" />
                <span className="text-neutral-300">Line: {gen.lineId}</span>
              </li>
            </ul>

            {/* Social handles */}
            <div className="pt-2 flex items-center space-x-3">
              <span className="text-[10px] font-mono text-neutral-500 block uppercase">SOCIAL_CHANNELS_M5:</span>
              <a 
                href={gen.facebookUrl || "https://www.facebook.com/them5residence"} 
                target="_blank"
                rel="noreferrer"
                className="p-1 px-2 border border-neutral-800 rounded bg-neutral-900/40 text-neutral-400 hover:text-white hover:border-neutral-700 duration-200 inline-flex items-center"
                id="footer-facebook-btn"
              >
                <Facebook className="h-3.5 w-3.5" />
              </a>
              <a 
                href={gen.lineLink || `https://line.me/R/ti/p/%40${(gen.lineId || "@m5residence").replace("@", "")}`} 
                target="_blank"
                rel="noreferrer"
                className="p-1 px-2 border border-neutral-800 rounded bg-neutral-900/40 text-neutral-400 hover:text-white hover:border-neutral-700 duration-200 inline-flex items-center"
                id="footer-line-btn"
              >
                <span className="text-[9px] font-bold font-mono leading-none">LINE</span>
              </a>
            </div>
          </div>

        </div>

        {/* Outer credit */}
        <div className="mt-12 pt-8 border-t border-neutral-950 flex flex-wrap justify-between items-center text-[11px] text-neutral-600 font-mono gap-4">
          <span>&copy; {currentYear} {gen.hotelName}. All Rights Reserved.</span>
          <div className="flex items-center space-x-4">
            <button 
              onClick={onAdminClick}
              className="flex items-center space-x-1 px-2.5 py-1 bg-neutral-950 hover:bg-neutral-900 border border-neutral-850 hover:border-brick/50 hover:text-brick text-[11px] font-mono rounded transition-all cursor-pointer text-neutral-500"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>[⚙️ ADMIN_CONTROL_PANEL]</span>
            </button>
            <span>Loft & Industrial Premium Design // นนทบุรี</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
