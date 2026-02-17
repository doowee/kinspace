import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck, ChevronDown, ChevronUp, Mail, MessageSquare } from "lucide-react";
import { format, subDays, subHours } from "date-fns";

interface CommEntry {
  id: string;
  timestamp: Date;
  sender: string;
  recipient: string;
  channel: "sms" | "email";
  message: string;
}

const MOCK_LOG: CommEntry[] = [
  { id: "1", timestamp: subHours(new Date(), 1), sender: "Sarah — Instructor", recipient: "Thursday 6AM Roster", channel: "sms", message: "Heads up! Today's class has moved to Studio B. See you there! 🏠" },
  { id: "2", timestamp: subHours(new Date(), 3), sender: "Automated System", recipient: "Jessica T.", channel: "sms", message: "Great news — a spot opened up in Thursday 6AM Pilates! You've been moved off the waitlist. ✅" },
  { id: "3", timestamp: subHours(new Date(), 5), sender: "Automated System", recipient: "Mark R.", channel: "sms", message: "Reminder: Your class with Elena starts in 1 hour. See you soon!" },
  { id: "4", timestamp: subDays(new Date(), 1), sender: "Owner", recipient: "Lapsed Students (12)", channel: "email", message: "Hey! We miss you at the studio. Come back for a complimentary class this week. Your mat is waiting! 💛" },
  { id: "5", timestamp: subDays(new Date(), 1), sender: "Automated System", recipient: "Amanda K.", channel: "sms", message: "Your 10-class pass is expiring in 3 days. Renew now to keep your streak going! 🔥" },
  { id: "6", timestamp: subDays(new Date(), 2), sender: "Sarah — Instructor", recipient: "Monday 7AM Roster", channel: "sms", message: "Quick update — today's class will be led by our guest instructor Mia. Same great energy! ⚡" },
  { id: "7", timestamp: subDays(new Date(), 3), sender: "Automated System", recipient: "New Students (5)", channel: "email", message: "Welcome to the studio! Here's everything you need to know for your first class. Arrive 10 minutes early." },
  { id: "8", timestamp: subDays(new Date(), 4), sender: "Owner", recipient: "Lisa M.", channel: "sms", message: "Hi Lisa! Thank you for the feedback. We've updated our scheduling based on your suggestion." },
];

function formatTimestamp(d: Date) {
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 24) {
    return `Today, ${format(d, "h:mm a")}`;
  }
  if (diffHours < 48) {
    return `Yesterday, ${format(d, "h:mm a")}`;
  }
  return format(d, "MMM d, h:mm a");
}

export default function CommunicationLog() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Security banner */}
      <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
        <span>
          <span className="font-medium text-foreground">Secure Audit Trail:</span>{" "}
          All outbound communications are logged to ensure brand compliance.
        </span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg">Communication Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Date/Time</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="w-[80px]">Channel</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_LOG.map((entry) => {
                  const expanded = expandedId === entry.id;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatTimestamp(entry.timestamp)}
                      </TableCell>
                      <TableCell className="text-sm font-medium whitespace-nowrap">
                        {entry.sender}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {entry.recipient}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`gap-1 text-[10px] ${
                            entry.channel === "sms"
                              ? "border-primary/30 text-primary"
                              : "border-secondary text-muted-foreground"
                          }`}
                        >
                          {entry.channel === "sms" ? (
                            <MessageSquare className="h-3 w-3" />
                          ) : (
                            <Mail className="h-3 w-3" />
                          )}
                          {entry.channel.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm ${expanded ? "" : "truncate"}`}>
                            {expanded ? entry.message : entry.message.slice(0, 50) + (entry.message.length > 50 ? "…" : "")}
                          </span>
                          {entry.message.length > 50 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => setExpandedId(expanded ? null : entry.id)}
                            >
                              {expanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
