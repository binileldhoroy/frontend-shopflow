import React, { useState, useEffect } from 'react';
import { FileText, BarChart2, PieChart, Shield, Download, Calendar } from 'lucide-react';
import { documentService } from '../../api/services/document.service';

import { customerService } from '../../api/services/customer.service';
import { supplierService } from '../../api/services/supplier.service';

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profit-loss');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    // Only fetch main reports automatically. Account statement needs ID.
    if (!['account-statement', 'tally-export'].includes(activeTab)) {
        fetchReport();
    }
  }, [activeTab, dateRange]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (activeTab === 'profit-loss') {
        const data = await documentService.getProfitLoss(dateRange);
        setReportData(data);
      } else if (activeTab === 'balance-sheet') {
        const data = await documentService.getBalanceSheet({ date: dateRange.end_date });
        setReportData(data);
      } else if (activeTab === 'gstr') {
        const [gstr1Data, gstr2Data] = await Promise.all([
           documentService.getGSTRReport({ ...dateRange, type: 'GSTR1' }),
           documentService.getGSTRReport({ ...dateRange, type: 'GSTR2' })
        ]);
        setReportData({ ...gstr1Data, ...gstr2Data });
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
          setReportData(data);
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
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
    { id: 'balance-sheet', label: 'Balance Sheet', icon: PieChart },
    { id: 'gstr', label: 'GSTR Reports', icon: Shield },
    { id: 'account-statement', label: 'Account Statement', icon: FileText },
    { id: 'tally-export', label: 'Tally Export', icon: Download },
  ];

  return (
    <div className="space-y-4">
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
        <div className="filter-bar !mb-0 !py-2">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
            className="input-field text-sm w-36"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
            className="input-field text-sm w-36"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        {/* Sidebar Navigation */}
        <div className="md:col-span-3 section-card p-3 h-full overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Report Type</p>
          <div className="space-y-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setReportData(null); }}
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
        <div className="md:col-span-9 section-card p-5 h-full overflow-y-auto">
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
                <GSTRDisplay data={reportData} />
              )}
              {activeTab === 'account-statement' && reportData && (
                 <AccountStatementDisplay data={reportData} />
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

const GSTRDisplay = ({ data }: { data: any }) => (
  <div className="space-y-8">

    {/* GSTR-1 Section */}
    <div>
        <h3 className="font-bold text-lg mb-4 text-blue-800 border-b pb-2">GSTR-1 (Sales / Outward Supplies)</h3>
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

export default Reports;
