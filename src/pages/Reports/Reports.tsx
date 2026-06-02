import React, { useState, useEffect } from 'react';
import { FileText, BarChart2, PieChart, Shield, Download, GitBranch, CreditCard, TrendingUp, ClipboardList, Package, Activity } from 'lucide-react';
import { documentService } from '../../api/services/document.service';
import { useBranch } from '../../hooks/useBranch';

import { customerService } from '../../api/services/customer.service';
import { supplierService } from '../../api/services/supplier.service';

const Reports: React.FC = () => {
  const { branches, currentBranch, isOverviewMode, branchesEnabled } = useBranch();
  const [activeTab, setActiveTab] = useState('profit-loss');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [accountStatementData, setAccountStatementData] = useState<any>(null);
  const [reconciliationData, setReconciliationData] = useState<any>(null);
  const [productProfitData, setProductProfitData] = useState<any>(null);
  const [productProfitGroupBy, setProductProfitGroupBy] = useState<'product' | 'category'>('product');
  const [gstr3bData, setGstr3bData] = useState<any>(null);
  const [gstr3bPeriod, setGstr3bPeriod] = useState(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
  });
  const [gstr4Data, setGstr4Data] = useState<any>(null);
  const [gstr4Period, setGstr4Period] = useState('Q1-2025-26');
  const [gstr9Data, setGstr9Data] = useState<any>(null);
  const [gstr9FY, setGstr9FY] = useState('2024-25');
  const [agingType, setAgingType] = useState<'receivables' | 'payables'>('receivables');
  const [agingData, setAgingData] = useState<any>(null);
  const [stockValData, setStockValData] = useState<any>(null);
  const [cashFlowData, setCashFlowData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // In branch mode, always use the current branch; in overview mode use the filter selection
  const effectiveBranchId = branchesEnabled
    ? (isOverviewMode ? selectedBranchId : (currentBranch?.id ?? null))
    : null;

  // Account Statement State
  const [accountParams, setAccountParams] = useState({
     type: 'customer', // or 'supplier'
     id: ''
  });
  const [parties, setParties] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'account-statement') {
        loadParties();
    }
  }, [activeTab, accountParams.type]);

  const loadParties = async () => {
      try {
          if (accountParams.type === 'customer') {
              const res = await customerService.getAll();
              setParties(res);
          } else {
              const res = await supplierService.getAllSuppliers();
              setParties(res);
          }
      } catch (err) {
          console.error("Error loading parties", err);
      }
  };

  useEffect(() => {
    if (!['account-statement', 'tally-export'].includes(activeTab)) {
        fetchReport();
    }
  }, [activeTab, dateRange, effectiveBranchId, productProfitGroupBy, agingType, gstr3bPeriod, gstr4Period, gstr9FY]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const branchParam = effectiveBranchId ? { branch_id: effectiveBranchId } : {};
      if (activeTab === 'profit-loss') {
        const data = await documentService.getProfitLoss({ ...dateRange, ...branchParam });
        setReportData(data);
      } else if (activeTab === 'balance-sheet') {
        const data = await documentService.getBalanceSheet({ date: dateRange.end_date, ...branchParam });
        setReportData(data);
      } else if (activeTab === 'gstr') {
        const [gstr1Data, gstr2Data] = await Promise.all([
           documentService.getGSTRReport({ ...dateRange, type: 'GSTR1', ...branchParam }),
           documentService.getGSTRReport({ ...dateRange, type: 'GSTR2', ...branchParam })
        ]);
        setReportData({ ...gstr1Data, ...gstr2Data });
      } else if (activeTab === 'reconciliation') {
        const data = await documentService.getReconciliation({ ...dateRange, ...branchParam });
        setReconciliationData(data);
      } else if (activeTab === 'product-profit') {
        const data = await documentService.getProductProfit({ ...dateRange, group_by: productProfitGroupBy, ...branchParam });
        setProductProfitData(data);
      } else if (activeTab === 'gstr3b') {
        const data = await documentService.getGSTR3B({ period: gstr3bPeriod, ...branchParam });
        setGstr3bData(data);
      } else if (activeTab === 'gstr4') {
        const data = await documentService.getGSTR4({ period: gstr4Period, ...branchParam });
        setGstr4Data(data);
      } else if (activeTab === 'gstr9') {
        const data = await documentService.getGSTR9({ fy: gstr9FY, ...branchParam });
        setGstr9Data(data);
      } else if (activeTab === 'aging') {
        const data = await documentService.getAgingReport({ type: agingType, as_of_date: dateRange.end_date, ...branchParam });
        setAgingData(data);
      } else if (activeTab === 'stock-valuation') {
        const data = await documentService.getStockValuation({ ...branchParam });
        setStockValData(data);
      } else if (activeTab === 'cash-flow') {
        const data = await documentService.getCashFlow({ ...dateRange, ...branchParam });
        setCashFlowData(data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountStatement = async () => {
      if (!accountParams.id) return;
      setLoading(true);
      try {
          const data = await documentService.getAccountStatement({
              ...dateRange,
              type: accountParams.type,
              id: accountParams.id
          });
          setAccountStatementData(data);
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
      }
  };

  const handleGSTRJsonDownload = async (type: 'gstr1' | 'gstr3b', period: string) => {
    try {
      const resp = await documentService.downloadGSTRJson({ type, period });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR_${type.toUpperCase()}_${period}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) {
      console.error('GSTR JSON download failed', e);
    }
  };

  const handleTallyExport = async () => {
       try {
           const blob = await documentService.getTallyExport(dateRange);
           const url = window.URL.createObjectURL(blob);
           const a = document.createElement('a');
           a.href = url;
           a.download = `tally_export_${dateRange.start_date}_${dateRange.end_date}.xml`;
           document.body.appendChild(a);
           a.click();
           document.body.removeChild(a);
       } catch (error) {
           console.error("Export failed", error);
       }
  };

  const tabs = [
    { id: 'profit-loss', label: 'Profit & Loss', icon: BarChart2 },
    { id: 'product-profit', label: 'Product Profit', icon: TrendingUp },
    { id: 'cash-flow', label: 'Cash Flow', icon: Activity },
    { id: 'reconciliation', label: 'Reconciliation', icon: CreditCard },
    { id: 'balance-sheet', label: 'Balance Sheet', icon: PieChart },
    { id: 'aging', label: 'Aging Report', icon: ClipboardList },
    { id: 'stock-valuation', label: 'Stock Valuation', icon: Package },
    { id: 'gstr', label: 'GSTR-1 & 2', icon: Shield },
    { id: 'gstr3b', label: 'GSTR-3B', icon: Shield },
    { id: 'gstr4', label: 'GSTR-4', icon: Shield },
    { id: 'gstr9', label: 'GSTR-9 (Annual)', icon: Shield },
    { id: 'account-statement', label: 'Account Statement', icon: FileText },
    { id: 'tally-export', label: 'Tally Export', icon: Download },
  ];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h1>Reports</h1>
            <p>Financial reports, GST data, and account statements</p>
          </div>
        </div>
        <div className="filter-bar !py-3 !px-4 !mb-0 flex flex-wrap items-end gap-3">
          {/* Branch filter — overview mode only */}
          {branchesEnabled && isOverviewMode && (
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-gray-400 px-0.5 flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> Branch
              </label>
              <select
                value={selectedBranchId ?? ''}
                onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all bg-white text-gray-700"
              >
                <option value="">All Branches</option>
                {branches.filter(b => b.is_active).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* Branch badge — branch mode */}
          {branchesEnabled && !isOverviewMode && currentBranch && (
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-gray-400 px-0.5 flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> Branch
              </label>
              <div className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                {currentBranch.name}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-400 px-0.5">From</label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all bg-white text-gray-700"
            />
          </div>
          <span className="text-gray-400 text-sm pb-2">—</span>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-gray-400 px-0.5">To</label>
            <input
              type="date"
              value={dateRange.end_date}
              min={dateRange.start_date || undefined}
              onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-all bg-white text-gray-700"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="md:col-span-3 section-card p-3 !overflow-y-auto min-h-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Report Type</p>
          <div className="space-y-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (tab.id !== 'account-statement') setReportData(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-9 section-card p-5 !overflow-y-auto min-h-0">
          {activeTab === 'account-statement' && (
              <div className="mb-6 flex gap-4 p-4 bg-gray-50 rounded-lg border">
                  <select
                     className="bg-white border text-sm rounded-lg p-2.5"
                     value={accountParams.type}
                     onChange={(e) => setAccountParams(prev => ({...prev, type: e.target.value, id: ''}))}
                  >
                      <option value="customer">Customer</option>
                      <option value="supplier">Supplier</option>
                  </select>

                  <select
                     className="bg-white border text-sm rounded-lg p-2.5 flex-1"
                     value={accountParams.id}
                     onChange={(e) => setAccountParams(prev => ({...prev, id: e.target.value}))}
                  >
                      <option value="">Select Party</option>
                      {parties.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>

                  <button
                     onClick={fetchAccountStatement}
                     disabled={!accountParams.id || loading}
                     className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
                  >
                      Generate Statement
                  </button>
              </div>
          )}

          {activeTab === 'tally-export' && (
               <div className="text-center py-20">
                   <Download className="w-16 h-16 mx-auto mb-4 text-green-600" />
                   <h2 className="text-xl font-bold mb-2">Export Data for Tally</h2>
                   <p className="text-gray-500 mb-6">Download XML file containing Sales Vouchers for the selected period.</p>
                   <button
                       onClick={handleTallyExport}
                       className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700"
                   >
                       Download XML
                   </button>
               </div>
          )}

          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'profit-loss' && reportData && (
                <ProfitLossDisplay data={reportData} />
              )}
              {activeTab === 'balance-sheet' && reportData && (
                <BalanceSheetDisplay data={reportData} />
              )}
              {activeTab === 'gstr' && reportData && (
                <GSTRDisplay
                  data={reportData}
                  onDownloadJson={() => {
                    const period = `${String(new Date(dateRange.start_date).getMonth() + 1).padStart(2, '0')}${new Date(dateRange.start_date).getFullYear()}`;
                    handleGSTRJsonDownload('gstr1', period);
                  }}
                />
              )}
              {activeTab === 'account-statement' && accountStatementData && (
                 <AccountStatementDisplay data={accountStatementData} />
              )}
              {activeTab === 'reconciliation' && reconciliationData && (
                <ReconciliationDisplay data={reconciliationData} />
              )}
              {activeTab === 'product-profit' && (
                <ProductProfitDisplay
                  data={productProfitData}
                  groupBy={productProfitGroupBy}
                  onGroupByChange={setProductProfitGroupBy}
                />
              )}
              {activeTab === 'gstr4' && (
                <GSTR4Display data={gstr4Data} period={gstr4Period} onPeriodChange={setGstr4Period} />
              )}
              {activeTab === 'gstr9' && (
                <GSTR9Display data={gstr9Data} fy={gstr9FY} onFYChange={setGstr9FY} />
              )}
              {activeTab === 'gstr3b' && (
                <GSTR3BDisplay
                  data={gstr3bData}
                  period={gstr3bPeriod}
                  onPeriodChange={setGstr3bPeriod}
                  onDownload={() => handleGSTRJsonDownload('gstr3b', gstr3bPeriod)}
                />
              )}
              {activeTab === 'aging' && (
                <AgingDisplay
                  data={agingData}
                  agingType={agingType}
                  onTypeChange={(t) => { setAgingType(t); setAgingData(null); }}
                />
              )}
              {activeTab === 'stock-valuation' && (
                <StockValuationDisplay data={stockValData} />
              )}
              {activeTab === 'cash-flow' && (
                <CashFlowDisplay data={cashFlowData} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ProfitLossDisplay = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-3 gap-6">
      <div className="p-4 bg-green-50 rounded-lg border border-green-100">
        <div className="text-sm text-green-600 font-medium">Total Revenue</div>
        <div className="text-2xl font-bold text-green-700 mt-1">₹{data.revenue?.total_revenue?.toLocaleString()}</div>
      </div>
      <div className="p-4 bg-red-50 rounded-lg border border-red-100">
        <div className="text-sm text-red-600 font-medium">Total Expenses</div>
        <div className="text-2xl font-bold text-red-700 mt-1">₹{data.expenses?.total_expenses?.toLocaleString()}</div>
      </div>
      <div className={`p-4 rounded-lg border ${data.net_profit >= 0 ? 'bg-primary-50 border-primary-100' : 'bg-orange-50 border-orange-100'}`}>
        <div className={`text-sm font-medium ${data.net_profit >= 0 ? 'text-primary-600' : 'text-orange-600'}`}>Net Profit</div>
        <div className={`text-2xl font-bold mt-1 ${data.net_profit >= 0 ? 'text-primary-700' : 'text-orange-700'}`}>
          ₹{data.net_profit?.toLocaleString()}
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-8">
       <div>
         <h3 className="font-bold mb-4 border-b pb-2">Income</h3>
         <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
            <span>Sales Revenue</span>
            <span className="font-medium">₹{data.revenue?.sales?.toLocaleString()}</span>
         </div>
       </div>
       <div>
         <h3 className="font-bold mb-4 border-b pb-2">Expenses</h3>
         <div className="flex justify-between py-2 border-b border-gray-100">
            <span>COGS (Purchases)</span>
            <span className="font-medium">₹{data.cogs?.total_cogs?.toLocaleString()}</span>
         </div>
         <div className="flex justify-between py-2 border-b border-gray-100">
            <span>Direct Expenses</span>
            <span className="font-medium">₹{data.expenses?.direct_expenses?.toLocaleString()}</span>
         </div>
       </div>
    </div>
  </div>
);

const BalanceSheetDisplay = ({ data }: { data: any }) => (
  <div className="space-y-8">
     <div className="grid grid-cols-2 gap-12">
        {/* Assets */}
        <div className="space-y-4">
           <h3 className="text-lg font-bold text-gray-800 border-b-2 border-green-500 pb-2">Assets</h3>

           <div className="space-y-2">
              <div className="flex justify-between p-3 bg-gray-50 rounded">
                 <span className="text-gray-600">Current Stock Value</span>
                 <span className="font-medium">₹{data.assets?.stock_value?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded">
                 <span className="text-gray-600">Cash & Bank Balance</span>
                 <span className="font-medium">₹{data.assets?.cash_bank?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded">
                 <span className="text-gray-600">Accounts Receivable</span>
                 <span className="font-medium">₹{data.assets?.receivables?.toLocaleString()}</span>
              </div>
           </div>

           <div className="flex justify-between p-4 bg-green-50 text-green-800 font-bold rounded text-lg mt-4">
              <span>Total Assets</span>
              <span>₹{data.assets?.total_assets?.toLocaleString()}</span>
           </div>
        </div>

        {/* Liabilities */}
        <div className="space-y-4">
           <h3 className="text-lg font-bold text-gray-800 border-b-2 border-red-500 pb-2">Liabilities & Equity</h3>

           <div className="space-y-2">
              <div className="flex justify-between p-3 bg-gray-50 rounded">
                 <span className="text-gray-600">Accounts Payable</span>
                 <span className="font-medium">₹{data.liabilities?.payables?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded">
                 <span className="text-gray-600">Tax Payable (GST)</span>
                 <span className="font-medium">₹{data.liabilities?.tax_payable?.toLocaleString()}</span>
              </div>
           </div>

           <div className="flex justify-between p-3 bg-blue-50 text-blue-800 font-bold rounded mt-4">
              <span>Owner's Equity</span>
              <span>₹{data.equity?.toLocaleString()}</span>
           </div>

           <div className="flex justify-between p-4 bg-red-50 text-red-800 font-bold rounded text-lg mt-4">
              <span>Total Liabilities & Equity</span>
              <span>₹{(data.liabilities?.total_liabilities + data.equity)?.toLocaleString()}</span>
           </div>
        </div>
     </div>
  </div>
);

const GSTRDisplay = ({ data, onDownloadJson }: { data: any; onDownloadJson?: () => void }) => (
  <div className="space-y-8">

    {/* GSTR-1 Section */}
    <div>
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h3 className="font-bold text-lg text-blue-800">GSTR-1 (Sales / Outward Supplies)</h3>
          {onDownloadJson && (
            <button onClick={onDownloadJson} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-3.5 h-3.5" /> Download JSON for GSTN
            </button>
          )}
        </div>
        {data.b2b && data.b2b.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">GSTIN</th>
                  <th className="px-4 py-3 text-left">Inv No.</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Taxable Value</th>
                  <th className="px-4 py-3 text-right">Tax Amount</th>
                  <th className="px-4 py-3 text-right">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.b2b.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-mono">{item.gstin}</td>
                    <td className="px-4 py-2">{item.invoice_no}</td>
                    <td className="px-4 py-2">{item.date}</td>
                    <td className="px-4 py-2 text-right">₹{item.taxable_value}</td>
                    <td className="px-4 py-2 text-right">₹{item.tax_amount}</td>
                    <td className="px-4 py-2 text-right font-medium">₹{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            No Sales Data Found
          </div>
        )}
    </div>

    {/* GSTR-2 Section */}
    <div>
        <h3 className="font-bold text-lg mb-4 text-green-800 border-b pb-2">GSTR-2 (Purchases / Inward Supplies)</h3>
        <div className="flex gap-4 mb-4">
             <button
                onClick={() => documentService.getGSTRReport({ ...data.filters, type: 'GSTR2' }).then(() => window.location.reload()) }
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
             >
                Load GSTR-2 Data
             </button>
             {/* Note: Ideally this would be fetched automatically or via prop update, but keeping simple for now */}
        </div>

        {data.purchases && data.purchases.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Supplier GSTIN</th>
                  <th className="px-4 py-3 text-left">Supplier Name</th>
                  <th className="px-4 py-3 text-left">Inv No.</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Taxable</th>
                  <th className="px-4 py-3 text-right">IGST</th>
                  <th className="px-4 py-3 text-right">CGST</th>
                  <th className="px-4 py-3 text-right">SGST</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.purchases.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-mono">{item.gstin}</td>
                    <td className="px-4 py-2">{item.supplier}</td>
                    <td className="px-4 py-2">{item.invoice_no}</td>
                    <td className="px-4 py-2">{item.date}</td>
                    <td className="px-4 py-2 text-right">₹{item.taxable_value}</td>
                    <td className="px-4 py-2 text-right">₹{item.igst || 0}</td>
                    <td className="px-4 py-2 text-right">₹{item.cgst || 0}</td>
                    <td className="px-4 py-2 text-right">₹{item.sgst || 0}</td>
                    <td className="px-4 py-2 text-right font-medium">₹{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            No Purchase Data Found (Select 'GSTR Reports' again or ensure data exists)
          </div>
        )}
    </div>

  </div>
);

const AccountStatementDisplay = ({ data }: { data: any }) => (
    <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-bold text-gray-800">{data.party?.name}</h3>
            <p className="text-sm text-gray-600">{data.party?.phone} | {data.party?.email}</p>
        </div>

        <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Description</th>
                        <th className="px-4 py-3 text-left">Ref No.</th>
                        <th className="px-4 py-3 text-right text-red-600">Debit</th>
                        <th className="px-4 py-3 text-right text-green-600">Credit</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {data.transactions?.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{item.date}</td>
                            <td className="px-4 py-2">{item.description}</td>
                            <td className="px-4 py-2">{item.ref_number}</td>
                            <td className="px-4 py-2 text-right">{item.debit > 0 ? `₹${item.debit.toLocaleString()}` : '-'}</td>
                            <td className="px-4 py-2 text-right">{item.credit > 0 ? `₹${item.credit.toLocaleString()}` : '-'}</td>
                            <td className="px-4 py-2 text-right font-medium">₹{item.balance.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold border-t">
                     <tr>
                         <td colSpan={5} className="px-4 py-3 text-right">Closing Balance</td>
                         <td className="px-4 py-3 text-right">₹{data.closing_balance?.toLocaleString()}</td>
                     </tr>
                </tfoot>
            </table>
        </div>
    </div>
);

const ReconciliationDisplay = ({ data }: { data: any }) => {
  const modeLabels: Record<string, string> = { cash: 'Cash', card: 'Card', upi: 'UPI / GPay', net_banking: 'Net Banking', bank_transfer: 'Bank Transfer', other: 'Other' };
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-lg mb-3 border-b pb-2">Payment Mode Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(data.breakdown || {}).map(([mode, info]: [string, any]) => (
            info.count > 0 && (
              <div key={mode} className="p-4 bg-gray-50 rounded-lg border">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{modeLabels[mode] || mode}</div>
                <div className="text-2xl font-bold text-gray-800 mt-1">₹{info.total?.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-0.5">{info.count} transaction{info.count !== 1 ? 's' : ''}</div>
              </div>
            )
          ))}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-xs text-green-600 font-medium uppercase tracking-wide">Grand Total</div>
            <div className="text-2xl font-bold text-green-700 mt-1">₹{data.grand_total?.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {data.sessions && data.sessions.length > 0 && (
        <div>
          <h3 className="font-bold text-lg mb-3 border-b pb-2">Register Sessions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Cashier</th>
                  <th className="px-4 py-3 text-left">Opened</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Opening Bal</th>
                  <th className="px-4 py-3 text-right">Total Cash</th>
                  <th className="px-4 py-3 text-right">Closing Bal</th>
                  <th className="px-4 py-3 text-right">Discrepancy</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.sessions.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{s.cashier}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{s.opened_at ? new Date(s.opened_at).toLocaleString() : '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.status === 'closed' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">₹{s.opening_balance?.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">₹{s.total_cash?.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">₹{s.closing_balance?.toLocaleString()}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${s.cash_discrepancy < 0 ? 'text-red-600' : s.cash_discrepancy > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      {s.cash_discrepancy > 0 ? '+' : ''}₹{s.cash_discrepancy?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const ProductProfitDisplay = ({ data, groupBy, onGroupByChange }: { data: any; groupBy: 'product' | 'category'; onGroupByChange: (v: 'product' | 'category') => void }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="font-bold text-lg">Gross Profit by {groupBy === 'category' ? 'Category' : 'Product'}</h3>
      <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
        <button
          onClick={() => onGroupByChange('product')}
          className={`px-4 py-2 font-medium transition-colors ${groupBy === 'product' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          By Product
        </button>
        <button
          onClick={() => onGroupByChange('category')}
          className={`px-4 py-2 font-medium transition-colors ${groupBy === 'category' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          By Category
        </button>
      </div>
    </div>

    {data?.data && data.data.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border rounded-lg overflow-hidden">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">{groupBy === 'category' ? 'Category' : 'Product'}</th>
              {groupBy === 'product' && <th className="px-4 py-3 text-left text-gray-400">SKU</th>}
              <th className="px-4 py-3 text-right">Units Sold</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 text-right">COGS</th>
              <th className="px-4 py-3 text-right">Gross Profit</th>
              <th className="px-4 py-3 text-right">Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.data.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{row.name}</td>
                {groupBy === 'product' && <td className="px-4 py-2 text-gray-400 font-mono text-xs">{row.sku}</td>}
                <td className="px-4 py-2 text-right">{row.units_sold?.toLocaleString()}</td>
                <td className="px-4 py-2 text-right">₹{row.revenue?.toLocaleString()}</td>
                <td className="px-4 py-2 text-right text-red-600">₹{row.cogs?.toLocaleString()}</td>
                <td className={`px-4 py-2 text-right font-bold ${row.gross_profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  ₹{row.gross_profit?.toLocaleString()}
                </td>
                <td className={`px-4 py-2 text-right font-semibold ${row.margin_pct >= 20 ? 'text-green-600' : row.margin_pct >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {row.margin_pct?.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="text-center py-12 text-gray-400">
        <TrendingUp className="w-10 h-10 mx-auto mb-2 text-gray-200" />
        <p>No sales data found for the selected period.</p>
        <p className="text-xs mt-1">Make sure products have cost prices set.</p>
      </div>
    )}
  </div>
);

// ─── GSTR-4 Display (Composition Scheme) ────────────────────────────────────
const GSTR4Display = ({ data, period, onPeriodChange }: { data: any; period: string; onPeriodChange: (p: string) => void }) => {
  const quarters = ['Q1-2025-26','Q2-2025-26','Q3-2025-26','Q4-2025-26','Q1-2024-25','Q2-2024-25','Q3-2024-25','Q4-2024-25'];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">GSTR-4 — Composition Scheme Quarterly Return</h3>
        <select value={period} onChange={e => onPeriodChange(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-400">
          {quarters.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
      </div>
      {!data ? (
        <div className="text-center py-12 text-gray-400"><Shield className="w-10 h-10 mx-auto mb-2 text-gray-200" /><p>Select a quarter to load GSTR-4</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border bg-blue-50">
            <div className="text-xs text-blue-600 font-medium uppercase">Total Turnover</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">₹{Number(data.summary?.total_turnover).toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg border bg-purple-50">
            <div className="text-xs text-purple-600 font-medium uppercase">Composition Rate</div>
            <div className="text-2xl font-bold text-purple-700 mt-1">{data.composition_rate}%</div>
          </div>
          <div className="p-4 rounded-lg border bg-red-50">
            <div className="text-xs text-red-600 font-medium uppercase">Tax Payable</div>
            <div className="text-2xl font-bold text-red-700 mt-1">₹{Number(data.summary?.flat_tax_payable).toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── GSTR-9 Display (Annual Return) ─────────────────────────────────────────
const GSTR9Display = ({ data, fy, onFYChange }: { data: any; fy: string; onFYChange: (f: string) => void }) => {
  const years = ['2024-25','2023-24','2022-23'];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">GSTR-9 — Annual Return</h3>
        <select value={fy} onChange={e => onFYChange(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-400">
          {years.map(y => <option key={y} value={y}>FY {y}</option>)}
        </select>
      </div>
      {!data ? (
        <div className="text-center py-12 text-gray-400"><Shield className="w-10 h-10 mx-auto mb-2 text-gray-200" /><p>Select a financial year to load GSTR-9</p></div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Taxable Outward', value: data.table4?.taxable_value, color: 'blue' },
              { label: 'Total Output Tax', value: data.table4?.total_tax, color: 'indigo' },
              { label: 'Total ITC', value: data.table6_itc?.total_itc, color: 'green' },
              { label: 'Net Payable', value: data.table9?.net_payable, color: 'red' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`p-4 rounded-lg border bg-${color}-50 border-${color}-100`}>
                <div className={`text-xs text-${color}-600 font-medium uppercase tracking-wide`}>{label}</div>
                <div className={`text-xl font-bold text-${color}-700 mt-1`}>₹{Number(value || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
          {data.monthly_breakdown?.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Month</th>
                    <th className="px-4 py-3 text-right">Taxable</th>
                    <th className="px-4 py-3 text-right">IGST</th>
                    <th className="px-4 py-3 text-right">CGST</th>
                    <th className="px-4 py-3 text-right">SGST</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.monthly_breakdown.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{row.month}</td>
                      <td className="px-4 py-2 text-right">₹{Number(row.taxable_value).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-blue-600">₹{Number(row.igst).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">₹{Number(row.cgst).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">₹{Number(row.sgst).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-semibold">₹{Number(row.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── GSTR-3B Display ────────────────────────────────────────────────────────
const GSTR3BDisplay = ({
  data, period, onPeriodChange, onDownload,
}: { data: any; period: string; onPeriodChange: (p: string) => void; onDownload: () => void }) => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const curYear = new Date().getFullYear();
  const periodOptions: { label: string; value: string }[] = [];
  for (let y = curYear; y >= curYear - 2; y--) {
    for (let m = 12; m >= 1; m--) {
      periodOptions.push({ label: `${months[m-1]} ${y}`, value: `${String(m).padStart(2,'0')}${y}` });
    }
  }

  const Row = ({ label, igst, cgst, sgst, total, bold }: { label: string; igst: number; cgst: number; sgst: number; total: number; bold?: boolean }) => (
    <tr className={bold ? 'font-bold bg-gray-50' : 'hover:bg-gray-50'}>
      <td className="px-4 py-2 text-left">{label}</td>
      <td className="px-4 py-2 text-right">₹{igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td className="px-4 py-2 text-right">₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td className="px-4 py-2 text-right">₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td className="px-4 py-2 text-right font-semibold">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">GSTR-3B — Monthly Summary Return</h3>
        <div className="flex items-center gap-3">
          <select value={period} onChange={e => onPeriodChange(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-400">
            {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {data && (
            <button onClick={onDownload} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-3.5 h-3.5" /> Download JSON
            </button>
          )}
        </div>
      </div>

      {!data ? (
        <div className="text-center py-12 text-gray-400"><Shield className="w-10 h-10 mx-auto mb-2 text-gray-200" /><p>Select a period to load GSTR-3B</p></div>
      ) : (
        <div className="space-y-6">
          {/* Table 3.1 — Outward Supplies */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">3.1 — Outward Taxable Supplies</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">IGST (₹)</th>
                    <th className="px-4 py-3 text-right">CGST (₹)</th>
                    <th className="px-4 py-3 text-right">SGST (₹)</th>
                    <th className="px-4 py-3 text-right">Total Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <Row label="3.1(a) Taxable supplies" igst={data.outward_supplies['3_1_a'].igst} cgst={data.outward_supplies['3_1_a'].cgst} sgst={data.outward_supplies['3_1_a'].sgst} total={data.outward_supplies['3_1_a'].total_tax} />
                  <Row label="3.1(b) Zero rated" igst={0} cgst={0} sgst={0} total={0} />
                  <Row label="Total Output Tax" igst={data.outward_supplies.total.igst} cgst={data.outward_supplies.total.cgst} sgst={data.outward_supplies.total.sgst} total={data.outward_supplies.total.total_tax} bold />
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 4 — ITC */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">4 — Eligible ITC</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">IGST (₹)</th>
                    <th className="px-4 py-3 text-right">CGST (₹)</th>
                    <th className="px-4 py-3 text-right">SGST (₹)</th>
                    <th className="px-4 py-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <Row label="4(A)(5) All other ITC" igst={data.itc['4_A_5'].igst} cgst={data.itc['4_A_5'].cgst} sgst={data.itc['4_A_5'].sgst} total={data.itc['4_A_5'].total} />
                  <Row label="Total ITC" igst={data.itc['4_A_5'].igst} cgst={data.itc['4_A_5'].cgst} sgst={data.itc['4_A_5'].sgst} total={data.itc.total} bold />
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Tax Payable */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Net IGST', value: data.tax_payable.igst, color: 'blue' },
              { label: 'Net CGST', value: data.tax_payable.cgst, color: 'indigo' },
              { label: 'Net SGST', value: data.tax_payable.sgst, color: 'purple' },
              { label: 'Total Payable', value: data.tax_payable.total, color: 'red' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`p-4 rounded-lg border bg-${color}-50 border-${color}-100`}>
                <div className={`text-xs text-${color}-600 font-medium uppercase tracking-wide`}>{label}</div>
                <div className={`text-xl font-bold text-${color}-700 mt-1`}>₹{Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Aging Report Display ────────────────────────────────────────────────────
const AgingDisplay = ({
  data, agingType, onTypeChange,
}: { data: any; agingType: 'receivables' | 'payables'; onTypeChange: (t: 'receivables' | 'payables') => void }) => {
  const bucketColors: Record<string, string> = {
    '0-30 days': 'text-green-700 bg-green-50',
    '31-60 days': 'text-yellow-700 bg-yellow-50',
    '61-90 days': 'text-orange-700 bg-orange-50',
    '91+ days': 'text-red-700 bg-red-50',
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Aging Report</h3>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
          {(['receivables', 'payables'] as const).map(t => (
            <button key={t} onClick={() => onTypeChange(t)} className={`px-4 py-2 font-medium transition-colors capitalize ${agingType === t ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{t}</button>
          ))}
        </div>
      </div>

      {!data ? (
        <div className="text-center py-12 text-gray-400"><ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-200" /><p>Loading…</p></div>
      ) : (
        <>
          {/* Bucket summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(data.bucket_totals).map(([bucket, total]: [string, any]) => (
              <div key={bucket} className={`p-4 rounded-lg border ${bucketColors[bucket] || 'text-gray-700 bg-gray-50'}`}>
                <div className="text-xs font-semibold uppercase tracking-wide">{bucket}</div>
                <div className="text-xl font-bold mt-1">₹{Number(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
            ))}
          </div>

          {/* Detail table */}
          {data.rows.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Party</th>
                    <th className="px-4 py-3 text-left">Ref No.</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right font-semibold">Outstanding</th>
                    <th className="px-4 py-3 text-center">Days</th>
                    <th className="px-4 py-3 text-center">Bucket</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.rows.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{row.party}</td>
                      <td className="px-4 py-2 text-xs font-mono text-gray-500">{row.ref_number}</td>
                      <td className="px-4 py-2 text-gray-500">{row.date}</td>
                      <td className="px-4 py-2 text-right">₹{Number(row.total).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-green-600">₹{Number(row.paid).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-bold text-red-600">₹{Number(row.outstanding).toLocaleString()}</td>
                      <td className="px-4 py-2 text-center">{row.days_overdue}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bucketColors[row.bucket] || ''}`}>{row.bucket}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold border-t">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right">Grand Total Outstanding</td>
                    <td className="px-4 py-3 text-right text-red-700">₹{Number(data.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg">No overdue {agingType} found</div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Stock Valuation Display ─────────────────────────────────────────────────
const StockValuationDisplay = ({ data }: { data: any }) => (
  <div className="space-y-5">
    <div className="flex items-center justify-between">
      <h3 className="font-bold text-lg">Stock Valuation (at Cost)</h3>
      {data && (
        <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-xs text-green-600 font-medium">Total Inventory Value</span>
          <div className="text-xl font-bold text-green-700">₹{Number(data.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
      )}
    </div>

    {!data ? (
      <div className="text-center py-12 text-gray-400"><Package className="w-10 h-10 mx-auto mb-2 text-gray-200" /><p>Loading…</p></div>
    ) : data.categories.length === 0 ? (
      <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg">No stock data found</div>
    ) : (
      <div className="space-y-4">
        {data.categories.map((cat: any) => (
          <div key={cat.category_id} className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
              <span className="font-semibold text-gray-700">{cat.category_name}</span>
              <span className="font-bold text-gray-800">₹{Number(cat.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-400 bg-white">
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-left text-gray-300">SKU</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Cost/Unit</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cat.items.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-800">{item.product_name}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-400">{item.sku}</td>
                    <td className="px-4 py-2 text-right">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-2 text-right text-gray-600">₹{Number(item.cost_price).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-semibold">₹{Number(item.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Cash Flow Display ────────────────────────────────────────────────────────
const CashFlowDisplay = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <h3 className="font-bold text-lg">Cash Flow Statement</h3>

    {!data ? (
      <div className="text-center py-12 text-gray-400"><Activity className="w-10 h-10 mx-auto mb-2 text-gray-200" /><p>Loading…</p></div>
    ) : (
      <>
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border bg-green-50 border-green-100">
            <div className="text-xs text-green-600 font-medium uppercase tracking-wide">Cash Received (Sales)</div>
            <div className="text-2xl font-bold text-green-700 mt-1">₹{Number(data.operating.cash_in).toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg border bg-red-50 border-red-100">
            <div className="text-xs text-red-600 font-medium uppercase tracking-wide">Cash Paid Out</div>
            <div className="text-2xl font-bold text-red-700 mt-1">₹{Number(data.operating.total_cash_out).toLocaleString()}</div>
          </div>
          <div className={`p-4 rounded-lg border ${data.operating.net_operating >= 0 ? 'bg-primary-50 border-primary-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className={`text-xs font-medium uppercase tracking-wide ${data.operating.net_operating >= 0 ? 'text-primary-600' : 'text-orange-600'}`}>Net Operating Cash</div>
            <div className={`text-2xl font-bold mt-1 ${data.operating.net_operating >= 0 ? 'text-primary-700' : 'text-orange-700'}`}>₹{Number(data.operating.net_operating).toLocaleString()}</div>
          </div>
        </div>

        {/* Operating section */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide border-b pb-2">A. Operating Activities</h4>
          <div className="space-y-2">
            {[
              { label: 'Cash received from customers', value: data.operating.cash_in, positive: true },
              { label: 'Cash paid to suppliers', value: -data.operating.cash_out_purchases, positive: false },
              { label: 'Cash paid for expenses', value: -data.operating.cash_out_expenses, positive: false },
            ].map(({ label, value, positive }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">{label}</span>
                <span className={`font-medium ${positive ? 'text-green-700' : 'text-red-600'}`}>
                  {value >= 0 ? '+' : ''}₹{Math.abs(value).toLocaleString()}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center py-2 font-bold">
              <span>Net Operating Cash Flow</span>
              <span className={data.operating.net_operating >= 0 ? 'text-green-700' : 'text-red-600'}>
                ₹{Number(data.operating.net_operating).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Monthly breakdown */}
        {data.monthly_breakdown.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide border-b pb-2">Monthly Breakdown</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Month</th>
                    <th className="px-4 py-3 text-right text-green-700">Cash In</th>
                    <th className="px-4 py-3 text-right text-red-600">Supplier Payments</th>
                    <th className="px-4 py-3 text-right text-red-500">Expenses</th>
                    <th className="px-4 py-3 text-right font-semibold">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.monthly_breakdown.map((row: any) => (
                    <tr key={row.month} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{row.month}</td>
                      <td className="px-4 py-2 text-right text-green-600">₹{Number(row.cash_in).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-red-500">₹{Number(row.cash_out_purchases).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-red-400">₹{Number(row.cash_out_expenses).toLocaleString()}</td>
                      <td className={`px-4 py-2 text-right font-bold ${row.net >= 0 ? 'text-green-700' : 'text-red-600'}`}>₹{Number(row.net).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    )}
  </div>
);

export default Reports;
