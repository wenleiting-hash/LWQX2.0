import { createHashRouter } from "react-router";
import LoginPage from "./pages/Login";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import SystemConfig from "./pages/SystemConfig";
import Documentation from "./pages/Documentation";
import PointsRulesList from "./pages/PointsRulesList";
import PointsRulesDetail from "./pages/PointsRulesDetail";
import OrderCenter from "./pages/OrderCenter";
import UserAssets from "./pages/UserAssets";
import TaskScheduler from "./pages/TaskScheduler";
import OperationConfig from "./pages/OperationConfig";

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
      { path: "system-config", Component: SystemConfig },
      { path: "documentation", Component: Documentation },
      { path: "points-rules", Component: PointsRulesList },
      { path: "points-rules/:id", Component: PointsRulesDetail },
      { path: "order-center", Component: OrderCenter },
      { path: "user-assets", Component: UserAssets },
      { path: "task-scheduler", Component: TaskScheduler },
      { path: "operations-config", Component: OperationConfig },
    ],
  },
]);