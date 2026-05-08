import { useEffect, useState } from "react";
import { ShoppingCart, Search, Info, RefreshCw } from "lucide-react";
import { getOrders } from "../../services/api/index";
import { Card, Table, Input, Select, Tag, Button, Typography, Space } from "antd";

const { Paragraph, Text } = Typography;

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
  commission: number;
  status: "pending" | "settled" | "invalid" | "exception";
  createTime: string;
  updateTime: string;
  openId: string;
  _id?: string;
}

export default function TaobaoOrders() {
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
        platform: "淘宝",
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
        return <Tag color="warning">待结算</Tag>;
      case "settled":
        return <Tag color="success">已入账</Tag>;
      case "invalid":
        return <Tag color="default">已失效</Tag>;
      case "exception":
        return <Tag color="error">异常</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: "系统流水号",
      dataIndex: "serialNo",
      key: "serialNo",
      width: 150,
      render: (text: string) => (
        <Paragraph ellipsis={{ tooltip: true }} copyable={text ? { text } : false} style={{ margin: 0, color: "#FF6200" }} className="font-mono">
          {text}
        </Paragraph>
      )
    },
    {
      title: "淘宝单号",
      dataIndex: "orderId",
      key: "orderId",
      width: 160,
      render: (text: string) => (
        <Paragraph ellipsis={{ tooltip: true }} copyable={text ? { text } : false} style={{ margin: 0 }} className="font-mono text-slate-600">
          {text}
        </Paragraph>
      )
    },
    {
      title: "商品名称",
      dataIndex: "productName",
      key: "productName",
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Paragraph ellipsis={{ tooltip: true, rows: 2 }} style={{ margin: 0 }} className="text-slate-700">
          {text}
        </Paragraph>
      )
    },
    {
      title: "下单金额",
      key: "actualPrice",
      width: 100,
      align: "right" as const,
      render: (_: any, record: OrderData) => (
        <span className="font-medium">¥{(Number(record.actualPrice || record.orderAmount) || 0).toFixed(2)}</span>
      )
    },
    {
      title: "查券节省",
      dataIndex: "couponAmount",
      key: "couponAmount",
      width: 100,
      align: "right" as const,
      render: (text: number) => (
        <span className="text-pink-600">¥{(Number(text) || 0).toFixed(2)}</span>
      )
    },
    {
      title: "预估佣金",
      dataIndex: "commission",
      key: "commission",
      width: 100,
      align: "right" as const,
      render: (text: number) => (
        <span className="text-[#FF6200] font-semibold">¥{(Number(text) || 0).toFixed(2)}</span>
      )
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: "用户 OpenID",
      dataIndex: "openId",
      key: "openId",
      width: 150,
      render: (text: string) => (
        text ? <Paragraph ellipsis={{ tooltip: true }} copyable={{ text }} style={{ margin: 0 }} className="font-mono text-xs">{text}</Paragraph> : <span>-</span>
      )
    },
    {
      title: "下单日期",
      dataIndex: "createTime",
      key: "createTime",
      width: 120,
      render: (text: string) => text ? text.split(" ")[0] : "-"
    },
    {
      title: "同步时间",
      dataIndex: "updateTime",
      key: "updateTime",
      width: 150,
      render: (text: string) => text ? new Date(text).toLocaleString("zh-CN") : "-"
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-[#FF6200]" />
          淘宝订单
        </h2>
        <p className="text-sm text-slate-500">
          查看淘宝平台的订单佣金计算和结算状态
        </p>
      </div>

      <Card
        bordered={false}
        className="shadow-sm rounded-2xl overflow-hidden"
        styles={{ body: { padding: 0 } }}
      >
        {/* Filters */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Space wrap size="middle">
            <Input
              prefix={<Search className="w-4 h-4 text-slate-400" />}
              placeholder="搜索订单号、商品名称、OpenID"
              style={{ width: 280 }}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrent(1);
              }}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setCurrent(1);
              }}
              style={{ width: 140 }}
              options={[
                { value: "all", label: "全部状态" },
                { value: "pending", label: "待结算" },
                { value: "settled", label: "已入账" },
                { value: "invalid", label: "已失效" },
                { value: "exception", label: "异常" }
              ]}
            />
          </Space>
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <span>共 <span className="font-medium text-slate-900">{total}</span> 条记录</span>
            <Button
              type="text"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />}
              onClick={fetchOrders}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600"
            />
          </div>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={data}
          rowKey={(record) => record._id || record.key || record.orderId}
          loading={loading}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (page, size) => {
              setCurrent(page);
              setPageSize(size);
            },
            className: "px-6 pb-6"
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Info Notice */}
      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex gap-3 text-sm text-slate-600">
        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-slate-700">📋 数据说明：</p>
          <ul className="list-decimal pl-4 space-y-1 text-slate-500">
            <li>订单数据由折淘客 API 定时同步，本页面为只读模式，严禁手动修改</li>
            <li>预估佣金为理论最大值，实际到账金额以联盟最终结算为准</li>
            <li>订单状态：待结算（冷冻期内）→ 已入账（可提现）→ 已失效（退款/取消）→ 异常（同步失败/数据异常）</li>
            <li>异常订单需要人工介入处理，请联系技术人员排查原因</li>
            <li>目前为前端模拟排版视图，若需真实联调请确保后端服务和定时拉取进程运行正常</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
