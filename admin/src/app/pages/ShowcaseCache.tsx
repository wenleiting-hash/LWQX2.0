import React, { useState, useEffect } from "react";
import { Card, Table, Button, message, Popconfirm, Tag, Space, Typography } from "antd";
import { fetchShowcaseCache, cleanupShowcase } from "../../services/api";
import { Database, RefreshCw, Trash2 } from "lucide-react";

const { Title, Paragraph } = Typography;

export default function ShowcaseCache() {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadData(1);
  }, []);

  const loadData = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetchShowcaseCache(pageNum, 10);
      setData(res.items || []);
      setTotal(res.total || 0);
      setPage(pageNum);
    } catch (e: any) {
      message.error("加载晒单缓存失败：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = () => {
    message.info("开发中：即将接入 cf-sync-showcase 云函数调用...");
  };

  const handleClean = async () => {
    const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
    setCleaning(true);
    try {
      const res: any = await cleanupShowcase(twoDaysAgo);
      message.success(`已清理 ${res.deleted || 0} 条过期记录`);
      loadData(1);
    } catch (e: any) {
      message.error("清理失败：" + e.message);
    } finally {
      setCleaning(false);
    }
  };

  const columns = [
    {
      title: "脱敏昵称",
      dataIndex: "nickname_masked",
      key: "nickname_masked",
      render: (text: string) => <Tag color="blue">{text || '神秘用户'}</Tag>
    },
    {
      title: "商品标题",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
    },
    {
      title: "平台",
      dataIndex: "platform",
      key: "platform",
      render: (platform: string) => (
        <Tag color={platform === 'jd' ? 'red' : 'orange'}>{platform === 'jd' ? '京东' : '淘宝'}</Tag>
      )
    },
    {
      title: "省钱金额",
      key: "saved",
      render: (_: any, record: any) => {
        const val = record.saved_amount || (record.original_price - record.coupon_price);
        return <strong className="text-red-500">¥{val?.toFixed(2) || '0.00'}</strong>;
      }
    },
    {
      title: "时间",
      dataIndex: "event_timestamp",
      key: "event_timestamp",
      render: (ts: number) => ts ? new Date(ts).toLocaleString() : '-'
    }
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
          <Database size={24} />
        </div>
        <Title level={2} style={{ margin: 0 }}>晒单缓存管理</Title>
      </div>

      <Card className="shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <Paragraph type="secondary" style={{ margin: 0 }}>
            显示 `showcase_events_cache` 中的临时订单数据，用于 C 端社区发现页展示。
          </Paragraph>
          <Space>
            <Button icon={<RefreshCw size={16} />} onClick={handleSync}>
              立即同步最新订单
            </Button>
            <Popconfirm title="确定清理48小时前的数据吗？" onConfirm={handleClean}>
              <Button danger icon={<Trash2 size={16} />} loading={cleaning}>
                清理过期数据
              </Button>
            </Popconfirm>
          </Space>
        </div>

        <Table 
          dataSource={data} 
          columns={columns} 
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 10,
            total: total,
            onChange: (p) => loadData(p)
          }}
        />
      </Card>
    </div>
  );
}
