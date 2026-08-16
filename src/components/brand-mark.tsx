type BrandMarkProps = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 28, className }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect width="32" height="32" rx="7.5" fill="#F4F1EA" />
      <path
        d="M13 8.58 A8 8 0 1 0 23.42 19"
        stroke="#1C1B19"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M16 16 L22.69 9.98"
        stroke="#1C1B19"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
