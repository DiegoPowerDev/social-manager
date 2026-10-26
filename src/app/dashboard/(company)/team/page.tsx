"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
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
  const [removing, setRemoving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");

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
      toast.error("Error al cargar el equipo");
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
      toast.error("Email y contraseña (mín. 6 caracteres) obligatorios");
      return;
    }

    setSaving(true);
    const tid = toast.loading("Añadiendo miembro…");
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

      toast.success("Usuario añadido al equipo", { id: tid });
      setEmail("");
      setPassword("");
      setName("");
      setRole("editor");
      loadMembers();
    } catch (e: any) {
      toast.error(e.message || "Error al invitar", { id: tid });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (
    targetUid: string,
    newRole: "editor" | "viewer",
  ) => {
    if (!companyId || !user || !isAdmin) return;

    const tid = toast.loading("Actualizando rol…");
    try {
      const res = await fetch("/api/team/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUid,
          companyId,
          requestedByUid: user.uid,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cambiar rol");

      setMembers((prev) =>
        prev.map((m) => (m.uid === targetUid ? { ...m, role: newRole } : m)),
      );
      toast.success("Rol actualizado", { id: tid });
    } catch (e: any) {
      toast.error(e.message || "Error al cambiar rol", { id: tid });
      loadMembers();
    }
  };

  const performRemove = async (member: Member) => {
    if (!companyId || !user || !isAdmin) return;
    setRemoving(true);
    const tid = toast.loading("Eliminando miembro…");
    try {
      const res = await fetch("/api/team/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUid: member.uid,
          companyId,
          requestedByUid: user.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      setRemoveTarget(null);
      toast.success("Miembro eliminado", { id: tid });
      loadMembers();
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar", { id: tid });
    } finally {
      setRemoving(false);
    }
  };

  if (!companyId) {
    return (
      <div className="p-6 text-muted-foreground">No hay empresa asociada.</div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="p-6 text-muted-foreground">
        Solo un administrador puede gestionar el equipo.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between bg-zinc-950/50 ">
        <div className="p-6 text-white">
          <h1 className="text-2xl font-bold">Equipo</h1>
          <p className="text-sm">
            Gestiona quién puede usar la plataforma en tu empresa
          </p>
        </div>
      </div>

      <div className="p-6 max-w-2xl space-y-6">
        <Card className="bg-zinc-950/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UserPlus className="h-5 w-5" />
              Añadir miembro
            </CardTitle>
            <CardDescription className="text-white/50">
              Crea acceso con email y contraseña. Ellos entrarán por el login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white text-black"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white text-black"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Contraseña temporal</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white text-black"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Rol</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "editor" | "viewer")}
                disabled={saving}
              >
                <SelectTrigger className="bg-white text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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

        <Card className="bg-zinc-950/50">
          <CardHeader>
            <CardTitle className="text-white">Miembros</CardTitle>
            <CardDescription className="text-white/50">
              {members.length} persona{members.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin miembros</p>
            ) : (
              members.map((m) => {
                const isSelf = m.uid === user?.uid;
                const isTargetAdmin = m.role === "admin";
                return (
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
                      {isSelf || isTargetAdmin ? (
                        <Badge variant="secondary" className="capitalize">
                          {m.role}
                        </Badge>
                      ) : (
                        <Select
                          value={m.role === "viewer" ? "viewer" : "editor"}
                          onValueChange={(v) =>
                            handleRoleChange(m.uid, v as "editor" | "viewer")
                          }
                        >
                          <SelectTrigger className="h-8 w-[120px] bg-white text-black text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {!isSelf && !isTargetAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRemoveTarget(m)}
                          title="Quitar"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="¿Quitar miembro?"
        description={
          removeTarget
            ? `Se eliminará el acceso de ${removeTarget.name || removeTarget.email || "este usuario"} a la empresa.`
            : undefined
        }
        confirmLabel="Quitar"
        destructive
        loading={removing}
        onConfirm={async () => {
          if (removeTarget) await performRemove(removeTarget);
        }}
      />
    </div>
  );
}
