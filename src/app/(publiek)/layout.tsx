// The auth pages bring their own full-bleed shell (AuthShell); the privacy page its own column.
export default function PubliekLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
