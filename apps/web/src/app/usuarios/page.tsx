"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Search, UserPlus, Users } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  USER_ROLES,
  USER_STATUSES,
  createUser,
  fetchUsers,
  filterUsers,
  type CreateUserPayload,
  type User,
  type UserRole,
  type UserStatus,
} from "@/lib/users/google-sheets";

const INITIAL_FORM: CreateUserPayload = {
  nombre: "",
  correo: "",
  rol: "Consulta",
  sucursal: "",
  area: "",
  estado: "Activo",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [rol, setRol] = useState("");
  const [estado, setEstado] = useState("");
  const [form, setForm] = useState<CreateUserPayload>(INITIAL_FORM);

  async function loadUsers() {
    setIsLoading(true);
    setError(null);
    try {
      setUsers(await fetchUsers());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudieron cargar usuarios reales.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const filtered = useMemo(
    () => filterUsers(users, { search, rol, estado }),
    [users, search, rol, estado],
  );
  const activeUsers = users.filter((user) => user.estado === "Activo").length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createUser({
        ...form,
        correo: form.correo.trim().toLowerCase(),
      });
      setSuccess(
        `Usuario ${"idUsuario" in result ? result.idUsuario : "creado"} guardado correctamente.`,
      );
      setForm(INITIAL_FORM);
      await loadUsers();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo crear el usuario.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.24),_transparent_32rem)] md:flex">
      <Sidebar />
      <section className="flex-1 p-4 sm:p-6 lg:p-8">
        <header className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/30">
          <Badge className="mb-3 bg-primary/15 text-primary">
            CFG_Usuarios
          </Badge>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
                Usuarios
              </h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Administra usuarios reales desde Google Sheets. La identidad
                operativa se basa en el correo de Google, sin contraseñas
                locales.
              </p>
            </div>
            <Users className="h-14 w-14 text-primary" />
          </div>
        </header>

        {error ? (
          <Message tone="error" text={error} onRetry={() => void loadUsers()} />
        ) : null}
        {success ? <Message tone="success" text={success} /> : null}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {[
            ["Usuarios registrados", users.length],
            ["Activos", activeUsers],
            ["Inactivos", users.length - activeUsers],
          ].map(([label, value]) => (
            <Card key={label} className="bg-white/[0.04]">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
          <Card className="bg-white/[0.04]">
            <CardHeader>
              <CardTitle>Directorio real</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 lg:grid-cols-3">
                <label className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    className="field pl-9"
                    placeholder="Buscar por nombre, correo o área"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <Select
                  value={rol}
                  onChange={setRol}
                  label="Todos los roles"
                  options={USER_ROLES}
                />
                <Select
                  value={estado}
                  onChange={setEstado}
                  label="Todos los estados"
                  options={USER_STATUSES}
                />
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-[900px] w-full text-left text-sm">
                  <thead className="bg-white/10 text-muted-foreground">
                    <tr>
                      {[
                        "ID",
                        "Nombre",
                        "Correo",
                        "Rol",
                        "Sucursal",
                        "Área",
                        "Estado",
                        "Actualización",
                      ].map((header) => (
                        <th key={header} className="px-4 py-3 font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                          Cargando usuarios reales...
                        </td>
                      </tr>
                    ) : null}
                    {!isLoading &&
                      filtered.map((user) => (
                        <tr
                          key={user.idUsuario}
                          className="border-t border-white/10"
                        >
                          <td className="px-4 py-3 font-semibold text-primary">
                            {user.idUsuario}
                          </td>
                          <td className="px-4 py-3">{user.nombre}</td>
                          <td className="px-4 py-3">{user.correo}</td>
                          <td className="px-4 py-3">{user.rol}</td>
                          <td className="px-4 py-3">{user.sucursal}</td>
                          <td className="px-4 py-3">{user.area}</td>
                          <td className="px-4 py-3">
                            <Badge
                              className={
                                user.estado === "Activo"
                                  ? "bg-primary/15 text-primary"
                                  : "bg-slate-500/20 text-slate-200"
                              }
                            >
                              {user.estado}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {formatDate(
                              user.fechaActualizacion || user.fechaCreacion,
                            )}
                          </td>
                        </tr>
                      ))}
                    {!isLoading && !filtered.length ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          No hay usuarios para los filtros seleccionados.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.04]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Crear usuario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <Field
                  label="Nombre"
                  value={form.nombre}
                  onChange={(nombre) => setForm({ ...form, nombre })}
                  required
                />
                <Field
                  label="Correo Google"
                  type="email"
                  value={form.correo}
                  onChange={(correo) => setForm({ ...form, correo })}
                  required
                />
                <Select
                  value={form.rol}
                  onChange={(value) =>
                    setForm({ ...form, rol: value as UserRole })
                  }
                  label="Rol"
                  options={USER_ROLES}
                />
                <Field
                  label="Sucursal"
                  value={form.sucursal}
                  onChange={(sucursal) => setForm({ ...form, sucursal })}
                  required
                />
                <Field
                  label="Área"
                  value={form.area}
                  onChange={(area) => setForm({ ...form, area })}
                  required
                />
                <Select
                  value={form.estado}
                  onChange={(value) =>
                    setForm({ ...form, estado: value as UserStatus })
                  }
                  label="Estado"
                  options={USER_STATUSES}
                />
                <button
                  className="w-full rounded-2xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? "Guardando..." : "Crear usuario"}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-muted-foreground">
      {label}
      <input
        className="field mt-2"
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: readonly string[];
}) {
  return (
    <select
      className="field"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function Message({
  tone,
  text,
  onRetry,
}: {
  tone: "error" | "success";
  text: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className={`mb-4 rounded-2xl border p-4 text-sm ${tone === "error" ? "border-red-400/30 bg-red-500/10 text-red-100" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"}`}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>{text}</span>
      </div>
      {onRetry ? (
        <button
          className="mt-3 rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10"
          onClick={onRetry}
        >
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-MX");
}
