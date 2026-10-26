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

interface Post {
  id: string;
  pageId: string;
  platform: string;
  message?: string;
  title?: string;
  imageUrl?: string;
  videoUrl?: string;
  link?: string | null;
  permalink?: string | null;
  publishedAt: Date;
  facebookPostId?: string | null;
  instagramPostId?: string | null;
  linkedinPostId?: string | null;
  youtubeVideoId?: string | null;
  tiktokPublishId?: string | null;
}

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
    <Card className="h-fit sticky top-6 self-start w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Últimas publicaciones</CardTitle>
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
        {loading && posts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando historial…
          </div>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay publicaciones.
          </p>
        ) : (
          posts.map((post) => {
            const postUrl = getPostUrl(post);
            const text = post.message || post.title;

            return (
              <div
                key={post.id}
                className="flex gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
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

                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2 leading-snug">
                    {text ? (
                      text
                    ) : (
                      <span className="text-muted-foreground italic">
                        Sin texto
                      </span>
                    )}
                  </p>

                  <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {post.imageUrl
                          ? "Imagen"
                          : post.videoUrl
                            ? "Video"
                            : "Texto"}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {formatDistanceToNow(post.publishedAt, {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>

                    {postUrl && (
                      <a
                        href={postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground shrink-0"
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
