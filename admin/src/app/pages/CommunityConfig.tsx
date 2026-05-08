import { useState, useEffect, useRef } from "react";
import { Card, Form, Input, Button, message, Spin, Typography, Table, Switch, Tag, Popconfirm, DatePicker } from "antd";
import { getSystemConfig, updateSystemConfig } from "../../services/api/index";
import { QrCode, Upload as UploadIcon, Trash2, Save } from "lucide-react";
import dayjs from "dayjs";

const { Title } = Typography;

interface CommunityQRCode {
  id: string;
  qrCodeUrl: string;
  expirationDate: string;
  status: boolean;
  createdAt: number;
}

export default function CommunityConfig() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [qrCodes, setQrCodes] = useState<CommunityQRCode[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getSystemConfig('community_config');
      const data = res?.data || res || {};
      if (data && data.qrCodes && Array.isArray(data.qrCodes)) {
        setQrCodes(data.qrCodes);
      } else {
        setQrCodes([]);
      }
    } catch (e: any) {
      message.error("获取社群配置失败: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (dataToSave: CommunityQRCode[] = qrCodes) => {
    try {
      setSaving(true);
      await updateSystemConfig('community_config', { qrCodes: dataToSave });
      message.success("社群配置保存成功！");
    } catch (error: any) {
      message.error("保存社群配置失败");
      console.error("保存社群配置失败", error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const values = await form.validateFields().catch(() => null);
    if (!values || !values.expirationDate) {
      message.error("请先选择该二维码的失效日期");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const uploadDate = values.expirationDate.format('YYYY-MM-DD');
    const file = e.target.files?.[0];
    if (file) {
      try {
        message.loading({ content: "正在处理二维码...", key: "upload" });
        const { compressImage } = await import("../../utils/imageCompressor");
        const compressedBase64 = await compressImage(file, 400, 400, 0.8);
        
        const newRecord: CommunityQRCode = {
          id: Date.now().toString(),
          qrCodeUrl: compressedBase64,
          expirationDate: uploadDate,
          status: false,
          createdAt: Date.now(),
        };

        const updatedQrCodes = [newRecord, ...qrCodes];
        setQrCodes(updatedQrCodes);
        
        message.success({ content: "二维码处理成功", key: "upload" });
        await handleSave(updatedQrCodes);
        
        form.resetFields();
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error("二维码处理失败", error);
        message.error({ content: "二维码处理失败，请重试", key: "upload" });
      }
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    let updatedQrCodes = [...qrCodes];

    if (currentStatus) {
      updatedQrCodes = updatedQrCodes.map(q => 
        q.id === id ? { ...q, status: false } : q
      );
      
      const hasValid = updatedQrCodes.some(q => q.status);
      if (!hasValid && updatedQrCodes.length > 0) {
        updatedQrCodes.sort((a, b) => b.createdAt - a.createdAt);
        updatedQrCodes[0].status = true;
        message.info("已自动将最新上传的记录设为有效");
      }
    } else {
      updatedQrCodes = updatedQrCodes.map(q => ({
        ...q,
        status: q.id === id
      }));
    }

    setQrCodes(updatedQrCodes);
    await handleSave(updatedQrCodes);
  };

  const handleDelete = async (id: string) => {
    let updatedQrCodes = qrCodes.filter(q => q.id !== id);
    
    const deletedRecord = qrCodes.find(q => q.id === id);
    if (deletedRecord?.status && updatedQrCodes.length > 0) {
      updatedQrCodes.sort((a, b) => b.createdAt - a.createdAt);
      updatedQrCodes[0].status = true;
      message.info("当前有效记录被删除，已自动将最新记录设为有效");
    }

    setQrCodes(updatedQrCodes);
    await handleSave(updatedQrCodes);
  };

  const columns = [
    {
      title: '二维码图片',
      dataIndex: 'qrCodeUrl',
      key: 'qrCodeUrl',
      width: 120,
      render: (text: string) => (
        <div style={{ width: 64, height: 64, border: '1px solid #f0f0f0', borderRadius: 4, padding: 4, background: '#fff' }}>
          <img src={text} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      )
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (text: number) => dayjs(text).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '失效日期',
      dataIndex: 'expirationDate',
      key: 'expirationDate',
      width: 140
    },
    {
      title: '当前状态',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: boolean, record: CommunityQRCode) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Switch 
            checked={status} 
            onChange={() => toggleStatus(record.id, status)}
            disabled={saving}
          />
          {status ? (
            <Tag color="success">生效中</Tag>
          ) : (
            <Tag color="default">已无效</Tag>
          )}
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      align: 'right' as const,
      render: (_: any, record: CommunityQRCode) => (
        <Popconfirm
          title="确定要删除该二维码记录吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="text" danger icon={<Trash2 size={16} />} disabled={saving} />
        </Popconfirm>
      )
    }
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ padding: 8, background: "#FFF0E8", borderRadius: 8 }}>
          <QrCode size={22} style={{ color: "#FF6B35" }} />
        </div>
        <div>
          <Title level={3} style={{ margin: 0 }}>社群配置</Title>
          <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>
            管理微信群二维码，支持历史记录溯源，同一时间仅允许一条记录生效
          </div>
        </div>
      </div>

      <Card className="shadow-sm" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, borderBottom: "1px solid #f0f0f0", paddingBottom: 16 }}>
          <UploadIcon size={18} style={{ color: "#FF6B35" }} />
          <span style={{ fontSize: 16, fontWeight: 500 }}>上传新二维码</span>
        </div>
        
        <Form form={form} layout="inline" style={{ alignItems: 'flex-start' }}>
          <Form.Item
            name="expirationDate"
            label="该二维码失效日期"
            rules={[{ required: true, message: "请选择失效日期" }]}
            style={{ marginBottom: 16 }}
          >
            <DatePicker style={{ width: 200 }} size="large" />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 16 }}>
            <div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: "none" }} 
              />
              <Button 
                type="primary" 
                icon={<UploadIcon size={16} />} 
                size="large"
                onClick={async () => {
                  try {
                    await form.validateFields();
                    fileInputRef.current?.click();
                  } catch (e) {
                    // validation failed
                  }
                }}
                loading={saving}
              >
                选择图片并上传
              </Button>
            </div>
          </Form.Item>
        </Form>
        <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          提示：上传的新二维码将自动记录到历史列表，默认状态为“无效”。您可以在下方列表中将其设为“有效”。
        </div>
      </Card>

      <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 16, background: '#FF6B35', borderRadius: 2 }}></div>
          <span style={{ fontSize: 16, fontWeight: 500 }}>历史二维码记录</span>
        </div>
        
        <Table 
          columns={columns} 
          dataSource={[...qrCodes].sort((a, b) => b.createdAt - a.createdAt)} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
          style={{ padding: '0 24px 24px 24px' }}
        />
      </Card>
    </div>
  );
}
