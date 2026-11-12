// The ObsyBrain mark, drawn here (no remote image): four nodes answering a gold centre — what the product
// keeps and the connections it finds between things.
export function Mark({ title }: { title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
    >
      <circle cx="12" cy="12" r="2.5" fill="var(--accent)" />
      <circle cx="5" cy="8" r="2" fill="var(--text)" />
      <circle cx="19" cy="8" r="2" fill="var(--text)" />
      <circle cx="6.5" cy="17" r="2" fill="var(--text)" />
      <circle cx="17.5" cy="17" r="2" fill="var(--text)" />
      <path
        d="M6.9 9.4 10.1 11.2M17.1 9.4 13.9 11.2M8 15.6 10.6 13.6M16 15.6 13.4 13.6"
        stroke="var(--accent)"
        stroke-width="1.3"
        fill="none"
      />
    </svg>
  )
}
