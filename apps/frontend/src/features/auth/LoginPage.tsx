import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema } from '@pos-lvmh/shared';
import type { LoginDto } from '@pos-lvmh/shared';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginDto>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginDto) => {
    setServerError('');
    try {
      const res = await api.post<{
        data: { accessToken: string; user: Parameters<typeof setAuth>[1] };
      }>('/auth/login', data);
      setAuth(res.data.data.accessToken, res.data.data.user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'Erreur de connexion';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-luxury-50">
      <div className="w-full max-w-md p-8 bg-white shadow-luxury rounded-luxury">
        {/* Logo / Titre */}
        <h1 className="font-display text-4xl text-luxury-900 text-center mb-2 tracking-wide">
          POS LVMH
        </h1>
        <p className="text-luxury-500 text-center text-sm mb-8">Système de caisse luxe</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-luxury-800 mb-1">Adresse e-mail</label>
            <input
              type="email"
              autoComplete="email"
              className="w-full border border-luxury-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition"
              {...register('email')}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-luxury-800 mb-1">Mot de passe</label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full border border-luxury-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Erreur serveur */}
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {serverError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition"
          >
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
