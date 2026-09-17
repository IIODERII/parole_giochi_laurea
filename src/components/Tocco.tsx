/** Tocco accademico, usato come piccolo stemma del sito. */
export default function Tocco({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 50" className={className} aria-hidden="true" fill="none">
      <path d="M32 6 58 17 32 28 6 17z" fill="currentColor" />
      <path
        d="M16 22v11c0 0 6 6 16 6s16-6 16-6V22"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M56 18v13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="56" cy="34" r="3.5" fill="currentColor" />
    </svg>
  )
}
