import React, { useState, useEffect } from "react";
import { Card, Input, Button, message, Spin, Typography } from "antd";
import { updateNicknamePool, fetchConfig } from "../../services/api";
import { Users } from "lucide-react";

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

export default function NicknamePool() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const configRes = await fetchConfig();
      // Assuming system_config has a 'global' doc containing nickname_pool
      const globalDoc = configRes.find((item: any) => item._id === "global");
      if (globalDoc && globalDoc.nickname_pool) {
        setText(globalDoc.nickname_pool.join("\n"));
      }
    } catch (e: any) {
      message.error("加载昵称池失败：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const nicknames = text
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    
    if (nicknames.length === 0) {
      message.warning("请输入至少一个昵称");
      return;
    }

    setSaving(true);
    try {
      await updateNicknamePool(nicknames);
      message.success(`成功保存 ${nicknames.length} 个昵称`);
    } catch (e: any) {
      message.error("保存失败：" + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
          <Users size={24} />
        </div>
        <Title level={2} style={{ margin: 0 }}>昵称池管理</Title>
      </div>

      <Card className="shadow-sm">
        <Paragraph type="secondary">
          此昵称池用于给社区晒单和弹幕模块提供随机的脱敏昵称数据。请每行输入一个昵称。
        </Paragraph>
        
        {loading ? (
          <div className="py-10 text-center"><Spin /></div>
        ) : (
          <div className="flex flex-col gap-4">
            <TextArea
              rows={15}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="例如：
用户张三
李四刚刚
王五购物狂"
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button onClick={() => setText("")}>清空</Button>
              <Button type="primary" loading={saving} onClick={handleSave}>保存昵称池</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
