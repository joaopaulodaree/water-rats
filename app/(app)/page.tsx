"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/avatar";
import { CommentSection } from "@/components/comment-section";
import Image from "next/image";
import { useState, useRef, useCallback, useEffect } from "react";
import { ContextBadge } from "@/components/context-badge";
import { LEGACY_AUTO_CAPTIONS } from "@/lib/context-label";

const PAGE_SIZE = 10;
const REACTIONS = ["💧", "🔥", "👏", "💪"];

interface CommentPreview {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile: { display_name: string; avatar_url: string | null };
}

interface FeedItem {
  id: string;
  user_id: string;
  amount_ml: number;
  photo_url: string | null;
  caption: string | null;
  created_at: string;
  profile: { display_name: string; avatar_url: string | null };
  reactions: { emoji: string; user_id: string }[];
  myReaction: string | null;
  comment_count: number;
  previewComments: CommentPreview[];
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

type FeedQueryData = {
  pages: FeedItem[][];
};

type ReactionBarProps = {
  logId: string;
  ownerId: string;
  reactions: FeedItem["reactions"];
  myReaction: string | null;
  currentUserId: string;
};

function ReactionBar({ logId, ownerId, reactions, myReaction, currentUserId }: ReactionBarProps) {
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

  const toggleMutation = useMutation({
    mutationFn: async (emoji: string) => {
      if (myReaction === emoji) {
        await supabase.from("reactions").delete()
          .eq("log_id", logId).eq("user_id", currentUserId);
        return null;
      }
      if (myReaction) {
        await supabase.from("reactions").delete()
          .eq("log_id", logId).eq("user_id", currentUserId);
      }
      await supabase.from("reactions").insert({ log_id: logId, user_id: currentUserId, emoji });
      return emoji;
    },
    onMutate: async (emoji) => {
      await qc.cancelQueries({ queryKey: ["feed"] });
      const prev = qc.getQueryData<FeedQueryData>(["feed"]);
      qc.setQueryData<FeedQueryData>(["feed"], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((item) => {
              if (item.id !== logId) return item;
              const filtered = item.reactions.filter((r) => r.user_id !== currentUserId);
              const newReactions = myReaction === emoji
                ? filtered
                : [...filtered, { emoji, user_id: currentUserId }];
              return { ...item, reactions: newReactions, myReaction: myReaction === emoji ? null : emoji };
            })
          ),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["feed"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      (async () => {
        try {
          const { data: newIds, error } = await supabase.rpc("check_achievements", { p_user_id: ownerId, p_log_id: logId });
          if (!error) await dispatchAchievements(newIds);
        } catch (err) {
          console.error("Error checking achievements:", err);
        }
      })();
    },
  });

  const counts = REACTIONS.reduce((acc, emoji) => {
    acc[emoji] = reactions.filter((r) => r.emoji === emoji).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex gap-2">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => toggleMutation.mutate(emoji)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium transition-colors ${
            myReaction === emoji
              ? "bg-[#0891b2]/15 text-[#0891b2] border border-[#0891b2]/30"
              : "bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0]"
          }`}
        >
          <span>{emoji}</span>
          {counts[emoji] > 0 && <span>{counts[emoji]}</span>}
        </button>
      ))}
    </div>
  );
}

function PhotoLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-10 text-white text-3xl leading-none p-2"
        aria-label="Fechar"
      >
        ×
      </button>
      <div className="relative w-full h-full max-w-2xl mx-auto" onClick={(e) => e.stopPropagation()}>
        <Image src={src} alt="Foto expandida" fill className="object-contain" />
      </div>
    </div>
  );
}

function FeedCard({ item, currentUserId }: { item: FeedItem; currentUserId: string }) {
  const [lightbox, setLightbox] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const qc = useQueryClient();
  const supabase = createClient();

  async function handleDelete() {
    await supabase.from("water_logs").delete().eq("id", item.id);
    qc.invalidateQueries({ queryKey: ["feed"] });
    qc.invalidateQueries({ queryKey: ["ranking"] });
  }

  const isOwn = item.user_id === currentUserId;

  return (
    <div className="bg-white border-b border-[#e2e8f0] px-4 py-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar displayName={item.profile.display_name} avatarUrl={item.profile.avatar_url} size={40} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#0f172a] text-sm truncate">{item.profile.display_name}</p>
          <p className="text-xs text-[#64748b]">{timeAgo(item.created_at)}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#ecfeff] px-3 py-1 rounded-full">
          <span>💧</span>
          <span className="font-bold text-[#0891b2] text-sm">{item.amount_ml}ml</span>
        </div>
        {isOwn && (
          <div className="relative ml-1">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-[#94a3b8] hover:text-[#64748b] text-lg leading-none px-1"
                aria-label="Opções"
              >
                ⋯
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  className="text-xs font-semibold text-[#ef4444] hover:text-[#dc2626]"
                >
                  Apagar
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-[#94a3b8] hover:text-[#64748b]"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {item.photo_url && (
        <>
          <button
            onClick={() => setLightbox(true)}
            className="relative w-full rounded-xl overflow-hidden mb-3 block cursor-zoom-in"
            style={{ paddingBottom: "56.25%" }}
            aria-label="Expandir foto"
          >
            <Image src={item.photo_url} alt="Foto do registro" fill className="object-cover" />
          </button>
          {lightbox && (
            <PhotoLightbox src={item.photo_url} onClose={() => setLightbox(false)} />
          )}
        </>
      )}

      {item.caption && !LEGACY_AUTO_CAPTIONS.has(item.caption) && (
        <p className="text-sm text-[#0f172a] mb-2">{item.caption}</p>
      )}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <ContextBadge amountMl={item.amount_ml} createdAt={item.created_at} />
        <ReactionBar
          logId={item.id}
          ownerId={item.user_id}
          reactions={item.reactions}
          myReaction={item.myReaction}
          currentUserId={currentUserId}
        />
      </div>

      <CommentSection
        logId={item.id}
        currentUserId={currentUserId}
        commentCount={item.comment_count}
        previewComments={item.previewComments}
      />
    </div>
  );
}

export default function FeedPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      let q = supabase
        .from("water_logs")
        .select(`
          id, user_id, amount_ml, photo_url, caption, created_at,
          profile:profiles!user_id(display_name, avatar_url),
          reactions(emoji, user_id),
          comments!comments_log_id_fkey(id, body, created_at, user_id, profile:profiles!user_id(display_name, avatar_url))
        `)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) q = q.lt("created_at", pageParam);

      const { data: rows, error } = await q;
      if (error) throw error;

      type RawFeedRow = {
        id: string;
        user_id: string;
        amount_ml: number;
        photo_url: string | null;
        caption: string | null;
        created_at: string;
        profile: unknown;
        reactions: Array<{ emoji: string; user_id: string }> | null;
        comments: Array<{
          id: string;
          body: string;
          created_at: string;
          user_id: string;
          profile: unknown;
        }> | null;
      };

      return ((rows ?? []) as RawFeedRow[]).map((row) => {
        const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
        const comments = Array.isArray(row.comments) ? row.comments : [];
        const previewComments = comments
          .slice()
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .slice(-2)
          .map((comment) => ({
            ...comment,
            profile: Array.isArray(comment.profile) ? comment.profile[0] : comment.profile,
          }));

        return {
          ...row,
          profile,
          reactions: row.reactions ?? [],
          myReaction: (row.reactions as { emoji: string; user_id: string }[])
            .find((r) => r.user_id === currentUserId)?.emoji ?? null,
          comment_count: comments.length,
          previewComments,
        };
      }) as FeedItem[];
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1].created_at;
    },
    enabled: currentUserId !== null,
  });

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [handleObserver]);

  const items = data?.pages.flat() ?? [];

  if (status === "pending") {
    return (
      <div className="flex flex-col">
        <div className="px-4 py-4 border-b border-[#e2e8f0]">
          <h1 className="text-xl font-bold text-[#0f172a]">💧 Water Rats</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0891b2] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4 border-b border-[#e2e8f0] bg-white sticky top-0 z-10">
        <h1 className="text-xl font-bold text-[#0f172a]">💧 Water Rats</h1>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <span className="text-6xl mb-4">💧</span>
          <p className="font-semibold text-[#0f172a] text-lg mb-1">Nenhum registro ainda</p>
          <p className="text-[#64748b] text-sm">Toque no + para registrar sua primeira água!</p>
        </div>
      ) : (
        <>
          {items.map((item) => (
            <FeedCard key={item.id} item={item} currentUserId={currentUserId!} />
          ))}

          <div ref={loaderRef} className="flex justify-center py-6">
            {isFetchingNextPage && (
              <div className="w-6 h-6 border-2 border-[#0891b2] border-t-transparent rounded-full animate-spin" />
            )}
            {!hasNextPage && items.length > 0 && (
              <p className="text-xs text-[#64748b]">Você chegou ao fim 🎉</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
