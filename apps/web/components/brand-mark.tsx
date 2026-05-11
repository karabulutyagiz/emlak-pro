type BrandMarkProps = {
  size?: number;
};

export function BrandMark({ size = 28 }: BrandMarkProps) {
  const smallWidth = Math.round(size * 0.32);
  const largeWidth = Math.round(size * 0.32);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.max(4, Math.round(size * 0.12)) }} aria-hidden="true">
      <span
        style={{
          width: smallWidth,
          height: Math.round(size * 0.92),
          borderRadius: 999,
          background: 'linear-gradient(180deg, #2563ff, #7c3aed)',
          transform: 'rotate(-20deg)',
          boxShadow: '0 0 18px rgba(37, 99, 255, 0.2)',
        }}
      />
      <span
        style={{
          width: largeWidth,
          height: Math.round(size * 1.22),
          borderRadius: 999,
          background: 'linear-gradient(180deg, #7c3aed, #a855f7)',
          transform: 'rotate(20deg) translateY(2px)',
          boxShadow: '0 0 18px rgba(124, 58, 237, 0.22)',
        }}
      />
    </span>
  );
}
