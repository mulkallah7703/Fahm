export function ChatEmptyState({ title }: { title: string }) {
  return (
    <div className="empty-state">
      <h2>لنرى ما الذي تريد فهمه.</h2>
      <p>{`اسأل فَهْم عن «${title}» كما وردت في صفحتك.`}</p>
    </div>
  );
}
