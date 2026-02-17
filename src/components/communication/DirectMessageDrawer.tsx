import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface Message {
  id: string;
  text: string;
  channel: "sms" | "email";
  from: "studio" | "system";
  timestamp: Date;
}

// Mock conversation history
const mockHistory = (name: string): Message[] => [
  { id: "1", text: `Hi ${name.split(" ")[0]}! Your pass is expiring in 3 days. Renew now to keep your streak going! 🔥`, channel: "sms", from: "system", timestamp: new Date(Date.now() - 7 * 86400000) },
  { id: "2", text: `Great news — a spot opened up in Thursday 6AM Pilates! You've been moved off the waitlist. ✅`, channel: "sms", from: "system", timestamp: new Date(Date.now() - 4 * 86400000) },
  { id: "3", text: `Reminder: Your class with Elena starts in 1 hour. See you soon!`, channel: "sms", from: "system", timestamp: new Date(Date.now() - 2 * 86400000) },
  { id: "4", text: `Hey ${name.split(" ")[0]}, we miss you! Come back for a complimentary class this week. 💛`, channel: "email", from: "studio", timestamp: new Date(Date.now() - 86400000) },
];

interface DirectMessageDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  studentEmail: string;
}

export default function DirectMessageDrawer({ open, onOpenChange, studentName, studentEmail }: DirectMessageDrawerProps) {
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => mockHistory(studentName));

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: Date.now().toString(),
      text: newMessage,
      channel: "sms",
      from: "studio",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
    toast({ title: "SMS sent", description: `Message delivered to ${studentName}.` });
  };

  const initials = studentName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <SheetTitle className="font-display text-base">{studentName}</SheetTitle>
              <SheetDescription className="text-xs truncate">{studentEmail}</SheetDescription>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.from === "studio" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] space-y-1`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.from === "studio"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-1.5 px-1">
                    {msg.from === "system" ? (
                      <Bot className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <User className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {format(msg.timestamp, "MMM d, h:mm a")}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-border">
                      {msg.channel.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input bar */}
        <div className="border-t px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type an SMS…"
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
