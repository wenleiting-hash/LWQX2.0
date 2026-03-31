import { useEffect, useState } from "react";
import { Card, Table, Input, Tag, Badge, Space, message, Button } from "antd";
import type { TableProps } from "antd";
import { Search, Clock, CheckCircle, AlertCircle, Play } from "lucide-react";
import { getCronTasks, runCronTask } from "../../services/api/index";

interface TaskData {
  key: string;
  taskName: string;
  taskType: string;
  description: string;
  cronExpression: string;
  status: "running" | "success" | "failed";
  lastRunTime: string;
  nextRunTime: string;
  duration: number;
  errorMessage?: string;
}

// Mock data generator has been removed

export default function TaskScheduler() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [pageSize, setPageSize] = useState(10);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await getCronTasks();
      const list = res.data?.list || res.data || res;
      if (Array.isArray(list)) {
        setData(list);
      }
    } catch (error) {
      console.error("加载任务调度失败", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return (
          <Badge status="processing" text="运行中" style={{ color: "#576B95" }} />
        );
      case "success":
        return (
          <Badge status="success" text="执行成功" style={{ color: "#07C160" }} />
        );
      case "failed":
        return (
          <Badge status="error" text="执行失败" style={{ color: "#FA5151" }} />
        );
      default:
        return <Badge status="default" text={status} />;
    }
  };

  const getTaskTypeTag = (type: string) => {
    const colorMap: Record<string, string> = {
      商品同步: "#FF6B35",
      订单同步: "#576B95",
      积分结算: "#07C160",
      数据统计: "#FFA940",
      风控监控: "#FA5151",
      系统维护: "#888888",
    };
    return <Tag color={colorMap[type] || "#888888"}>{type}</Tag>;
  };

  const columns: TableProps<any>["columns"] = [
    {
      title: "任务名称",
      dataIndex: "taskName",
      key: "taskName",
      width: 180,
      fixed: "left",
      render: (text) => <span style={{ fontWeight: 500, color: "#191919" }}>{text}</span>,
    },
    {
      title: "任务类型",
      dataIndex: "taskType",
      key: "taskType",
      width: 120,
      filters: [
        { text: "商品同步", value: "商品同步" },
        { text: "订单同步", value: "订单同步" },
        { text: "积分结算", value: "积分结算" },
        { text: "数据统计", value: "数据统计" },
        { text: "风控监控", value: "风控监控" },
        { text: "系统维护", value: "系统维护" },
      ],
      onFilter: (value, record) => record.taskType === value,
      render: (type) => getTaskTypeTag(type),
    },
    {
      title: "任务描述",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      width: 280,
    },
    {
      title: "Cron 表达式",
      dataIndex: "cronExpression",
      key: "cronExpression",
      width: 150,
      render: (text) => (
        <span style={{ fontFamily: "monospace", fontSize: 12, color: "#888888" }}>{text}</span>
      ),
    },
    {
      title: "执行状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      filters: [
        { text: "运行中", value: "running" },
        { text: "执行成功", value: "success" },
        { text: "执行失败", value: "failed" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => getStatusBadge(status),
    },
    {
      title: "最后运行",
      dataIndex: "lastRunTime",
      key: "lastRunTime",
      width: 180,
      render: (text) => {
        if (!text || text === '从未运行') return '-';
        const date = typeof text === 'string' ? new Date(text) : (text instanceof Date ? text : new Date(text));
        return isNaN(date.getTime()) ? text : date.toLocaleString('zh-CN');
      },
      defaultSortOrder: "descend",
    },
    {
      title: "下次运行",
      dataIndex: "nextRunTime",
      key: "nextRunTime",
      width: 180,
      render: (text) => (
        <span style={{ color: "#576B95" }}>
          <Clock size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
          {text ? new Date(text).toLocaleString('zh-CN') : '-'}
        </span>
      ),
    },
    {
      title: "耗时 (ms)",
      dataIndex: "duration",
      key: "duration",
      width: 100,
      align: "right",
      sorter: (a, b) => a.duration - b.duration,
      render: (value) => <span className="table-number-align">{value}</span>,
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<Play size={14} />}
            onClick={async () => {
              try {
                const res: any = await runCronTask(record._id || record.key);
                message.success(res.data?.msg || "任务已触发");
              } catch (e) {
                message.error("触发任务失败");
              }
            }}
            style={{ color: "#FF6B35" }}
          >
            执行
          </Button>
        </Space>
      ),
    },
  ];

  // 扩展行内容 (显示日志/结果)
  const expandedRowRender = (record: any) => {
    return (
      <div
        style={{
          padding: "16px",
          background: "#F8F9FB",
          borderRadius: "8px",
          margin: "8px 0",
          border: "1px solid #E8E8E8"
        }}
      >
        <div style={{ marginBottom: 12, fontWeight: 500, color: "#191919" }}>任务执行详情</div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <span style={{ color: '#888888' }}>任务 ID：</span>
            <code style={{ background: '#eee', padding: '2px 4px', borderRadius: 4 }}>{record._id}</code>
          </div>
          <div>
            <span style={{ color: '#888888' }}>执行结果：</span>
            <span style={{ color: record.status === 'failed' ? '#FA5151' : '#07C160' }}>
              {record.errorMessage || record.results || (record.status === 'success' ? '执行成功，查看日志' : '处理中...')}
            </span>
          </div>
          {record.duration > 0 && (
            <div>
              <span style={{ color: '#888888' }}>上次耗时：</span>
              <span>{record.duration} ms</span>
            </div>
          )}
        </Space>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <Clock size={24} style={{ color: "#FF6B35" }} />
          任务调度
        </h2>
        <p style={{ color: "#666666", margin: "8px 0 0 0", fontSize: 14 }}>
          监控系统定时任务的执行状态和运行日志
        </p>
      </div>
      <Card className="dashboard-card">
        <div style={{ marginBottom: 16 }}>
          <Space size="middle" style={{ width: "100%", justifyContent: "space-between" }}>
            <Input
              placeholder="搜索任务名称、类型或描述"
              prefix={<Search size={16} />}
              style={{ width: 320 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <span style={{ color: "#888888", fontSize: 14 }}>
              共 {data.length} 个任务
            </span>
          </Space>
        </div>

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={data}
          loading={loading}
          expandable={{
            expandedRowRender,
            rowExpandable: () => true,
          }}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            onShowSizeChange: (_, size) => setPageSize(size),
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
          <p style={{ margin: 0 }}>🤖 任务说明：</p>
          <p style={{ margin: "8px 0 0 0" }}>
            1. 所有定时任务由系统自动执行，无需人工干预<br />
            2. Cron 表达式格式：秒 分 时 日 月 周（例如：0 0 2 * * * 表示每天凌晨2点执行）<br />
            3. 任务执行失败会自动重试，超过3次失败将触发告警通知<br />
            4. 点击失败任务可展开查看详细错误信息
          </p>
        </div>
      </Card>
    </div>
  );
}