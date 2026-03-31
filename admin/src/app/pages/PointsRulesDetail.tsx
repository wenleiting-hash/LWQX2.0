import { useEffect } from "react";
import { Card, Form, Input, InputNumber, Switch, Button, message, Divider, Space } from "antd";
import { Save, Info, ArrowLeft } from "lucide-react";
import { useParams, useNavigate } from "react-router";
import { getPointsRule, createPointsRule, updatePointsRule } from "../../services/api/index";
import { useState } from "react";

export default function PointsRulesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isNew = id === "new";

  // 加载详情数据
  useEffect(() => {
    if (!isNew && id) {
      const fetchDetail = async () => {
        try {
          setLoading(true);
          const res = await getPointsRule(id);
          const data = res.data || res;
          if (data) {
            form.setFieldsValue(data);
          }
        } catch (error) {
          console.error("加载规则详情失败", error);
          message.error("加载失败");
        } finally {
          setLoading(false);
        }
      };
      fetchDetail();
    }
  }, [id, isNew, form]);

  const onFinish = async (values: any) => {
    try {
      setSaving(true);
      if (isNew) {
        await createPointsRule(values);
        message.success("积分规则已创建");
      } else {
        await updatePointsRule(id!, values);
        message.success("积分规则已更新");
      }
      setTimeout(() => {
        navigate("/points-rules");
      }, 1000);
    } catch (error) {
      console.error("保存积分规则失败", error);
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate("/points-rules");
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeft size={18} />} onClick={handleBack}>
          返回列表
        </Button>
      </div>

      <Card className="dashboard-card" title={isNew ? "新增积分规则" : "编辑积分规则"}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            exchangeRate: 100,
            freezeDays: 15,
            minWithdraw: 1000,
            maxWithdraw: 100000,
            enableAutoSettle: true,
            enableWithdraw: true,
            dailyWithdrawLimit: 50000,
          }}
        >
          <Divider orientation="left">基础信息</Divider>

          <Form.Item
            label="规则名称"
            name="ruleName"
            rules={[{ required: true, message: "请输入规则名称" }]}
          >
            <Input placeholder="例如：2026年Q1标准规则" />
          </Form.Item>

          <Form.Item
            label="版本号"
            name="ruleVersion"
            rules={[{ required: true, message: "请输入版本号" }]}
          >
            <Input placeholder="例如：v3.2.0" />
          </Form.Item>

          <Form.Item label="规则说明" name="description">
            <Input.TextArea
              rows={3}
              placeholder="简要描述该规则的适用场景和特点"
            />
          </Form.Item>

          <Divider orientation="left">积分汇率设置</Divider>

          <Form.Item
            label="积分与现金汇率"
            extra={
              <span>
                <Info size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                当前标准：100积分 = 1元人民币
              </span>
            }
          >
            <Space align="baseline">
              <Form.Item
                name="exchangeRate"
                noStyle
                rules={[{ required: true, message: "请设置汇率" }]}
              >
                <InputNumber min={1} max={1000} style={{ width: 120 }} />
              </Form.Item>
              <span style={{ color: "#353535" }}>积分 = 1 元</span>
            </Space>
          </Form.Item>

          <Divider orientation="left">冷冻期设置</Divider>

          <Form.Item
            label="积分发放冷冻期"
            name="freezeDays"
            rules={[{ required: true, message: "请设置冷冻期" }]}
            extra="用户获得积分后需等待冷冻期结束才能提现，防范恶意退款刷单"
          >
            <InputNumber min={0} max={90} addonAfter="天" style={{ width: 200 }} />
          </Form.Item>

          <Divider orientation="left">提现规则</Divider>

          <Form.Item
            label="最低提现门槛"
            name="minWithdraw"
            rules={[{ required: true, message: "请设置最低提现门槛" }]}
            extra="用户账户积分需达到此门槛才可发起提现"
          >
            <InputNumber
              min={100}
              max={10000}
              step={100}
              addonAfter="积分"
              style={{ width: 200 }}
            />
          </Form.Item>

          <Form.Item
            label="单次最高提现额度"
            name="maxWithdraw"
            rules={[{ required: true, message: "请设置最高提现额度" }]}
            extra="单次提现申请的最大积分数量"
          >
            <InputNumber
              min={1000}
              max={1000000}
              step={1000}
              addonAfter="积分"
              style={{ width: 200 }}
            />
          </Form.Item>

          <Form.Item
            label="每日提现总额限制"
            name="dailyWithdrawLimit"
            rules={[{ required: true, message: "请设置每日提现限制" }]}
            extra="全平台每日提现总额上限，用于资金风控"
          >
            <InputNumber
              min={10000}
              max={10000000}
              step={10000}
              addonAfter="积分"
              style={{ width: 200 }}
            />
          </Form.Item>

          <Divider orientation="left">功能开关</Divider>

          <Form.Item
            label="自动结算开关"
            name="enableAutoSettle"
            valuePropName="checked"
            extra="开启后系统将自动处理订单结算和积分发放"
          >
            <Switch checkedChildren="已开启" unCheckedChildren="已关闭" />
          </Form.Item>

          <Form.Item
            label="用户提现开关"
            name="enableWithdraw"
            valuePropName="checked"
            extra="关闭后用户将暂时无法发起提现申请"
          >
            <Switch checkedChildren="已开启" unCheckedChildren="已关闭" />
          </Form.Item>

          <Form.Item style={{ marginTop: 32 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large" 
              icon={<Save size={18} />}
              loading={saving}
            >
              {isNew ? "创建规则" : "保存规则"}
            </Button>
            <Button style={{ marginLeft: 16 }} size="large" onClick={handleBack} disabled={saving}>
              取消
            </Button>
          </Form.Item>
        </Form>

        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "rgba(255, 107, 53, 0.1)",
            borderRadius: 4,
            color: "#888888",
            fontSize: 12,
          }}
        >
          <p style={{ margin: 0 }}>💡 规则说明：</p>
          <p style={{ margin: "8px 0 0 0" }}>
            1. 新规则创建后默认为停用状态，需要手动启用才会生效
            <br />
            2. 积分汇率修改后将对所有新订单生效，历史订单不受影响
            <br />
            3. 冷冻期调整会影响所有未提现的积分
            <br />
            4. 提现规则变更建议提前通知用户
            <br />
            5. 系统同时只能有一个生效规则
          </p>
        </div>

        {/* 算账示例 */}
        <Card
          style={{ marginTop: 24, background: "#FAFAFA", border: "1px solid #E5E5E5" }}
          title={<span style={{ color: "#191919" }}>算账示例</span>}
          size="small"
        >
          <div style={{ lineHeight: 2, color: "#353535" }}>
            <p>
              <strong>场景：</strong>用户通过小程序购买商品，预估佣金 35.8 元
            </p>
            <p>
              <strong>计算过程：</strong>
            </p>
            <p>1. 佣金转积分：35.8 元 × 100 = 3,580 积分</p>
            <p>2. 积分状态：冻结中（需等待设定的冷冻期）</p>
            <p>3. ���冻期结束：积分变为可提现状态</p>
            <p>4. 发起提现：用户积分需 ≥ 最低提现门槛</p>
            <p>5. 提现到账：3,580 积分 ÷ 100 = 35.8 元（转入微信零钱）</p>
            <p style={{ color: "#FF6B35", fontWeight: 500 }}>
              ✓ 算账逻辑透明：100积分 = 1元，确保用户权益
            </p>
          </div>
        </Card>
      </Card>
    </div>
  );
}
