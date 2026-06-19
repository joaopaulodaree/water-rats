"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface CommentRow {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile: { display_name: string; avatar_url: string | null };
}

interface CommentSectionProps {
  logId: string;
  currentUserId: string;
  previewComments: CommentRow[];
  commentCount: number;
}

type FeedQueryData = {
  pages: Array<{
    id: string;
    comment_count: number;
    previewComments: CommentRow[];
  }[]>;
};

type RawCommentRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile: unknown;
};

type RawCommentInsertRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile: unknown;
};

export function CommentSection({
  logId,
  currentUserId,
  previewComments,
  commentCount,
}: CommentSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const supabase = createClient();

  async function dispatchAchievements(achievementIds: string[] | null | undefined) {
    if (!achievementIds || achievementIds.length === 0) return;
    const { data: achs, error } = await supabase
      .from("achievements")
      .select("icon, name, description")
      .in("id", achievementIds as string[]);

    if (!error && achs && achs.length > 0) {
      window.dispatchEvent(new CustomEvent("new-achievements", { detail: achs }));
    }
  }

  const { data: fullComments } = useQuery<CommentRow[], Error>({
    queryKey: ["comments", logId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, body, created_at, user_id, profile:profiles!user_id(display_name, avatar_url)")
        .eq("log_id", logId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as RawCommentRow[]).map((row) => ({
        ...row,
        profile: Array.isArray(row.profile) ? row.profile[0] : row.profile,
      })) as CommentRow[];
    },
    enabled: expanded,
  });

  const displayComments = useMemo(() => {
    if (expanded) return fullComments ?? previewComments;
    return previewComments;
  }, [expanded, fullComments, previewComments]);

  const createMutation = useMutation({
    mutationFn: async (commentBody: string) => {
      if (!commentBody.trim()) {
        throw new Error("Comentário não pode ficar vazio.");
      }
      const { data, error } = await supabase
        .from("comments")
        .insert({ log_id: logId, user_id: currentUserId, body: commentBody.trim() })
        .select("id, body, created_at, user_id, profile:profiles!user_id(display_name, avatar_url)")
        .single();
      if (error) throw error;
      return {
        ...data,
        profile: Array.isArray(data.profile) ? data.profile[0] : data.profile,
      } as CommentRow;
    },
    onMutate: async (commentBody) => {
      setError("");
      if (!commentBody.trim()) {
        throw new Error("Comentário não pode ficar vazio.");
      }
      await qc.cancelQueries({ queryKey: ["feed"] });
      const prevFeed = qc.getQueryData<FeedQueryData>(["feed"]);
      qc.setQueryData<FeedQueryData>(["feed"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((item) => {
              if (item.id !== logId) return item;
              return {
                ...item,
                comment_count: item.comment_count + 1,
                previewComments: [
                  ...item.previewComments,
                  { id: "temp-comment", user_id: currentUserId, body: commentBody.trim(), created_at: new Date().toISOString(), profile: { display_name: "Você", avatar_url: null } },
                ].slice(-2),
              };
            })
          ),
        };
      });
      return { prevFeed };
    },
    onError: (_error, _variables, context) => {
      if (context?.prevFeed) qc.setQueryData(["feed"], context.prevFeed);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      if (expanded) qc.invalidateQueries({ queryKey: ["comments", logId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;
      return commentId;
    },
    onMutate: async (commentId) => {
      await qc.cancelQueries({ queryKey: ["feed"] });
      const prevFeed = qc.getQueryData<FeedQueryData>(["feed"]);
      qc.setQueryData<FeedQueryData>(["feed"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((item) => {
              if (item.id !== logId) return item;
              return {
                ...item,
                comment_count: item.comment_count - 1,
                previewComments: item.previewComments.filter((c) => c.id !== commentId),
              };
            })
          ),
        };
      });
      return { prevFeed };
    },
    onError: (_error, _variables, context) => {
      if (context?.prevFeed) qc.setQueryData(["feed"], context.prevFeed);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      if (expanded) qc.invalidateQueries({ queryKey: ["comments", logId] });
    },
  });

  const handleAddComment = async () => {
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Comentário não pode ficar vazio.");
      return;
    }
    if (trimmed.length > 200) {
      setError("Comentário não pode ultrapassar 200 caracteres.");
      return;
    }
    try {
      await createMutation.mutateAsync(trimmed);
      setBody("");
      if (!expanded) setExpanded(true);
      const { data: newIds, error } = await supabase.rpc("check_achievements", {
        p_user_id: currentUserId,
        p_log_id: logId,
      });
      if (!error) {
        await dispatchAchievements(newIds);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro ao enviar comentário.";
      setError(message);
    }
  };

  return (
    <div className="mt-3 border-t border-[#e2e8f0] pt-3">
      <div className="flex items-center justify-between text-xs text-[#64748b] mb-2">
        <span>{commentCount} comentário{commentCount === 1 ? "" : "s"}</span>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-[#0891b2] font-semibold"
        >
          {expanded ? "Ocultar" : "Ver todos"}
        </button>
      </div>

      {displayComments.length > 0 && (
        <div className="space-y-3 mb-3">
          {displayComments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-3">
              <div className="flex-1 text-sm text-[#0f172a] bg-[#f8fafc] rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[#0f172a]">{comment.profile.display_name}</span>
                  <span className="text-[#64748b] text-xs">{new Date(comment.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="whitespace-pre-wrap">{comment.body}</p>
              </div>
              {comment.user_id === currentUserId && (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(comment.id)}
                  className="text-[#ef4444] text-xs"
                >
                  Apagar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            if (error) setError("");
          }}
          placeholder="Adicione um comentário..."
          maxLength={200}
          rows={2}
          className="w-full px-4 py-3 rounded-2xl border border-[#e2e8f0] text-[#0f172a] text-sm resize-none focus:outline-none focus:border-[#0891b2]"
        />
        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-[#64748b]">{body.length}/200</span>
          <button
            type="button"
            onClick={handleAddComment}
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-[#0891b2] text-white rounded-2xl text-sm font-semibold disabled:opacity-50"
          >
            {createMutation.isPending ? "Enviando..." : "Comentar"}
          </button>
        </div>
      </div>
    </div>
  );
}
