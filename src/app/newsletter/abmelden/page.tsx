export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;

  const token = params.token ?? "";

  const done = params.status === "done";

  return (
    <main className="min-h-screen bg-black px-4 py-20 text-white">
      <div className="mx-auto max-w-xl rounded-2xl border border-fuchsia-500/20 bg-zinc-950 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">
          SynSight
        </p>

        <h1 className="mt-3 text-2xl font-semibold">Newsletter</h1>

        {done ? (
          <p className="mt-5 leading-7 text-zinc-400">
            Deine E-Mail-Adresse wurde vom SynSight-Newsletter abgemeldet.
          </p>
        ) : (
          <>
            <p className="mt-5 leading-7 text-zinc-400">
              Möchtest du keine weiteren SynSight-Newsletter erhalten?
            </p>

            <form
              method="post"
              action="/api/newsletter/unsubscribe"
              className="mt-6"
            >
              <input type="hidden" name="token" value={token} />

              <button
                type="submit"
                className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-400/10 px-5 py-3 text-sm font-medium text-fuchsia-100"
              >
                Newsletter abbestellen
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
