"use client";

import { useEffect, useState } from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Video, FileText, ExternalLink } from "lucide-react";

interface Post {
  id: string;
  pageId: string;
  platform: string;
  message?: string;
  imageUrl?: string;
  videoUrl?: string;
  link?: string;
  publishedAt: Date;
  postId?: string; // facebookPostId o instagramPostId
}

interface Props {
  pageId: string;
  platform?: "facebook" | "instagram";
}

export function PostHistory({ pageId, platform = "facebook" }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      setLoading(true);

      const q = query(
        collection(db, "publishedPosts"),
        where("platform", "==", platform), // ← ahora usa el platform recibido
        limit(30),
      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs
        .map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            pageId: d.pageId || d.igUserId || "",
            platform: d.platform,
            message: d.message,
            imageUrl: d.imageUrl,
            videoUrl: d.videoUrl,
            link: d.link,
            publishedAt: d.publishedAt?.toDate?.() || new Date(d.publishedAt),
            postId: d.facebookPostId || d.instagramPostId,
          };
        })
        .filter((post) => post.pageId === pageId)
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
        .slice(0, 10);

      setPosts(data);
    } catch (error) {
      console.error("Error cargando historial:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pageId) fetchPosts();
  }, [pageId, platform]);

  const getPostUrl = (post: Post) => {
    if (!post.postId) return null;

    if (post.platform === "instagram") {
      return `https://www.instagram.com/p/${post.postId}/`;
    }

    // Facebook
    return `https://www.facebook.com/${post.postId}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Últimas publicaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando historial...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit sticky top-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Últimas publicaciones</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchPosts}>
            Actualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay publicaciones.
          </p>
        ) : (
          posts.map((post) => {
            const postUrl = getPostUrl(post);

            return (
              <div
                key={post.id}
                className="flex gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  {post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt="Post"
                      className="w-full h-full object-cover"
                    />
                  ) : post.videoUrl ? (
                    <Video className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2 leading-snug">
                    {post.message || (
                      <span className="text-muted-foreground italic">
                        Sin texto
                      </span>
                    )}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {post.imageUrl
                          ? "Imagen"
                          : post.videoUrl
                            ? "Video"
                            : "Texto"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
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
                        className="text-muted-foreground hover:text-foreground"
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
