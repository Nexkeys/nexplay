/** Plain layout shared by the privacy and terms pages. */
export function Legal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="legal">
      <h1>{title}</h1>
      <p className="updated">Last updated {updated}</p>
      {children}
    </article>
  );
}
