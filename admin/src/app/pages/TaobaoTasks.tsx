import { useState, useEffect } from "react";
import { Activity, PlayCircle, StopCircle, RefreshCw, Settings, LayoutGrid, Save } from "lucide-react";
import { getCronLogs, runCronTask, getSystemConfig, updateSystemConfig } from "../../services/api/index";
import { Card, Table, Button, Typography, Space, message, Modal, Form, DatePicker, Select, Input, Row, Col } from "antd";
import dayjs from "dayjs";

const { Paragraph, Text } = Typography;

export default function TaobaoTasks() {
  const [loading, setLoading] = useState(false);
  const [taskStatus, setTaskStatus] = useState<"running" | "stopped">("stopped");
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [triggering, setTriggering] = useState(false);

  const [isSetupModalVisible, setIsSetupModalVisible] = useState(false);
  const [setupConfig, setSetupConfig] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const openSetupModal = async () => {
    setIsSetupModalVisible(true);
    try {
      const res = await getSystemConfig('taobao_config');
      const config = res?.data || res || {};
      setSetupConfig(config);
      form.setFieldsValue({
        syncInterval: config.syncInterval || '30',
        apiUrl: config.apiUrl || 'https://api.zhetaoke.com:10001/api/open_dingdanchaxun2.ashx',
        startTime: config.startTime ? dayjs(config.startTime) : undefined,
        endTime: config.endTime ? dayjs(config.endTime) : undefined,
      });
    } catch (e) {
      message.error("加载配置失败");
    }
  };

  const handleSaveSetup = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (values.startTime) values.startTime = values.startTime.format('YYYY-MM-DD HH:mm:ss');
      if (values.endTime) values.endTime = values.endTime.format('YYYY-MM-DD HH:mm:ss');
      const mergedConfig = { ...setupConfig, ...values };
      await updateSystemConfig('taobao_config', mergedConfig);
      message.success("保存设定成功");
      setIsSetupModalVisible(false);
    } catch (e) {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const fetchLogs = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      const res = await getCronLogs({ taskId: 'sync_tk_orders', page, pageSize });
      const data = res?.data || res;
      if (data && Array.isArray(data.list)) {
        setLogs(data.list);
        setPagination(prev => ({ ...prev, current: page, pageSize, total: data.total || 0 }));
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error("加载日志失败", error);
      message.error("加载执行日志失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await getSystemConfig('taobao_config');
      const config = res?.data || res || {};
      setSetupConfig(config);
      if (config.taskEnabled) {
        setTaskStatus("running");
      } else {
        setTaskStatus("stopped");
      }
    } catch (e) {
      console.error("加载配置失败", e);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchConfig();
  }, []);

  const handleManualTrigger = async () => {
    try {
      setTriggering(true);
      const extraPayload: any = {};
      if (setupConfig && setupConfig.startTime && setupConfig.endTime) {
         extraPayload.startTime = setupConfig.startTime;
         extraPayload.endTime = setupConfig.endTime;
      }
      const res: any = await runCronTask('sync_tk_orders', extraPayload);
      if (res?.code === 200 || res?.msg) {
        message.success(res?.msg || "同步任务已触发");
        setTimeout(() => fetchLogs(1, pagination.pageSize), 2000);
      } else {
        message.error(res?.msg || "触发失败");
      }
    } catch (error: any) {
      console.error("触发任务失败", error);
      message.error(error.message || "触发任务失败");
    } finally {
      setTriggering(false);
    }
  };

  const toggleTaskStatus = async (status: "running" | "stopped") => {
    try {
      const isEnabled = status === "running";
      setTaskStatus(status);
      const mergedConfig = { ...setupConfig, taskEnabled: isEnabled };
      await updateSystemConfig('taobao_config', mergedConfig);
      setSetupConfig(mergedConfig);
      message.success(isEnabled ? "已开启定时任务" : "已停止定时任务");
    } catch (error) {
      message.error("更新状态失败");
    }
  };

  const formatDate = (text: string) => {
    if (!text) return "-";
    const date = new Date(text);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const columns = [
    {
      title: "执行时间",
      dataIndex: "startTime",
      key: "startTime",
      width: 200,
      render: (text: string) => (
        <Paragraph ellipsis={{ tooltip: true }} copyable={text ? { text: formatDate(text) } : false} style={{ margin: 0 }} className="font-mono text-slate-600">
          {formatDate(text)}
        </Paragraph>
      )
    },
    {
      title: "拉取总量(单)",
      key: "total",
      width: 140,
      render: (_: any, record: any) => (
        <span className="font-medium text-slate-700">{record.results?.total || 0}</span>
      )
    },
    {
      title: "有效付款",
      key: "valid",
      width: 140,
      render: (_: any, record: any) => (
        <span className="text-blue-600 font-medium">{record.results?.valid || 0}</span>
      )
    },
    {
      title: "已结算",
      key: "settled",
      width: 140,
      render: (_: any, record: any) => (
        <span className="text-emerald-500 font-medium">{record.results?.settled || 0}</span>
      )
    },
    {
      title: "失效/违规",
      key: "invalid",
      width: 140,
      render: (_: any, record: any) => (
        <span className="text-slate-400">{record.results?.invalid || 0}</span>
      )
    },
    {
      title: "操作",
      key: "action",
      align: "right" as const,
      render: (_: any, record: any) => (
        <Button
          type="text"
          size="small"
          className="text-[#FF6200] hover:text-[#e05600] hover:bg-[#FF6200]/5"
          onClick={() => message.info(`耗时: ${record.duration || 0}ms, 状态: ${record.status || 'unknown'}`)}
          icon={<LayoutGrid className="w-4 h-4" />}
        >
          查看明细
        </Button>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-1">
            淘宝订单同步调度
          </h2>
          <div className="text-sm text-slate-500 flex items-center gap-2">
            管理淘宝联盟订单的系统自动化拉取规则与记录
            <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
              <span>状态:</span>
              {taskStatus === "running" ? (
                <span className="text-emerald-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  运行中
                </span>
              ) : (
                <span className="text-slate-400">已停止</span>
              )}
            </div>
          </div>
        </div>
        <Space wrap size="middle">
          <Button
            type="default"
            className="text-blue-600 border-blue-100 bg-blue-50 hover:bg-blue-100 hover:border-blue-200"
            icon={triggering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            onClick={handleManualTrigger}
            disabled={triggering}
          >
            手动执行
          </Button>
          <Button
            type="default"
            className="text-emerald-600 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-200"
            icon={<PlayCircle className="w-4 h-4" />}
            onClick={() => toggleTaskStatus("running")}
          >
            任务开启
          </Button>
          <Button
            type="default"
            className="text-rose-500 border-rose-100 bg-rose-50 hover:bg-rose-100 hover:border-rose-200"
            icon={<StopCircle className="w-4 h-4" />}
            onClick={() => toggleTaskStatus("stopped")}
          >
            任务停止
          </Button>
          <Button
            type="default"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => fetchLogs(pagination.current, pagination.pageSize)}
            disabled={loading}
          >
            刷新状态
          </Button>
          <Button
            type="primary"
            style={{ backgroundColor: "#0f172a", borderColor: "#0f172a" }}
            icon={<Settings className="w-4 h-4" />}
            onClick={openSetupModal}
          >
            任务设置
          </Button>
        </Space>
      </div>

      {/* Main Card */}
      <Card
        bordered={false}
        className="shadow-sm rounded-2xl overflow-hidden"
        styles={{ body: { padding: 0 } }}
      >
        <div className="p-6 pb-4 flex items-center gap-2">
          <div className="w-1 h-4 bg-[#FF6200] rounded-full"></div>
          <span className="text-base font-medium text-slate-900">同步执行明细</span>
        </div>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey={(record) => record._id || record.id}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (page, size) => fetchLogs(page, size),
            className: "px-6 pb-6"
          }}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#FF6200]" />
            <span className="text-lg text-slate-800 font-medium">淘宝订单调度设置</span>
          </div>
        }
        open={isSetupModalVisible}
        onCancel={() => setIsSetupModalVisible(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-6">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="startTime" label={<span className="text-slate-500">开始时间</span>}>
                <DatePicker showTime style={{ width: '100%' }} placeholder="年/月/日 --:--" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label={<span className="text-slate-500">结束时间 (不选为长期任务)</span>}>
                <DatePicker showTime style={{ width: '100%' }} placeholder="年/月/日 --:--" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="syncInterval" label={<span className="text-slate-500">同步请求间隔</span>}>
                <Select>
                  <Select.Option value="10">每 10 分钟</Select.Option>
                  <Select.Option value="30">每 30 分钟</Select.Option>
                  <Select.Option value="60">每 60 分钟</Select.Option>
                  <Select.Option value="120">每 120 分钟</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="apiUrl" label={<span className="text-slate-500">接口预设地址</span>}>
                <Input placeholder="输入预设地址" />
              </Form.Item>
            </Col>
          </Row>

          <div className="mt-4 p-5 bg-[#FFF8F3] rounded-lg border border-[#FFEDDF]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF6200]"></div>
              <span className="text-[#D95300] font-medium text-sm">接口参数回显</span>
            </div>
            <Row gutter={16}>
              <Col span={8}>
                <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                  <div className="text-xs text-[#FF8C42] mb-1">APP_KEY</div>
                  <div className="text-slate-700 font-mono text-sm truncate">
                    {setupConfig?.ztk_appkey || setupConfig?.zhetaokeAppKey || '未配置'}
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                  <div className="text-xs text-[#FF8C42] mb-1">淘宝 PID</div>
                  <div className="text-slate-700 font-mono text-sm truncate">
                    {setupConfig?.taobao_pid || setupConfig?.taobaoPid || '未配置'}
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div className="bg-white p-3 rounded shadow-sm border border-slate-100">
                  <div className="text-xs text-[#FF8C42] mb-1">授权 SID</div>
                  <div className="text-slate-700 font-mono text-sm truncate">
                    {setupConfig?.ztk_sid || setupConfig?.zhetaokeSid || '未配置'}
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
            <Button onClick={() => setIsSetupModalVisible(false)}>取消</Button>
            <Button
              type="primary"
              style={{ backgroundColor: "#FF6200", borderColor: "#FF6200" }}
              icon={<Save className="w-4 h-4" />}
              loading={saving}
              onClick={handleSaveSetup}
            >
              保存设定
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
