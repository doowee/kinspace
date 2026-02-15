import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  text: string;
  sender: "system" | "student";
  timestamp: Date;
}

type ScenarioType = "reminder" | "waitlist" | "low-balance" | "review" | "smart-review" | "refill" | "flash-deal";

type ConversationStep = null | "smart-review-rating" | "smart-review-followup-positive" | "smart-review-followup-negative";

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
  const [conversationStep, setConversationStep] = useState<ConversationStep>(null);
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
      const studio = studioName || "Kinspace.Studio";

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
                `Tap here to view packages: kinspace.studio/packs`,
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
          case "smart-review":
            addMessage(
              `How was Sarah's Reformer Flow today? Reply 1 (Poor) to 5 (Amazing)!`,
              "system"
            );
            setAwaitingReply("smart-review");
            setConversationStep("smart-review-rating");
            break;
          case "refill":
            addMessage(
              `You just crushed your last class! 💪 Reply REFILL to instantly reload your usual 10-Class Pack ($199) using the card on file.`,
              "system"
            );
            setAwaitingReply("refill");
            break;
          case "flash-deal":
            addMessage(
              `⚡ FLASH DROP: 2 spots left in 5 PM Flow! Reply CLAIM to grab one for just 0.5 pts (normally 1pt).`,
              "system"
            );
            setAwaitingReply("flash-deal");
            break;
        }
      }, 1500);
    },
    [addMessage]
  );

  const sendStudentReply = useCallback(
    (text: string) => {
      addMessage(text, "student");
      const lower = text.toLowerCase().trim();

      if (awaitingReply === "waitlist" && lower.includes("yes")) {
        setAwaitingReply(null);
        setTyping(true);

        const meta = waitlistMetaRef.current;

        const doDbWork = async () => {
          if (meta) {
            await supabase
              .from("bookings")
              .update({ status: "confirmed" as any })
              .eq("id", meta.bookingId);

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
              `You're in! We've charged 0.5 credit. See you there! 💪`,
              "system"
            );
            toast({
              title: "Spot claimed via SMS!",
              description: "Revenue saved.",
            });
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

      // --- Smart Review: multi-step ---
      } else if (awaitingReply === "smart-review" && conversationStep === "smart-review-rating") {
        const rating = parseInt(lower);
        if (rating >= 4 && rating <= 5) {
          setConversationStep("smart-review-followup-positive");
          setTyping(true);
          setTimeout(() => {
            setTyping(false);
            addMessage(`Love to hear it! 🌟 What was your favorite part?`, "system");
          }, 1500);
        } else if (rating >= 1 && rating <= 3) {
          setConversationStep("smart-review-followup-negative");
          setTyping(true);
          setTimeout(() => {
            setTyping(false);
            addMessage(`Oh no, we missed the mark. What could we do better?`, "system");
          }, 1500);
        }
      } else if (awaitingReply === "smart-review" && conversationStep === "smart-review-followup-positive") {
        setAwaitingReply(null);
        setConversationStep(null);
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          addMessage(
            `We'll tell Sarah! Mind tapping this link to drop that on Google? kinspace.studio/review 🌟`,
            "system"
          );
        }, 1800);
      } else if (awaitingReply === "smart-review" && conversationStep === "smart-review-followup-negative") {
        setAwaitingReply(null);
        setConversationStep(null);
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          addMessage(
            `Got it. The owner has been notified. We've added 1 free credit to your account to make it right!`,
            "system"
          );
          toast({
            title: "Feedback received",
            description: "1 recovery credit added. Churn prevented.",
          });
        }, 1800);

      // --- Refill ---
      } else if (awaitingReply === "refill" && lower.includes("refill")) {
        setAwaitingReply(null);
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          addMessage(`Done! 10 credits added. See you back in the studio!`, "system");
          toast({
            title: "Revenue Captured: $199 via SMS Auto-Refill",
            description: "Pack renewed without leaving the chat.",
            className: "border-success bg-success/10 text-success",
          });
        }, 1800);

      // --- Flash Deal ---
      } else if (awaitingReply === "flash-deal" && lower.includes("claim")) {
        setAwaitingReply(null);
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          addMessage(
            `You got it! Card charged $15. Hustle over, class starts in 45 mins!`,
            "system"
          );
          toast({
            title: "Flash Sale Claimed: $15 recovered from empty inventory",
            description: "Last-minute revenue captured via SMS.",
            className: "border-success bg-success/10 text-success",
          });
        }, 1800);
      }
    },
    [awaitingReply, conversationStep, addMessage]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setAwaitingReply(null);
    setConversationStep(null);
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
