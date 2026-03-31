import { useState, useEffect } from "react";
import { Card, Form, Input, Button, Upload, message, Row, Col, Space, Image as AntImage, Spin } from "antd";
import { Upload as UploadIcon, QrCode, MessageSquare, Store, Save, Info, Briefcase, Search } from "lucide-react";
import { getOperationsConfig, updateOperationsConfig } from "../../services/api/index";

const { TextArea } = Input;

interface ConfigData {
  qrCode: string;
  shareText: string;
  videoShopUrl: string;
  wechatId: string;
  subsidyKeywords: string;
  subsidyTagText: string;
}

export default function OperationConfig() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  
  // 初始化表单数据
  const initialValues: ConfigData = {
    qrCode: "",
    shareText: "邀请你一起用小栗鼠购物，领券省钱，还能赚佣金！点击链接立即加入 👉",
    videoShopUrl: "https://channels.weixin.qq.com/shop/xxxxx",
    wechatId: "LaoWenHQ",
    subsidyKeywords: "补贴, 政府, 以旧换新",
    subsidyTagText: "政府补贴",
  };

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setFetching(true);
        const res = await getOperationsConfig();
        const data = res.data || res;
        // 如果后端有返回有效数据
        if (data && Object.keys(data).length > 0 && !data.status) {
          form.setFieldsValue(data);
          if (data.qrCode) {
            setQrCodeUrl(data.qrCode);
          }
        }
      } catch (error) {
        console.error("获取运营配置失败", error);
      } finally {
        setFetching(false);
      }
    };
    fetchConfig();
  }, [form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      await updateOperationsConfig(values);
      
      message.success("运营配置保存成功！");
      console.log("保存的配置数据：", values);
      
    } catch (error: any) {
      if (error && error.errorFields) {
        message.error("请完善必填信息");
      } else {
        message.error("保存运营配置失败");
        console.error("保存运营配置失败", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQrCodeUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setQrCodeUrl(url);
      form.setFieldValue("qrCode", url);
      message.success("二维码已暂存本地，请点击底部「保存配置」上传");
    };
    reader.readAsDataURL(file);
    return false; // 阻止自动上传，改为 base64 存储或其他机制
  };

  return (
    <Spin spinning={fetching}>
      <div style={{ padding: '0 0 24px 0' }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <Briefcase size={24} style={{ color: "#FF6B35" }} />
            运营配置
          </h2>
          <p style={{ color: "#666666", margin: "8px 0 0 0", fontSize: 14 }}>
            管理小程序端分享文案、社群二维码及视频号店地址
          </p>
        </div>

        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          autoComplete="off"
        >
          <Row gutter={24}>
            {/* 配置表单 */}
            <Col xs={24} lg={24}>
              {/* 私域社群二维码 */}
              <Card
                className="premium-card"
                style={{ marginBottom: 24 }}
                title={
                  <Space>
                    <QrCode style={{ color: "#FF6B35", fontSize: 18 }} />
                    <span>加入老温私域社群</span>
                  </Space>
                }
              >
                <Form.Item
                  label="社群二维码"
                  name="qrCode"
                  extra="推荐尺寸：400x400px，支持 JPG、PNG 格式，大小不超过 2MB"
                >
                  <Upload
                    beforeUpload={handleQrCodeUpload}
                    maxCount={1}
                    accept="image/*"
                    showUploadList={false}
                  >
                    <Button>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <UploadIcon size={16} />
                        <span>点击上传二维码</span>
                      </div>
                    </Button>
                  </Upload>
                </Form.Item>

                <Form.Item
                  label="客服微信号"
                  name="wechatId"
                  rules={[{ required: true, message: "请输入客服微信号" }]}
                >
                  <Input placeholder="请输入微信号，方便用户复制添加" />
                </Form.Item>
                
                {qrCodeUrl && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 14, color: "#666666", marginBottom: 8 }}>
                      二维码预览：
                    </div>
                    <AntImage
                      src={qrCodeUrl}
                      alt="社群二维码"
                      width={200}
                      style={{ borderRadius: 8, border: "1px solid #f2f2f2" }}
                    />
                  </div>
                )}
              </Card>

              {/* 搜索与转化配置 */}
              <Card
                className="premium-card"
                title={
                  <Space>
                    <Search style={{ color: "#FF6B35", fontSize: 18 }} />
                    <span>搜索与转化配置</span>
                  </Space>
                }
              >
                <Form.Item
                  label="补贴检测关键词"
                  name="subsidyKeywords"
                  extra="多个关键词请用逗号(,)分隔。当商品标题或描述包含这些词时，将自动标注为补贴商品。"
                >
                  <Input placeholder="例如：补贴, 政府, 以旧换新, 百亿补贴" />
                </Form.Item>

                <Form.Item
                  label="补贴标签文案"
                  name="subsidyTagText"
                  initialValue="政府补贴"
                  rules={[{ required: true, message: "请输入标签文案" }]}
                >
                  <Input placeholder="例如：政府补贴、大促补贴" maxLength={10} />
                </Form.Item>

                <div
                  style={{
                    background: "#f0fdf4",
                    padding: 12,
                    borderRadius: 6,
                    fontSize: 13,
                    color: "#166534",
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <Info size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    当用户在小程序内“搜索”或“解析口令”时，系统将根据以上配置自动增强商品展示。
                  </div>
                </div>
              </Card>

              {/* 邀请好友分享文案 */}
              <Card
                className="premium-card"
                style={{ marginBottom: 24, marginTop: 24 }}
                title={
                  <Space>
                    <MessageSquare style={{ color: "#FF6B35", fontSize: 18 }} />
                    <span>邀请好友一起省钱</span>
                  </Space>
                }
              >
                <Form.Item
                  label="分享文案"
                  name="shareText"
                  rules={[
                    { required: true, message: "请输入分享文案" },
                    { max: 200, message: "文案长度不能超过200字" },
                  ]}
                  extra='用户点击「邀请好友」时，会使用此文案进行分享（200字以内）'
                >
                  <TextArea
                    rows={4}
                    placeholder="请输入分享文案..."
                    showCount
                    maxLength={200}
                    style={{ fontSize: 14 }}
                  />
                </Form.Item>
              </Card>

              {/* 视频号店地址 */}
              <Card
                className="premium-card"
                title={
                  <Space>
                    <Store style={{ color: "#FF6B35", fontSize: 18 }} />
                    <span>视频号店</span>
                  </Space>
                }
              >
                <Form.Item
                  label="视频号店地址"
                  name="videoShopUrl"
                  rules={[
                    { required: true, message: "请输入视频号店地址" },
                    { type: "url", message: "请输入正确的URL格式" },
                  ]}
                  extra="请输入完整的视频号店铺链接地址"
                >
                  <Input
                    placeholder="https://channels.weixin.qq.com/shop/xxxxx"
                    prefix={<Store style={{ color: "#d0d0d0", fontSize: 18 }} />}
                    style={{ fontSize: 14 }}
                  />
                </Form.Item>
              </Card>
            </Col>

          </Row>

          {/* 保存按钮 */}
          <div
            style={{
              marginTop: 24,
              padding: "16px 24px",
              background: "#ffffff",
              borderRadius: 8,
              border: "1px solid #f2f2f2",
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
            }}
          >
            <Button
              type="default"
              size="large"
              onClick={() => form.resetFields()}
            >
              重置
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<Save size={16} />}
              loading={loading}
              onClick={handleSave}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              保存配置
            </Button>
          </div>
        </Form>
      </div>
    </Spin>
  );
}
