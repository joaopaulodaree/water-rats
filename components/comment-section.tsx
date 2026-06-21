"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/avatar";

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
  currentUserDisplayName: string;
  currentUserAvatarUrl: string | null;
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
  currentUserDisplayName,
  currentUserAvatarUrl,
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
                  { id: "temp-comment", user_id: currentUserId, body: commentBody.trim(), created_at: new Date().toISOString(), profile: { display_name: currentUserDisplayName, avatar_url: currentUserAvatarUrl } },
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
      <div className="flex items-center justify-between text-xs text-[#64748b] mb-3">
        <span>{commentCount} comentário{commentCount === 1 ? "" : "s"}</span>
        {commentCount > 2 && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="text-[#0891b2] font-semibold"
          >
            {expanded ? "Ocultar" : "Ver todos"}
          </button>
        )}
      </div>

      {displayComments.length > 0 && (
        <div className="space-y-3 mb-3">
          {displayComments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2.5">
              <Avatar
                displayName={comment.profile.display_name}
                avatarUrl={comment.profile.avatar_url}
                size={32}
                className="flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="font-semibold text-sm text-[#0f172a] truncate max-w-[120px] sm:max-w-none">
                    {comment.profile.display_name}
                  </span>
                  <span className="text-[#94a3b8] text-xs flex-shrink-0">
                    {new Date(comment.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {comment.user_id === currentUserId && (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(comment.id)}
                      className="text-[#94a3b8] hover:text-[#ef4444] text-xs ml-auto flex-shrink-0 transition-colors"
                    >
                      Apagar
                    </button>
                  )}
                </div>
                <p className="text-sm text-[#334155] whitespace-pre-wrap leading-snug">{comment.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2.5">
        <Avatar
          displayName={currentUserDisplayName}
          avatarUrl={currentUserAvatarUrl}
          size={28}
          className="flex-shrink-0 mt-2"
        />
        <div className="flex-1 space-y-2">
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (error) setError("");
            }}
            placeholder="Adicione um comentário..."
            maxLength={200}
            rows={2}
            className="w-full px-3 py-2 rounded-2xl border border-[#e2e8f0] text-[#0f172a] text-sm resize-none focus:outline-none focus:border-[#0891b2] bg-[#f8fafc]"
          />
          {error && <p className="text-xs text-[#ef4444]">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[#94a3b8]">{body.length}/200</span>
            <button
              type="button"
              onClick={handleAddComment}
              disabled={createMutation.isPending}
              className="px-4 py-1.5 bg-[#0891b2] text-white rounded-full text-xs font-semibold disabled:opacity-50"
            >
              {createMutation.isPending ? "Enviando..." : "Comentar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
