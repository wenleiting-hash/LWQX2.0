import { useEffect, useState } from "react";
import { Card, Table, Input, Tag, Button, Modal, Space, message } from "antd";
import type { TableProps } from "antd";
import { Search, Lock, Unlock, Wallet } from "lucide-react";
import { getUsers, freezeUser, unfreezeUser } from "../../services/api/index";

interface UserAssetData {
  key: string;
  openId: string;
  nickname: string;
  totalPoints: number;
  availablePoints: number;
  frozenPoints: number;
  status: "active" | "frozen";
  registerTime: string;
  lastActiveTime: string;
}

// Mock data generator has been removed.

export default function UserAssets() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"freeze" | "unfreeze">("freeze");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsers({
        page: current,
        pageSize,
        userId: searchText || undefined,
      });
      const d = res.data || res;
      if (d) {
        setData(d.list || []);
        setTotal(d.total || 0);
      }
    } catch (error) {
      console.error("加载用户资产失败", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [current, pageSize, searchText]);

  const handleFreeze = (record: any) => {
    setSelectedUser(record);
    setModalType("freeze");
    setModalVisible(true);
  };

  const handleUnfreeze = (record: any) => {
    setSelectedUser(record);
    setModalType("unfreeze");
    setModalVisible(true);
  };

  const confirmAction = async () => {
    if (!selectedUser) return;

    try {
      if (modalType === "freeze") {
        await freezeUser(selectedUser._openid || selectedUser.openId, "后台管理员冻结");
      } else {
        await unfreezeUser(selectedUser._openid || selectedUser.openId);
      }
      
      message.success(
        modalType === "freeze"
          ? `已冻结用户 ${selectedUser._openid || selectedUser.openId} 的账户`
          : `已解冻用户 ${selectedUser._openid || selectedUser.openId} 的账户`
      );
      setModalVisible(false);
      setSelectedUser(null);
      fetchUsers(); // 刷新列表
    } catch (error) {
      console.error("操作失败", error);
    }
  };

  const getStatusTag = (status: number | string) => {
    // 兼容可能存在的旧冻结状态逻辑（0是冻结，1是正常，或者 active/frozen）
    if (status === 1 || status === "active" || status === undefined) {
      return (
        <Tag className="status-tag-success">
          <span className="status-dot status-dot-active" />
          正常可用
        </Tag>
      );
    } else {
      return (
        <Tag className="status-tag-error">
          <span className="status-dot status-dot-frozen" />
          已被冻结
        </Tag>
      );
    }
  };

  const columns: TableProps<any>["columns"] = [
    {
      title: "用户 OpenID",
      dataIndex: "_openid", // 优先使用云开发自带的 _openid
      key: "_openid",
      width: 160,
      fixed: "left",
      render: (text) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{text}</span>,
    },
    {
      title: "昵称",
      dataIndex: "nickname",
      key: "nickname",
      width: 150,
    },
    {
      title: "累计积分",
      dataIndex: "totalPoints",
      key: "totalPoints",
      width: 120,
      align: "right",
      sorter: (a, b) => a.totalPoints - b.totalPoints,
      render: (value) => <span className="table-number-align">{value ? value.toLocaleString() : "0"}</span>,
    },
    {
      title: "可用积分",
      dataIndex: "availablePoints",
      key: "availablePoints",
      width: 120,
      align: "right",
      sorter: (a, b) => a.availablePoints - b.availablePoints,
      render: (value) => (
        <span className="table-number-align" style={{ color: "#07C160", fontWeight: 500 }}>
          {(Number(value) || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: "冻结积分",
      dataIndex: "frozenPoints",
      key: "frozenPoints",
      width: 120,
      align: "right",
      sorter: (a, b) => a.frozenPoints - b.frozenPoints,
      render: (value) => (
        <span className="table-number-align" style={{ color: "#FFA940" }}>
          {(Number(value) || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: "账户状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      filters: [
        { text: "正常可用", value: 1 },
        { text: "已被冻结", value: 0 },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => getStatusTag(status),
    },
    {
      title: "注册时间",
      dataIndex: "registerTime",
      key: "registerTime",
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
    {
      title: "最后活跃",
      dataIndex: "lastActiveTime",
      key: "lastActiveTime",
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          {record.status === 1 || record.status === undefined || record.status === "active" ? (
            <Button
              type="text"
              size="small"
              icon={<Lock size={14} />}
              onClick={() => handleFreeze(record)}
              style={{ color: "#FA5151" }}
            >
              冻结
            </Button>
          ) : (
            <Button
              type="text"
              size="small"
              icon={<Unlock size={14} />}
              onClick={() => handleUnfreeze(record)}
              style={{ color: "#07C160" }}
            >
              解冻
            </Button>
          )}
        </Space>
      ),
    },
  ];



  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <Wallet size={24} style={{ color: "#FF6B35" }} />
          用户积分
        </h2>
        <p style={{ color: "#666666", margin: "8px 0 0 0", fontSize: 14 }}>
          查看和管理用户积分资产及账户状态
        </p>
      </div>
      <Card className="dashboard-card">
        <div style={{ marginBottom: 16 }}>
          <Space size="middle" style={{ width: "100%", justifyContent: "space-between" }}>
            <Input
              placeholder="搜索 OpenID 或用户昵称"
              prefix={<Search size={16} />}
              style={{ width: 320 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <span style={{ color: "#888888", fontSize: 14 }}>
              共 {total} 个用户
            </span>
          </Space>
        </div>

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1300 }}
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
            background: "rgba(255, 169, 64, 0.1)",
            borderRadius: 4,
            color: "#888888",
            fontSize: 12,
          }}
        >
          <p style={{ margin: 0 }}>⚠️ 风控提示：</p>
          <p style={{ margin: "8px 0 0 0" }}>
            1. 冻结账户后，用户将无法提现，但可正常购买商品并获得积分<br />
            2. 冻结操作主要用于反制恶意退款刷单行为，请谨慎使用<br />
            3. 解冻操作将立即恢复用户的提现权限<br />
            4. 所有冻结/解冻操作将被记录在系统审计日志中
          </p>
        </div>
      </Card>

      {/* 确认弹窗 */}
      <Modal
        title={modalType === "freeze" ? "冻结用户账户" : "解冻用户账户"}
        open={modalVisible}
        onOk={confirmAction}
        onCancel={() => setModalVisible(false)}
        okText="确认"
        cancelText="取消"
        okButtonProps={{
          danger: modalType === "freeze",
        }}
      >
        {selectedUser && (
          <div style={{ lineHeight: 2 }}>
            <p>
              <strong>用户 OpenID：</strong>
              <span style={{ fontFamily: "monospace" }}>{selectedUser._openid || selectedUser.openId}</span>
            </p>
            <p>
              <strong>用户昵称：</strong>
              {selectedUser.nickname}
            </p>
            <p>
              <strong>累计积分：</strong>
              {selectedUser.totalPoints ? selectedUser.totalPoints.toLocaleString() : "0"} 分
            </p>
            <p>
              <strong>可用积分：</strong>
              {selectedUser.availablePoints ? selectedUser.availablePoints.toLocaleString() : "0"} 分
            </p>
            <p style={{ marginTop: 16, color: modalType === "freeze" ? "#FA5151" : "#07C160" }}>
              {modalType === "freeze"
                ? "⚠️ 确认要冻结该用户账户吗？冻结后用户将无法提现。"
                : "✓ 确认要解冻该用户账户吗？解冻后用户将恢复提现权限。"}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}