/**
 * Tiny "Demo environment" pill shown while the app is running in demo/test mode.
 * Toggle off by setting VITE_DEMO_MODE="false" before going live.
 */
export function DemoModeBadge() {
  const flag = import.meta.env.VITE_DEMO_MODE;
  const enabled = flag === undefined || flag === "true" || flag === "1";
  if (!enabled) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800"
      title="This is a demo environment — Stripe and Twilio are in test mode and no real charges or SMS are processed against production accounts."
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
      Demo mode
    </div>
  );
}
