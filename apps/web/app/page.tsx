import Link from "next/link";
import { APP_DISPLAY_NAME } from "@/lib/app-brand";

const primaryCtaClass =
  "inline-flex h-11 items-center justify-center rounded-lg bg-white px-6 text-sm font-semibold text-zinc-950 shadow-lg shadow-indigo-950/30 transition hover:bg-zinc-100";

const secondaryCtaClass =
  "inline-flex h-11 items-center justify-center rounded-lg border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10";

const ghostCtaClass =
  "inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(99,102,241,0.35),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-[28rem] w-[28rem] rounded-full bg-indigo-600/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-violet-600/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,rgb(255_255_255/0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.08)_1px,transparent_1px)] [background-size:4rem_4rem]"
        aria-hidden
      />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:px-12 lg:pt-28">
        <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-indigo-200">
          Candidate experience
        </p>

        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl sm:leading-[1.08] lg:text-6xl">
          Land the right role with{" "}
          <span className="bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-transparent">
            {APP_DISPLAY_NAME}
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
          One profile, résumé on file, and skills that travel with every application—so recruiters see the real you,
          not another empty form.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Link href="/login" className={primaryCtaClass}>
            Sign in
          </Link>
          <Link href="/register" className={secondaryCtaClass}>
            Create account
          </Link>
          <Link href="/jobs" className={ghostCtaClass}>
            Browse open roles →
          </Link>
        </div>

        <ul className="mt-20 grid gap-4 sm:grid-cols-3 sm:gap-6">
          <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition hover:border-indigo-500/30 hover:bg-white/[0.06]">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/25 text-sm font-bold text-indigo-200"
              aria-hidden
            >
              1
            </span>
            <h2 className="mt-3 text-base font-semibold text-white">Fast apply</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Submit once per job with your profile snapshot—no re-uploading the same PDF every time.
            </p>
          </li>
          <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition hover:border-indigo-500/30 hover:bg-white/[0.06]">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/25 text-sm font-bold text-indigo-200"
              aria-hidden
            >
              2
            </span>
            <h2 className="mt-3 text-base font-semibold text-white">Résumé + skills</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Keep skills and résumé in sync on your profile; applications stay consistent with what you intended.
            </p>
          </li>
          <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition hover:border-indigo-500/30 hover:bg-white/[0.06] sm:col-span-1">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/25 text-sm font-bold text-indigo-200"
              aria-hidden
            >
              3
            </span>
            <h2 className="mt-3 text-base font-semibold text-white">Track applications</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              See where you have applied and stay oriented as new roles open up.
            </p>
          </li>
        </ul>
      </main>
    </div>
  );
}
