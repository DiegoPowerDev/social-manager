"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Trash2 } from "lucide-react";

interface Member {
  id: string;
  uid: string;
  email?: string;
  name?: string;
  role: string;
}

export default function TeamPage() {
  const companyId = useAuthStore((s) => s.companyId);
  const memberRole = useAuthStore((s) => s.memberRole);
  const user = useAuthStore((s) => s.user);
  const isAdmin = memberRole === "admin";

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("editor");

  const loadMembers = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const q = query(
        collection(db, "memberships"),
        where("companyId", "==", companyId),
      );
      const snap = await getDocs(q);
      setMembers(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            uid: data.uid,
            email: data.email,
            name: data.name,
            role: data.role || "viewer",
          };
        }),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [companyId]);

  const handleInvite = async () => {
    if (!companyId || !user || !isAdmin) return;
    if (!email.trim() || password.length < 6) {
      setMessage({
        type: "error",
        text: "Email y contraseña (mín. 6 caracteres) obligatorios",
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || email.trim(),
          role,
          companyId,
          invitedByUid: user.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al invitar");

      setMessage({ type: "success", text: "Usuario añadido al equipo" });
      setEmail("");
      setPassword("");
      setName("");
      setRole("editor");
      loadMembers();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (targetUid: string) => {
    if (!companyId || !user || !isAdmin) return;
    if (!confirm("¿Quitar a este miembro de la empresa?")) return;

    try {
      const res = await fetch("/api/team/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUid,
          companyId,
          requestedByUid: user.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      loadMembers();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
  };

  if (!companyId) {
    return (
      <div className="p-6 text-muted-foreground">No hay empresa asociada.</div>
    );
  }

  return (
    <div>
      <div className="p-6 bg-yellow-500/20">
        <h2 className="text-2xl font-bold">Equipo</h2>
        <p className="text-muted-foreground mt-1">
          Gestiona quién puede usar la plataforma en tu empresa
        </p>
      </div>

      <div className="p-6 max-w-2xl space-y-6">
        {message && (
          <div
            className={`p-3 rounded-md text-sm border ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {isAdmin && (
          <Card className="bg-white/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Añadir miembro
              </CardTitle>
              <CardDescription>
                Crea acceso con email y contraseña. Ellos entrarán por el login.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Contraseña temporal</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as any)}
                  disabled={saving}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleInvite}
                disabled={saving}
                className="bg-gradient-to-r from-orange-400 to-yellow-500 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Añadir al equipo"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/70">
          <CardHeader>
            <CardTitle>Miembros</CardTitle>
            <CardDescription>
              {members.length} persona{members.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin miembros</p>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/60"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {m.name || m.email || m.uid}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="capitalize">
                      {m.role}
                    </Badge>
                    {isAdmin && m.uid !== user?.uid && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(m.uid)}
                        title="Quitar"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {!isAdmin && (
          <p className="text-sm text-muted-foreground">
            Solo un administrador puede añadir o quitar miembros.
          </p>
        )}
      </div>
    </div>
  );
}
