import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { branchService } from '@api/services/branchService';
import { Branch } from '../../types/branch.types';

export const BRANCH_STORAGE_KEY = 'shopflow_selected_branch';

interface BranchState {
  branches: Branch[];
  currentBranch: Branch | null; // null = Overview mode (all branches)
  loading: boolean;
  error: string | null;
}

const initialState: BranchState = {
  branches: [],
  currentBranch: null, // AppInitializer restores from localStorage after validating against fresh data
  loading: false,
  error: null,
};

export const fetchBranches = createAsyncThunk(
  'branch/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await branchService.getAll();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch branches');
    }
  }
);

const branchSlice = createSlice({
  name: 'branch',
  initialState,
  reducers: {
    setCurrentBranch: (state, action: PayloadAction<Branch | null>) => {
      state.currentBranch = action.payload;
      if (action.payload) {
        localStorage.setItem(BRANCH_STORAGE_KEY, String(action.payload.id));
      } else {
        localStorage.removeItem(BRANCH_STORAGE_KEY);
      }
    },
    clearBranches: (state) => {
      state.branches = [];
      state.currentBranch = null;
      localStorage.removeItem(BRANCH_STORAGE_KEY);
    },
    updateBranchInList: (state, action: PayloadAction<Branch>) => {
      const idx = state.branches.findIndex((b) => b.id === action.payload.id);
      if (idx !== -1) state.branches[idx] = action.payload;
    },
    addBranchToList: (state, action: PayloadAction<Branch>) => {
      state.branches.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBranches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranches.fulfilled, (state, action) => {
        state.loading = false;
        state.branches = action.payload;
      })
      .addCase(fetchBranches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentBranch, clearBranches, updateBranchInList, addBranchToList } = branchSlice.actions;
export default branchSlice.reducer;
