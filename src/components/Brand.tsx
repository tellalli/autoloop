import { Infinity as LoopIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="AutoLoop home">
      <span className="brand-mark"><LoopIcon aria-hidden="true" size={26} strokeWidth={2.3} /></span>
      <span>AutoLoop</span>
    </Link>
  );
}
