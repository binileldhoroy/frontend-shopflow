import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { sessionService, RegisterSession } from '@api/services/session.service';

interface SessionState {
  currentSession: RegisterSession | null;
  previousClosedSession: RegisterSession | null;
  loading: boolean;
  error: string | null;
  needsSessionSetup: boolean; // Flag to easily show/hide modal
}

const initialState: SessionState = {
  currentSession: null,
  previousClosedSession: null,
  loading: false,
  error: null,
  needsSessionSetup: false,
};

// Async thunks
export const fetchCurrentSession = createAsyncThunk(
  'session/fetchCurrent',
  async (_, { rejectWithValue }) => {
    try {
      const session = await sessionService.getCurrent();
      return session;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No active session
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch session');
    }
  }
);

export const fetchPreviousClosedSession = createAsyncThunk(
  'session/fetchPreviousClosed',
  async (_, { rejectWithValue }) => {
    try {
      const session = await sessionService.getPreviousClosed();
      return session;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch previous session');
    }
  }
);

export const openSession = createAsyncThunk(
  'session/open',
  async (openingBalance: number, { rejectWithValue }) => {
    try {
      const session = await sessionService.openSession(openingBalance);
      return session;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to open session');
    }
  }
);

export const closeSession = createAsyncThunk(
  'session/close',
  async ({ id, closingBalance }: { id: number; closingBalance: number }, { rejectWithValue }) => {
    try {
      const session = await sessionService.closeSession(id, closingBalance);
      return session;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to close session');
    }
  }
);

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    clearSessionError: (state) => {
      state.error = null;
    },
    resetSessionState: (state) => {
      state.currentSession = null;
      state.previousClosedSession = null;
      state.loading = false;
      state.error = null;
      state.needsSessionSetup = false;
    }
  },
  extraReducers: (builder) => {
    // fetchCurrentSession
    builder
      .addCase(fetchCurrentSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentSession.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSession = action.payload;
        state.needsSessionSetup = action.payload === null;
      })
      .addCase(fetchCurrentSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // fetchPreviousClosedSession
    builder
      .addCase(fetchPreviousClosedSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPreviousClosedSession.fulfilled, (state, action) => {
        state.loading = false;
        state.previousClosedSession = action.payload;
      })
      .addCase(fetchPreviousClosedSession.rejected, (state) => {
        state.loading = false;
      });

    // openSession
    builder
      .addCase(openSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(openSession.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSession = action.payload;
        state.needsSessionSetup = false;
      })
      .addCase(openSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // closeSession
    builder
      .addCase(closeSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(closeSession.fulfilled, (state, action) => {
        state.loading = false;
        state.previousClosedSession = action.payload; // the closed session becomes the previous closed session
        state.currentSession = null;
        state.needsSessionSetup = true;
      })
      .addCase(closeSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearSessionError, resetSessionState } = sessionSlice.actions;
export default sessionSlice.reducer;
