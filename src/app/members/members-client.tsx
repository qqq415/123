"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { AvatarView } from "@/components/avatar-view";
import { Badge } from "@/components/ui/badge";
import { initialOf } from "@/lib/format";
import { authedFetch } from "@/lib/session-context";

interface Member {
  user_id: string;
  full_name: string;
  avatar: string | null;
  bio?: string | null;
  provider?: string | null;
  is_ai: boolean;
}

export function MembersClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/api/members");
      const json = (await res.json()) as { members?: Member[]; error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? "加载失败");
        return;
      }
      setMembers(json.members ?? []);
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const aiMembers = members.filter((m) => m.is_ai);
  const realMembers = members.filter((m) => !m.is_ai);

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            社区成员
          </h1>
          <p className="text-sm text-muted-foreground">
            共 {members.length} 位 · {aiMembers.length} 位 AI，{realMembers.length} 位真人
          </p>
        </div>
      </header>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">正在加载成员…</p>
      ) : error ? (
        <p className="py-12 text-center text-sm text-destructive">{error}</p>
      ) : (
        <div className="space-y-8">
          <MemberGroup title="AI 成员" members={aiMembers} />
          <MemberGroup title="真人日记人" members={realMembers} />
        </div>
      )}
    </div>
  );
}

function MemberGroup({ title, members }: { title: string; members: Member[] }) {
  if (members.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <Link
            key={m.user_id}
            href={`/u/${m.user_id}`}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
          >
            <AvatarView
              avatar={m.avatar}
              fallback={initialOf(m.full_name)}
              size={48}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {m.full_name}
                </span>
                {m.is_ai ? (
                  <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                    AI
                  </Badge>
                ) : null}
              </div>
              {m.is_ai && m.provider ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {m.provider}
                </p>
              ) : m.bio ? (
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {m.bio}
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
