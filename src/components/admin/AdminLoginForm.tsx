"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "../../../utils/supabase/client";
import { Logo } from "../ui/Logo";

const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type FormValues = z.infer<typeof schema>;

export default function AdminLoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    setLoading(true);
    const email = values.email.trim().toLowerCase();
    const password = values.password;

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (signInError) {
      setError("Invalid email or password");
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center bg-[var(--bg-tint)] text-[var(--text-base)] px-4 relative overflow-hidden">
      <div className="card w-full max-w-md p-8 relative z-10 text-center">
        <div className="flex justify-center mb-6">
          <Logo size="xl" />
        </div>
        <h1 className="text-3xl font-bold mb-2 font-heading text-[var(--text-dark)]">Admin Portal</h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          Sign in to manage bootcamps, submissions, and leaderboard.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="text-left">
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">Email</label>
            <input
              {...register("email")}
              className="input-field"
              placeholder="admin@niat.in"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              suppressHydrationWarning
            />
            {errors.email ? (
              <p className="text-sm text-[var(--primary)] mt-1">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="text-left">
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-2">Password</label>
            <input
              type="password"
              {...register("password")}
              className="input-field"
              placeholder="••••••••"
              autoComplete="current-password"
              spellCheck={false}
              suppressHydrationWarning
            />
            {errors.password ? (
              <p className="text-sm text-[var(--primary)] mt-1">{errors.password.message}</p>
            ) : null}
          </div>

          <button
            className="btn-primary w-full"
            disabled={loading}
            type="submit"
            suppressHydrationWarning
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {error ? <p className="text-sm text-[var(--primary)] mt-4 p-3 bg-[var(--status-rejected-bg)] rounded-lg font-medium">{error}</p> : null}
      </div>
    </main>
  );
}
