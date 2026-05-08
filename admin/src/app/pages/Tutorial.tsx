import { useState, useEffect } from "react";
import { Button, message, Popconfirm, Input, Switch, Card, Typography } from "antd";
import { Save, BookOpen, AlertCircle, RotateCcw, Code } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { getSystemConfig, updateSystemConfig } from "../../services/api/index";

const { Title } = Typography;

export default function Tutorial() {
  const defaultHtml = `<div style="text-align: center;"><h2 style="color: #FF6200; margin-bottom: 5px;">如何使用小栗鼠查券省钱？</h2><p style="color: #999; font-size: 14px; margin-top: 0;">只需3步，轻松领取隐藏优惠券</p></div><br><div style="background-color: #fff; border-radius: 12px; padding: 16px; margin: 15px 0; border: 1px solid #f5f5f5;"><h3 style="color: #333; margin-top: 0;"><strong>1. </strong>在淘宝/京东复制链接</h3><p style="color: #666; font-size: 14px; line-height: 1.6;">在你想买的商品详情页，点击右上角分享按钮，选择【复制链接】或【复制口令】。</p><p style="text-align: center; font-size: 40px; margin: 10px 0;">📋</p></div><div style="background-color: #fff; border-radius: 12px; padding: 16px; margin: 15px 0; border: 1px solid #f5f5f5;"><h3 style="color: #333; margin-top: 0;"><strong>2. </strong>打开小栗鼠小程序</h3><p style="color: #666; font-size: 14px; line-height: 1.6;">返回微信，下拉聊天列表打开"小栗鼠查券"。小程序会自动识别您刚刚复制的商品链接。</p><p style="text-align: center; font-size: 40px; margin: 10px 0;">🐿️</p></div><div style="background-color: #fff; border-radius: 12px; padding: 16px; margin: 15px 0; border: 1px solid #f5f5f5;"><h3 style="color: #333; margin-top: 0;"><strong>3. </strong>领券下单，省钱成功</h3><p style="color: #666; font-size: 14px; line-height: 1.6;">点击弹出的商品卡片进入详情，点击底部【领券购买】，即可使用专属隐藏优惠券，立省大笔钱！</p><p style="text-align: center; font-size: 40px; margin: 10px 0;">🎉</p></div><br><div style="background: rgba(255,98,0,0.05); border-radius: 12px; padding: 16px; margin-top: 20px;"><h4 style="color: #FF6200; margin-top: 0; margin-bottom: 10px;">💡 温馨提示</h4><p style="color: #666; font-size: 13px; line-height: 1.8; margin: 0;">• 优惠券数量有限，建议看到心动商品立即领取<br>• 领券后请在有效期内完成购买<br>• 本工具完全免费，无需充值无需会员</p></div>`;
  
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSourceMode, setIsSourceMode] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await getSystemConfig("operations_config");
        const data = res.data || res;
        if (data && data.tutorial_content) {
          setContent(data.tutorial_content);
        } else {
          setContent(defaultHtml);
        }
      } catch (error) {
        console.error("加载教程内容失败", error);
        setContent(defaultHtml);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSystemConfig("operations_config", { tutorial_content: content });
      message.success("使用教程已保存");
    } catch (error) {
      console.error("保存教程失败", error);
      message.error("保存教程失败");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setContent(defaultHtml);
    message.success("已重置为默认排版模板，点击保存发布后生效");
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["clean"]
    ]
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ padding: 8, background: "#FFF0E8", borderRadius: 8 }}>
            <BookOpen size={22} style={{ color: "#FF6B35" }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0 }}>使用教程</Title>
            <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>
              编辑和管理小程序内的使用教程（支持图文混排及源码编辑）
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 12, background: "#f5f5f5", padding: "4px 12px", borderRadius: 20 }}>
            <Code size={16} color={isSourceMode ? "#FF6B35" : "#999"} />
            <span style={{ fontSize: 14, color: isSourceMode ? "#FF6B35" : "#666" }}>源码模式</span>
            <Switch 
              checked={isSourceMode} 
              onChange={setIsSourceMode} 
              size="small" 
            />
          </div>
          <Popconfirm
            title="重置教程内容"
            description="确定要重置为初始的精美卡片排版吗？(重置后需点击保存才会生效)"
            onConfirm={handleReset}
            okText="确定重置"
            cancelText="取消"
          >
            <Button
              size="large"
              icon={<RotateCcw size={18} />}
            >
              恢复默认排版
            </Button>
          </Popconfirm>
          <Button
            type="primary"
            size="large"
            icon={<Save size={18} />}
            onClick={handleSave}
            loading={saving}
          >
            保存发布
          </Button>
        </div>
      </div>

      <Card className="shadow-sm" bodyStyle={{ padding: 0 }} loading={loading}>
        <div
          style={{
            minHeight: 600,
            display: "flex",
            flexDirection: "column"
          }}
        >
          {isSourceMode ? (
            <Input.TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ 
                flex: 1, 
                minHeight: 600, 
                padding: 16, 
                fontFamily: "monospace", 
                fontSize: 14,
                border: 'none',
                resize: 'none',
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                borderRadius: '8px'
              }}
              placeholder="请在此输入 HTML 源码..."
            />
          ) : (
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
              placeholder="在此输入教程内容，支持插入图片..."
              style={{ flex: 1, minHeight: 600 }}
            />
          )}
        </div>
      </Card>

      <div
        style={{
          marginTop: 24,
          padding: 24,
          background: "rgba(255, 107, 53, 0.05)",
          borderRadius: 8,
          border: "1px dashed #FF6B35",
          color: "#353535",
          fontSize: 14,
          lineHeight: 1.8
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "#FF6B35", fontWeight: 600 }}>
          <AlertCircle size={18} />
          <span>富文本编辑提示</span>
        </div>
        <p style={{ margin: 0 }}>
          1. <strong>源码模式</strong>：开启右上方【源码模式】开关，可以直接编辑或粘贴任意复杂的 HTML / CSS 样式代码。建议在源码模式下进行复杂排版。<br />
          2. <strong>排版冲突</strong>：如果在可视化界面中随意编辑，可能会导致复制进来的底层 HTML CSS 样式被清洗。因此复杂的卡片排版建议始终在“源码模式”下修改文字。<br />
          3. <strong>图片限制</strong>：当前使用 Base64 编码直接存储图片，建议仅插入 500KB 以下的小图。
        </p>
      </div>
    </div>
  );
}
