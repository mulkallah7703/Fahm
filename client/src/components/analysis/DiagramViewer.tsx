interface Props {
  title?: string;
  description: string;
  previewUrl?: string | null;
}

export function DiagramViewer({ title, description, previewUrl }: Props) {
  return (
    <div>
      {title ? <p><strong>{title}</strong></p> : null}
      {previewUrl ? (
        <img src={previewUrl} alt={title ?? "معاينة العنصر البصري"} />
      ) : null}
      <p>{description}</p>
      <p className="muted">هذا وصف للعنصر البصري، وليس الرسم الأصلي نفسه.</p>
    </div>
  );
}
