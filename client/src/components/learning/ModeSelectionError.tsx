interface Props {
  message: string;
}

export function ModeSelectionError({ message }: Props) {
  return (
    <div className="mode-reco-error" role="status">
      <p>{message}</p>
      <p>يمكنك اختيار الطريقة التي تفضلها.</p>
    </div>
  );
}
