import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ArrowRight, CalendarDays, Eye, EyeOff, Loader2, LockKeyhole, PawPrint, Users } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';

function safeDestination(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  if (value.split(/[?#]/)[0] === '/login') return '/';
  return value;
}

export function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [demoMessage, setDemoMessage] = useState('');

  useEffect(() => { document.title = 'Acesso da equipe | SmartPet Hub'; }, []);

  if (user) return <Navigate to={safeDestination(location.state?.from)} replace />;

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = 'Informe seu email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Informe um email válido.';
    if (!password) nextErrors.password = 'Informe sua senha.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      (event.currentTarget.elements.namedItem(nextErrors.email ? 'email' : 'password') as HTMLInputElement | null)?.focus();
      return;
    }
    setIsSubmitting(true);
    try { await login(email, password); }
    catch (error) { setErrors({ form: error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.' }); }
    finally { setIsSubmitting(false); }
  };

  const fillDemo = (role: 'gerente' | 'atendente') => {
    setEmail(`${role}@smartpet.com`);
    setPassword(role === 'gerente' ? 'Gerente123!' : 'Atendente123!');
    setErrors({});
    setDemoMessage(`Dados de ${role} preenchidos. Clique em Entrar para continuar.`);
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F5F7FA] px-4 py-8 sm:px-8 lg:py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm lg:grid-cols-2">
        <section className="hidden flex-col justify-between bg-[#EAF4FF] p-12 lg:flex" aria-label="Conheça o SmartPet Hub">
          <div>
            <div className="mb-12 flex items-center gap-3">
              <span className="rounded-2xl bg-white p-3 text-2xl" aria-hidden="true">🐾</span>
              <span className="text-xl font-bold"><span className="text-[#D95800]">Smart</span><span className="text-[#1476D6]">Pet Hub</span></span>
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#1476D6]">Cuidado em cada detalhe</span>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-slate-800">Seu pet shop,<br />mais organizado.</h2>
            <p className="mt-4 leading-relaxed text-slate-600">Clientes, pets e atendimentos no mesmo lugar. Mais tempo para cuidar de quem importa.</p>
          </div>
          <div className="mt-10 space-y-4 text-sm text-slate-700">
            {[
              { icon: Users, text: 'Tutores e pets sempre conectados' },
              { icon: CalendarDays, text: 'Sua rotina de atendimentos à vista' },
              { icon: PawPrint, text: 'Uma experiência feita para a equipe' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3"><span className="rounded-xl bg-white p-2 text-[#1476D6]"><Icon size={20} aria-hidden="true" /></span>{text}</div>
            ))}
          </div>
        </section>

        <section className="min-w-0 p-6 sm:p-10 lg:p-12" aria-labelledby="login-title">
          <div className="mb-8 flex items-center gap-2 text-xl font-bold lg:hidden"><span aria-hidden="true">🐾</span><span><span className="text-[#D95800]">Smart</span><span className="text-[#1476D6]">Pet Hub</span></span></div>
          <div className="mb-7">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-800"><LockKeyhole size={14} aria-hidden="true" /> Acesso da equipe</span>
            <h1 id="login-title" className="text-2xl font-bold text-slate-800">Bem-vindo de volta!</h1>
            <p className="mt-2 text-sm text-slate-500">Entre para cuidar da rotina do pet shop.</p>
          </div>

          <form onSubmit={handleLogin} noValidate className="space-y-5" aria-busy={isSubmitting}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-slate-700">Email de trabalho</Label>
              <Input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required placeholder="nome@smartpet.com" value={email} disabled={isSubmitting} onChange={(event) => { setEmail(event.target.value); setErrors((previous) => ({ ...previous, email: undefined, form: undefined })); setDemoMessage(''); }} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} className="h-12 rounded-xl border-slate-200 bg-white" />
              {errors.email && <p id="email-error" className="text-sm text-red-700" role="alert">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-slate-700">Senha</Label>
              <div className="relative">
                <Input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required placeholder="Digite sua senha" value={password} disabled={isSubmitting} onChange={(event) => { setPassword(event.target.value); setErrors((previous) => ({ ...previous, password: undefined, form: undefined })); setDemoMessage(''); }} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} className="h-12 rounded-xl border-slate-200 bg-white pr-12" />
                <button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} onClick={() => setShowPassword((previous) => !previous)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-[#3296FA]">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
              </div>
              {errors.password && <p id="password-error" className="text-sm text-red-700" role="alert">{errors.password}</p>}
            </div>
            {errors.form && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{errors.form}</p>}
            <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl bg-[#FF6B00] font-semibold text-white hover:bg-[#E45F00]">{isSubmitting ? <><Loader2 className="animate-spin" aria-hidden="true" /> Entrando…</> : <>Entrar <ArrowRight aria-hidden="true" /></>}</Button>
          </form>

          <Dialog>
            <div className="mt-3 text-center"><DialogTrigger asChild><button type="button" className="min-h-11 rounded-lg px-4 text-sm text-[#1476D6] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#3296FA]">Esqueci minha senha</button></DialogTrigger></div>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Precisa recuperar seu acesso?</DialogTitle><DialogDescription>Procure o gerente ou responsável pelo sistema para solicitar a redefinição da sua senha. Se você é gerente, fale com o responsável pela implantação.</DialogDescription></DialogHeader>
              <p className="rounded-xl bg-blue-50 p-4 text-sm leading-relaxed text-slate-600">Nesta demonstração, utilize uma das contas de exemplo abaixo do formulário. O envio de email de recuperação estará disponível quando o backend for integrado.</p>
            </DialogContent>
          </Dialog>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-[#F5FAFF] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1476D6]">Demonstração do frontend</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">Escolha um perfil para preencher os dados de exemplo. Este acesso é simulado.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => fillDemo('gerente')} className="min-h-11 rounded-xl border-blue-200 text-[#1476D6]">Gerente</Button>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => fillDemo('atendente')} className="min-h-11 rounded-xl border-blue-200 text-[#1476D6]">Atendente</Button>
            </div>
            <dl className="mt-3 space-y-2 break-all text-xs text-slate-600">
              <div><dt className="font-medium">Gerente: gerente@smartpet.com</dt><dd>Senha: Gerente123!</dd></div>
              <div><dt className="font-medium">Atendente: atendente@smartpet.com</dt><dd>Senha: Atendente123!</dd></div>
            </dl>
            <p className="mt-2 text-xs text-[#1476D6]" role="status">{demoMessage}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
