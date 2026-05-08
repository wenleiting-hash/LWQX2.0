import { createHashRouter } from "react-router";
import MainLayout from "./components/MainLayout";
import LoginPage from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TaobaoConfig from "./pages/TaobaoConfig";
import JdConfig from "./pages/JdConfig";
import TaobaoOrders from "./pages/TaobaoOrders";
import JdOrders from "./pages/JdOrders";
import TaobaoTasks from "./pages/TaobaoTasks";
import JdTasks from "./pages/JdTasks";
import OperationConfig from "./pages/OperationConfig";
import Documentation from "./pages/Documentation";
import AdminUsers from "./pages/AdminUsers";
import Tutorial from "./pages/Tutorial";
import OperationLogs from "./pages/OperationLogs";
import TaobaoSearchLogs from "./pages/TaobaoSearchLogs";
import JdSearchLogs from "./pages/JdSearchLogs";
import ContactUsConfig from "./pages/ContactUsConfig";
import CommunityConfig from "./pages/CommunityConfig";

export const router = createHashRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: Dashboard },
      // 参数配置
      { path: "config/taobao", Component: TaobaoConfig },
      { path: "config/jd", Component: JdConfig },
      // 订单
      { path: "order/taobao", Component: TaobaoOrders },
      { path: "order/jd", Component: JdOrders },
      // 定时调度
      { path: "task/taobao", Component: TaobaoTasks },
      { path: "task/jd", Component: JdTasks },
      // 查券管理
      { path: "search/taobao", Component: TaobaoSearchLogs },
      { path: "search/jd", Component: JdSearchLogs },
      // 运营配置
      { path: "operation-config", Component: OperationConfig },
      { path: "config/contact-us", Component: ContactUsConfig },
      { path: "config/community", Component: CommunityConfig },
      { path: "documentation", Component: Documentation },
      { path: "config/tutorial", Component: Tutorial },
      // 管理员
      { path: "admin-users", Component: AdminUsers },
      { path: "operation-logs", Component: OperationLogs },
    ],
  },
]);