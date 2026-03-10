import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { companyService } from '@api/services/company.service';
import { Company } from '../../types/company.types';

interface CompanyState {
  currentCompany: Company | null;
  companies: Company[];
  loading: boolean;
  error: string | null;
}

const initialState: CompanyState = {
  currentCompany: null,
  companies: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchCurrentCompany = createAsyncThunk(
  'company/fetchCurrent',
  async (_, { rejectWithValue }) => {
    try {
      const company = await companyService.getCurrent();
      return company;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch company');
    }
  }
);

export const fetchAllCompanies = createAsyncThunk(
  'company/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const companies = await companyService.getAll();
      return companies;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch companies');
    }
  }
);

// Slice
const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    setCurrentCompany: (state, action: PayloadAction<Company>) => {
      state.currentCompany = action.payload;
    },
    clearCompany: (state) => {
      state.currentCompany = null;
      state.companies = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch current company
    builder
      .addCase(fetchCurrentCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCompany = action.payload;
      })
      .addCase(fetchCurrentCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch all companies
    builder
      .addCase(fetchAllCompanies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllCompanies.fulfilled, (state, action) => {
        state.loading = false;
        state.companies = action.payload;
      })
      .addCase(fetchAllCompanies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentCompany, clearCompany } = companySlice.actions;
export default companySlice.reducer;
