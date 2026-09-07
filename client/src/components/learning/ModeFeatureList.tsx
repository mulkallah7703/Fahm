interface Props {
  features: string[];
}

export function ModeFeatureList({ features }: Props) {
  if (features.length === 0) return null;
  return (
    <ul className="mode-features">
      {features.map((feature) => (
        <li key={feature}>{feature}</li>
      ))}
    </ul>
  );
}
