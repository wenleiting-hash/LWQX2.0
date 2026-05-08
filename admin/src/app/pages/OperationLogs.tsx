import { useState, useEffect } from "react";
import { Card, Table, Typography, message, Tag } from "antd";
import { getOperationLogs } from "../../services/api/index";
import { Activity } from "lucide-react";

const { Title, Paragraph } = Typography;

export default function OperationLogs() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  useEffect(() => {
    fetchLogs(pagination.current, pagination.pageSize);
  }, []);

  const fetchLogs = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const res = await getOperationLogs({ page, pageSize });
      const logsData = res?.data || res || {};
      
      if (logsData.items !== undefined || res.code === 200) {
        setData(logsData.items || res?.data?.items || []);
        setPagination({
          current: logsData.page || res?.data?.page || page,
          pageSize: logsData.pageSize || res?.data?.pageSize || pageSize,
          total: logsData.total !== undefined ? logsData.total : (res?.data?.total || 0)
        });
      } else {
        setData([]);
      }
    } catch (e: any) {
      message.error(e.message || '获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pag: any) => {
    fetchLogs(pag.current, pag.pageSize);
  };

  const columns = [
    {
      title: '操作时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (val: any) => val ? new Date(val).toLocaleString() : '-'
    },
    {
      title: '操作人',
      dataIndex: 'admin_name',
      key: 'admin_name',
      width: 120,
      render: (val: string) => <Tag color="blue">{val}</Tag>
    },
    {
      title: '动作',
      dataIndex: 'action',
      key: 'action',
      width: 160,
      render: (val: string) => <Tag color="orange">{val}</Tag>
    },
    {
      title: '详情 (Payload)',
      dataIndex: 'payload',
      key: 'payload',
      render: (val: any) => {
        if (!val) return '-';
        let str = '';
        try {
          const parsed = typeof val === 'string' ? JSON.parse(val) : val;
          if (parsed && typeof parsed === 'object' && parsed.password) {
            parsed.password = '***';
          }
          str = typeof parsed === 'object' ? JSON.stringify(parsed) : String(parsed);
        } catch (e) {
          str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        }
        return (
          <Paragraph
            ellipsis={{ tooltip: true, rows: 2 }}
            copyable={{ text: str }}
            style={{ fontSize: 12, color: '#666', fontFamily: 'monospace', margin: 0, maxWidth: 400 }}
          >
            {str}
          </Paragraph>
        );
      }
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 120,
      render: (val: string) => <span style={{ color: '#888' }}>{val || '未知'}</span>
    }
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ padding: 8, background: "#EBF5FF", borderRadius: 8 }}>
          <Activity size={22} style={{ color: "#1677FF" }} />
        </div>
        <Title level={3} style={{ margin: 0 }}>操作日志</Title>
      </div>

      <Card className="shadow-sm">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true
          }}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}
