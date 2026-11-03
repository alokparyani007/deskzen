import { useEffect, useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { DesktopHome } from './DesktopHome';
import { PhoneHome } from './PhoneHome';

export function HomePage() {
  usePageTitle('Home');
  const [phone, setPhone] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)');
    const apply = () => setPhone(query.matches);
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);
  return phone ? <PhoneHome /> : <DesktopHome />;
}
