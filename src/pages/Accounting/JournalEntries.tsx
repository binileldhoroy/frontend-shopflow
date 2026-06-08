import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';
import { accountingService } from '@api/services/accounting.service';
import { FileText, Plus, CheckCircle, Trash2, X } from 'lucide-react';
import DeleteConfirmModal from '../../components/common/DeleteConfirmModal/DeleteConfirmModal';
import Modal from '../../components/common/Modal/Modal';

interface JELine { account_id: string; debit_amount: string; credit_amount: string; narration: string; }
const emptyLine = (): JELine => ({ account_id: '', debit_amount: '', credit_amount: '', narration: '' });

const JournalEntries: React.FC = () => {
  const dispatch = useAppDispatch();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  // Create form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [jeDate, setJeDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<JELine[]>([emptyLine(), emptyLine()]);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await accountingService.getJournalEntries({ page_size: 30 });
      setEntries(data.results || data);
      
    } catch {
      dispatch(addNotification({ message: 'Failed to load journal entries', type: 'error' }));
    } finally { setLoading(false); }
  }, [dispatch]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    accountingService.getAccounts().then(d => setAccounts(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  }, []);

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit_amount) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const updateLine = (i: number, field: keyof JELine, val: string) => {
    setLines(p => { const n = [...p]; (n[i] as any)[field] = val; return n; });
  };

  const handleSaveEntry = async () => {
    if (!narration.trim()) { dispatch(addNotification({ message: 'Enter a narration', type: 'error' })); return; }
    if (!isBalanced) { dispatch(addNotification({ message: 'Debits and credits must be equal and non-zero', type: 'error' })); return; }
    const validLines = lines.filter(l => l.account_id && (parseFloat(l.debit_amount) > 0 || parseFloat(l.credit_amount) > 0));
    if (validLines.length < 2) { dispatch(addNotification({ message: 'Need at least 2 lines', type: 'error' })); return; }
    setSaving(true);
    try {
      await accountingService.createJournalEntry({
        date: jeDate, narration,
        lines: validLines.map(l => ({
          account_id: parseInt(l.account_id),
          debit_amount: parseFloat(l.debit_amount) || 0,
          credit_amount: parseFloat(l.credit_amount) || 0,
          narration: l.narration,
        })),
      });
      dispatch(addNotification({ message: 'Journal entry created', type: 'success' }));
      setShowCreateModal(false);
      setNarration(''); setJeDate(new Date().toISOString().split('T')[0]);
      setLines([emptyLine(), emptyLine()]);
      fetch();
    } catch (e: any) {
      dispatch(addNotification({ message: e?.response?.data?.error || 'Failed to save', type: 'error' }));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await accountingService.deleteJournalEntry(selected.id);
      dispatch(addNotification({ message: 'Journal entry deleted', type: 'success' }));
      setShowDeleteModal(false);
      fetch();
    } catch (e: any) {
      dispatch(addNotification({ message: e?.response?.data?.error || 'Cannot delete posted entry', type: 'error' }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon"><FileText className="w-5 h-5" /></div>
          <div><h1>Journal Entries</h1><p>Manual accounting adjustments (double-entry)</p></div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 inline mr-1.5" />New Entry
        </button>
      </div>

      <div className="section-card flex flex-col" style={{ height: 'calc(var(--viewport-height) - 220px)', minHeight: '300px' }}>
        {loading ? (
          <div className="loading-center flex-1"><div className="spinner" /></div>
        ) : entries.length === 0 ? (
          <div className="empty-state flex-1">
            <div className="empty-state-icon"><FileText className="w-6 h-6" /></div>
            <p className="text-gray-700 font-medium">No journal entries yet</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 p-2">
            {entries.map(je => (
              <div key={je.id} className="border rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === je.id ? null : je.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-gray-700">{je.entry_number}</span>
                    <span className="text-sm text-gray-500">{je.date}</span>
                    <span className="text-sm text-gray-700 truncate max-w-xs">{je.narration}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {je.is_posted && <span className="badge badge-success flex items-center gap-1"><CheckCircle className="w-3 h-3" />Posted</span>}
                    <span className="text-sm font-semibold text-gray-700">Dr ₹{Number(je.total_debit).toLocaleString()}</span>
                    {!je.is_posted && (
                      <button className="action-btn action-btn-danger" onClick={e => { e.stopPropagation(); setSelected(je); setShowDeleteModal(true); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {expandedId === je.id && (
                  <div className="border-t bg-gray-50 px-4 py-3">
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-gray-400 uppercase"><th className="text-left py-1">Account</th><th className="text-right py-1">Debit</th><th className="text-right py-1">Credit</th></tr></thead>
                      <tbody className="divide-y">
                        {je.lines.map((l: any, i: number) => (
                          <tr key={i}>
                            <td className="py-1.5">{l.account_code} — {l.account_name}</td>
                            <td className="text-right py-1.5">{Number(l.debit_amount) > 0 ? `₹${Number(l.debit_amount).toLocaleString()}` : '—'}</td>
                            <td className="text-right py-1.5">{Number(l.credit_amount) > 0 ? `₹${Number(l.credit_amount).toLocaleString()}` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showDeleteModal && selected && (
        <DeleteConfirmModal show={showDeleteModal} title="Delete Journal Entry" message={`Delete entry ${selected.entry_number}? This cannot be undone.`} onConfirm={handleDelete} onHide={() => { setShowDeleteModal(false); setSelected(null); }} />
      )}

      {/* Create Journal Entry Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} title="New Journal Entry" size="xl">
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" className="input-field w-full" value={jeDate} onChange={e => setJeDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Narration *</label>
              <input className="input-field w-full" placeholder="Description of this entry" value={narration} onChange={e => setNarration(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Lines (Dr = Debit, Cr = Credit)</label>
              <button onClick={() => setLines(p => [...p, emptyLine()])} className="text-xs text-primary-600 font-medium flex items-center gap-1"><Plus className="w-3 h-3" />Add Line</button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left">Account</th>
                    <th className="px-3 py-2 text-right w-32">Debit (Dr) ₹</th>
                    <th className="px-3 py-2 text-right w-32">Credit (Cr) ₹</th>
                    <th className="px-3 py-2 text-left">Narration</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <select className="input-field w-full text-sm py-1" value={line.account_id} onChange={e => updateLine(i, 'account_id', e.target.value)}>
                          <option value="">Select account</option>
                          {['asset','liability','income','expense','equity'].map(type => (
                            <optgroup key={type} label={type.toUpperCase()}>
                              {accounts.filter(a => a.account_type === type).map(a => (
                                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" step="0.01" className="input-field w-full text-sm py-1 text-right" placeholder="0.00"
                          value={line.debit_amount}
                          onChange={e => { updateLine(i, 'debit_amount', e.target.value); if (e.target.value) updateLine(i, 'credit_amount', ''); }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" step="0.01" className="input-field w-full text-sm py-1 text-right" placeholder="0.00"
                          value={line.credit_amount}
                          onChange={e => { updateLine(i, 'credit_amount', e.target.value); if (e.target.value) updateLine(i, 'debit_amount', ''); }}
                        />
                      </td>
                      <td className="px-3 py-2"><input className="input-field w-full text-sm py-1" value={line.narration} onChange={e => updateLine(i, 'narration', e.target.value)} /></td>
                      <td className="px-3 py-2">{lines.length > 2 && <button onClick={() => setLines(p => p.filter((_, idx) => idx !== i))} className="p-1 text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className={`border-t ${isBalanced ? 'bg-green-50' : totalDebit > 0 || totalCredit > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <tr>
                    <td className="px-3 py-2 text-sm font-semibold">Totals</td>
                    <td className="px-3 py-2 text-right font-bold">₹{totalDebit.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-bold">₹{totalCredit.toFixed(2)}</td>
                    <td colSpan={2} className={`px-3 py-2 text-xs font-semibold ${isBalanced ? 'text-green-700' : 'text-red-600'}`}>
                      {isBalanced ? '✓ Balanced' : `Difference: ₹${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCreateModal(false)} className="btn btn-outline-secondary">Cancel</button>
            <button onClick={handleSaveEntry} disabled={saving || !isBalanced} className="btn btn-primary disabled:opacity-50">
              {saving ? 'Saving…' : 'Create Entry'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default JournalEntries;
