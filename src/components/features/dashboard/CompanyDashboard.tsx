import React, { useEffect, useState } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { useAuth } from '@hooks/useAuth';
import { fetchProfile } from '@store/slices/authSlice';
import { fetchCurrentCompany } from '@store/slices/companySlice';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays } from 'date-fns';
import axiosInstance from '@api/axios';
import { API_ENDPOINTS } from '@api/endpoints';


interface DailySalesData {
  total_sales: number;
  total_orders: number;
}

interface Product {
  id: number;
  name: string;
  category_name?: string;
  is_active: boolean;
  quantity?: number;
  reorder_level?: number;
}

interface StockItem {
  product: number;
  product_name: string;
  quantity: number;
  reorder_level: number;
}

interface RecentSale {
  id: number;
  order_number: string;
  customer_name: string | null;
  total_amount: string;
  payment_method: string;
  sale_date: string;
  status: string;
}

const CompanyDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [dailySales, setDailySales] = useState<DailySalesData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProductCount, setTotalProductCount] = useState<number>(0);
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch profile once on mount if not already loaded
  useEffect(() => {
    if (!user) {
      dispatch(fetchProfile());
    }
  }, []);

  // Fetch company once when user becomes available
  useEffect(() => {
    if (user) {
      dispatch(fetchCurrentCompany());
    }
  }, [user?.id]);

  // Fetch dashboard data once on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch daily sales report
      const salesResponse = await axiosInstance.get(API_ENDPOINTS.SALES.DAILY_REPORT);
      setDailySales(salesResponse.data);

      // Fetch sales trend
      const trendResponse = await axiosInstance.get(API_ENDPOINTS.SALES.TREND);
      // Map API data to chart format
      const trendData = trendResponse.data.map((item: any) => ({
        name: format(new Date(item.date), 'EEE'),
        date: item.date,
        sales: item.orders,
        revenue: parseFloat(item.revenue || '0')
      }));
      setTrendData(trendData);

      // Fetch products (large page_size to load all for category/active breakdown)
      const productsResponse = await axiosInstance.get(API_ENDPOINTS.PRODUCTS.LIST, {
        params: { page_size: 9999 },
      });
      const productList = productsResponse.data.results || productsResponse.data || [];
      setProducts(productList);
      setTotalProductCount(productsResponse.data.count ?? productList.length);

      // Fetch low stock items
      const lowStockResponse = await axiosInstance.get(API_ENDPOINTS.INVENTORY.LOW_STOCK);
      setLowStockItems(lowStockResponse.data.results || lowStockResponse.data || []);

      // Fetch recent sales (last 5 completed)
      const recentSalesResponse = await axiosInstance.get(API_ENDPOINTS.SALES.LIST, {
        params: { page_size: 5, status: 'completed', ordering: '-sale_date' },
      });
      setRecentSales(recentSalesResponse.data.results || recentSalesResponse.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate last 7 days data for trend (placeholder fallback)
  const last7Days = trendData.length > 0 ? trendData : Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return {
      name: format(date, 'EEE'),
      date: format(date, 'yyyy-MM-dd'),
      sales: 0,
      revenue: 0,
    };
  });

  const activeProducts = products.filter((p) => p.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-[#0F1F18] rounded-xl p-5 flex items-center justify-between overflow-hidden relative">
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-emerald-500/10 rounded-full pointer-events-none" />
        <div className="absolute right-16 bottom-0 w-20 h-20 bg-green-500/10 rounded-full pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-xl font-bold text-white mb-0.5">
            Welcome back, {user?.first_name || user?.username}!
          </h1>
          <p className="text-slate-400 text-sm">
            {isAdmin
              ? 'Company Admin · Full access'
              : `Logged in as ${user?.role.replace(/_/g, ' ')}`}
          </p>
        </div>
        <div className="relative z-10 hidden sm:block">
          <button
            onClick={() => navigate('/pos')}
            className="btn btn-primary text-sm px-5"
          >
            New Sale
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Today's Revenue"
          value={`₹${dailySales?.total_sales?.toFixed(2) || '0.00'}`}
          change="+12.5%"
          trend="up"
          icon={DollarSign}
          color="primary"
        />
        <MetricCard
          title="Today's Orders"
          value={dailySales?.total_orders?.toString() || '0'}
          change="+8.2%"
          trend="up"
          icon={ShoppingCart}
          color="success"
        />
        <MetricCard
          title="Total Products"
          value={totalProductCount.toString()}
          change={`${activeProducts} active`}
          trend="up"
          icon={Package}
          color="warning"
        />
        <MetricCard
          title="Low Stock Items"
          value={lowStockItems.length.toString()}
          change={lowStockItems.length > 0 ? 'Needs attention' : 'All good'}
          trend={lowStockItems.length > 0 ? 'down' : 'up'}
          icon={AlertTriangle}
          color="danger"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Sales Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, color: '#111827', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#6B7280' }} />
              <Line type="monotone" dataKey="sales" stroke="#0d9158" strokeWidth={2} dot={false} name="Orders" />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} name="Revenue (₹)" />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Historical data will populate as sales are recorded
          </p>
        </div>

        {/* Recent Sales */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">Recent Sales</h3>
            <button
              onClick={() => navigate('/sales')}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              View all
            </button>
          </div>
          {recentSales.length > 0 ? (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <PaymentIcon method={sale.payment_method} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {sale.customer_name || 'Walk-in Customer'}
                    </p>
                    <p className="text-xs text-gray-500">{sale.order_number}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">₹{parseFloat(sale.total_amount).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{format(new Date(sale.sale_date), 'h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center h-[240px]">
              <div className="text-center">
                <Receipt className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">No sales today</p>
                <p className="text-gray-400 text-xs mt-1">Completed sales will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="card bg-warning-50 border border-warning-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-warning-900">Low Stock Alert</h3>
              <p className="text-sm text-warning-700 mt-1">
                {lowStockItems.length} product(s) are running low on stock
              </p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {lowStockItems.map((item) => (
                  <div key={item.product} className="bg-white p-3 rounded-lg border border-warning-200">
                    <div className="font-medium text-gray-900 text-sm">{item.product_name}</div>
                    <div className="text-xs text-warning-700 mt-1">
                      Only {item.quantity || 0} left (Min: {item.reorder_level || 0})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Today's Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Orders:</span>
              <span className="font-medium">{dailySales?.total_orders || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Revenue:</span>
              <span className="font-medium">₹{dailySales?.total_sales?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Order:</span>
              <span className="font-medium">
                ₹{dailySales?.total_orders && dailySales.total_orders > 0
                  ? ((dailySales.total_sales || 0) / dailySales.total_orders).toFixed(2)
                  : '0.00'}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Inventory Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Products:</span>
              <span className="font-medium">{totalProductCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Active:</span>
              <span className="font-medium text-success-600">{activeProducts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Low Stock:</span>
              <span className="font-medium text-warning-600">{lowStockItems.length}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/pos')}
              className="w-full btn btn-primary text-sm"
            >
              New Sale
            </button>
            <button
              onClick={() => navigate('/products')}
              className="w-full btn btn-outline-secondary text-sm"
            >
              Add Product
            </button>
            <button
              onClick={() => navigate('/sales')}
              className="w-full btn btn-outline-secondary text-sm"
            >
              View Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ElementType;
  color: 'primary' | 'success' | 'warning' | 'danger';
}

function MetricCard({ title, value, change, trend, icon: Icon, color }: MetricCardProps) {
  const cfg = {
    primary: { stripe: 'accent-indigo', icon: 'bg-primary-100 text-primary-600' },
    success: { stripe: 'accent-emerald', icon: 'bg-success-100 text-success-600' },
    warning: { stripe: 'accent-amber', icon: 'bg-warning-100 text-warning-600' },
    danger:  { stripe: 'accent-rose',   icon: 'bg-danger-100 text-danger-600'  },
  }[color];

  return (
    <div className="stat-card">
      <div className={`stat-card-stripe ${cfg.stripe}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="stat-card-label truncate">{title}</p>
          <p className="stat-card-value">{value}</p>
          <div className="flex items-center gap-1 mt-1.5">
            {trend === 'up' ? (
              <TrendingUp className="w-3.5 h-3.5 text-success-600 flex-shrink-0" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-danger-600 flex-shrink-0" />
            )}
            <span className={`text-xs font-medium ${trend === 'up' ? 'text-success-600' : 'text-danger-600'}`}>
              {change}
            </span>
          </div>
        </div>
        <div className={`stat-card-icon ${cfg.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function PaymentIcon({ method }: { method: string }) {
  const m = (method || '').toLowerCase();
  if (m === 'cash') return <Banknote className="w-4 h-4 text-primary-600" />;
  if (m === 'upi') return <Smartphone className="w-4 h-4 text-primary-600" />;
  if (m === 'card') return <CreditCard className="w-4 h-4 text-primary-600" />;
  return <Receipt className="w-4 h-4 text-primary-600" />;
}

export default CompanyDashboard;
