import { useAppSelector } from '@hooks/useRedux';
import { useAuth } from '@hooks/useAuth';
import { CompanyFeatures } from '../types/company.types';

export const useCompanyFeatures = () => {
  const features = useAppSelector((state) => state.company.currentCompany?.features);
  const { isSuperUser } = useAuth();

  const isFeatureEnabled = (feature: keyof Omit<CompanyFeatures, 'max_users' | 'max_branches'>): boolean => {
    if (isSuperUser) return true;
    return features?.[feature] ?? true;
  };

  return { features, isFeatureEnabled };
};
