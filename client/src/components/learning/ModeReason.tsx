interface Props {
  title: string;
  text: string;
}

export function ModeReason({ title, text }: Props) {
  return (
    <div className="mode-reason">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
