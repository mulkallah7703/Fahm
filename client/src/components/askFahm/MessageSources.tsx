interface Props {
  label: string | null;
}

export function MessageSources({ label }: Props) {
  if (!label) return null;
  return <span className="ask-source">{label}</span>;
}
