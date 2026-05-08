import { useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { Separator } from "./ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { AppSidebar } from "./AppSidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { LogOut, ChevronsUpDown } from "lucide-react";
import { clearAdminToken } from "../../services/api";
import logo from "@/assets/logo.png";

// 面包屑映射
const breadcrumbMap: Record<string, { parent?: string; label: string }> = {
  "/": { label: "首页" },
  "/order/taobao": { parent: "平台订单", label: "淘宝订单" },
  "/order/jd": { parent: "平台订单", label: "京东订单" },
  "/task/taobao": { parent: "任务调度", label: "淘宝任务" },
  "/task/jd": { parent: "任务调度", label: "京东任务" },
  "/config/taobao": { parent: "参数配置", label: "淘宝参数" },
  "/config/jd": { parent: "参数配置", label: "京东参数" },
  "/admin-users": { parent: "用户角色", label: "用户管理" },
  "/operation-logs": { parent: "用户角色", label: "操作日志" },
  "/config/contact-us": { parent: "客服配置", label: "联系我们" },
  "/config/community": { parent: "客服配置", label: "社群配置" },
  "/documentation": { parent: "客服配置", label: "常见问题" },
  "/config/tutorial": { parent: "客服配置", label: "使用教程" },
  "/search/taobao": { parent: "查券管理", label: "淘宝查券" },
  "/search/jd": { parent: "查券管理", label: "京东查券" },
  "/operation-config": { parent: "运营配置", label: "基础配置" },
};

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const adminUsername = localStorage.getItem("adminUsername") || "Admin";
  const adminRole = localStorage.getItem("adminRole") || "admin";

  const handleLogout = () => {
    clearAdminToken();
    navigate("/login");
  };

  // 检查登录状态
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
  }, [navigate]);

  const crumb = breadcrumbMap[location.pathname] || { label: "页面" };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 bg-white/80 backdrop-blur-md px-4 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 !h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink
                    className="cursor-pointer"
                    onClick={() => navigate("/")}
                  >
                    小栗鼠管理后台
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {crumb.parent && <BreadcrumbSeparator className="hidden md:block" />}
                {crumb.parent && (
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink>{crumb.parent}</BreadcrumbLink>
                  </BreadcrumbItem>
                )}
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 outline-none hover:bg-slate-50 px-2 py-1.5 rounded-lg transition-colors cursor-pointer">
                <Avatar className="size-8 rounded-lg shadow-sm p-0.5 bg-orange-50 border border-orange-100">
                  <img src={logo} className="w-full h-full object-contain rounded-md" alt="Admin" />
                </Avatar>
                <div className="hidden md:grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium text-slate-800">{adminUsername}</span>
                  <span className="truncate text-[10px] text-slate-500">
                    {adminRole === "superuser" ? "超级管理员" : "普通管理员"}
                  </span>
                </div>
                <ChevronsUpDown className="size-4 text-slate-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl border-slate-100 shadow-lg" align="end" sideOffset={8}>
                <div className="px-2 py-2 text-sm">
                  <div className="font-medium text-slate-800">{adminUsername}</div>
                  <div className="text-xs text-slate-500">
                    {adminRole === "superuser" ? "超级管理员" : "普通管理员"}
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer rounded-lg my-1">
                  <LogOut className="mr-2 size-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-transparent">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}