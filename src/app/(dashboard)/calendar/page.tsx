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

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import { ScheduledPostDetailModal } from "@/components/calendar/ScheduledPostDetailModal";

interface ScheduledPost {
  id: string;
  title: string;
  message?: string;
  platforms: {
    facebook?: boolean;
    instagram?: boolean;
    linkedin?: boolean;
  };
  scheduledAt: Date;
  status: "scheduled" | "publishing" | "published" | "failed";
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function CalendarPage() {
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

  // Ajuste para que la semana empiece en lunes
  const startPad = (getDay(monthStart) + 6) % 7; // 0 = lunes
  const paddingDays = Array.from({ length: startPad });

  const loadPosts = async () => {
    try {
      setLoading(true);
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const q = query(
        collection(db, "scheduledPosts"),
        where("scheduledAt", ">=", Timestamp.fromDate(start)),
        where("scheduledAt", "<=", Timestamp.fromDate(end)),
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title || "Sin título",
          message: d.message,
          results: d.results || undefined,
          platforms: d.platforms || {},
          scheduledAt: d.scheduledAt?.toDate?.() || new Date(d.scheduledAt),
          status: d.status || "scheduled",
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
  }, [currentMonth]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    posts.forEach((post) => {
      const key = format(post.scheduledAt, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    });
    // Ordenar por hora dentro del día
    map.forEach((list) => {
      list.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    });
    return map;
  }, [posts]);

  const openCreateModal = (day: Date) => {
    setSelectedDate(day);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendario</h2>
          <p className="text-muted-foreground mt-1">
            Programa publicaciones por día y hora
          </p>
        </div>
      </div>

      {/* Controles de mes */}
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
        <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
          Hoy
        </Button>
      </div>

      {/* Grilla */}
      <div className="border rounded-lg overflow-hidden bg-background">
        {/* Días de la semana */}
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

        {/* Días del mes */}
        <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)]">
          {/* Padding días vacíos */}
          {paddingDays.map((_, i) => (
            <div key={`pad-${i}`} className="border-b border-r bg-muted/10" />
          ))}

          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayPosts = postsByDay.get(key) || [];
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={key}
                className={`border-b border-r p-1.5 flex flex-col gap-1 min-h-[120px] ${
                  !isSameMonth(day, currentMonth) ? "bg-muted/10" : ""
                }`}
              >
                {/* Número del día + botón + */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => openCreateModal(day)}
                    title="Programar publicación"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Lista de posts */}
                <div className="flex-1 space-y-1 overflow-y-auto">
                  {dayPosts.map((post) => (
                    <button
                      key={post.id}
                      className="w-full text-left px-1.5 py-1 rounded text-[11px] leading-tight bg-muted/60 hover:bg-muted transition-colors"
                      onClick={() => {
                        setSelectedPost(post);
                        setDetailOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <span className="truncate font-medium">
                          {post.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {post.platforms.facebook && (
                          <Image
                            height={20}
                            width={20}
                            src="./facebook-icon.svg"
                            alt="Facebook logo"
                          />
                        )}
                        {post.platforms.instagram && (
                          <Image
                            height={20}
                            width={20}
                            src="./instagram-icon.svg"
                            alt="Instagram logo"
                          />
                        )}
                        {post.platforms.linkedin && (
                          <Image
                            height={20}
                            width={20}
                            src="./linkedin.svg"
                            alt="Linkedin logo"
                          />
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {format(post.scheduledAt, "HH:mm")}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground text-center">
          Cargando publicaciones...
        </p>
      )}

      {/* Modal se agrega en el siguiente paso */}
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
              date={selectedDate || new Date()}
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
  );
}
