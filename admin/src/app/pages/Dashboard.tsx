import { useState, useEffect } from "react";
import { Users, ShoppingCart, Banknote, Wallet, Globe, TrendingUp, Clock, BarChart3, Activity } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { getDashboardStats } from "../../services/api/index";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    stats: [
      { title: "今日新增用户", value: 0, icon: "Users", isMoney: false },
      { title: "今日订单数", value: 0, icon: "ShoppingCart", isMoney: false },
      { title: "今日预估佣金", value: 0, icon: "Banknote", isMoney: true },
      { title: "本月预估佣金", value: 0, icon: "Wallet", isMoney: true },
      { title: "系统用户总数", value: 0, icon: "Globe", isMoney: false },
    ],
    monthTrend: [], 
    orderTrend: [], 
    realtimeOrders: [],
    businessMetrics: {
      avgOrderValue: "0.00",
      conversionRate: "0.0%",
      activeUsers: 0,
      monthlyGrowth: "+0.0%"
    }
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await getDashboardStats();
        const apiData = res.data || res;
        
        if (apiData) {
          // 根据功能清单映射 5 个核心指标
          const newStats = [
            { title: "今日新增用户", value: apiData.todayNewUsers || 0, icon: "Users", isMoney: false },
            { title: "今日订单数", value: apiData.todayOrders || 0, icon: "ShoppingCart", isMoney: false },
            { title: "今日预估佣金", value: apiData.todayCommission || 0, icon: "Banknote", isMoney: true },
            { title: "本月预估佣金", value: apiData.monthCommission || 0, icon: "Wallet", isMoney: true },
            { title: "系统用户总数", value: apiData.totalUsers || 0, icon: "Globe", isMoney: false },
          ];

          setData({
            stats: newStats,
            monthTrend: apiData.monthTrend || apiData.chartData || [],
            orderTrend: apiData.orderTrend || [],
            realtimeOrders: apiData.realtimeOrders || [],
            businessMetrics: apiData.businessMetrics || {
              avgOrderValue: "0.00",
              conversionRate: "0.0%",
              activeUsers: apiData.totalUsers || 0,
              monthlyGrowth: "+0.0%"
            }
          });
        }
      } catch (error) {
        console.error("加载大盘数据失败", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return <Users size={20} className="text-[#576B95]" />;
      case 'ShoppingCart': return <ShoppingCart size={20} className="text-[#07C160]" />;
      case 'Banknote': return <Banknote size={20} className="text-[#FF6200]" />;
      case 'Wallet': return <Wallet size={20} className="text-[#FF6200]" />;
      case 'Globe': return <Globe size={20} className="text-[#576B95]" />;
      default: return <Activity size={20} className="text-gray-500" />;
    }
  };

  const getIconBg = (iconName: string) => {
    switch (iconName) {
      case 'Users': return "bg-[#576B95]/10";
      case 'ShoppingCart': return "bg-[#07C160]/10";
      case 'Banknote': return "bg-[#FF6200]/10";
      case 'Wallet': return "bg-[#FF6200]/10";
      case 'Globe': return "bg-[#576B95]/10";
      default: return "bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6200] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-6 animate-in fade-in duration-500">
      {/* 顶部指标卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {data.stats.map((item: any, index: number) => (
          <div key={index} className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between min-h-[120px]">
            <div className="flex justify-between items-start">
              <span className="text-gray-500 text-sm font-medium">{item.title}</span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getIconBg(item.icon)}`}>
                {getIcon(item.icon)}
              </div>
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold text-gray-900 tracking-tight">
                {item.isMoney ? `¥${Number(item.value).toLocaleString()}` : Number(item.value).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 趋势图表区 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 近30天双端平台走势 (金额) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-[#FF6200]" />
            <h3 className="font-semibold text-gray-900">近30天订单金额走势 (双端)</h3>
          </div>
          <div className="h-[350px] w-full">
            {data.monthTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    formatter={(value: any) => [`¥${Number(value).toLocaleString()}`, "订单金额"]}
                    labelStyle={{ color: '#6B7280', marginBottom: '4px' }}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#FF6200" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: "#FF6200" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </div>

        {/* 实时订单流 */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Clock size={18} className="text-[#576B95]" />
            <h3 className="font-semibold text-gray-900">实时订单流</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[350px] pr-2 scrollbar-thin scrollbar-thumb-gray-200">
            {data.realtimeOrders.length > 0 ? (
              <div className="flex flex-col">
                {data.realtimeOrders.map((order: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-3.5 border-b border-dashed border-gray-100 last:border-0">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-gray-800">用户 {order.user || '匿名'}</span>
                      <span className="text-xs text-gray-400 font-medium">{order.time || '今日'}</span>
                    </div>
                    <span className="font-semibold text-[#07C160] text-base">+¥{order.amount || '0.00'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">暂无最新订单</div>
            )}
          </div>
        </div>
      </div>

      {/* 底部指标区 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 近30天订单数走势 */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={18} className="text-[#07C160]" />
            <h3 className="font-semibold text-gray-900">近30天订单数走势 (双端)</h3>
          </div>
          <div className="h-[250px] w-full">
            {data.orderTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.orderTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    formatter={(value: any) => [`${value} 笔`, "订单数"]}
                  />
                  <Bar dataKey="count" fill="#07C160" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">暂无数据</div>
            )}
          </div>
        </div>

        {/* 深层业务 KPI 下钻 */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-6">
            <Activity size={18} className="text-amber-500" />
            <h3 className="font-semibold text-gray-900">关键业务指标</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 h-[250px]">
            <div className="bg-[#F4F5F8] rounded-2xl p-6 flex flex-col justify-center transition-all hover:bg-gray-100">
              <span className="text-gray-500 text-sm mb-2">平均客单价</span>
              <span className="text-3xl font-bold text-gray-900">¥{data.businessMetrics.avgOrderValue || '0.00'}</span>
            </div>
            <div className="bg-[#F4F5F8] rounded-2xl p-6 flex flex-col justify-center transition-all hover:bg-gray-100">
              <span className="text-gray-500 text-sm mb-2">佣金转化率</span>
              <span className="text-3xl font-bold text-[#FF6200]">{data.businessMetrics.conversionRate || '0.0%'}</span>
            </div>
            <div className="bg-[#F4F5F8] rounded-2xl p-6 flex flex-col justify-center transition-all hover:bg-gray-100">
              <span className="text-gray-500 text-sm mb-2">活跃用户数</span>
              <span className="text-3xl font-bold text-gray-900">{Number(data.businessMetrics.activeUsers || 0).toLocaleString()}</span>
            </div>
            <div className="bg-[#F4F5F8] rounded-2xl p-6 flex flex-col justify-center transition-all hover:bg-gray-100">
              <span className="text-gray-500 text-sm mb-2">月度增长率</span>
              <span className="text-3xl font-bold text-[#07C160]">{data.businessMetrics.monthlyGrowth || '+0.0%'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}