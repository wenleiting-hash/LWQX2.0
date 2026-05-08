import { useState } from "react";
import { useNavigate } from "react-router";
import { Form, Input, Button, message } from "antd";
import { Lock, User } from "lucide-react";
import { login } from "../../services/api/index";
import { setAdminToken } from "../../services/api";
import logo from "@/assets/logo.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      setLoading(true);
      const result = await login(values);

      if (result && result.token) {
        // 存储 token 及用户信息
        setAdminToken(result.token);
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("adminUsername", result.username || values.username);
        localStorage.setItem("adminRole", result.role || "admin");
        message.success(`欢迎回来，${result.username}`);
        navigate("/");
      } else {
        message.error("登录失败：未获取到有效凭证");
      }
    } catch (error: any) {
      console.error("登录异常", error);
      message.error(error?.message && error.message !== 'API Error' ? error.message : "登录失败，请检查账号密码或网络连接");
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
          <p style={{ color: "#888888", fontSize: 14 }}>后台管理系统 V2.0</p>
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
          <p>默认超级管理员：Superuser / password</p>
          <p style={{ marginTop: 8 }}>
            超级管理员可管理其他管理员账号 | 操作将被安全审计
          </p>
        </div>
      </div>
    </div>
  );
}
