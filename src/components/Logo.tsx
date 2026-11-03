type LogoProps = {
  showWordmark?: boolean;
  tone?: 'default' | 'onBrand';
  className?: string;
};

export function Logo({ showWordmark = true, tone = 'default', className }: LogoProps) {
  const desk = tone === 'onBrand' ? 'text-white' : 'text-desk';
  const zen = tone === 'onBrand' ? 'text-white' : 'text-print';

  return (
    <span className={['inline-flex items-center gap-2', className].filter(Boolean).join(' ')}>
      <img src="/brand/deskzen-icon.svg" alt={showWordmark ? '' : 'DeskZen'} className="size-9 shrink-0" />
      {showWordmark ? (
        <span className="text-lg font-semibold tracking-tight">
          <span className={desk}>Desk</span>
          <span className={zen}>Zen</span>
        </span>
      ) : null}
    </span>
  );
}
