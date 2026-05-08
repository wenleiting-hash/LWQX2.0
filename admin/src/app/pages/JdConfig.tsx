import { useState, useEffect } from "react";
import { Card, Form, Input, Button, message, Spin, Typography } from "antd";
import { getSystemConfig, updateSystemConfig } from "../../services/api/index";
import { Zap, Save } from "lucide-react";

const { Title } = Typography;

export default function JdConfig() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getSystemConfig('jd_config');
      const config = data?.data || data || {};
      if (config) {
        form.setFieldsValue({
          jd_appkey: config.jd_appkey || config.jdAppKey || config.JD_APPKEY,
          zjk_appkey: config.zjk_appkey || config.zhetaokeAppKey,
          jd_union_id: config.jd_union_id || config.jdUnionId,
          jd_channel_id: config.jd_channel_id || config.jdChannelId,
          jd_position_id: config.jd_position_id || config.jdPositionId,
        });
      }
    } catch (e: any) {
      message.error("加载配置失败：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      
      // 先获取原有配置，合并后再保存，避免覆盖其他页面的参数 (如淘宝参数)
      const currentRes = await getSystemConfig('jd_config');
      const currentConfig = currentRes?.data || currentRes || {};
      const mergedConfig = { ...currentConfig, ...values };
      delete mergedConfig.status;
      
      await updateSystemConfig('jd_config', mergedConfig);
      message.success("京东参数保存成功！");
    } catch (e: any) {
      if (!e.errorFields) {
        message.error("保存失败：" + e.message);
      }
    } finally {
      setSaving(false);
    }
  };



  return (
    <div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
        当前位置 &gt; <span style={{ color: "#353535" }}>京东参数</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ padding: 8, background: "#EBF5FF", borderRadius: 8 }}>
          <Zap size={22} style={{ color: "#E4393C" }} />
        </div>
        <Title level={3} style={{ margin: 0 }}>折京客配置</Title>
      </div>

      <Card className="shadow-sm">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>🔗 联盟 SDK 核心参数 (折京客)</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}><Spin /></div>
        ) : (
          <Form form={form} layout="vertical" style={{ maxWidth: 640 }}>
            <Form.Item
              name="jd_appkey"
              label="京东 APPKEY"
              rules={[{ required: true, message: "必填" }]}
              extra="京东联盟开放平台分配的核心授权Key"
            >
              <Input.Password placeholder="输入京东 App Key" size="large" />
            </Form.Item>

            <Form.Item
              name="zjk_appkey"
              label="折淘客 APPKEY (用于调用京东精选接口)"
              rules={[{ required: true, message: "必填" }]}
              extra="折淘客官方提供的 AppKey，专门用于授权获取京东商品数据"
            >
              <Input placeholder="输入折淘客 App Key" size="large" />
            </Form.Item>

            <Form.Item
              name="jd_union_id"
              label="京东联盟ID"
              rules={[{ required: true, message: "必填" }]}
            >
              <Input placeholder="输入京东联盟ID" size="large" />
            </Form.Item>

            <Form.Item
              name="jd_channel_id"
              label="京东联盟渠道ID"
              extra="如有需要，输入京东联盟渠道ID..."
            >
              <Input placeholder="如有需要，输入京东联盟渠道ID..." size="large" />
            </Form.Item>

            <Form.Item
              name="jd_position_id"
              label="推广位ID (positionId)"
              extra="自定义推广位标识，留空默认使用联盟渠道ID等"
            >
              <Input placeholder="输入推广位ID" size="large" />
            </Form.Item>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32, paddingTop: 20, borderTop: "1px solid #f0f0f0" }}>

              <Button type="primary" size="large" icon={<Save size={14} />} loading={saving} onClick={handleSave}>
                保存
              </Button>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
}
