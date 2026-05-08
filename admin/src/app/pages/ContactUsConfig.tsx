import { useState, useEffect, useRef } from "react";
import { Card, Form, Input, Button, message, Spin, Typography } from "antd";
import { getSystemConfig, updateSystemConfig } from "../../services/api/index";
import { Headphones, Upload as UploadIcon, QrCode, Phone, Info, Save } from "lucide-react";

const { Title } = Typography;

export default function ContactUsConfig() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getSystemConfig('contact_config');
      const data = res?.data || res || {};
      if (data && !data.status) {
        form.setFieldsValue({
          wechatId: data.wechatId,
          phone: data.phone,
        });
        setQrCodeUrl(data.qrCodeUrl || "");
      }
    } catch (e: any) {
      message.error("获取联系我们配置失败: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!values.wechatId && !values.phone && !qrCodeUrl) {
        message.warning("请至少填写一项内容");
        return;
      }
      
      setSaving(true);
      await updateSystemConfig('contact_config', { ...values, qrCodeUrl });
      message.success("联系我们配置保存成功！");
    } catch (e: any) {
      if (!e.errorFields) {
        message.error("保存联系我们配置失败: " + e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        message.loading({ content: "正在处理二维码...", key: "upload" });
        const { compressImage } = await import("../../utils/imageCompressor");
        const compressedBase64 = await compressImage(file, 400, 400, 0.8);
        setQrCodeUrl(compressedBase64);
        message.success({ content: "二维码已暂存本地，请点击「保存」上传", key: "upload" });
      } catch (error) {
        console.error("二维码处理失败", error);
        message.error({ content: "二维码处理失败，请重试", key: "upload" });
      }
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ padding: 8, background: "#FFF0E8", borderRadius: 8 }}>
          <Headphones size={22} style={{ color: "#FF6B35" }} />
        </div>
        <div>
          <Title level={3} style={{ margin: 0 }}>联系我们配置</Title>
          <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>
            设置小程序端“联系我们”页面展示的客服微信号、手机号及二维码
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}><Spin /></div>
      ) : (
        <Form form={form} layout="vertical" style={{ maxWidth: 800 }}>
          <Card className="shadow-sm" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, borderBottom: "1px solid #f0f0f0", paddingBottom: 16 }}>
              <Info size={18} style={{ color: "#FF6B35" }} />
              <span style={{ fontSize: 16, fontWeight: 500 }}>基本联系信息</span>
            </div>
            
            <Form.Item
              name="wechatId"
              label={
                <span>
                  客服微信号 <span style={{ color: "#FA5151" }}>*</span>
                </span>
              }
              extra="用户在小程序中可一键复制该微信号"
            >
              <Input placeholder="请输入客服微信号" size="large" style={{ maxWidth: 400 }} />
            </Form.Item>

            <Form.Item
              name="phone"
              label={
                <span>
                  客服手机号 <span style={{ color: "#FA5151" }}>*</span>
                </span>
              }
              extra="用户在小程序中可一键拨打该号码"
            >
              <Input prefix={<Phone size={16} style={{ color: "#bfbfbf" }} />} placeholder="请输入客服手机号" size="large" style={{ maxWidth: 400 }} />
            </Form.Item>
          </Card>

          <Card className="shadow-sm">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, borderBottom: "1px solid #f0f0f0", paddingBottom: 16 }}>
              <QrCode size={18} style={{ color: "#FF6B35" }} />
              <span style={{ fontSize: 16, fontWeight: 500 }}>客服微信二维码</span>
            </div>
            
            <Form.Item
              label="上传二维码图片"
              extra="推荐尺寸：400x400px，支持 JPG、PNG 格式，大小不超过 2MB"
            >
              <div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  style={{ display: "none" }} 
                />
                <Button 
                  icon={<UploadIcon size={16} />} 
                  onClick={() => fileInputRef.current?.click()}
                >
                  点击上传客服二维码
                </Button>
              </div>
              {qrCodeUrl && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 14, color: "#888", marginBottom: 8 }}>二维码预览：</div>
                  <img 
                    src={qrCodeUrl} 
                    alt="客服二维码" 
                    style={{ width: 160, height: 160, borderRadius: 8, border: "1px solid #e5e5e5", objectFit: "cover" }}
                  />
                </div>
              )}
            </Form.Item>
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32, paddingTop: 20, borderTop: "1px solid #f0f0f0" }}>
              <Button size="large" onClick={loadData} disabled={saving}>
                重置
              </Button>
              <Button type="primary" size="large" icon={<Save size={14} />} loading={saving} onClick={handleSave}>
                保存配置
              </Button>
            </div>
          </Card>
        </Form>
      )}
    </div>
  );
}
