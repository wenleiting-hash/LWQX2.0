import { useState, useEffect } from "react";
import { Search, RefreshCw } from "lucide-react";
import { getSearchLogs } from "../../services/api/index";
import { Card, Table, Button, Typography, Space, message } from "antd";

const { Paragraph, Text } = Typography;

export default function TaobaoSearchLogs() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const fetchLogs = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      const res: any = await getSearchLogs({ platform: 'taobao', page, pageSize });
      if (res?.list) {
        setLogs(res.list || []);
        setPagination(prev => ({ ...prev, current: page, pageSize, total: res.total || 0 }));
      }
    } catch (error: any) {
      console.error("加载日志失败", error);
      message.error(error.message || "加载查询记录失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (ts: number | string) => {
    if (!ts) return "-";
    const date = new Date(typeof ts === 'number' ? ts : Date.parse(ts));
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const columns = [
    {
      title: "查券时间",
      key: "searchTime",
      width: 160,
      render: (_: any, record: any) => (
        <span className="text-slate-600 text-sm whitespace-nowrap">
          {formatDate(record.searchTime || record.event_timestamp || record.created_at)}
        </span>
      )
    },
    {
      title: "用户微信openid",
      dataIndex: "openid",
      key: "openid",
      width: 150,
      render: (text: string) => (
        <Paragraph ellipsis={{ tooltip: true }} copyable={text ? { text } : false} style={{ margin: 0 }} className="font-medium text-slate-700">
          {text || '-'}
        </Paragraph>
      )
    },
    {
      title: "查询链接",
      dataIndex: "queryContent",
      key: "queryContent",
      width: 180,
      render: (text: string) => (
        <Paragraph ellipsis={{ tooltip: true }} copyable={text ? { text } : false} style={{ margin: 0 }} className="text-sm text-slate-500">
          {text || '-'}
        </Paragraph>
      )
    },
    {
      title: "商品主图",
      dataIndex: "product_image",
      key: "product_image",
      width: 80,
      render: (img: string) => (
        img ? (
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 shrink-0">
            <img src={img} alt="商品" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
            <span className="text-xs text-slate-400">无图</span>
          </div>
        )
      )
    },
    {
      title: "商品名称",
      dataIndex: "resultTitle",
      key: "resultTitle",
      width: 250,
      ellipsis: true,
      render: (text: string) => (
        <Paragraph ellipsis={{ tooltip: true, rows: 2 }} copyable={text ? { text } : false} style={{ margin: 0 }} className="text-sm font-medium text-slate-800">
          {text || '-'}
        </Paragraph>
      )
    },
    {
      title: "商品价格",
      dataIndex: "originalPrice",
      key: "originalPrice",
      width: 100,
      align: "right" as const,
      render: (val: number) => (
        <span className="text-slate-600 font-medium whitespace-nowrap">{val ? `¥ ${val}` : '-'}</span>
      )
    },
    {
      title: "优惠价格",
      dataIndex: "finalPrice",
      key: "finalPrice",
      width: 100,
      align: "right" as const,
      render: (val: number) => (
        <span className="text-slate-600 font-medium whitespace-nowrap">{val ? `¥ ${val}` : '-'}</span>
      )
    },
    {
      title: "优惠金额",
      dataIndex: "couponAmount",
      key: "couponAmount",
      width: 110,
      align: "right" as const,
      render: (val: number) => (
        <span className="text-red-500 font-medium whitespace-nowrap">{val ? `¥ ${val}` : '-'}</span>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <div className="p-1.5 bg-[#FF6200]/10 rounded-lg">
              <Search className="w-5 h-5 text-[#FF6200]" />
            </div>
            淘宝查券记录
          </h2>
          <div className="text-sm text-slate-500 flex items-center gap-2">
            记录并分析小程序用户的淘宝商品查券请求行为
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="default"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => fetchLogs(1, pagination.pageSize)}
            disabled={loading}
          >
            刷新状态
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card
        bordered={false}
        className="shadow-sm rounded-2xl overflow-hidden"
        styles={{ body: { padding: 0 } }}
      >
        <div className="p-6 pb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-[#FF6200] rounded-full"></div>
          <span className="text-base font-medium text-slate-900">查券行为明细</span>
        </div>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey={(record) => record._id || Math.random().toString()}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, size) => fetchLogs(page, size),
            className: "px-6 pb-6"
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
}
