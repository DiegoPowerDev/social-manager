"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Video, FileText, ExternalLink, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LucideLoaderCircle } from "lucide-react";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAuthStore } from "@/stores/useAuthStore";
import TitleComponent from "@/components/layout/titleComponent";

interface PublishedPost {
  id: string;
  platform?: string;
  publishedAt?: Date;
  message?: string | null;
  title?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  link?: string | null;
  facebookPostId?: string | null;
  instagramPostId?: string | null;
  linkedinPostId?: string | null;
  permalink?: string | null;
}

interface ScheduledPost {
  id: string;
  status?: string;
  scheduledAt?: Date;
}

type RangeKey = "7" | "14" | "30" | "90";
type PlatformFilter = "all" | "facebook" | "instagram" | "linkedin";

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  instagram: "#E4405F",
  linkedin: "#0A66C2",
  other: "#94a3b8",
};

export default function DashboardPage() {
  const [published, setPublished] = useState<PublishedPost[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  const companyId = useAuthStore((s) => s.companyId);
  // Filtros
  const [range, setRange] = useState<RangeKey>("30");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        if (!companyId) {
          return;
        }
        const [pubSnap, schSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "publishedPosts"),
              where("companyId", "==", companyId),
              orderBy("publishedAt", "desc"),
              limit(300),
            ),
          ),
          getDocs(
            query(
              collection(db, "scheduledPosts"),
              where("companyId", "==", companyId),
            ),
          ),
        ]);

        setPublished(
          pubSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              platform: (data.platform || "other").toLowerCase(),
              publishedAt:
                data.publishedAt?.toDate?.() ||
                (data.publishedAt ? new Date(data.publishedAt) : undefined),
              message: data.message || null,
              title: data.title || null,
              imageUrl: data.imageUrl || null,
              videoUrl: data.videoUrl || null,
              link: data.link || null,
              facebookPostId: data.facebookPostId || data.postId || null,
              instagramPostId: data.instagramPostId || null,
              linkedinPostId: data.linkedinPostId || null,
              permalink: data.permalink || null,
            };
          }),
        );

        setScheduled(
          schSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              status: data.status || "scheduled",
              scheduledAt:
                data.scheduledAt?.toDate?.() ||
                (data.scheduledAt ? new Date(data.scheduledAt) : undefined),
            };
          }),
        );
      } catch (e) {
        console.error("Error cargando dashboard:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const getExternalUrl = (post: PublishedPost): string | null => {
    if (post.permalink) return post.permalink;
    if (post.platform === "facebook" && post.facebookPostId) {
      return `https://www.facebook.com/${post.facebookPostId}`;
    }
    if (post.platform === "linkedin" && post.linkedinPostId) {
      return `https://www.linkedin.com/feed/update/${post.linkedinPostId}/`;
    }
    return null;
  };

  const rangeDays = Number(range);

  const daysInRange = useMemo(() => {
    const end = startOfDay(new Date());
    const start = subDays(end, rangeDays - 1);
    return eachDayOfInterval({ start, end });
  }, [rangeDays]);

  // Filtro base: rango + plataforma
  const filtered = useMemo(() => {
    const start = startOfDay(subDays(new Date(), rangeDays - 1));
    const end = endOfDay(new Date());

    return published.filter((p) => {
      if (!p.publishedAt) return false;
      if (!isWithinInterval(p.publishedAt, { start, end })) return false;
      if (platformFilter !== "all" && p.platform !== platformFilter)
        return false;
      return true;
    });
  }, [published, rangeDays, platformFilter]);

  // Si hay día seleccionado, lista de ese día
  const listPosts = useMemo(() => {
    if (!selectedDay) return filtered;
    return filtered.filter(
      (p) => p.publishedAt && isSameDay(p.publishedAt, selectedDay),
    );
  }, [filtered, selectedDay]);

  const postsPerDay = useMemo(() => {
    return daysInRange.map((day) => {
      const count = filtered.filter(
        (p) => p.publishedAt && isSameDay(p.publishedAt, day),
      ).length;
      return {
        day: format(day, "dd/MM"),
        full: format(day, "d MMM yyyy", { locale: es }),
        dateKey: format(day, "yyyy-MM-dd"),
        date: day,
        posts: count,
      };
    });
  }, [filtered, daysInRange]);

  const postsByPlatform = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((p) => {
      const key = (p.platform || "other").toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      key: name,
      value,
      color: PLATFORM_COLORS[name] || PLATFORM_COLORS.other,
    }));
  }, [filtered]);

  const stats = useMemo(() => {
    const scheduledCount = scheduled.filter(
      (s) => s.status === "scheduled",
    ).length;
    const failedCount = scheduled.filter((s) => s.status === "failed").length;

    const bestDay = postsPerDay.reduce(
      (best, d) => (d.posts > best.posts ? d : best),
      postsPerDay[0] || { full: "—", posts: 0 },
    );

    return {
      totalPublished: filtered.length,
      scheduledCount,
      failedCount,
      bestDay,
    };
  }, [filtered, scheduled, postsPerDay]);

  const clearFilters = () => {
    setPlatformFilter("all");
    setSelectedDay(null);
    setRange("30");
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LucideLoaderCircle className="animate-spin h-16 w-16 text-orange-400" />
      </div>
    );
  }

  return (
    <div>
      <TitleComponent
        title="Dashboard"
        description="Actividad de publicaciones — haz clic en barras o sectores para
          filtrar"
      />

      <div className="p-6 space-y-6">
        {/* Filtros */}
        <Card className="bg-white/70">
          <CardContent className="pt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              Periodo:
            </span>
            {(["7", "14", "30", "90"] as RangeKey[]).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "default" : "outline"}
                className={
                  range === r
                    ? "bg-gradient-to-r from-orange-400 to-yellow-500 text-white border-0"
                    : ""
                }
                onClick={() => {
                  setRange(r);
                  setSelectedDay(null);
                }}
              >
                {r} días
              </Button>
            ))}

            <span className="text-sm font-medium text-muted-foreground ml-2">
              Red:
            </span>
            {(
              [
                ["all", "Todas"],
                ["facebook", "Facebook"],
                ["instagram", "Instagram"],
                ["linkedin", "LinkedIn"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={platformFilter === key ? "default" : "outline"}
                className={
                  platformFilter === key
                    ? "bg-gradient-to-r from-orange-400 to-yellow-500 text-white border-0"
                    : ""
                }
                onClick={() => {
                  setPlatformFilter(key);
                  setSelectedDay(null);
                }}
              >
                {label}
              </Button>
            ))}

            {(platformFilter !== "all" || selectedDay) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className="ml-auto"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Chips activos */}
        {(selectedDay || platformFilter !== "all") && (
          <div className="flex flex-wrap gap-2">
            {platformFilter !== "all" && (
              <Badge variant="secondary" className="capitalize">
                Red: {platformFilter}
              </Badge>
            )}
            {selectedDay && (
              <Badge variant="secondary">
                Día: {format(selectedDay, "d MMM yyyy", { locale: es })}
              </Badge>
            )}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/70">
            <CardHeader className="pb-2">
              <CardDescription>Publicados</CardDescription>
              <CardTitle className="text-3xl">{stats.totalPublished}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                En el periodo filtrado
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70">
            <CardHeader className="pb-2">
              <CardDescription>Programados</CardDescription>
              <CardTitle className="text-3xl text-sky-600">
                {stats.scheduledCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </CardContent>
          </Card>

          <Card className="bg-white/70">
            <CardHeader className="pb-2">
              <CardDescription>Fallidos</CardDescription>
              <CardTitle className="text-3xl text-red-600">
                {stats.failedCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Calendario</p>
            </CardContent>
          </Card>

          <Card className="bg-white/70">
            <CardHeader className="pb-2">
              <CardDescription>Día con más posts</CardDescription>
              <CardTitle className="text-xl">{stats.bestDay.full}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {stats.bestDay.posts} publicación
                {stats.bestDay.posts !== 1 ? "es" : ""}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-white/70 lg:col-span-2">
            <CardHeader>
              <CardTitle>Publicaciones por día</CardTitle>
              <CardDescription>
                Clic en una barra para ver los posts de ese día
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full cursor-pointer">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={postsPerDay}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                      }}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.full || ""
                      }
                    />
                    <Bar
                      dataKey="posts"
                      name="Posts"
                      fill="#f97316"
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                      onClick={(data: any) => {
                        const day = data?.payload?.date as Date | undefined;
                        if (!day) return;
                        setSelectedDay((prev) =>
                          prev && isSameDay(prev, day) ? null : day,
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70">
            <CardHeader>
              <CardTitle>Por red</CardTitle>
              <CardDescription>
                Clic en un sector para filtrar por red
              </CardDescription>
            </CardHeader>
            <CardContent>
              {postsByPlatform.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Aún no hay publicaciones
                </p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={postsByPlatform}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={80}
                        cursor="pointer"
                        onClick={(_, index) => {
                          const item = postsByPlatform[index];
                          if (!item) return;
                          const key = item.key as PlatformFilter;
                          setPlatformFilter((prev) =>
                            prev === key ? "all" : key,
                          );
                          setSelectedDay(null);
                        }}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {postsByPlatform.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={entry.color}
                            opacity={
                              platformFilter === "all" ||
                              platformFilter === entry.key
                                ? 1
                                : 0.35
                            }
                          />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lista filtrada */}
        <Card className="bg-white/70">
          <CardHeader>
            <CardTitle>
              {selectedDay
                ? `Posts del ${format(selectedDay, "d MMMM yyyy", { locale: es })}`
                : "Publicaciones filtradas"}
            </CardTitle>
            <CardDescription>
              {listPosts.length} resultado{listPosts.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay publicaciones con estos filtros
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {listPosts.slice(0, 30).map((p) => {
                  const externalUrl = getExternalUrl(p);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/60 text-sm"
                    >
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : p.videoUrl ? (
                          <Video className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {p.message || p.title || "Sin texto"}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {p.platform || "—"}
                          {p.publishedAt
                            ? ` · ${format(p.publishedAt, "d MMM HH:mm", { locale: es })}`
                            : ""}
                        </p>
                      </div>
                      {externalUrl && (
                        <a
                          href={externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground shrink-0 p-1"
                          title="Ver publicación"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
