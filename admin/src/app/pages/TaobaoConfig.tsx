import { useState, useEffect } from "react";
import { Card, Form, Input, Button, message, Spin, Typography, Space } from "antd";
import { getSystemConfig, updateSystemConfig } from "../../services/api/index";
import { Zap, Save } from "lucide-react";

const { Title, Paragraph } = Typography;

export default function TaobaoConfig() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rawConfig, setRawConfig] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getSystemConfig('taobao_config');
      const config = data?.data || data || {};
      setRawConfig(data);
      if (config) {
        form.setFieldsValue({
          ztk_appkey: config.ztk_appkey || config.zhetaokeAppKey || config.ZHETAOKE_APP_KEY,
          taobao_pid: config.taobao_pid || config.taobaoPid || config.TAOBAO_PID,
          ztk_sid: config.ztk_sid || config.zhetaokeSid || config.ZHETAOKE_SID,
          taobao_channel_id: config.taobao_channel_id || config.taobaoChannelId || config.taobao_relation_id,
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
      
      // 先获取原有配置，合并后再保存，避免覆盖其他页面的参数 (如京东参数)
      const currentRes = await getSystemConfig('taobao_config');
      const currentConfig = currentRes?.data || currentRes || {};
      const mergedConfig = { ...currentConfig, ...values };
      delete mergedConfig.status;
      
      await updateSystemConfig('taobao_config', mergedConfig);
      message.success("淘宝参数保存成功！");
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ padding: 8, background: "#FFF0E8", borderRadius: 8 }}>
          <Zap size={22} style={{ color: "#FF6B35" }} />
        </div>
        <Title level={3} style={{ margin: 0 }}>折淘客配置</Title>
      </div>

      <Card className="shadow-sm">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>🔗 联盟 SDK 核心参数 (折淘客)</span>
        </div>
        

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}><Spin /></div>
        ) : (
          <Form form={form} layout="vertical" style={{ maxWidth: 640 }}>
            <Form.Item
              name="ztk_appkey"
              label="ZHETAOKE_APP_KEY"
              rules={[{ required: true, message: "必填" }]}
              extra="折淘客开放平台的唯一 App Key，用于接口鉴权"
            >
              <Input.Password placeholder="输入 App Key" size="large" />
            </Form.Item>

            <Form.Item
              name="taobao_pid"
              label="TAOBAO_PID"
              rules={[{ required: true, message: "必填" }]}
              extra="淘宝联盟官方推广位 PID，格式 mm_xxx_xxx_xxx"
            >
              <Input placeholder="mm_xxx_xxx_xxx" size="large" />
            </Form.Item>

            <Form.Item
              name="ztk_sid"
              label="ZHETAOKE_SID (可选)"
              extra="折淘客推荐位 SID，用于核心转链、订单回调"
            >
              <Input.Password placeholder="输入 SID" size="large" />
            </Form.Item>

            <Form.Item
              name="taobao_channel_id"
              label="淘宝联盟渠道ID"
              rules={[{ required: true, message: "必填" }]}
              extra="淘宝渠道专享ID，格式类似 mm_xxx_xxx_xxx"
            >
              <Input placeholder="mm_xxx_xxx_xxx" size="large" />
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
