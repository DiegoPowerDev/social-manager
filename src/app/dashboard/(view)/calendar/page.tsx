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
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

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

export default function CalendarPage() {
  const companyId = useAuthStore((s) => s.companyId);
  const memberRole = useAuthStore((s) => s.memberRole);
  const canEdit = memberRole === "admin" || memberRole === "editor";

  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Un solo modal: create (post=null) | detail (post definido)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date>(() => new Date());
  const [modalPost, setModalPost] = useState<ScheduledPost | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = (getDay(monthStart) + 6) % 7;
  const paddingDays = Array.from({ length: startPad });

  const loadPosts = useCallback(async () => {
    if (!companyId) {
      setPosts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const q = query(
        collection(db, "scheduledPosts"),
        where("companyId", "==", companyId),
        where("scheduledAt", ">=", Timestamp.fromDate(start)),
        where("scheduledAt", "<=", Timestamp.fromDate(end)),
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
          scheduledAt: d.scheduledAt?.toDate?.() || new Date(d.scheduledAt),
          status: d.status || "scheduled",
          results: d.results || undefined,
        } as ScheduledPost;
      });

      setPosts(data);
    } catch (error) {
      console.error("Error cargando posts programados:", error);
      toast.error("No se pudo cargar el calendario");
    } finally {
      setLoading(false);
    }
  }, [companyId, currentMonth]);

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

  return (
    <div>
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
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold min-w-[180px] text-center capitalize text-white">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </h3>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
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

          <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
            Hoy
          </Button>
        </div>

        <div className="rounded-lg overflow-hidden mt-4 relative">
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

          <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)]">
            {paddingDays.map((_, i) => (
              <div key={`pad-${i}`} />
            ))}

            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayPosts = postsByDay.get(key) || [];
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={key}
                  className={`border-b border-r border-white/20 p-1.5 flex flex-col gap-1 min-h-[120px] ${
                    isToday ? "bg-yellow-500/20" : "bg-zinc-950/60 text-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? "bg-yellow-500 text-black" : ""
                      }`}
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

                  <div className="flex-1 space-y-1 overflow-y-auto max-h-28 pr-0.5">
                    {dayPosts.map((post) => {
                      const style =
                        statusStyles[post.status] || statusStyles.scheduled;

                      return (
                        <button
                          key={post.id}
                          type="button"
                          className={`w-full text-left px-1.5 py-1 rounded text-[11px] leading-tight border transition-colors ${style.card}`}
                          onClick={() => openDetail(post)}
                          title={`${style.label} · ${format(post.scheduledAt, "HH:mm")}`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`}
                            />
                            <span className="truncate font-medium">
                              {post.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {post.platforms.facebook && (
                              <Image
                                height={14}
                                width={14}
                                src="/facebook-icon.svg"
                                alt="Facebook"
                              />
                            )}
                            {post.platforms.instagram && (
                              <Image
                                height={14}
                                width={14}
                                src="/instagram-icon.svg"
                                alt="Instagram"
                              />
                            )}
                            {post.platforms.instagram &&
                              post.instagramMediaType === "CAROUSEL" && (
                                <span className="text-[9px] opacity-80">
                                  carousel
                                </span>
                              )}
                            {post.platforms.linkedin && (
                              <Image
                                height={14}
                                width={14}
                                src="/linkedin.svg"
                                alt="LinkedIn"
                              />
                            )}
                            {post.platforms.youtube && (
                              <Image
                                height={14}
                                width={14}
                                src="/youtube.svg"
                                alt="YouTube"
                              />
                            )}
                            {post.platforms.tiktok && (
                              <Image
                                height={14}
                                width={14}
                                src="/tiktok.svg"
                                alt="TikTok"
                              />
                            )}
                            <span className="text-[10px] opacity-70 ml-auto">
                              {format(post.scheduledAt, "HH:mm")}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Un solo modal: crear (post=null) o detalle/editar (post definido) */}
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
