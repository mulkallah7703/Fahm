interface Props {
  text: string | null;
}

export function ReviewRecommendation({ text }: Props) {
  if (!text) return null;
  return <p className="mode-hint">{text}</p>;
}
