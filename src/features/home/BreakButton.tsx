import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

type BreakButtonProps = {
  label: string;
  withArrow?: boolean;
  fullWidth?: boolean;
};

export function BreakButton({ label, withArrow = false, fullWidth = false }: BreakButtonProps) {
  return (
    <Link
      to="/break"
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm',
        fullWidth ? 'w-full rounded-2xl py-3.5 text-base shadow-lg shadow-brand/20' : '',
      ].join(' ')}
    >
      {label}
      {withArrow ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
    </Link>
  );
}
