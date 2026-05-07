import { useAppSelector, useAppDispatch } from './useRedux';
import { setCurrentBranch } from '@store/slices/branchSlice';
import { Branch } from '../types/branch.types';

export const useBranch = () => {
  const dispatch = useAppDispatch();
  const { branches, currentBranch, loading, error } = useAppSelector((state) => state.branch);
  const branchesEnabled = useAppSelector(
    (state) => state.company.currentCompany?.features?.branches_enabled ?? false
  );

  // Overview mode: branches enabled but no specific branch selected
  const isOverviewMode = branchesEnabled && currentBranch === null;

  const switchBranch = (branch: Branch | null) => {
    dispatch(setCurrentBranch(branch));
  };

  return {
    branches,
    currentBranch,
    isOverviewMode,
    branchesEnabled,
    loading,
    error,
    switchBranch,
  };
};
