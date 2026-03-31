import { useEffect, useState } from "react";
import { Card, Table, Button, Tag, Space, Modal, message } from "antd";
import type { TableProps } from "antd";
import { Plus, Edit, Trash2, Eye, Award } from "lucide-react";
import { useNavigate } from "react-router";
import { getPointsRules, deletePointsRule } from "../../services/api/index";

interface PointsRuleData {
  key: string;
  ruleName: string;
  ruleVersion: string;
  exchangeRate: number;
  freezeDays: number;
  minWithdraw: number;
  status: "active" | "inactive";
  createTime: string;
  updateTime: string;
  creator: string;
}

// Mock data generator has been removed

export default function PointsRulesList() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any | null>(null);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await getPointsRules();
      const list = res.data?.list || res.data || res;
      if (Array.isArray(list)) {
        setData(list);
      }
    } catch (error) {
      console.error("加载积分规则列表失败", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleView = (record: any) => {
    navigate(`/points-rules/${record._id || record.key}`);
  };

  const handleEdit = (record: any) => {
    navigate(`/points-rules/${record._id || record.key}`);
  };

  const handleDelete = (record: any) => {
    if (record.status === "active") {
      message.error("无法删除当前生效的规则！");
      return;
    }
    setSelectedRule(record);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!selectedRule) return;

    try {
      await deletePointsRule(selectedRule._id || selectedRule.key);
      message.success(`已删除规则：${selectedRule.ruleName}`);
      setDeleteModalVisible(false);
      setSelectedRule(null);
      fetchRules(); // 刷新列表
    } catch (error) {
      console.error("删除规则失败", error);
    }
  };

  const handleAddNew = () => {
    navigate("/points-rules/new");
  };

  const getStatusTag = (status: string) => {
    if (status === "active") {
      return <Tag className="status-tag-success">当前生效</Tag>;
    } else {
      return <Tag className="status-tag-default">已停用</Tag>;
    }
  };

  const columns: TableProps<any>["columns"] = [
    {
      title: "规则名称",
      dataIndex: "ruleName",
      key: "ruleName",
      width: 220,
      fixed: "left",
      render: (text, record) => (
        <span
          style={{
            fontWeight: record.status === "active" ? 600 : 400,
            color: record.status === "active" ? "#FF6B35" : "#191919",
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: "版本号",
      dataIndex: "ruleVersion",
      key: "ruleVersion",
      width: 120,
      render: (text) => (
        <span style={{ fontFamily: "monospace", color: "#888888" }}>{text}</span>
      ),
    },
    {
      title: "兑换比例",
      dataIndex: "exchangeRate",
      key: "exchangeRate",
      width: 120,
      align: "right",
      render: (value) => <span className="table-number-align">{value}:1</span>,
    },
    {
      title: "冻结天数",
      dataIndex: "freezeDays",
      key: "freezeDays",
      width: 120,
      align: "right",
      sorter: (a, b) => a.freezeDays - b.freezeDays,
      render: (value) => <span className="table-number-align">{value} 天</span>,
    },
    {
      title: "最低提现",
      dataIndex: "minWithdraw",
      key: "minWithdraw",
      width: 120,
      align: "right",
      sorter: (a, b) => a.minWithdraw - b.minWithdraw,
      render: (value) => <span className="table-number-align">{value} 积分</span>,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      filters: [
        { text: "当前生效", value: "active" },
        { text: "已停用", value: "inactive" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => getStatusTag(status),
    },
    {
      title: "创建时间",
      dataIndex: "createTime",
      key: "createTime",
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString("zh-CN") : "-",
    },
    {
      title: "更新时间",
      dataIndex: "updateTime",
      key: "updateTime",
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString("zh-CN") : "-",
    },
    {
      title: "创建人",
      dataIndex: "creator",
      key: "creator",
      width: 100,
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="text"
            size="small"
            icon={<Edit size={14} />}
            onClick={() => handleEdit(record)}
            style={{ color: "#576B95" }}
          >
            编辑
          </Button>
          <Button
            type="text"
            size="small"
            icon={<Award size={14} />}
            onClick={async () => {
              try {
                await updatePointsRule(record._id || record.key, { ...record, status: "active" });
                message.success(`已启用规则：${record.ruleName}`);
                fetchRules();
              } catch (e) {
                message.error("切换规则失败");
              }
            }}
            style={{ color: "#FF6B35" }}
            disabled={record.status === "active"}
          >
            启用
          </Button>
          <Button
            type="text"
            size="small"
            icon={<Trash2 size={14} />}
            onClick={() => handleDelete(record)}
            style={{ color: "#FA5151" }}
            disabled={record.status === "active"}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <Award size={24} style={{ color: "#FF6B35" }} />
          积分规则
        </h2>
        <p style={{ color: "#666666", margin: "8px 0 0 0", fontSize: 14 }}>
          管理积分兑换规则、冻结期和提现门槛
        </p>
      </div>
      <Card
        className="dashboard-card"
        extra={
          <Button type="primary" icon={<Plus size={18} />} onClick={handleAddNew}>
            新增规则
          </Button>
        }
      >
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1600 }}
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
            background: "rgba(255, 107, 53, 0.1)",
            borderRadius: 4,
            color: "#888888",
            fontSize: 12,
          }}
        >
          <p style={{ margin: 0 }}>📋 规则说明：</p>
          <p style={{ margin: "8px 0 0 0" }}>
            1. 系统同时只能有<strong>一个生效规则</strong>，新规则生效后旧规则自动停用<br />
            2. 兑换比例：积分与人民��的换算比率（如 100:1 表示 100 积分 = 1 元）<br />
            3. 冻结天数：用户获得积分后需等待的天数才能提现，用于防范恶意退款<br />
            4. 最低提现：用户可提现的最低积分门槛<br />
            5. 已停用的规则可以删除，当前生效的规则无法删除
          </p>
        </div>
      </Card>

      {/* 删除确认弹窗 */}
      <Modal
        title="删除积分规则"
        open={deleteModalVisible}
        onOk={confirmDelete}
        onCancel={() => setDeleteModalVisible(false)}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        {selectedRule && (
          <div style={{ lineHeight: 2 }}>
            <p>
              <strong>规则名称：</strong>
              {selectedRule.ruleName}
            </p>
            <p>
              <strong>版本号：</strong>
              {selectedRule.ruleVersion}
            </p>
            <p style={{ marginTop: 16, color: "#FA5151" }}>
              ⚠️ 确认要删除该积分规则吗？此操作不可恢复！
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
