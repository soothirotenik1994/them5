const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `
      {/* Floating Concierge AI Support Chatbot */}
      <AIChatbot />
`;

const replacement1 = `
      {/* Mobile Sticky Booking Bar */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 1, type: "spring", stiffness: 100 }}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-md border-t border-neutral-800 p-3 sm:p-4 flex items-center justify-between shadow-[0_-5px_30px_rgba(0,0,0,0.6)]"
      >
        <div className="flex flex-col">
          <span className="text-[10px] sm:text-xs text-neutral-400 font-mono tracking-wider uppercase">Starting Rate</span>
          <span className="text-sm sm:text-base font-bold text-amber-500">฿850 <span className="text-[10px] sm:text-xs text-neutral-500 font-normal">/ คืน</span></span>
        </div>
        <button 
          onClick={handleBookClick}
          className="px-6 py-2.5 sm:py-3 bg-brick hover:bg-brick-dark text-white rounded text-xs sm:text-sm font-sans font-bold shadow-lg shadow-brick/20 overflow-hidden relative group"
          style={{ backgroundImage: "linear-gradient(to right, #d95a06 0%, #b84100 100%)" }}
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          <span className="relative z-10">จองห้องพักตอนนี้</span>
        </button>
      </motion.div>

      {/* Floating Concierge AI Support Chatbot */}
      <AIChatbot />
`;

code = code.replace(target1.trim(), replacement1.trim());
fs.writeFileSync('src/App.tsx', code);
