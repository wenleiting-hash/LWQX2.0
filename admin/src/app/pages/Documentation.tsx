import { useState, useEffect } from "react";
import { Card, Button, message, Form, Input, Space, Divider, Empty, Popconfirm } from "antd";
import { Save, Plus, Trash2, GripVertical, AlertCircle, FileText } from "lucide-react";
import { getDoc, updateDoc } from "../../services/api/index";

export default function Documentation() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const res = await getDoc();
        const data = res.data || res;
        
        if (data && data.content) {
          // 尝试解析 JSON，如果解析失败（说明是旧的 HTML 格式），则提供默认结构
          try {
            const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
            if (Array.isArray(parsed)) {
              form.setFieldsValue({ categories: parsed });
            } else {
              throw new Error("Not an array");
            }
          } catch (e) {
            console.warn("无法解析旧的文档格式，使用默认结构", e);
            form.setFieldsValue({ categories: getDefaultData() });
          }
        } else {
          form.setFieldsValue({ categories: getDefaultData() });
        }
      } catch (error) {
        console.error("加载说明文档失败", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [form]);

  const getDefaultData = () => [
    {
      title: "1. 关于积分",
      items: [
        { q: "什么是积分？", a: "积分是平台提供的福利，您在购买受支持的特权商品或参与邀请活动时均可获得可观的积分奖励。" },
        { q: "积分怎么拿到手？", a: "您通过本平台转化的订单若无退款，对应的奖励积分将在下个月的 20 号自动到账至此账号。" }
      ]
    },
    {
      title: "2. 关于查券",
      items: [
        { q: "如何查询隐藏优惠？", a: "前往淘宝等 App 复制商品口令或分享链接，回到本小程序将自动进行弹窗解析；您也可以通过底部的搜索框手工查找全网商品。" }
      ]
    }
  ];

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      // 将结构化数据转为 JSON 字符串存储
      await updateDoc(JSON.stringify(values.categories));
      message.success("使用说明已保存");
    } catch (error) {
      console.error("保存说明文档失败", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="documentation-container">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <FileText size={24} style={{ color: "#FF6B35" }} />
          使用说明
        </h2>
        <p style={{ color: "#666666", margin: "8px 0 0 0", fontSize: 14 }}>
          编辑和管理系统使用说明文档
        </p>
      </div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
          <Button
            type="primary"
            size="large"
            icon={<Save size={18} />}
            onClick={handleSave}
            loading={saving}
            style={{ height: 44, padding: '0 24px' }}
          >
            保存所有配置
          </Button>
        </Space>
      </div>

      <Form form={form} layout="vertical">
        <Form.List name="categories">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Card
                  key={key}
                  className="dashboard-card"
                  style={{ marginBottom: 24, borderRadius: 8 }}
                  title={
                    <Form.Item
                      {...restField}
                      name={[name, 'title']}
                      noStyle
                      rules={[{ required: true, message: '请输入分类标题' }]}
                    >
                      <Input 
                        variant="borderless" 
                        placeholder="输入分类标题，例如：1. 关于积分" 
                        style={{ fontSize: 18, fontWeight: 700, color: '#FF6B35', padding: 0 }}
                      />
                    </Form.Item>
                  }
                  extra={
                    <Popconfirm
                      title="确定要删除整个分类吗？"
                      onConfirm={() => remove(name)}
                      okText="确认"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button type="text" danger icon={<Trash2 size={18} />} />
                    </Popconfirm>
                  }
                >
                  <Form.List name={[name, 'items']}>
                    {(subFields, { add: addSub, remove: removeSub }) => (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {subFields.map((subField) => (
                          <div 
                            key={subField.key} 
                            style={{ 
                              background: '#F9F9F9', 
                              padding: '20px', 
                              borderRadius: 8, 
                              position: 'relative',
                              border: '1px solid #F0F0F0'
                            }}
                          >
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                              <Form.Item
                                {...subField}
                                name={[subField.name, 'q']}
                                label={<span style={{ fontWeight: 600 }}>问题 (Q)</span>}
                                rules={[{ required: true, message: '请输入问题内容' }]}
                                style={{ marginBottom: 0 }}
                              >
                                <Input.TextArea autoSize placeholder="例如：什么是积分？" />
                              </Form.Item>
                              <Form.Item
                                {...subField}
                                name={[subField.name, 'a']}
                                label={<span style={{ fontWeight: 600 }}>回答 (A)</span>}
                                rules={[{ required: true, message: '请输入回答内容' }]}
                                style={{ marginBottom: 0 }}
                              >
                                <Input.TextArea autoSize={{ minRows: 2 }} placeholder="输入详细的回答内容..." />
                              </Form.Item>
                            </Space>
                            <Button 
                              type="text" 
                              danger 
                              icon={<Trash2 size={16} />} 
                              onClick={() => removeSub(subField.name)}
                              style={{ position: 'absolute', top: 10, right: 10 }}
                            />
                          </div>
                        ))}
                        <Button
                          type="dashed"
                          onClick={() => addSub()}
                          block
                          icon={<Plus size={16} />}
                          style={{ height: 48, borderRadius: 8, color: '#888888' }}
                        >
                          添加新问题
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </Card>
              ))}
              
              <Button
                type="dashed"
                onClick={() => add()}
                block
                size="large"
                icon={<Plus size={20} />}
                style={{ 
                  height: 60, 
                  borderRadius: 12, 
                  borderWidth: 2, 
                  background: 'rgba(255, 107, 53, 0.02)',
                  color: '#FF6B35',
                  borderColor: '#FF6B35',
                  marginBottom: 40
                }}
              >
                新增文档分类
              </Button>
            </>
          )}
        </Form.List>
      </Form>

      <div
        style={{
          padding: 24,
          background: 'rgba(255, 107, 53, 0.05)',
          borderRadius: 8,
          border: '1px dashed #FF6B35',
          color: '#353535',
          fontSize: 14,
          lineHeight: 1.8
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#FF6B35', fontWeight: 600 }}>
          <AlertCircle size={18} />
          <span>管理提示与规范</span>
        </div>
        <p style={{ margin: 0 }}>
          1. <strong>结构化同步</strong>：此处修改的内容将直接按卡片形式展示在小程序端的“使用说明”页面。<br />
          2. <strong>排序逻辑</strong>：建议分类标题包含数字序号（如 1. 2. ），方便用户快速定位。<br />
          3. <strong>极简文案</strong>：一个问题建议控制在两行以内，回答建议控制在五行以内，确保移动端阅读体验。<br />
          4. <strong>实时生效</strong>：点击上方“保存所有配置”后，小程序端将即时加载最新的 Q&A 内容。
        </p>
      </div>
    </div>
  );
}
