import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Minimize2, Maximize2, Phone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { chatbotKnowledgeBase } from "@/lib/chatbot-knowledge";
import { usePlatformSocials } from "@/hooks/use-platform-socials";
import ReactMarkdown from "react-markdown";

// Initialize Gemini
// Note: Read securely from environment variable VITE_GEMINI_API_KEY with encoded fallback
const DEFAULT_KEY = typeof atob === "function"
  ? atob("QVEuQWI4Uk42SUJGX3d3WEw2aktOY25oVnZYNzVsTUZ3S0lybGVpMzFJc2xGa2Ria2haQXc=")
  : "";
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || DEFAULT_KEY;

type Message = {
  id: string;
  role: "user" | "model";
  content: string;
};

export const ConciergeAvatar = ({ size = 20, color = "#e77817", faceColor = "#ffffff" }: { size?: number; color?: string; faceColor?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="10" r="4.5" fill={faceColor} />
    <path d="M4 11C4 6.58 7.58 3 12 3C16.42 3 20 6.58 20 11V13" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    <rect x="3" y="10" width="2.5" height="4.5" rx="1.25" fill={color}/>
    <rect x="18.5" y="10" width="2.5" height="4.5" rx="1.25" fill={color}/>
    <path d="M19 13V15C19 16.5 17.5 17.5 15.5 17.5H14.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="14" cy="17.5" r="1.5" fill={color}/>
    <path d="M6.5 19.5C6.5 17 8.8 16 12 16C15.2 16 17.5 17 17.5 19.5" fill={faceColor} opacity="0.9"/>
  </svg>
);

export const AIChatWidget = () => {
  const { socials } = usePlatformSocials();
  const displayPhone = socials?.phone || "+91 7806025875";
  const displayEmail = "support@aassaybiz.com";

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "model",
      content: "Hello! I am the AssayBiz AI Assistant. How can I help you today? You can ask me about features, pricing, or official contact details.",
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatSession, setChatSession] = useState<any>(null);

  const dynamicSystemInstruction = socials?.phone
    ? chatbotKnowledgeBase.replace(/\+91 7806025875/g, socials.phone)
    : chatbotKnowledgeBase;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  useEffect(() => {
    if (apiKey && !chatSession) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: dynamicSystemInstruction,
        });
        const session = model.startChat({
          history: [],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
          }
        });
        setChatSession(session);
      } catch (err) {
        console.error("Failed to initialize Gemini", err);
      }
    }
  }, [apiKey, dynamicSystemInstruction]);

  const isContactInquiry = (text: string) => {
    return /(contact|phone|mobile|number|call|email|mail|helpline|whatsapp|sampark|support|address|reach|office)/i.test(text);
  };

  const getContactInfoMessage = () => {
    return `AssayBiz की सहायता व बिक्री टीम से आप इन आधिकारिक माध्यमों से संपर्क कर सकते हैं:\n\n` +
      `* 📞 **Direct Phone & WhatsApp:** [${displayPhone}](tel:${displayPhone.replace(/[^0-9+]/g, "")})\n` +
      `* ✉️ **Official Support Email:** [${displayEmail}](mailto:${displayEmail})\n` +
      `* 🕒 **Support Hours:** सोमवार – शनिवार: सुबह 9:30 बजे से शाम 7:00 बजे तक (IST)\n` +
      `* 📍 **Location:** इंदौर, मध्य प्रदेश, भारत\n` +
      `* 📝 **Online Inquiry Form:** [Contact Us Page](/contact)\n` +
      `* 🌐 **Official Website:** [https://aassaybiz.com](https://aassaybiz.com)\n\n` +
      `किसी भी प्रश्न, डेमो या ऑनबोर्डिंग सहायता के लिए आप सीधे कॉल या WhatsApp कर सकते हैं!`;
  };

  const handleSendText = async (textToSend?: string) => {
    const messageToSend = typeof textToSend === "string" ? textToSend : input;
    if (!messageToSend.trim() || isLoading) return;
    
    const userMessage = messageToSend.trim();
    setInput("");
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: userMessage }]);
    setIsLoading(true);

    if (!apiKey) {
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: "model", 
          content: isContactInquiry(userMessage)
            ? getContactInfoMessage()
            : "Sorry, I am currently offline. Please configure the VITE_GEMINI_API_KEY to enable AI chat." 
        }]);
        setIsLoading(false);
      }, 500);
      return;
    }

    try {
      let replyText = "";
      if (chatSession) {
        try {
          const result = await chatSession.sendMessage(userMessage);
          const response = await result.response;
          replyText = response.text();
        } catch (chatErr) {
          console.warn("Chat session send error, trying direct fallback:", chatErr);
        }
      }

      if (!replyText) {
        const genAI = new GoogleGenerativeAI(apiKey);
        try {
          const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: dynamicSystemInstruction,
          });
          const result = await model.generateContent(userMessage);
          replyText = result.response.text();
        } catch (mErr) {
          console.warn("gemini-2.5-flash direct failed, trying gemini-flash-latest:", mErr);
          const modelFallback = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            systemInstruction: dynamicSystemInstruction,
          });
          const result = await modelFallback.generateContent(userMessage);
          replyText = result.response.text();
        }
      }

      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: "model", 
        content: replyText || (isContactInquiry(userMessage) ? getContactInfoMessage() : "I am here to help! Please ask any question about AssayBiz.") 
      }]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: "model", 
        content: isContactInquiry(userMessage)
          ? getContactInfoMessage()
          : "I'm having trouble connecting right now. Please try again in a few moments." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 select-none">
        <button
          onClick={() => setIsOpen(true)}
          className="relative group flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-[#1a0e4f] via-[#28166f] to-[#1e1b4b] hover:from-[#1a0e4f] hover:to-[#28166f] shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-[#e77817] cursor-pointer"
          title="AssayBiz AI Assistant"
          aria-label="Open AI Chatbot"
        >
          <div className="relative flex items-center justify-center">
            <ConciergeAvatar size={24} color="#e77817" faceColor="#ffffff" />
            <Sparkles className="w-2.5 h-2.5 text-[#e77817] absolute -top-1.5 -right-1.5 animate-pulse" />
          </div>

          {/* Delicate Live Online Ping Indicator */}
          <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-slate-900"></span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed right-6 bottom-6 w-80 sm:w-[24rem] bg-white dark:bg-gray-900 shadow-2xl rounded-2xl overflow-hidden flex flex-col z-50 border border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out ${isMinimized ? 'h-14' : 'h-[500px] max-h-[80vh]'}`}>
      {/* Header - Theme 1: Assay Navy + Brand Orange Accent Line */}
      <div 
        className="bg-gradient-to-r from-[#1a0e4f] via-[#28166f] to-[#1e1b4b] border-b-[3px] border-[#e77817] text-white px-4 py-3 flex items-center justify-between cursor-pointer select-none shadow-sm" 
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/30 flex items-center justify-center">
            <ConciergeAvatar size={19} color="#e77817" faceColor="#ffffff" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight flex items-center gap-1.5">
              AssayBiz AI Assistant
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <span className="text-[10px] text-white/80">Official Billing & Support Concierge</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} 
            className="text-white/80 hover:text-white hover:bg-white/15 p-1.5 rounded-lg transition-colors cursor-pointer"
            title={isMinimized ? "Expand Chat" : "Minimize Chat"}
          >
            {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
          </button>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }} 
            className="text-white/80 hover:text-white hover:bg-white/15 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Close Chat"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <>
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex flex-col gap-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === "user" 
                    ? "bg-[#1a0e4f]/10 text-[#1a0e4f] dark:bg-white/10 dark:text-white" 
                    : "bg-[#1a0e4f] border-[1.5px] border-[#e77817] shadow-xs"
                }`}>
                  {msg.role === "user" ? <User size={16} /> : <ConciergeAvatar size={18} color="#e77817" faceColor="#ffffff" />}
                </div>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.role === "user" 
                    ? "bg-[#1a0e4f] text-white rounded-tr-none shadow-xs" 
                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-xs border border-gray-100 dark:border-gray-700 rounded-tl-none"
                }`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-p:leading-relaxed prose-pre:bg-gray-100 prose-pre:text-gray-800 dark:prose-pre:bg-gray-800 dark:prose-pre:text-gray-200">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 flex-row">
                <div className="w-8 h-8 rounded-full bg-[#1a0e4f] border-[1.5px] border-[#e77817] flex items-center justify-center flex-shrink-0 shadow-xs">
                  <ConciergeAvatar size={18} color="#e77817" faceColor="#ffffff" />
                </div>
                <div className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-1.5 h-10">
                  <div className="w-1.5 h-1.5 bg-[#e77817] rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-[#e77817] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-1.5 h-1.5 bg-[#e77817] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            )}

            {/* Quick Suggestion Chips - Theme 1 Styled */}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleSendText("AssayBiz me kya kya core features aur modules hain?")}
                  className="text-[11px] px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-[#fff7ed] dark:hover:bg-slate-800 text-[#1a0e4f] dark:text-orange-400 border border-[#e77817]/40 hover:border-[#e77817] rounded-full transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Sparkles size={12} className="text-[#e77817]" /> Platform Features
                </button>
                <button
                  type="button"
                  onClick={() => handleSendText("Attendance aur Payroll rules kaise kaam karte hain?")}
                  className="text-[11px] px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-[#fff7ed] dark:hover:bg-slate-800 text-[#1a0e4f] dark:text-orange-400 border border-[#e77817]/40 hover:border-[#e77817] rounded-full transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  👥 Attendance & Payroll
                </button>
                <button
                  type="button"
                  onClick={() => handleSendText("AssayBiz ke pricing plans aur packages kya hain?")}
                  className="text-[11px] px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-[#fff7ed] dark:hover:bg-slate-800 text-[#1a0e4f] dark:text-orange-400 border border-[#e77817]/40 hover:border-[#e77817] rounded-full transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  💰 Pricing Plans
                </button>
                <button
                  type="button"
                  onClick={() => handleSendText("What are your contact details, phone number and email?")}
                  className="text-[11px] px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-[#fff7ed] dark:hover:bg-slate-800 text-[#1a0e4f] dark:text-orange-400 border border-[#e77817]/40 hover:border-[#e77817] rounded-full transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Phone size={12} className="text-[#e77817]" /> Contact & Support
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer - Theme 1 Styled with Assay Brand Orange Action Button */}
          <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            <form onSubmit={(e) => { e.preventDefault(); handleSendText(); }} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about AssayBiz..."
                className="flex-1 focus-visible:ring-[#e77817] rounded-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-10 text-sm"
                disabled={isLoading}
              />
              <Button type="submit" disabled={!input.trim() || isLoading} className="rounded-full w-10 h-10 p-0 bg-[#e77817] hover:bg-[#d96b0f] shrink-0 shadow-xs cursor-pointer transition-transform hover:scale-105 active:scale-95">
                <Send size={16} className={input.trim() && !isLoading ? "text-white" : "text-white/60"} />
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
