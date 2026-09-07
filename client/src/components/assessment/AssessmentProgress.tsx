interface Props {
  label: string;
}

export function AssessmentProgress({ label }: Props) {
  return (
    <p className="step-kicker" aria-current="true">
      {label}
    </p>
  );
}
