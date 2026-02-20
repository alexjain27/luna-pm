import { redirect } from "next/navigation";

import { authOptions } from "@/auth";

export default async function SignInPage() {
  if (!authOptions.providers?.length) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Enter your email to receive a magic link.
      </p>
      <form
        className="mt-6 flex flex-col gap-3"
        action="/api/auth/signin/email"
        method="post"
      >
        <label className="flex flex-col gap-2 text-sm font-medium">
          Email
          <input
            className="rounded border border-neutral-300 px-3 py-2"
            type="email"
            name="email"
            placeholder="you@example.com"
            required
          />
        </label>
        <button
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
          type="submit"
        >
          Send magic link
        </button>
      </form>
    </main>
  );
}
