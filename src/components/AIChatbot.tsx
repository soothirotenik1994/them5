import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, Loader2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage } from "../types";

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "สวัสดีครับ! ผม 'เอ็มมี่ (M-My)' ผู้ช่วยดูแลลูกค้าอัจฉริยะส่วนตัวของ The M5 Residence ยินดีช่วยเหลือครับ วันนี้คุณมีข้อมูลอะไรที่ต้องการสอบถามเกี่ยวกับห้องพัก โปรโมชั่น หรือเส้นทางการเดินทางไป อิมแพ็ค มิวสิค เมืองทองธานี ไหมครับ?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          userMessage: textToSend,
        }),
      });

      const data = await response.json();
      if (data && data.success) {
        const assistantMsg: ChatMessage = {
          id: Math.random().toString(),
          role: "assistant",
          content: data.reply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error("Chat api failed");
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "assistant",
        content: "ต้องขออภัยด้วยนะครับ พอดีระบบขัดข้องชั่วคราวขณะประมวลผลคำตอบ แต่คุณสามารถโทรตรวจเช็คห้องพักโดยตรงได้ที่เบอร์โทรศัพท์ส่วนกลางของโรงแรม หรือพิมพ์คำถามอื่นให้ผมช่วยได้ครับ!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlesSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputMessage);
  };

  const suggestionChips = [
    "ขอดูราคาห้องพักสไตล์ลอฟท์",
    "เดินทางไปอิมแพ็คยังไงเร็วที่สุด?",
    "มีโปรโมชั่นส่วนลดบัตรคอนเสิร์ตไหม?",
    "สบู่แชมพูที่ Copper & Steam มีขายไหม?",
  ];

  return (
    <div className="fixed bottom-6 right-6 z-45 font-sans">
      
      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="h-14 w-14 rounded-full bg-brick hover:bg-brick-dark text-white shadow-2xl shadow-brick/40 flex items-center justify-center border border-brick-light/30 relative cursor-pointer"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <X key="close" className="h-6 w-6" />
          ) : (
            <div key="open" className="relative flex items-center justify-center">
              <MessageSquare className="h-6 w-6" />
              {/* Green active signal pulse */}
              <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Pane */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="absolute bottom-16 right-0 w-[90vw] sm:w-[380px] h-[500px] bg-charcoal-deep border border-neutral-800 rounded-xl shadow-2xl flex flex-col overflow-hidden relative rivet-effect"
          >
            {/* Corner screws */}
            <div className="absolute top-1 left-2 w-1 h-1 rounded-full bg-neutral-900 border-t border-l border-white/5"></div>
            <div className="absolute top-1 right-2 w-1 h-1 rounded-full bg-neutral-900 border-t border-r border-white/5"></div>

            {/* Chat Header */}
            <div className="p-4 bg-charcoal-medium border-b border-charcoal-light flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded bg-charcoal-deep border border-neutral-800 text-brick-light relative">
                  <Bot className="h-4.5 w-4.5" />
                  <span className="absolute right-0 bottom-0 h-2 w-2 rounded-full bg-emerald-500 border border-charcoal-medium"></span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-1">
                    <span>คุณเอ็มมี่</span>
                    <span className="text-[10px] bg-brick/10 border border-brick-light/20 text-brick-light px-1 py-0.2 rounded font-mono">AI CONCIERGE</span>
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-light flex items-center space-x-1">
                    <span>The M5 Residence</span>
                    <span className="h-1 w-1 bg-neutral-500 rounded-full inline-block"></span>
                    <span>พร้อมช่วยเหลือครับ</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Message window */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-950/20">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-brick text-white rounded-br-none shadow-md shadow-brick/5"
                        : "bg-charcoal-medium text-neutral-200 border border-neutral-800 rounded-bl-none font-light"
                    }`}
                  >
                    {/* Render newlines */}
                    <p className="whitespace-pre-line">{msg.content}</p>
                    <span className="block text-[8px] text-neutral-500 text-right mt-1 font-mono">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Typing Loader Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-charcoal-medium text-neutral-400 rounded-lg rounded-bl-none p-3 border border-neutral-800 flex items-center space-x-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-brick-light" />
                    <span className="text-[10px] font-mono">เอ็มมี่กำลังเรียบเรียงคำตอบ...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Chip list block */}
            {messages.length < 3 && (
              <div className="p-2 bg-neutral-950/40 border-t border-neutral-900 overflow-x-auto flex space-x-2 scrollbar-none">
                {suggestionChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip)}
                    className="flex-shrink-0 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-[10px] text-neutral-400 hover:text-white rounded-full transition-all duration-200 cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input bar */}
            <form
              onSubmit={handlesSubmitForm}
              className="p-3 bg-charcoal-medium border-t border-charcoal-light flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder="พิมพ์ข้อความคุยกับเอ็มมี่ได้ที่นี่..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-charcoal-deep border border-neutral-800 rounded dark:placeholder-neutral-500 text-neutral-200 text-xs focus:outline-none focus:border-brick font-sans"
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="p-2 bg-brick hover:bg-brick-dark disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded transition-colors cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
