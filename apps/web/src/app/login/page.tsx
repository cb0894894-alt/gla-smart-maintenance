import { Activity, ShieldCheck } from "lucide-react";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.25),_transparent_35rem)] p-6">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/90 p-8 text-center shadow-2xl shadow-cyan-950/30">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Activity className="h-8 w-8" /></div>
      <p className="text-sm uppercase tracking-[0.3em] text-primary">GLA Smart Maintenance</p>
      <h1 className="mt-3 text-3xl font-black">Acceso seguro</h1>
      <p className="mt-4 text-muted-foreground">Inicia sesión con Google. El acceso se valida contra CFG_Usuarios y solo se permite a usuarios Activos.</p>
      {params.error ? <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">No se pudo completar el inicio de sesión. Revisa la configuración OAuth o contacta al administrador.</p> : null}
      <a href="/api/auth/google" className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90"><ShieldCheck className="h-5 w-5" />Continuar con Google</a>
      <p className="mt-5 text-xs text-muted-foreground">No se usan contraseñas locales ni usuarios simulados.</p>
    </section>
  </main>;
}
