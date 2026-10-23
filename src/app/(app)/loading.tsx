// Spec 8.8: the shell stays and a thin bar runs along the top. No skeleton: it flashed on every tab switch.
export default function AppLoading() {
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
      <span className="sr-only">Even laden</span>
      <div aria-hidden className="load-bar h-full w-2/5 rounded-full bg-action" />
    </div>
  );
}
