"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { SchedulePostModal } from "@/components/calendar/SchedulePostModal";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  LucideLoaderCircle,
  Plus,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  getDay,
} from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type IgMediaType = "FEED" | "REELS" | "STORIES" | "CAROUSEL";

export interface ScheduledPost {
  id: string;
  title: string;
  message?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  videoUrl?: string | null;
  link?: string | null;
  platforms: {
    facebook?: boolean;
    instagram?: boolean;
    linkedin?: boolean;
    youtube?: boolean;
    tiktok?: boolean;
  };
  instagramMediaType?: IgMediaType | null;
  youtubeTitle?: string | null;
  youtubePrivacy?: "public" | "unlisted" | "private" | null;
  tiktokPrivacy?:
    | "PUBLIC_TO_EVERYONE"
    | "MUTUAL_FOLLOW_FRIENDS"
    | "FOLLOWER_OF_CREATOR"
    | "SELF_ONLY"
    | null;
  scheduledAt: Date;
  status: "scheduled" | "publishing" | "published" | "failed";
  results?: Record<string, { success: boolean; message?: string }>;
  createdByUid: string;
  createdByName: string | null;
  createdByEmail: string | null;
  createdAt: Timestamp;
  updatedByUid?: string | null;
  updatedByName?: string | null;
  updatedAt?: Timestamp;
}

const statusStyles: Record<
  ScheduledPost["status"],
  { card: string; dot: string; label: string }
> = {
  scheduled: {
    card: "bg-sky-50 border-sky-200 hover:bg-sky-100 text-sky-900",
    dot: "bg-sky-500",
    label: "Programado",
  },
  publishing: {
    card: "bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-900",
    dot: "bg-amber-500",
    label: "Publicando",
  },
  published: {
    card: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900",
    dot: "bg-emerald-500",
    label: "Publicado",
  },
  failed: {
    card: "bg-red-50 border-red-200 hover:bg-red-100 text-red-900",
    dot: "bg-red-500",
    label: "Falló",
  },
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type CalendarView = "month" | "week";

function PlatformIcons({ post }: { post: ScheduledPost }) {
  return (
    <div className="flex items-center gap-1 mt-0.5">
      {post.platforms.facebook && (
        <Image height={14} width={14} src="/facebook-icon.svg" alt="Facebook" />
      )}
      {post.platforms.instagram && (
        <Image
          height={14}
          width={14}
          src="/instagram-icon.svg"
          alt="Instagram"
        />
      )}
      {post.platforms.instagram && post.instagramMediaType === "CAROUSEL" && (
        <span className="text-[9px] opacity-80">carousel</span>
      )}
      {post.platforms.linkedin && (
        <Image height={14} width={14} src="/linkedin.svg" alt="LinkedIn" />
      )}
      {post.platforms.youtube && (
        <Image height={14} width={14} src="/youtube.svg" alt="YouTube" />
      )}
      {post.platforms.tiktok && (
        <Image height={14} width={14} src="/tiktok.svg" alt="TikTok" />
      )}
      <span className="text-[10px] opacity-70 ml-auto">
        {format(post.scheduledAt, "HH:mm")}
      </span>
    </div>
  );
}

export default function CalendarPage() {
  const companyId = useAuthStore((s) => s.companyId);
  const memberRole = useAuthStore((s) => s.memberRole);
  const canEdit = memberRole === "admin" || memberRole === "editor";

  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(() => new Date()); // mes o cualquier día de la semana
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date>(() => new Date());
  const [modalPost, setModalPost] = useState<ScheduledPost | null>(null);

  const range = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: 1 });
      const end = endOfWeek(cursor, { weekStartsOn: 1 });
      return { start, end };
    }
    return {
      start: startOfMonth(cursor),
      end: endOfMonth(cursor),
    };
  }, [view, cursor]);

  const days = useMemo(
    () => eachDayOfInterval({ start: range.start, end: range.end }),
    [range],
  );

  const monthStart = startOfMonth(cursor);
  const startPad = view === "month" ? (getDay(monthStart) + 6) % 7 : 0;
  const paddingDays = Array.from({ length: startPad });

  const loadPosts = useCallback(async () => {
    if (!companyId) {
      setPosts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const q = query(
        collection(db, "scheduledPosts"),
        where("companyId", "==", companyId),
        where("scheduledAt", ">=", Timestamp.fromDate(range.start)),
        where("scheduledAt", "<=", Timestamp.fromDate(range.end)),
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          title: d.title || "Sin título",
          message: d.message || null,
          imageUrl: d.imageUrl || d.imageUrls?.[0] || null,
          imageUrls: d.imageUrls || null,
          videoUrl: d.videoUrl || null,
          link: d.link || null,
          platforms: d.platforms || {},
          instagramMediaType: d.instagramMediaType || null,
          youtubeTitle: d.youtubeTitle || null,
          youtubePrivacy: d.youtubePrivacy || null,
          tiktokPrivacy: d.tiktokPrivacy || null,
          scheduledAt: d.scheduledAt?.toDate?.() || new Date(d.scheduledAt),
          status: d.status || "scheduled",
          results: d.results || undefined,
          createdByUid: d.createdByUid || null,
          createdByName: d.createdByName || null,
          createdByEmail: d.createdByEmail || null,
          createdAt:
            d.createdAt?.toDate?.() ||
            (d.createdAt ? new Date(d.createdAt) : null),
          updatedByUid: d.updatedByUid || null,
          updatedByName: d.updatedByName || null,
        } as ScheduledPost;
      });

      setPosts(data);
    } catch (error) {
      console.error("Error cargando posts programados:", error);
      toast.error("No se pudo cargar el calendario");
    } finally {
      setLoading(false);
    }
  }, [companyId, range.start, range.end]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    posts.forEach((post) => {
      const key = format(post.scheduledAt, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    });
    map.forEach((list) => {
      list.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    });
    return map;
  }, [posts]);

  const headerLabel = useMemo(() => {
    if (view === "week") {
      const sameMonth = isSameMonth(range.start, range.end);
      if (sameMonth) {
        return `${format(range.start, "d", { locale: es })} – ${format(
          range.end,
          "d MMM yyyy",
          { locale: es },
        )}`;
      }
      return `${format(range.start, "d MMM", { locale: es })} – ${format(
        range.end,
        "d MMM yyyy",
        { locale: es },
      )}`;
    }
    return format(cursor, "MMMM yyyy", { locale: es });
  }, [view, range, cursor]);

  const goPrev = () => {
    setCursor((d) => (view === "week" ? subWeeks(d, 1) : subMonths(d, 1)));
  };

  const goNext = () => {
    setCursor((d) => (view === "week" ? addWeeks(d, 1) : addMonths(d, 1)));
  };

  const goToday = () => setCursor(new Date());

  const openCreate = (day: Date) => {
    if (!canEdit) {
      toast.error("Solo administradores y editores pueden programar");
      return;
    }
    setModalPost(null);
    setModalDate(day);
    setModalOpen(true);
  };

  const openDetail = (post: ScheduledPost) => {
    setModalPost(post);
    setModalDate(post.scheduledAt);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalPost(null);
  };

  if (!companyId) {
    return (
      <div className="p-6 text-muted-foreground">
        No hay empresa asociada a tu cuenta.
      </div>
    );
  }

  const dayMinHeight = view === "week" ? "min-h-[420px]" : "min-h-[120px]";
  const dayPostsMaxH = view === "week" ? "max-h-64" : "max-h-48";

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between bg-zinc-950/60">
        <div className="p-6 text-white">
          <h1 className="text-2xl font-bold">Calendario</h1>
          <p className="text-sm">
            {canEdit
              ? "Programa publicaciones por día y hora"
              : "Vista de publicaciones programadas (solo lectura)"}
          </p>
        </div>
      </div>

      {!canEdit && (
        <p className="mx-6 mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-md">
          Tu rol es solo lectura. Puedes ver el calendario, pero no crear ni
          editar publicaciones.
        </p>
      )}

      <div className="w-full h-full px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold min-w-[200px] text-center capitalize text-white">
              {headerLabel}
            </h3>
            <Button variant="outline" size="icon" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 rounded-full bg-zinc-900 p-1 border border-white/10">
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "rounded-full h-8 px-4 text-sm",
                view === "month"
                  ? "bg-gradient-to-r from-orange-400 to-yellow-500 text-white hover:text-white"
                  : "text-white/70 hover:text-black",
              )}
              onClick={() => setView("month")}
            >
              Mes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "rounded-full h-8 px-4 text-sm",
                view === "week"
                  ? "bg-gradient-to-r from-orange-400 to-yellow-500 text-white hover:text-white"
                  : "text-white/70 hover:text-black",
              )}
              onClick={() => setView("week")}
            >
              Semana
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-black bg-white p-2 rounded-full">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" /> Programado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Publicando
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Publicado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Falló
            </span>
          </div>

          <Button variant="outline" onClick={goToday}>
            Hoy
          </Button>
        </div>

        <div className="rounded-lg overflow-hidden mt-4 relative h-full">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
              <LucideLoaderCircle className="animate-spin h-10 w-10 text-yellow-200" />
            </div>
          )}

          <div className="grid grid-cols-7 border-b bg-zinc-950/60">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-xs font-medium text-white"
              >
                {day}
              </div>
            ))}
          </div>

          <div
            className={cn(
              "grid grid-cols-7",
              view === "week"
                ? "auto-rows-[minmax(220px,auto)]"
                : "auto-rows-[minmax(120px,auto)]",
            )}
          >
            {view === "month" &&
              paddingDays.map((_, i) => <div key={`pad-${i}`} />)}

            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayPosts = postsByDay.get(key) || [];
              const isToday = isSameDay(day, new Date());
              const outsideMonth =
                view === "month" && !isSameMonth(day, cursor);

              return (
                <div
                  key={key}
                  className={cn(
                    "border-b border-r border-white/20 p-1.5 flex flex-col gap-1 h-full",
                    dayMinHeight,
                    isToday ? "bg-yellow-500/20" : "bg-zinc-950/60 text-white",
                    outsideMonth && "opacity-40",
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                        isToday && "bg-yellow-500 text-black",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="flex items-center gap-1">
                      {dayPosts.length > 0 && (
                        <span className="text-white/50 select-none flex gap-1 items-center text-[10px]">
                          {dayPosts.length}
                          <Clock size={12} />
                        </span>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white hover:text-black"
                          onClick={() => openCreate(day)}
                          title="Programar publicación"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex-1 space-y-1 overflow-y-auto pr-0.5",
                      dayPostsMaxH,
                    )}
                  >
                    {dayPosts.map((post) => {
                      const style =
                        statusStyles[post.status] || statusStyles.scheduled;

                      return (
                        <button
                          key={post.id}
                          type="button"
                          className={cn(
                            "w-full text-left px-1.5 py-1 rounded text-[11px] leading-tight border transition-colors",
                            style.card,
                          )}
                          onClick={() => openDetail(post)}
                          title={`${style.label} · ${format(post.scheduledAt, "HH:mm")}`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full shrink-0",
                                style.dot,
                              )}
                            />
                            <span className="truncate font-medium">
                              {post.title}
                            </span>
                          </div>
                          <PlatformIcons post={post} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <SchedulePostModal
          open={modalOpen}
          date={modalDate}
          post={modalPost}
          canEdit={canEdit}
          onClose={closeModal}
          onSaved={() => {
            loadPosts();
            if (!modalPost) {
              toast.success("Publicación programada");
            }
          }}
        />
      </div>
    </div>
  );
}
