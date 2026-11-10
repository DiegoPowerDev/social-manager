"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Video, FileText, ExternalLink, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import { EmptyState } from "../layout/EmptyState";
import { Post } from "@/types";

interface Props {
  pageId: string;
  platform?: "facebook" | "instagram" | "linkedin" | "youtube" | "tiktok";
}

function getPostUrl(post: Post): string | null {
  if (post.permalink) return post.permalink;

  if (post.platform === "facebook" && post.facebookPostId) {
    return `https://www.facebook.com/${post.facebookPostId}`;
  }

  if (post.platform === "linkedin" && post.linkedinPostId) {
    return `https://www.linkedin.com/feed/update/${post.linkedinPostId}/`;
  }

  if (post.platform === "youtube" && post.youtubeVideoId) {
    return `https://www.youtube.com/watch?v=${post.youtubeVideoId}`;
  }

  // TikTok a veces solo tiene publish id; sin permalink público no inventamos URL
  return null;
}

export function PostHistory({ pageId, platform = "facebook" }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const companyId = useAuthStore((s) => s.companyId);

  const fetchPosts = useCallback(async () => {
    if (!companyId) {
      setPosts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const q = query(
        collection(db, "publishedPosts"),
        where("companyId", "==", companyId),
        where("platform", "==", platform),
        limit(30),
      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            pageId:
              d.pageId ||
              d.igUserId ||
              d.personId ||
              d.channelId ||
              d.openId ||
              "",
            platform: d.platform,
            message: d.message || d.title || "",
            title: d.title || null,
            imageUrl: d.imageUrl,
            videoUrl: d.videoUrl,
            link: d.link || null,
            permalink: d.permalink || null,
            publishedAt: d.publishedAt?.toDate?.() || new Date(d.publishedAt),
            facebookPostId: d.facebookPostId || d.postId || null,
            instagramPostId: d.instagramPostId || null,
            linkedinPostId: d.linkedinPostId || null,
            youtubeVideoId: d.youtubeVideoId || null,
            tiktokPublishId: d.tiktokPublishId || null,
            publishedByName: d.publishedByName || null,
            publishedByEmail: d.publishedByEmail || null,
          } as Post;
        })
        .filter((post) => {
          if (!pageId) return true;
          if (
            (platform === "youtube" || platform === "tiktok") &&
            !post.pageId
          ) {
            return true;
          }
          return post.pageId === pageId;
        })
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
        .slice(0, 10);

      setPosts(data);
    } catch (error) {
      console.error("Error cargando historial:", error);
      toast.error("No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  }, [companyId, pageId, platform]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <Card className="h-fit sticky top-6 self-start w-full bg-zinc-950/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg text-white">
            Últimas publicaciones
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchPosts()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Actualizar"
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aún no hay publicaciones"
            description="Cuando publiques en esta red, el historial se mostrará aquí."
            className="border-0 bg-transparent shadow-none"
          />
        ) : (
          posts.map((post) => {
            const postUrl = getPostUrl(post);
            const text = post.message || post.title;

            return (
              <div
                key={post.id}
                className="flex gap-3 p-3 rounded-lg border-2 border-zinc-300/50 bg-zinc-950/60 hover:bg-zinc-900/20 transition-colors"
              >
                <div className="w-14 h-14 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  {post.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : post.videoUrl ? (
                    <Video className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0 flex justify-between items-center">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm line-clamp-2 leading-snug text-white">
                      {text ? text : <span className=" italic">Sin texto</span>}
                    </p>
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant="outline"
                        className="text-xs shrink-0 bg-white"
                      >
                        {post.imageUrl
                          ? "Imagen"
                          : post.videoUrl
                            ? "Video"
                            : "Texto"}
                      </Badge>
                      <span className="text-xs  truncate text-white/70">
                        {formatDistanceToNow(post.publishedAt, {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {post.publishedByName || post.publishedByEmail || "—"}
                      {post.source === "schedule" ? " · programado" : ""}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    {postUrl && (
                      <a
                        href={postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-white/50 shrink-0"
                        title="Ver publicación"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
