import { useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  CalendarClock,
  Settings2,
  Users,
  Headphones,
  BookOpen,
  Share2,
  BarChart3,
  LogOut,
  Bot,
  FileImage,
  ChevronRight,
  ChevronsUpDown,
  Squirrel,
  Search,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "./ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import logo from "@/assets/logo.png";

// ===== 菜单数据定义 =====
type NavItem = {
  title: string;
  url: string;
  icon: React.ElementType;
  disabled?: boolean;
  badge?: string;
  items?: { title: string; url: string; disabled?: boolean }[];
};

const navMain: NavItem[] = [
  {
    title: "首页",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "平台订单",
    url: "#",
    icon: ShoppingCart,
    items: [
      { title: "淘宝订单", url: "/order/taobao" },
      { title: "京东订单", url: "/order/jd" },
    ]
  },
  {
    title: "任务调度",
    url: "#",
    icon: CalendarClock,
    items: [
      { title: "淘宝任务", url: "/task/taobao" },
      { title: "京东任务", url: "/task/jd" },
    ]
  },
  {
    title: "查券管理",
    url: "#",
    icon: Search,
    items: [
      { title: "淘宝查券", url: "/search/taobao" },
      { title: "京东查券", url: "/search/jd" },
    ]
  },
  {
    title: "参数配置",
    url: "#",
    icon: Settings2,
    items: [
      { title: "淘宝参数", url: "/config/taobao" },
      { title: "京东参数", url: "/config/jd" },
    ],
  },
  {
    title: "用户角色",
    url: "#",
    icon: Users,
    items: [
      { title: "用户管理", url: "/admin-users" },
      { title: "操作日志", url: "/operation-logs" },
    ],
  },
  {
    title: "客服配置",
    url: "#",
    icon: Headphones,
    items: [
      { title: "联系我们", url: "/config/contact-us" },
      { title: "社群配置", url: "/config/community" },
      { title: "常见问题", url: "/documentation" },
      { title: "使用教程", url: "/config/tutorial" },
    ],
  },
  {
    title: "AI运营",
    url: "#",
    icon: Bot,
    items: [
      { title: "小红书图文", url: "#", disabled: true },
    ],
  },
];

// ===== 侧边栏组件 =====
export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const isGroupOpen = (item: NavItem) => {
    if (!item.items) return false;
    return item.items.some((sub) => isActive(sub.url));
  };

  const handleNav = (url: string) => {
    if (url && url !== "#") navigate(url);
  };

  return (
    <Sidebar collapsible="icon">
      {/* ===== Header: Brand ===== */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent" onClick={() => handleNav("/")}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                <img src={logo} className="size-5 object-contain" alt="Logo" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">小栗鼠 3.0</span>
                <span className="truncate text-xs text-muted-foreground">后台管理系统</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ===== Content: Nav ===== */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navMain.map((item) =>
              item.items ? (
                // 含子菜单 → Collapsible
                <Collapsible key={item.title} asChild defaultOpen={isGroupOpen(item)} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title}>
                        <item.icon />
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((sub) => (
                          <SidebarMenuSubItem key={sub.title}>
                            <SidebarMenuSubButton
                              isActive={isActive(sub.url)}
                              onClick={() => handleNav(sub.url)}
                              className={sub.disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}
                            >
                              <span>{sub.title}</span>
                              {sub.disabled && (
                                <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">待开发</span>
                              )}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                // 无子菜单 → 直接按钮
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                    onClick={() => handleNav(item.url)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ),
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
