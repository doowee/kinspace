import React, { createContext, useContext, useState, useCallback } from "react";

export interface ChatMessage {
  id: string;
  text: string;
  sender: "system" | "student";
  timestamp: Date;
}

type ScenarioType = "reminder" | "waitlist" | "low-balance" | "review";

interface DemoPhoneContextType {
  messages: ChatMessage[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerScenario: (type: ScenarioType, studioName?: string) => void;
  sendStudentReply: (text: string) => void;
  awaitingReply: ScenarioType | null;
  clearMessages: () => void;
}

const DemoPhoneContext = createContext<DemoPhoneContextType | undefined>(undefined);

let msgId = 0;
const nextId = () => `msg-${++msgId}`;

export function DemoPhoneProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState<ScenarioType | null>(null);

  const addMessage = useCallback((text: string, sender: "system" | "student") => {
    setMessages((prev) => [
      ...prev,
      { id: nextId(), text, sender, timestamp: new Date() },
    ]);
  }, []);

  const triggerScenario = useCallback(
    (type: ScenarioType, studioName?: string) => {
      setIsOpen(true);
      const studio = studioName || "Kinspace Studio";

      setTimeout(() => {
        switch (type) {
          case "reminder":
            addMessage(
              `Hey Sarah, gentle reminder for Reformer Pilates at 6:00 PM today. Don't forget your grip socks! 🧦`,
              "system"
            );
            break;
          case "waitlist":
            addMessage(
              `GOOD NEWS: A spot opened in 6pm Pilates! Reply YES to claim it.`,
              "system"
            );
            setAwaitingReply("waitlist");
            break;
          case "low-balance":
            addMessage(
              `Hi Sarah, heads up — you have just 1 credit left at ${studio}. Grab a pack so you don't miss your next class! 💪`,
              "system"
            );
            setTimeout(() => {
              addMessage(
                `Tap here to view packages: kinspace.app/packs`,
                "system"
              );
            }, 1200);
            break;
          case "review":
            addMessage(
              `Thanks for attending Reformer Pilates today! How was it? Rate 1-5 ⭐`,
              "system"
            );
            setAwaitingReply("review");
            break;
        }
      }, 1500);
    },
    [addMessage]
  );

  const sendStudentReply = useCallback(
    (text: string) => {
      addMessage(text, "student");

      if (awaitingReply === "waitlist" && text.toLowerCase().includes("yes")) {
        setAwaitingReply(null);
        setTimeout(() => {
          addMessage(
            `You're in! We've charged 1 credit. See you there. 🎉`,
            "system"
          );
        }, 1500);
      } else if (awaitingReply === "review") {
        setAwaitingReply(null);
        setTimeout(() => {
          addMessage(
            `Thank you for your feedback! We're glad you enjoyed it. See you next time! ✨`,
            "system"
          );
        }, 1500);
      }
    },
    [awaitingReply, addMessage]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setAwaitingReply(null);
  }, []);

  return (
    <DemoPhoneContext.Provider
      value={{
        messages,
        isOpen,
        setIsOpen,
        triggerScenario,
        sendStudentReply,
        awaitingReply,
        clearMessages,
      }}
    >
      {children}
    </DemoPhoneContext.Provider>
  );
}

export function useDemoPhone() {
  const ctx = useContext(DemoPhoneContext);
  if (!ctx) throw new Error("useDemoPhone must be used within DemoPhoneProvider");
  return ctx;
}
