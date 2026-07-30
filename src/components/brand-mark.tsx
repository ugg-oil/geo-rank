type BrandMarkProps = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 14, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="16" cy="16" r="11.5" stroke="var(--border-hover)" strokeWidth="1" />
      <circle cx="16" cy="16" r="7.5" stroke="var(--border-hover)" strokeWidth="1" />
      <path
        d="M16 16 L16 4.5"
        stroke="var(--text)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 16 L26.2 10.8 A11.5 11.5 0 0 0 16 4.5 Z"
        fill="var(--text)"
        fillOpacity="0.12"
      />
      <circle cx="16" cy="16" r="2.25" fill="var(--text)" />
      <circle cx="22.5" cy="11" r="1.5" fill="var(--text)" />
      <circle cx="19.5" cy="20" r="1" fill="var(--text-secondary)" />
    </svg>
  );
}
