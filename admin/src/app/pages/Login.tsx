import { useState } from "react";
import { useNavigate } from "react-router";
import { Form, Input, Button, message } from "antd";
import { Lock, User } from "lucide-react";
import { login } from "../../services/api/index";
import logo from "@/assets/logo.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      setLoading(true);
      const res = await login(values);
      
      // Axios interceptor will throw if code !== 0, 
      // but in your backend it returns { code: 200, data: { token } }
      // The interceptor might need tweaking or we handle response here
      const result = res.data || res;
      
      if (result && result.token) {
        localStorage.setItem("adminToken", result.token);
        localStorage.setItem("isLoggedIn", "true");
        message.success("登录成功");
        navigate("/");
      }
    } catch (error) {
      console.error("登录异常", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-title">
          <div className="brand-logo" style={{ justifyContent: "center", marginBottom: 16, gap: 12 }}>
            <img src={logo} style={{ width: 48, height: 48, objectFit: "contain" }} alt="Logo" />
            <span style={{ fontSize: 28 }}>小栗鼠</span>
          </div>
          <p style={{ color: "#888888", fontSize: 14 }}>后台管理系统 V1.2.0</p>
        </div>
        <Form name="login" onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            label="管理员账号"
            name="username"
            rules={[{ required: true, message: "请输入管理员账号" }]}
          >
            <Input prefix={<User size={18} />} placeholder="请输入管理员账号" />
          </Form.Item>

          <Form.Item
            label="登录密码"
            name="password"
            rules={[{ required: true, message: "请输入登录密码" }]}
          >
            <Input.Password prefix={<Lock size={18} />} placeholder="请输入登录密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录系统
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: "center", color: "#B2B2B2", fontSize: 12, marginTop: 24 }}>
          <p>尝试使用分配的管理员凭据登录</p>
          <p style={{ marginTop: 8 }}>
            超级管理员单点登录 | 操作将被安全审计
          </p>
        </div>
      </div>
    </div>
  );
}
