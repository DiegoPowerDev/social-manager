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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LucideLoaderCircle } from "lucide-react";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
  parseISO,
  differenceInCalendarDays,
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
const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

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
  tiktokPostId?: string | null;
  tiktokPublishId?: string | null;
  linkedinPostId?: string | null;
  youtubeVideoId?: string | null;
  permalink?: string | null;
  publishedByUid?: string | null;
  publishedByName?: string | null;
  publishedByEmail?: string | null;
  source?: "manual" | "schedule" | string | null;
}

interface ScheduledPost {
  id: string;
  status?: string;
  scheduledAt?: Date;
}

type RangeKey = "7" | "14" | "30" | "90" | "custom";
type PlatformFilter =
  | "all"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "youtube";

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  instagram: "#E4405F",
  linkedin: "#2E77FF",
  tiktok: "#fafafa",
  youtube: "#FF0000",
  other: "#94a3b8",
};

const STORAGE_PREFIX = "trendly.dashboard.filters.";

type PersistedFilters = {
  range: RangeKey;
  dateFrom: string; // yyyy-MM-dd
  dateTo: string; // yyyy-MM-dd
  toIsToday: boolean;
  platformFilter: PlatformFilter;
  selectedUser: string | null;
};

function todayKey() {
  return format(new Date(), "yyyy-MM-dd");
}

function defaultFilters(): PersistedFilters {
  const to = todayKey();
  const from = format(subDays(new Date(), 29), "yyyy-MM-dd");
  return {
    range: "30",
    dateFrom: from,
    dateTo: to,
    toIsToday: true,
    platformFilter: "all",
    selectedUser: null,
  };
}

function loadFilters(companyId: string): PersistedFilters {
  if (typeof window === "undefined") return defaultFilters();
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + companyId);
    if (!raw) return defaultFilters();
    const parsed = JSON.parse(raw) as Partial<PersistedFilters>;
    const base = defaultFilters();
    const dateFrom =
      typeof parsed.dateFrom === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.dateFrom)
        ? parsed.dateFrom
        : base.dateFrom;
    let dateTo =
      typeof parsed.dateTo === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.dateTo)
        ? parsed.dateTo
        : base.dateTo;
    const toIsToday = parsed.toIsToday !== false;
    if (toIsToday) dateTo = todayKey();
    const platformFilter = (
      ["all", "facebook", "instagram", "linkedin", "tiktok", "youtube"] as const
    ).includes(parsed.platformFilter as PlatformFilter)
      ? (parsed.platformFilter as PlatformFilter)
      : "all";
    const range = (["7", "14", "30", "90", "custom"] as const).includes(
      parsed.range as RangeKey,
    )
      ? (parsed.range as RangeKey)
      : "custom";
    return {
      range,
      dateFrom,
      dateTo,
      toIsToday,
      platformFilter,
      selectedUser:
        typeof parsed.selectedUser === "string" ? parsed.selectedUser : null,
    };
  } catch {
    return defaultFilters();
  }
}

function saveFilters(companyId: string, filters: PersistedFilters) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + companyId, JSON.stringify(filters));
  } catch {
    /* ignore quota */
  }
}

function applyPreset(
  days: number,
): Pick<PersistedFilters, "range" | "dateFrom" | "dateTo" | "toIsToday"> {
  const to = todayKey();
  const from = format(subDays(new Date(), days - 1), "yyyy-MM-dd");
  const key = String(days) as RangeKey;
  return {
    range: (["7", "14", "30", "90"] as string[]).includes(key) ? key : "custom",
    dateFrom: from,
    dateTo: to,
    toIsToday: true,
  };
}

export default function DashboardPage() {
  const [published, setPublished] = useState<PublishedPost[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  const companyId = useAuthStore((s) => s.companyId);

  const [range, setRange] = useState<RangeKey>("30");
  const [dateFrom, setDateFrom] = useState(() =>
    format(subDays(new Date(), 29), "yyyy-MM-dd"),
  );
  const [dateTo, setDateTo] = useState(todayKey);
  const [toIsToday, setToIsToday] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [filtersReady, setFiltersReady] = useState(false);

  // Cargar filtros guardados al tener companyId
  useEffect(() => {
    if (!companyId) {
      setFiltersReady(true);
      return;
    }
    const f = loadFilters(companyId);
    setRange(f.range);
    setDateFrom(f.dateFrom);
    setDateTo(f.toIsToday ? todayKey() : f.dateTo);
    setToIsToday(f.toIsToday);
    setPlatformFilter(f.platformFilter);
    setSelectedUser(f.selectedUser);
    setSelectedDay(null);
    setFiltersReady(true);
  }, [companyId]);

  // Persistir (excepto selectedDay, que es temporal de UI)
  useEffect(() => {
    if (!companyId || !filtersReady) return;
    saveFilters(companyId, {
      range,
      dateFrom,
      dateTo: toIsToday ? todayKey() : dateTo,
      toIsToday,
      platformFilter,
      selectedUser,
    });
  }, [
    companyId,
    filtersReady,
    range,
    dateFrom,
    dateTo,
    toIsToday,
    platformFilter,
    selectedUser,
  ]);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
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
              tiktokPostId: data.tiktokPostId || data.tiktokPublishId || null,
              tiktokPublishId: data.tiktokPublishId || null,
              facebookPostId: data.facebookPostId || data.postId || null,
              instagramPostId: data.instagramPostId || null,
              linkedinPostId: data.linkedinPostId || null,
              youtubeVideoId: data.youtubeVideoId || null,
              permalink: data.permalink || null,
              publishedByUid: data.publishedByUid || null,
              publishedByName: data.publishedByName || null,
              publishedByEmail: data.publishedByEmail || null,
              source: data.source || null,
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
  }, [companyId]);

  const getExternalUrl = (post: PublishedPost): string | null => {
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
    return null;
  };

  const effectiveToKey = toIsToday ? todayKey() : dateTo;

  const rangeStart = useMemo(() => {
    try {
      return startOfDay(parseISO(dateFrom));
    } catch {
      return startOfDay(subDays(new Date(), 29));
    }
  }, [dateFrom]);

  const rangeEnd = useMemo(() => {
    try {
      return endOfDay(parseISO(effectiveToKey));
    } catch {
      return endOfDay(new Date());
    }
  }, [effectiveToKey]);

  // Si from > to, invertimos al filtrar
  const interval = useMemo(() => {
    if (rangeStart.getTime() <= rangeEnd.getTime()) {
      return { start: rangeStart, end: rangeEnd };
    }
    return { start: startOfDay(rangeEnd), end: endOfDay(rangeStart) };
  }, [rangeStart, rangeEnd]);

  const daysInRange = useMemo(() => {
    const days = differenceInCalendarDays(interval.end, interval.start) + 1;
    // Evitar charts enormes si alguien pone años
    if (days > 366) {
      const cappedStart = startOfDay(subDays(interval.end, 365));
      return eachDayOfInterval({
        start: cappedStart,
        end: startOfDay(interval.end),
      });
    }
    return eachDayOfInterval({
      start: startOfDay(interval.start),
      end: startOfDay(interval.end),
    });
  }, [interval]);

  const filtered = useMemo(() => {
    return published.filter((p) => {
      if (!p.publishedAt) return false;
      if (!isWithinInterval(p.publishedAt, interval)) return false;
      if (platformFilter !== "all" && p.platform !== platformFilter)
        return false;
      if (selectedUser) {
        const key = p.publishedByUid || "unknown";
        if (key !== selectedUser) return false;
      }
      return true;
    });
  }, [published, interval, platformFilter, selectedUser]);

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

  const byUser = useMemo(() => {
    const base = published.filter((p) => {
      if (!p.publishedAt) return false;
      if (!isWithinInterval(p.publishedAt, interval)) return false;
      if (platformFilter !== "all" && p.platform !== platformFilter)
        return false;
      return true;
    });

    const map = new Map<
      string,
      { name: string; total: number; byPlatform: Record<string, number> }
    >();

    for (const p of base) {
      const key = p.publishedByUid || "unknown";
      const name = p.publishedByName || p.publishedByEmail || "Desconocido";
      const cur = map.get(key) || { name, total: 0, byPlatform: {} };
      cur.total += 1;
      const plat = p.platform || "other";
      cur.byPlatform[plat] = (cur.byPlatform[plat] || 0) + 1;
      map.set(key, cur);
    }

    return Array.from(map.entries())
      .map(([uid, v]) => ({ uid, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [published, interval, platformFilter]);

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

  const setPreset = (days: 7 | 14 | 30 | 90) => {
    const next = applyPreset(days);
    setRange(next.range);
    setDateFrom(next.dateFrom);
    setDateTo(next.dateTo);
    setToIsToday(true);
    setSelectedDay(null);
  };

  const onChangeFrom = (value: string) => {
    setDateFrom(value);
    setRange("custom");
    setSelectedDay(null);
  };

  const onChangeTo = (value: string) => {
    setDateTo(value);
    setToIsToday(value === todayKey());
    setRange("custom");
    setSelectedDay(null);
  };

  const setUntilToday = () => {
    setDateTo(todayKey());
    setToIsToday(true);
    setRange("custom");
    setSelectedDay(null);
  };

  const clearFilters = () => {
    const next = applyPreset(30);
    setRange(next.range);
    setDateFrom(next.dateFrom);
    setDateTo(next.dateTo);
    setToIsToday(true);
    setPlatformFilter("all");
    setSelectedDay(null);
    setSelectedUser(null);
  };

  const hasActiveFilters =
    platformFilter !== "all" ||
    selectedDay ||
    selectedUser ||
    range !== "30" ||
    !toIsToday;

  if (loading || !filtersReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LucideLoaderCircle className="animate-spin h-16 w-16 text-orange-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between bg-zinc-950/50">
        <div className="p-6 text-white">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm">
            Actividad de publicaciones — clic en barras, sectores o usuarios
            para filtrar
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Filtros */}
        <Card className="bg-zinc-950/60">
          <CardContent className="pt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-white">Periodo:</span>
              {([7, 14, 30, 90] as const).map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={range === String(r) ? "default" : "outline"}
                  className={cn(
                    "border-none border-0",
                    range === String(r)
                      ? "bg-gradient-to-r from-orange-400 to-yellow-500 text-white outline-none"
                      : "bg-black text-white",
                  )}
                  onClick={() => setPreset(r)}
                >
                  {r} días
                </Button>
              ))}
              {range === "custom" && (
                <Badge
                  variant="secondary"
                  className="bg-white/10 text-white border-0"
                >
                  Personalizado
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dash-from" className="text-white text-xs">
                  Desde
                </Label>
                <Input
                  id="dash-from"
                  type="date"
                  value={dateFrom}
                  max={effectiveToKey}
                  onChange={(e) => onChangeFrom(e.target.value)}
                  className="bg-white text-black w-[11rem]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dash-to" className="text-white text-xs">
                  Hasta
                </Label>
                <Input
                  id="dash-to"
                  type="date"
                  value={effectiveToKey}
                  min={dateFrom}
                  max={todayKey()}
                  onChange={(e) => onChangeTo(e.target.value)}
                  className="bg-white text-black w-[11rem]"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant={toIsToday ? "default" : "outline"}
                className={cn(
                  "mb-0.5",
                  toIsToday
                    ? "bg-gradient-to-r from-orange-400 to-yellow-500 text-white border-0"
                    : "bg-black text-white border-0",
                )}
                onClick={setUntilToday}
              >
                Hasta hoy
              </Button>
              <p className="text-xs text-white/50 pb-2">
                {format(interval.start, "d MMM yyyy", { locale: es })} —{" "}
                {format(interval.end, "d MMM yyyy", { locale: es })}
                {toIsToday ? " (actualidad)" : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-white">Red:</span>
              {(
                [
                  ["all", "Todas"],
                  ["facebook", "Facebook"],
                  ["instagram", "Instagram"],
                  ["linkedin", "LinkedIn"],
                  ["tiktok", "TikTok"],
                  ["youtube", "YouTube"],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={platformFilter === key ? "default" : "outline"}
                  className={cn(
                    "border-none border-0",
                    platformFilter === key
                      ? "bg-gradient-to-r from-orange-400 to-yellow-500 text-white border-0"
                      : "bg-black text-white",
                  )}
                  onClick={() => {
                    setPlatformFilter(key);
                    setSelectedDay(null);
                  }}
                >
                  {label}
                </Button>
              ))}

              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearFilters}
                  className="ml-auto text-white"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {(selectedDay || platformFilter !== "all" || selectedUser) && (
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
            {selectedUser && (
              <Badge variant="secondary">
                Usuario:{" "}
                {byUser.find((u) => u.uid === selectedUser)?.name ||
                  "Desconocido"}
              </Badge>
            )}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-950/60 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-white">
                Publicados
              </CardDescription>
              <CardTitle className="text-3xl">{stats.totalPublished}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-white">En el periodo filtrado</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/60">
            <CardHeader className="pb-2">
              <CardDescription className="text-white">
                Programados
              </CardDescription>
              <CardTitle className="text-3xl text-sky-600">
                {stats.scheduledCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-white">Pendientes</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/60">
            <CardHeader className="pb-2">
              <CardDescription className="text-white">Fallidos</CardDescription>
              <CardTitle className="text-3xl text-red-600">
                {stats.failedCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-white">Calendario</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/60">
            <CardHeader className="pb-2">
              <CardDescription className="text-white">
                Día con más posts
              </CardDescription>
              <CardTitle className="text-xl text-white font-bold">
                {stats.bestDay.full}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-white">
                {stats.bestDay.posts} publicación
                {stats.bestDay.posts !== 1 ? "es" : ""}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-zinc-950/60 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">
                Publicaciones por día
              </CardTitle>
              <CardDescription className="text-white">
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
                      tick={{ fontSize: 11, fill: "white" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "white" }}
                    />
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

          <Card className="bg-zinc-950/60">
            <CardHeader>
              <CardTitle className="text-white">Por red</CardTitle>
              <CardDescription className="text-white">
                Clic en un sector para filtrar por red
              </CardDescription>
            </CardHeader>
            <CardContent>
              {postsByPlatform.length === 0 ? (
                <p className="text-sm text-white text-center py-12">
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

        {/* Ranking por usuario */}
        <Card className="bg-zinc-950/60">
          <CardHeader>
            <CardTitle className="text-white">
              Publicaciones por persona
            </CardTitle>
            <CardDescription className="text-white">
              Quién publicó más en el periodo (incluye posts programados
              ejecutados). Clic para filtrar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {byUser.length === 0 ? (
              <p className="text-sm text-white/70">
                Sin datos de autoría aún. Los posts nuevos guardarán quién
                publicó.
              </p>
            ) : (
              <ul className="space-y-2">
                {byUser.map((u, i) => (
                  <li key={u.uid}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedUser((prev) =>
                          prev === u.uid ? null : u.uid,
                        )
                      }
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                        selectedUser === u.uid
                          ? "bg-orange-500/30 ring-1 ring-orange-400/50"
                          : "bg-zinc-900/80 hover:bg-zinc-900",
                      )}
                    >
                      <span className="text-white/50 text-sm w-6">
                        {i + 1}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white truncate">
                          {u.name}
                        </p>
                        <p className="text-xs text-white/50 truncate">
                          {Object.entries(u.byPlatform)
                            .map(([plat, n]) => `${plat}: ${n}`)
                            .join(" · ")}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-white/10 text-white"
                      >
                        {u.total}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Lista filtrada */}
        <Card className="bg-zinc-950/60">
          <CardHeader>
            <CardTitle className="text-white">
              {selectedDay
                ? `Posts del ${format(selectedDay, "d MMMM yyyy", { locale: es })}`
                : "Publicaciones filtradas"}
            </CardTitle>
            <CardDescription className="text-white">
              {listPosts.length} resultado{listPosts.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listPosts.length === 0 ? (
              <p className="text-sm text-white">
                No hay publicaciones con estos filtros
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {listPosts.slice(0, 30).map((p) => {
                  const externalUrl = getExternalUrl(p);
                  const author =
                    p.publishedByName || p.publishedByEmail || null;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950/60 text-sm"
                    >
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center shrink-0">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : p.videoUrl ? (
                          <Video className="h-5 w-5 text-white" />
                        ) : (
                          <FileText className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate text-white">
                          {p.message || p.title || "Sin texto"}
                        </p>
                        <p className="text-xs text-white/80 capitalize">
                          {p.platform || "—"}
                          {p.publishedAt
                            ? ` · ${format(p.publishedAt, "d MMM HH:mm", { locale: es })}`
                            : ""}
                          {author ? ` · ${author}` : ""}
                          {p.source === "schedule" ? " · programado" : ""}
                        </p>
                      </div>
                      {externalUrl && (
                        <a
                          href={externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-foreground shrink-0 p-1"
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
