import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  text: string;
  sender: "system" | "student";
  timestamp: Date;
}

type ScenarioType = "reminder" | "waitlist" | "low-balance" | "review";

interface WaitlistMeta {
  bookingId: string;
  userId: string;
  studioId: string;
  className: string;
  classTime: string;
}

interface DemoPhoneContextType {
  messages: ChatMessage[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerScenario: (type: ScenarioType, studioName?: string) => void;
  triggerWaitlistPromotion: (meta: WaitlistMeta) => void;
  sendStudentReply: (text: string) => void;
  awaitingReply: ScenarioType | null;
  clearMessages: () => void;
  typing: boolean;
  onWaitlistPromoted: React.MutableRefObject<(() => void) | null>;
}

const DemoPhoneContext = createContext<DemoPhoneContextType | undefined>(undefined);

let msgId = 0;
const nextId = () => `msg-${++msgId}`;

export function DemoPhoneProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState<ScenarioType | null>(null);
  const [typing, setTyping] = useState(false);
  const waitlistMetaRef = useRef<WaitlistMeta | null>(null);
  const onWaitlistPromoted = useRef<(() => void) | null>(null);

  const addMessage = useCallback((text: string, sender: "system" | "student") => {
    setMessages((prev) => [
      ...prev,
      { id: nextId(), text, sender, timestamp: new Date() },
    ]);
  }, []);

  const triggerWaitlistPromotion = useCallback(
    (meta: WaitlistMeta) => {
      waitlistMetaRef.current = meta;
      setIsOpen(true);
      setTimeout(() => {
        addMessage(
          `GOOD NEWS: A spot just opened up due to a cancellation! Reply YES to claim it.`,
          "system"
        );
        setAwaitingReply("waitlist");
      }, 1500);
    },
    [addMessage]
  );

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
        setTyping(true);

        const meta = waitlistMetaRef.current;

        const doDbWork = async () => {
          if (meta) {
            // Update booking status
            await supabase
              .from("bookings")
              .update({ status: "confirmed" as any })
              .eq("id", meta.bookingId);

            // Deduct 1 credit from earliest-expiring pass
            const { data: passes } = await supabase
              .from("student_passes")
              .select("id, credits_remaining")
              .eq("user_id", meta.userId)
              .eq("studio_id", meta.studioId)
              .gt("credits_remaining", 0)
              .gt("expires_at", new Date().toISOString())
              .order("expires_at", { ascending: true })
              .limit(1);

            if (passes && passes.length > 0) {
              await supabase
                .from("student_passes")
                .update({ credits_remaining: passes[0].credits_remaining - 1 })
                .eq("id", passes[0].id);
            }
          }

          setTimeout(() => {
            setTyping(false);
            addMessage(
              `You're in! We've charged 1 credit. See you there! 💪`,
              "system"
            );
            toast({
              title: "Spot claimed via SMS!",
              description: "Revenue saved.",
            });
            // Trigger refetch callback
            onWaitlistPromoted.current?.();
            waitlistMetaRef.current = null;
          }, 1800);
        };

        doDbWork();
      } else if (awaitingReply === "review") {
        setAwaitingReply(null);
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
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
    setTyping(false);
    waitlistMetaRef.current = null;
  }, []);

  return (
    <DemoPhoneContext.Provider
      value={{
        messages,
        isOpen,
        setIsOpen,
        triggerScenario,
        triggerWaitlistPromotion,
        sendStudentReply,
        awaitingReply,
        clearMessages,
        typing,
        onWaitlistPromoted,
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
