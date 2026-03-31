import { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Spin, message, Empty, List, Avatar, Badge } from "antd";
import { TrendingUp, Users, Award, Clock, ShoppingCart, Activity, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getDashboardStats } from "../../services/api/index";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>({
    stats: [],
    monthTrend: [],
    realtimeOrders: [],
    orderTrend: [],
    businessMetrics: {}
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await getDashboardStats();
        const data = res.data || res;
        
        if (data) {
          // 兼容新旧结构
          let finalStats = [];
          if (Array.isArray(data.stats)) {
            finalStats = data.stats;
          } else if (data.totalUsers !== undefined) {
            // 兼容旧的平铺结构
            finalStats = [
              { title: "今日新增用户", value: data.todayNewUsers || 0, icon: "Users" },
              { title: "今日预估佣金", value: data.todayCommission || 0, icon: "DollarSign" },
              { title: "累计发放积分", value: data.totalPoints || 0, icon: "Award" },
              { title: "系统用户总数", value: data.totalUsers || 0, icon: "Award" }
            ];
          }

          setStatsData({
            stats: finalStats,
            monthTrend: data.monthTrend || data.chartData || [],
            realtimeOrders: data.realtimeOrders || [],
            orderTrend: data.orderTrend || [],
            businessMetrics: data.businessMetrics || {
              avgOrderValue: "0.00",
              conversionRate: "0.0%",
              activeUsers: data.totalUsers || 0,
              monthlyGrowth: "+0.0%"
            }
          });
        }
      } catch (error) {
        console.error("加载大盘数据失败", error);
        message.error("数据加载失败，请重试");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const { stats, monthTrend, realtimeOrders, orderTrend, businessMetrics } = statsData;

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '0 0 24px 0' }}>
        {/* 第一行：核心 KPI 卡片 */}
        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          {stats.map((item: any, index: number) => {
            let IconComp = Award;
            let color = "#FF6B35";
            let bg = "rgba(255, 107, 53, 0.1)";
            
            if (item.icon === 'Users') { IconComp = Users; color = "#576B95"; bg = "rgba(87, 107, 149, 0.1)"; }
            if (item.icon === 'ShoppingCart') { IconComp = ShoppingCart; color = "#07C160"; bg = "rgba(7, 193, 96, 0.1)"; }
            if (item.icon === 'DollarSign' || item.icon === 'TrendingUp') { IconComp = TrendingUp; color = "#FF6B35"; bg = "rgba(255, 107, 53, 0.1)"; }
            if (item.icon === 'Award') { IconComp = Award; color = "#faad14"; bg = "rgba(250, 173, 20, 0.1)"; }

            return (
              <Col key={index} style={{ flex: '1 0 200px', maxWidth: '100%' }}>
                <Card className="dashboard-card" bordered={false} hoverable style={{ height: '100%' }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <IconComp size={22} color={color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Statistic
                        title={<span style={{ color: '#888', fontSize: 13, whiteSpace: 'nowrap' }}>{item.title}</span>}
                        value={item.value}
                        valueStyle={{ fontSize: 20, fontWeight: '700', color: '#191919' }}
                      />
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>

        {/* 第二行：流水趋势 (75%) + 实时订单流 (25%) */}
        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={18} style={{ display: 'flex' }}>
            <Card
              className="dashboard-card"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24 }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={18} color="#FF6B35" />
                  <span>近30天财务流水及佣金预估趋势</span>
                </div>
              }
              extra={<span style={{ color: '#888', fontSize: 12 }}>Last 30 Days</span>}
              bordered={false}
            >
              <div style={{ flex: 1, minHeight: 400, width: "100%" }}>
                {monthTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#BFBFBF", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#BFBFBF", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: any) => [`¥${Number(value).toLocaleString()}`, "预估佣金"]}
                      />
                      <Line type="monotone" dataKey="amount" stroke="#FF6B35" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </div>
                )}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={6} style={{ display: 'flex' }}>
            <Card
              className="dashboard-card"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 24px' }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={18} color="#576B95" />
                  <span>实时订单流</span>
                </div>
              }
              bordered={false}
            >
              <div style={{ flex: 1, minHeight: 400, overflowY: 'auto' }}>
                <List
                  dataSource={realtimeOrders}
                  locale={{ emptyText: <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /></div> }}
                  renderItem={(item: any) => (
                    <List.Item style={{ padding: '12px 0', borderBottom: '1px dashed #f0f0f0' }}>
                      <List.Item.Meta
                        avatar={<Avatar size="small" style={{ backgroundColor: '#f0f2f5', color: '#576B95', fontSize: 10 }}>{item.time}</Avatar>}
                        title={<span style={{ fontSize: 13, color: '#555' }}>用户 {item.user}</span>}
                      />
                      <div style={{ fontWeight: '600', color: '#FF6B35' }}>+¥{item.amount}</div>
                    </List.Item>
                  )}
                />
              </div>
            </Card>
          </Col>
        </Row>

        {/* 第三行：订单量趋势 (50%) + 关键业务指标 (50%) */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <Card
              className="dashboard-card"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24 }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart3 size={18} color="#07C160" />
                  <span>订单量趋势</span>
                </div>
              }
              bordered={false}
            >
              <div style={{ flex: 1, minHeight: 300, width: "100%" }}>
                {orderTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={orderTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#BFBFBF", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#BFBFBF", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Line type="stepAfter" dataKey="count" stroke="#07C160" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </div>
                )}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <Card
              className="dashboard-card"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24 }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={18} color="#faad14" />
                  <span>关键业务指标</span>
                </div>
              }
              bordered={false}
            >
              <div style={{ flex: 1, minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <div style={{ padding: '20px 16px', background: '#fafafa', borderRadius: 12 }}>
                      <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>平均客单价</div>
                      <div style={{ fontSize: 24, fontWeight: '700', color: '#191919' }}>¥{businessMetrics.avgOrderValue || '0.00'}</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ padding: '20px 16px', background: '#fafafa', borderRadius: 12 }}>
                      <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>佣金转化率</div>
                      <div style={{ fontSize: 24, fontWeight: '700', color: '#FF6B35' }}>{businessMetrics.conversionRate || '0.0%'}</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ padding: '20px 16px', background: '#fafafa', borderRadius: 12 }}>
                      <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>活跃用户数</div>
                      <div style={{ fontSize: 24, fontWeight: '700', color: '#191919' }}>{Number(businessMetrics.activeUsers || 0).toLocaleString()}</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ padding: '20px 16px', background: '#fafafa', borderRadius: 12 }}>
                      <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>月度增长率</div>
                      <div style={{ fontSize: 24, fontWeight: '700', color: '#07C160' }}>{businessMetrics.monthlyGrowth || '+0.0%'}</div>
                    </div>
                  </Col>
                </Row>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
}