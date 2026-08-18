export default function SharedNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-display text-2xl font-extrabold uppercase">
        Link not valid
      </p>
      <p className="mt-2 text-sm text-muted">
        This share link is invalid or the initiative is no longer available.
      </p>
    </div>
  );
}
