import React, { useState, useEffect } from "react";
import { Card, Table, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Tag, Space, Typography } from "antd";
import { fetchSeedBulletins, addSeedBulletin, deleteSeedBulletin } from "../../services/api";
import { MessageSquare, Plus, Trash2 } from "lucide-react";

const { Title, Paragraph } = Typography;

export default function SeedBulletin() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchSeedBulletins();
      setData(res || []);
    } catch (e: any) {
      message.error("加载种子弹幕失败：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      await addSeedBulletin(values);
      message.success("新增种子弹幕成功");
      setIsModalVisible(false);
      loadData();
    } catch (e: any) {
      if (!e.errorFields) {
        message.error("新增失败：" + e.message);
      }
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteSeedBulletin(docId);
      message.success("删除成功");
      loadData();
    } catch (e: any) {
      message.error("删除失败：" + e.message);
    }
  };

  const columns = [
    {
      title: "脱敏昵称",
      dataIndex: "nickname_masked",
      key: "nickname_masked",
      render: (text: string) => <Tag color="purple">{text}</Tag>
    },
    {
      title: "商品短标题",
      dataIndex: "title_short",
      key: "title_short",
    },
    {
      title: "省钱金额",
      dataIndex: "saved_amount",
      key: "saved_amount",
      render: (val: number) => <strong className="text-red-500">¥{val?.toFixed(2)}</strong>
    },
    {
      title: "操作",
      key: "action",
      render: (_: any, record: any) => (
        <Popconfirm title="确定删除这条记录吗？" onConfirm={() => handleDelete(record._id)}>
          <Button danger type="text" icon={<Trash2 size={16} />}>删除</Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
          <MessageSquare size={24} />
        </div>
        <Title level={2} style={{ margin: 0 }}>种子弹幕管理</Title>
      </div>

      <Card className="shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <Paragraph type="secondary" style={{ margin: 0 }}>
            这些是静态的种子数据，用于在没有真实查券行为时，在查券页上方滚动播放。
          </Paragraph>
          <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>
            新增种子弹幕
          </Button>
        </div>

        <Table 
          dataSource={data} 
          columns={columns} 
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="新增种子弹幕"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="nickname_masked" 
            label="脱敏昵称" 
            rules={[{ required: true, message: '请输入昵称，如：黄**' }]}
          >
            <Input placeholder="黄**" />
          </Form.Item>
          <Form.Item 
            name="title_short" 
            label="商品短标题" 
            rules={[{ required: true, message: '请输入短标题（建议6字内）' }]}
          >
            <Input placeholder="抽纸10包" />
          </Form.Item>
          <Form.Item 
            name="saved_amount" 
            label="省钱金额" 
            rules={[{ required: true, message: '请输入省钱金额' }]}
          >
            <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} placeholder="25.5" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
