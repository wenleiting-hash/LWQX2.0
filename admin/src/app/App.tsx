import { RouterProvider } from "react-router";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import "./styles/antd-custom.css";

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#FF6B35",
          colorSuccess: "#07C160",
          colorWarning: "#FFA940",
          colorError: "#FA5151",
          colorInfo: "#576B95",
          colorLink: "#576B95",
          colorTextBase: "#353535",
          colorTextHeading: "#191919",
          colorTextSecondary: "#888888",
          colorTextPlaceholder: "#B2B2B2",
          colorBorder: "#E5E5E5",
          colorBgContainer: "#FFFFFF",
          colorBgLayout: "#F5F5F5",
          borderRadius: 4,
          fontSize: 14,
        },
        components: {
          Layout: {
            headerBg: "#FFFFFF",
            headerHeight: 56,
            siderBg: "#FFFFFF",
            bodyBg: "#F5F5F5",
          },
          Menu: {
            itemSelectedBg: "#FFF0E8",
            itemSelectedColor: "#FF6B35",
            itemHoverBg: "#FFF0E8",
            itemHoverColor: "#FF6B35",
          },
          Card: {
            paddingLG: 24,
          },
          Button: {
            primaryColor: "#FFFFFF",
            colorPrimaryHover: "#E55A2B",
            colorPrimaryActive: "#E55A2B",
          },
        },
      }}
    >
      <RouterProvider router={router} />
      <Toaster position="bottom-right" />
    </ConfigProvider>
  );
}

export default App;
