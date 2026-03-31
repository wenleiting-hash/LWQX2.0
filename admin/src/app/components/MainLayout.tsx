import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Layout, Menu, Avatar, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  DollarSign,
  Settings,
  FileText,
  Award,
  ShoppingCart,
  Wallet,
  Clock,
  LogOut,
  User,
  Briefcase,
} from "lucide-react";
import { Outlet } from "react-router";
import logo from "@/assets/logo.png";

const { Header, Sider, Content, Footer } = Layout;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedKey, setSelectedKey] = useState("1");

  // 检查登录状态
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  // 根据路由设置选中的菜单项
  useEffect(() => {
    const path = location.pathname;
    const keyMap: Record<string, string> = {
      "/": "1",
      "/system-config": "2",
      "/documentation": "3",
      "/points-rules": "4",
      "/order-center": "5",
      "/user-assets": "6",
      "/task-scheduler": "7",
      "/operations-config": "8",
    };
    setSelectedKey(keyMap[path] || "1");
  }, [location.pathname]);

  const handleMenuClick = (key: string, path: string) => {
    setSelectedKey(key);
    navigate(path);
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "1",
      icon: <DollarSign size={18} />,
      label: "财务大盘",
      onClick: () => handleMenuClick("1", "/"),
    },
    {
      key: "2",
      icon: <Settings size={18} />,
      label: "基础设置",
      onClick: () => handleMenuClick("2", "/system-config"),
    },
    {
      key: "3",
      icon: <FileText size={18} />,
      label: "使用说明",
      onClick: () => handleMenuClick("3", "/documentation"),
    },
    {
      key: "4",
      icon: <Award size={18} />,
      label: "积分规则",
      onClick: () => handleMenuClick("4", "/points-rules"),
    },
    {
      key: "5",
      icon: <ShoppingCart size={18} />,
      label: "订单中心",
      onClick: () => handleMenuClick("5", "/order-center"),
    },
    {
      key: "6",
      icon: <Wallet size={18} />,
      label: "用户积分",
      onClick: () => handleMenuClick("6", "/user-assets"),
    },
    {
      key: "7",
      icon: <Clock size={18} />,
      label: "任务调度",
      onClick: () => handleMenuClick("7", "/task-scheduler"),
    },
    {
      key: "8",
      icon: <Briefcase size={18} />,
      label: "运营配置",
      onClick: () => handleMenuClick("8", "/operations-config"),
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "logout",
      icon: <LogOut size={16} />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={240} theme="light" style={{ borderRight: "1px solid #E5E5E5" }}>
        <div
          className="brand-logo"
          style={{ height: 56, padding: "0 24px", display: "flex", alignItems: "center", gap: 8 }}
        >
          <img src={logo} style={{ width: 32, height: 32, objectFit: "contain" }} alt="Logo" />
          <span>小栗鼠</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #E5E5E5",
          }}
        >
          <div />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <span style={{ color: "#353535" }}>超级管理员</span>
              <Avatar
                size={32}
                icon={<User size={18} />}
                style={{ backgroundColor: "#FF6B35" }}
              />
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: "24px", minHeight: "calc(100vh - 56px - 72px)" }}>
          <Outlet />
        </Content>
        <Footer className="audit-info">
          身份审计：超级管理员 | 登录时间：{new Date().toLocaleString("zh-CN")} | 操作环境：生产环境
        </Footer>
      </Layout>
    </Layout>
  );
}