import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';

type ConfirmationStatus = 'verifying' | 'confirmed' | 'error';

function getConfirmationError() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  return (
    searchParams.get('error_description') ??
    hashParams.get('error_description') ??
    searchParams.get('error') ??
    hashParams.get('error')
  );
}

export default function AuthConfirmPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConfirmationStatus>('verifying');
  const [message, setMessage] = useState('Estamos validando tu enlace de confirmación.');

  useEffect(() => {
    let active = true;

    const confirmEmail = async () => {
      const redirectError = getConfirmationError();
      if (redirectError) {
        if (active) {
          setStatus('error');
          setMessage(redirectError);
        }
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        setStatus('error');
        setMessage(error.message);
        return;
      }

      if (data.session) {
        setStatus('confirmed');
        setMessage('Tu correo fue confirmado correctamente. Ya puedes ingresar a Linergy.');
        return;
      }

      setStatus('error');
      setMessage('El enlace no es válido, ya fue utilizado o ha vencido. Solicita uno nuevo desde el inicio de sesión.');
    };

    void confirmEmail();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(21,122,90,0.16),transparent_24%),linear-gradient(180deg,#f7faf8_0%,#eef4f0_100%)] px-4 py-8">
      <div className="pointer-events-none absolute inset-0 grid-backdrop opacity-30" />
      <section className="surface-panel-elevated relative w-full max-w-[480px] p-8 text-center sm:p-10" aria-live="polite">
        {status === 'verifying' && (
          <Loader2 className="mx-auto h-14 w-14 animate-spin text-[#157A5A]" aria-hidden="true" />
        )}
        {status === 'confirmed' && (
          <CheckCircle2 className="mx-auto h-14 w-14 text-[#157A5A]" aria-hidden="true" />
        )}
        {status === 'error' && (
          <AlertCircle className="mx-auto h-14 w-14 text-[#dc2626]" aria-hidden="true" />
        )}

        <p className="section-heading mt-5">Confirmación de cuenta</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#0f172a]">
          {status === 'verifying' ? 'Validando correo' : status === 'confirmed' ? 'Correo confirmado' : 'No pudimos confirmar'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#64748b]">{message}</p>

        {status === 'confirmed' && (
          <Button
            type="button"
            size="lg"
            className="mt-7 w-full"
            onClick={() => navigate('/dashboard/mapa', { replace: true, state: { fromLogin: true } })}
          >
            Continuar al sistema
          </Button>
        )}

        {status === 'error' && (
          <Link
            to="/login"
            className="mt-7 inline-flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-gradient-to-b from-[#1a8e67] to-[#157A5A] px-6 py-3 font-medium text-white shadow-[0_14px_30px_rgba(21,122,90,0.24)] transition-all hover:-translate-y-0.5"
          >
            Volver al inicio de sesión
          </Link>
        )}
      </section>
    </main>
  );
}
