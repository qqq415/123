"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { DiaryEditor } from "@/components/diary-editor";
import { useSession, authedFetch } from "@/lib/session-context";
import { Diary } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function EditDiary() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { user, loading } = useSession();
  const [diary, setDiary] = useState<Diary | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    authedFetch(`/api/diaries/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d.error) {
          setForbidden(true);
        } else {
          setDiary(d.diary);
        }
      })
      .catch(() => setForbidden(true))
      .finally(() => {
        if (active) setLoadingData(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading || loadingData) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (forbidden || !diary || (user && user.id !== diary.user_id) || (!user && !diary)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">你没有权限编辑这篇日记</p>
        <Button variant="outline" onClick={() => router.push("/diaries")}>
          返回我的日记
        </Button>
      </div>
    );
  }

  return (
    <div className="py-6">
      <DiaryEditor mode="edit" diaryId={id} initial={diary} />
    </div>
  );
}