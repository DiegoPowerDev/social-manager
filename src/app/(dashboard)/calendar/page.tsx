"use client";

import { useEffect, useMemo, useState } from "react";
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
import { ScheduledPostDetailModal } from "@/components/calendar/ScheduledPostDetailModal";
import { useAuthStore } from "@/stores/useAuthStore";

interface ScheduledPost {
  id: string;
  title: string;
  message?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  link?: string | null;
  platforms: {
    facebook?: boolean;
    instagram?: boolean;
    linkedin?: boolean;
  };
  instagramMediaType?: "FEED" | "REELS" | "STORIES" | null;
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

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = (getDay(monthStart) + 6) % 7;
  const paddingDays = Array.from({ length: startPad });

  const loadPosts = async () => {
    if (!companyId) {
      setPosts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      // Índice: companyId ASC, scheduledAt ASC
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
          imageUrl: d.imageUrl || null,
          videoUrl: d.videoUrl || null,
          link: d.link || null,
          platforms: d.platforms || {},
          instagramMediaType: d.instagramMediaType || null,
          scheduledAt: d.scheduledAt?.toDate?.() || new Date(d.scheduledAt),
          status: d.status || "scheduled",
          results: d.results || undefined,
        } as ScheduledPost;
      });

      setPosts(data);
    } catch (error) {
      console.error("Error cargando posts programados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [currentMonth, companyId]);

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

  const openCreateModal = (day: Date) => {
    if (!canEdit) return;
    setSelectedDate(day);
    setModalOpen(true);
  };

  if (!companyId) {
    return (
      <div className="p-6 text-muted-foreground">
        No hay empresa asociada a tu cuenta.
      </div>
    );
  }

  return (
    <div className="">
      <div className="flex items-center justify-between p-6">
        <div>
          <h2 className="text-2xl font-bold">Calendario</h2>
          <p className="text-muted-foreground mt-1">
            Programa publicaciones por día y hora
          </p>
        </div>
      </div>

      <div className="w-full h-full px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold min-w-[180px] text-center capitalize">
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
          <div className="flex flex-wrap items-center gap-3 text-xs text-black bg-white p-2 rounded-full mt-3 mb-2">
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

        <div className="rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-xs font-medium text-muted-foreground"
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
                  className={`border-b border-r p-1.5 flex flex-col gap-1 min-h-[120px] ${
                    isToday
                      ? "bg-yellow-500/20"
                      : "bg-white text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full">
                      {format(day, "d")}
                    </span>
                    {dayPosts.length !== 0 && (
                      <span className="text-black/50 rounded-full border-2 select-none flex gap-2 items-center">
                        {dayPosts.length}
                        <Clock size={15} />
                      </span>
                    )}
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => openCreateModal(day)}
                        title="Programar publicación"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="flex-1 space-y-1 overflow-y-auto max-h-24 pr-2">
                    {dayPosts.map((post) => {
                      const style =
                        statusStyles[post.status] || statusStyles.scheduled;

                      return (
                        <button
                          key={post.id}
                          type="button"
                          className={`w-full text-left px-1.5 py-1 rounded text-[11px] leading-tight border transition-colors ${style.card}`}
                          onClick={() => {
                            setSelectedPost(post);
                            setDetailOpen(true);
                          }}
                          title={style.label}
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
                                height={16}
                                width={16}
                                src="/facebook-icon.svg"
                                alt="Facebook"
                              />
                            )}
                            {post.platforms.instagram && (
                              <Image
                                height={16}
                                width={16}
                                src="/instagram-icon.svg"
                                alt="Instagram"
                              />
                            )}
                            {post.platforms.linkedin && (
                              <Image
                                height={16}
                                width={16}
                                src="/linkedin.svg"
                                alt="LinkedIn"
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

        {loading && (
          <div className="flex justify-center py-12">
            <LucideLoaderCircle className="animate-spin h-10 w-10 text-yellow-200" />
          </div>
        )}

        {modalOpen && selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Programar para{" "}
                  {format(selectedDate, "d MMMM yyyy", { locale: es })}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cerrar
                </Button>
              </div>
              <SchedulePostModal
                date={selectedDate}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={() => {
                  loadPosts();
                }}
              />
            </div>
          </div>
        )}

        <ScheduledPostDetailModal
          post={selectedPost}
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setSelectedPost(null);
          }}
          onUpdated={() => {
            loadPosts();
          }}
        />
      </div>
    </div>
  );
}
