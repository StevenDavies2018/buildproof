export default function TablePlaceholder() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr,0.9fr]">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-stone-200 animate-pulse" />
          <div className="h-8 w-56 rounded bg-stone-200 animate-pulse" />
          <div className="h-5 w-full max-w-2xl rounded bg-stone-200 animate-pulse" />
        </div>
        <div className="mt-8 grid gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 rounded bg-stone-200 animate-pulse" />
                <div className="h-7 w-20 rounded-full bg-stone-200 animate-pulse" />
              </div>
              <div className="mt-3 h-4 w-full rounded bg-stone-200 animate-pulse" />
              <div className="mt-2 h-4 w-4/5 rounded bg-stone-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-stone-200 bg-stone-950 p-8 shadow-sm">
        <div className="h-4 w-28 rounded bg-stone-800 animate-pulse" />
        <div className="mt-3 h-8 w-48 rounded bg-stone-800 animate-pulse" />
        <div className="mt-6 space-y-3">
          <div className="h-4 w-full rounded bg-stone-800 animate-pulse" />
          <div className="h-4 w-11/12 rounded bg-stone-800 animate-pulse" />
          <div className="h-4 w-4/5 rounded bg-stone-800 animate-pulse" />
        </div>
        <div className="mt-8 rounded-2xl border border-stone-800 bg-stone-900/80 p-5">
          <div className="h-4 w-24 rounded bg-stone-800 animate-pulse" />
          <div className="mt-3 h-4 w-40 rounded bg-stone-800 animate-pulse" />
          <div className="mt-2 h-4 w-full rounded bg-stone-800 animate-pulse" />
          <div className="mt-2 h-4 w-3/4 rounded bg-stone-800 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
