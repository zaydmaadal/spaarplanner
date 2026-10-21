// Spec 8.8: the layout of a screen as grey blocks at their real size, without shimmer.
const Block = ({ className }: { className: string }) => <div aria-hidden className={`bg-tint ${className}`} />;

export default function AppLoading() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Even laden</span>
      <Block className="h-8 w-40 rounded-md" />
      <Block className="h-36 rounded-card" />
      <Block className="h-48 rounded-card" />
      <Block className="h-48 rounded-card" />
    </div>
  );
}
