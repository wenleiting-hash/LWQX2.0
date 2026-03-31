import { useState, useEffect } from "react";
import { Card, Form, Input, Button, message, Tabs, Spin } from "antd";
import { Save, Settings } from "lucide-react";
import { getSystemConfig, updateSystemConfig } from "../../services/api/index";

export default function SystemConfig() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await getSystemConfig();
        const data = res.data || res;
        if (data) {
          form.setFieldsValue(data);
        }
      } catch (error) {
        console.error("获取配置失败", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [form]);

  const onFinish = async (values: any) => {
    try {
      setSaving(true);
      await updateSystemConfig(values);
      message.success("配置已保存");
    } catch (error) {
      console.error("保存配置失败", error);
    } finally {
      setSaving(false);
    }
  };

  const tabItems = [
    {
      key: "zhetaoke",
      label: "折淘客",
      children: (
        <div>
          <Form.Item
            label="ZHETAOKE_APP_KEY"
            name="zhetaokeAppKey"
            rules={[{ required: true, message: "请输入折淘客 APP_KEY" }]}
            extra="用于调用折淘客 API 获取商品信息与佣金数据"
          >
            <Input placeholder="请输入折淘客 APP_KEY" />
          </Form.Item>

          <Form.Item
            label="TAOBAO_PID"
            name="taobaoPid"
            rules={[{ required: true, message: "请输入淘宝 PID" }]}
            extra="格式：mm_账户ID_渠道ID_推广位ID"
          >
            <Input placeholder="mm_90082353_3402400017_116243300175" />
          </Form.Item>

          <Form.Item
            label="ZHETAOKE_SID"
            name="zhetaokeSid"
            extra="折淘客渠道 ID (也可从 PID 中自动解析)"
          >
            <Input placeholder="请输入折淘客渠道 ID" />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "jd",
      label: "京东联盟",
      children: (
        <div>
          <Form.Item
            label="京东联盟 ID"
            name="jdUnionId"
            rules={[{ required: true, message: "请输入京东联盟 ID" }]}
          >
            <Input placeholder="请输入京东联盟 ID" />
          </Form.Item>

          <Form.Item
            label="京东推广位 ID"
            name="jdPositionId"
            rules={[{ required: true, message: "请输入京东推广位 ID" }]}
          >
            <Input placeholder="请输入京东推广位 ID" />
          </Form.Item>

          <Form.Item
            label="京东 App Key"
            name="jdAppKey"
            rules={[{ required: true, message: "请输入京东 App Key" }]}
          >
            <Input placeholder="请输入京东 App Key" />
          </Form.Item>

          <Form.Item
            label="京东 App Secret"
            name="jdAppSecret"
            rules={[{ required: true, message: "请输入京东 App Secret" }]}
          >
            <Input.Password placeholder="请输入京东 App Secret" />
          </Form.Item>
        </div>
      ),
    },
    {
      key: "pdd",
      label: "拼多多",
      children: (
        <div>
          <Form.Item
            label="拼多多 Client ID"
            name="pddClientId"
            rules={[{ required: true, message: "请输入拼多多 Client ID" }]}
          >
            <Input placeholder="请输入拼多多 Client ID" />
          </Form.Item>

          <Form.Item
            label="拼多多 Client Secret"
            name="pddClientSecret"
            rules={[{ required: true, message: "请输入拼多多 Client Secret" }]}
          >
            <Input.Password placeholder="请输入拼多多 Client Secret" />
          </Form.Item>

          <Form.Item
            label="拼多多 PID"
            name="pddPid"
            rules={[{ required: true, message: "请输入拼多多 PID" }]}
            extra="格式：推广位ID_频道ID"
          >
            <Input placeholder="3000000_123456789" />
          </Form.Item>
        </div>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <Settings size={24} style={{ color: "#FF6B35" }} />
            基础设置
          </h2>
          <p style={{ color: "#666666", margin: "8px 0 0 0", fontSize: 14 }}>
            配置电商平台API密钥和推广位参数
          </p>
        </div>
        <Card className="dashboard-card">
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
          >
          <Tabs defaultActiveKey="zhetaoke" items={tabItems} size="large" />

          <Form.Item style={{ marginTop: 32 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<Save size={18} />}
              loading={saving}
            >
              保存配置
            </Button>
            <Button
              style={{ marginLeft: 16 }}
              size="large"
              onClick={() => form.resetFields()}
            >
              重置
            </Button>
          </Form.Item>
        </Form>

        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "rgba(255, 169, 64, 0.1)",
            borderRadius: 4,
            color: "#888888",
            fontSize: 12,
          }}
        >
          <p style={{ margin: 0 }}>⚠️ 安全提示：</p>
          <p style={{ margin: "8px 0 0 0" }}>
            1. 所有配置信息仅存储在服务器端，不会在前端明文展示<br />
            2. 修改配置后需要重启相关服务才能生效<br />
            3. 请妥善保管所有 API 密钥，切勿泄露给第三方
          </p>
        </div>
      </Card>
    </div>
    </Spin>
  );
}