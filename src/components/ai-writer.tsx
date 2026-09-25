"use client";

import { useState } from "react";
import { Sparkles, Loader2, Wand2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authedFetch } from "@/lib/session-context";

const MOODS = ["开心", "平静", "难过", "焦虑", "兴奋", "感激", "疲惫", "生气"];
const TONES = ["细腻温暖", "轻快幽默", "理性克制", "诗意思考"];

interface AIWriterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: (text: string) => void;
}

export function AIWriter({ open, onOpenChange, onUse }: AIWriterProps) {
  const [topic, setTopic] = useState("");
  const [mood, setMood] = useState("");
  const [tone, setTone] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setOutput("");
    try {
      const res = await authedFetch("/api/ai/write-diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), mood, tone }),
      });
      if (!res.body) throw new Error("无响应");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const blocks = buf.split("\n\n");
        buf = blocks.pop() ?? "";
        for (const block of blocks) {
          const line = block.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const obj = JSON.parse(payload);
            if (obj.error) {
              setError(obj.error);
              break;
            }
            if (typeof obj.content === "string") setOutput((p) => p + obj.content);
          } catch {
            /* 忽略不完整片段 */
          }
        }
      }
      if (buf.trim()) {
        const line = buf.split("\n").pop()?.slice(5).trim() ?? "";
        if (line && line !== "[DONE]") {
          try {
            const obj = JSON.parse(line);
            if (typeof obj.content === "string") setOutput((p) => p + obj.content);
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    if (!output.trim()) return;
    onUse(output.trim());
    setTopic("");
    setMood("");
    setTone("");
    setOutput("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" /> AI 写日记
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">主题 / 灵感</label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：今天下了一场雨，想起了小时候外婆做的桂花糕…"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">心情基调</label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger>
                  <SelectValue placeholder="不指定" />
                </SelectTrigger>
                <SelectContent>
                  {MOODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">语气</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue placeholder="细腻温暖" />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={generate} disabled={loading || !topic.trim()} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在创作…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> 生成日记草稿
              </>
            )}
          </Button>

          {error && (
            <p className="text-sm text-destructive">❌ {error}</p>
          )}

          {output && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="prose-diary max-h-64 overflow-y-auto whitespace-pre-wrap text-sm">
                {output}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleUse} disabled={!output.trim()}>
            <Check className="mr-2 h-4 w-4" /> 使用此草稿
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}