import { useEffect, useState } from "react";
import { Card, Table, Input, Tag, Select, Space, Typography } from "antd";
import type { TableProps } from "antd";
import { Search, ShoppingCart } from "lucide-react";
import { getOrders } from "../../services/api/index";

const { Option } = Select;
const { Text } = Typography;

interface OrderData {
  key: string;
  orderId: string;
  serialNo: string;
  platform: string;
  productName: string;
  orderAmount: number;
  actualPrice?: number;
  originalPrice?: number;
  couponAmount?: number;
  points?: number;
  commission: number;
  status: "pending" | "settled" | "invalid" | "exception";
  createTime: string;
  updateTime: string;
  openId: string;
  pointsRule: string;
}

// Mock data generator has been removed.

export default function OrderCenter() {
  const [data, setData] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await getOrders({
        page: current,
        pageSize,
        status: statusFilter === "all" ? undefined : statusFilter,
        orderId: searchText || undefined,
      });
      const d = res.data || res;
      if (d) {
        setData(d.list || []);
        setTotal(d.total || 0);
      }
    } catch (error) {
      console.error("加载订单列表失败", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [current, pageSize, statusFilter, searchText]);

  const getStatusTag = (status: string) => {
    switch (status) {
      case "pending":
        return <Tag className="status-tag-warning">待结算</Tag>;
      case "settled":
        return <Tag className="status-tag-success">已入账</Tag>;
      case "invalid":
        return <Tag className="status-tag-default">已失效</Tag>;
      case "exception":
        return <Tag className="status-tag-error">异常</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns: TableProps<OrderData>["columns"] = [
    {
      title: "系统流水号",
      dataIndex: "serialNo",
      key: "serialNo",
      width: 200,
      render: (text) => (
        <Text copyable={{ text: String(text) }} style={{ color: "#FF6B35", fontWeight: 500, fontFamily: "monospace", fontSize: 12 }}>
          {text}
        </Text>
      ),
    },
    {
      title: "平台单号",
      dataIndex: "orderId",
      key: "orderId",
      width: 200,
      render: (text) => (
        <Text copyable={{ text: String(text) }} style={{ color: "#576B95", fontFamily: "monospace", fontSize: 12 }}>
          {text}
        </Text>
      ),
    },
    {
      title: "平台",
      dataIndex: "platform",
      key: "platform",
      width: 80,
    },
    {
      title: "商品名称",
      dataIndex: "productName",
      key: "productName",
      ellipsis: true,
      width: 220,
    },
    {
      title: "下单金额",
      dataIndex: "actualPrice",
      key: "actualPrice",
      width: 100,
      align: "right",
      render: (value, record) => <span className="table-number-align">¥{(Number(value || record.orderAmount) || 0).toFixed(2)}</span>,
    },
    {
      title: "查券节省",
      dataIndex: "couponAmount",
      key: "couponAmount",
      width: 100,
      align: "right",
      render: (value) => <span className="table-number-align" style={{ color: "#EB2F96" }}>¥{(Number(value) || 0).toFixed(2)}</span>,
    },
    {
      title: "预估佣金",
      dataIndex: "commission",
      key: "commission",
      width: 100,
      align: "right",
      render: (value) => (
        <span className="table-number-align" style={{ color: "#FF6B35", fontWeight: 500 }}>
          ¥{(Number(value) || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: "预估积分",
      dataIndex: "points",
      key: "points",
      width: 100,
      align: "right",
      render: (value) => <Tag color="orange" style={{ margin: 0 }}>{value || 0}</Tag>,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: "用户 OpenID",
      dataIndex: "openId",
      key: "openId",
      width: 150,
      render: (text) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{text}</span>,
    },
    {
      title: "下单日期",
      dataIndex: "createTime",
      key: "orderDate",
      width: 120,
      render: (text) => text ? text.split(' ')[0] : '-',
    },
    {
      title: "同步时间",
      dataIndex: "updateTime",
      key: "updateTime",
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
  ];



  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <ShoppingCart size={24} style={{ color: "#FF6B35" }} />
          订单中心
        </h2>
        <p style={{ color: "#666666", margin: "8px 0 0 0", fontSize: 14 }}>
          查看所有订单的佣金计算和结算状态
        </p>
      </div>
      <Card className="dashboard-card">
        <div style={{ marginBottom: 16 }}>
          <Space size="middle" style={{ width: "100%", justifyContent: "space-between" }}>
            <Space>
              <Input
                placeholder="搜索订单号、商品名称、OpenID"
                prefix={<Search size={16} />}
                style={{ width: 320 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
              <Select
                style={{ width: 120 }}
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Option value="all">全部状态</Option>
                <Option value="pending">待结算</Option>
                <Option value="settled">已入账</Option>
                <Option value="invalid">已失效</Option>
                <Option value="exception">异常</Option>
              </Select>
            </Space>
            <span style={{ color: "#888888", fontSize: 14 }}>
              共 {total} 条记录
            </span>
          </Space>
        </div>

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            onChange: (page, size) => {
              setCurrent(page);
              setPageSize(size);
            },
            showTotal: (total) => `共 ${total} 条`,
          }}
        />

        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: "rgba(87, 107, 149, 0.1)",
            borderRadius: 4,
            color: "#888888",
            fontSize: 12,
          }}
        >
          <p style={{ margin: 0 }}>📋 数据说明：</p>
          <p style={{ margin: "8px 0 0 0" }}>
            1. 订单数据由折淘客 API 实时同步，本页面为只读模式，严禁手动修改<br />
            2. 预估佣金为理论最大值，实际到账金额以联盟最终结算为准<br />
            3. 订单状态：待结算（冷冻期内）→ 已入账（可提现）→ 已失效（退款/取消）→ 异常（同步失败/数据异常）<br />
            4. 异常订单需要人工介入处理，请联系技术人员排查原因<br />
            5. 点击表头字段可切换排序，默认按创建时间倒序显示最新流水
          </p>
        </div>
      </Card>
    </div>
  );
}