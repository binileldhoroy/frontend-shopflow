import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
  mobilePath?: string;
}

const MobileAwareRoute: React.FC<Props> = ({ children, mobilePath = '/mobile-pos' }) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isMobile) return <Navigate to={mobilePath} replace />;
  return <>{children}</>;
};

export default MobileAwareRoute;
