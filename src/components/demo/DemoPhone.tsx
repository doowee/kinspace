import { useState, useRef, useEffect } from "react";
import { useDemoPhone, ChatMessage } from "@/contexts/DemoPhoneContext";
import { X, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

function MessageBubble({ message }: { message: ChatMessage }) {
  const isStudent = message.sender === "student";
  const time = message.timestamp.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className="animate-fade-in"
      style={{
        display: "flex",
        justifyContent: isStudent ? "flex-end" : "flex-start",
        marginBottom: 6,
      }}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "8px 12px",
          borderRadius: 18,
          fontSize: 14,
          lineHeight: 1.4,
          ...(isStudent
            ? {
                background: "#007AFF",
                color: "#fff",
                borderBottomRightRadius: 4,
              }
            : {
                background: "#E9E9EB",
                color: "#000",
                borderBottomLeftRadius: 4,
              }),
        }}
      >
        {message.text}
        <div
          style={{
            fontSize: 10,
            marginTop: 2,
            opacity: 0.6,
            textAlign: isStudent ? "right" : "left",
          }}
        >
          {time}
        </div>
      </div>
    </div>
  );
}

export default function DemoPhone() {
  const { messages, isOpen, setIsOpen, sendStudentReply, awaitingReply, clearMessages, typing } =
    useDemoPhone();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendStudentReply(trimmed);
    setInput("");
  };

  // Floating toggle button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #333 100%)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        📱 Demo Phone
        {messages.length > 0 && (
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: "#FF3B30", color: "#fff" }}
          >
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 animate-scale-in"
      style={{
        width: 340,
        height: 620,
        borderRadius: 44,
        background: "#000",
        padding: 10,
        boxShadow: "0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)",
      }}
    >
      {/* iPhone inner frame */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 36,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Notch / Status bar */}
        <div
          style={{
            height: 48,
            background: "#f8f8f8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            borderBottom: "1px solid #e5e5e5",
          }}
        >
          {/* Notch shape */}
          <div
            style={{
              width: 120,
              height: 28,
              background: "#000",
              borderRadius: "0 0 18px 18px",
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#1a1a2e",
                position: "absolute",
                top: 8,
                right: 22,
              }}
            />
          </div>
        </div>

        {/* Chat header */}
        <div
          style={{
            padding: "8px 12px",
            background: "#f8f8f8",
            borderBottom: "1px solid #e5e5e5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6B8F71, #9BB59E)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              🏠
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#000" }}>
                Kinspace.Studio
              </div>
              <div style={{ fontSize: 11, color: "#8e8e93" }}>SMS</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={clearMessages}
              className="rounded-full p-1.5 transition-colors hover:bg-black/5"
              title="Clear messages"
            >
              <Trash2 className="h-4 w-4" style={{ color: "#8e8e93" }} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 transition-colors hover:bg-black/5"
              title="Minimize"
            >
              <X className="h-4 w-4" style={{ color: "#8e8e93" }} />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 10px",
            background: "#fff",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "#8e8e93",
                fontSize: 13,
                marginTop: 80,
                padding: "0 20px",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
              Use the <strong>⚡ Demo Triggers</strong> in the navbar to simulate SMS scenarios
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {typing && (
            <div className="animate-fade-in" style={{ display: "flex", justifyContent: "flex-start", marginBottom: 6 }}>
              <div style={{ padding: "10px 16px", borderRadius: 18, background: "#E9E9EB", borderBottomLeftRadius: 4, fontSize: 18, letterSpacing: 2 }}>
                <span className="animate-pulse">•••</span>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div
          style={{
            padding: "8px 10px",
            borderTop: "1px solid #e5e5e5",
            background: "#f8f8f8",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={awaitingReply ? "Type a reply…" : "iMessage"}
            disabled={!awaitingReply}
            style={{
              flex: 1,
              border: "1px solid #ddd",
              borderRadius: 20,
              padding: "7px 14px",
              fontSize: 14,
              outline: "none",
              background: "#fff",
              color: "#000",
              opacity: awaitingReply ? 1 : 0.5,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!awaitingReply || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity disabled:opacity-30"
            style={{ background: "#007AFF" }}
          >
            <Send className="h-3.5 w-3.5" style={{ color: "#fff" }} />
          </button>
        </div>

        {/* Home indicator bar */}
        <div
          style={{
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8f8f8",
          }}
        >
          <div
            style={{
              width: 100,
              height: 4,
              borderRadius: 2,
              background: "#ccc",
            }}
          />
        </div>
      </div>
    </div>
  );
}
