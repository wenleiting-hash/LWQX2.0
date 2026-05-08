import { useState, useEffect } from "react";
import { UserPlus, Shield, Trash2, Edit, Users, RefreshCw } from "lucide-react";
import { getAdminUsers, addAdminUser, updateAdminUser, deleteAdminUser } from "../../services/api/index";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Typography } from "antd";

const { Paragraph } = Typography;
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";

interface AdminUser {
  _id: string;
  username: string;
  role: string;
  created_at: string;
  last_login_time: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  
  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");

  // Delete Confirm Modal states
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const currentRole = localStorage.getItem("adminRole") || "admin";

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await getAdminUsers();
      const data = res?.list || res?.data?.list || [];
      setUsers(data);
    } catch (error: any) {
      toast.error("加载管理员列表失败：" + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAdd = () => {
    setEditUser(null);
    setUsername("");
    setPassword("");
    setRole("admin");
    setModalOpen(true);
  };

  const handleEdit = (record: AdminUser) => {
    setEditUser(record);
    setUsername(record.username);
    setPassword("");
    setRole(record.role);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAdminUser(id);
      toast.success("管理员已删除");
      loadUsers();
      setDeleteId(null);
    } catch (error: any) {
      toast.error(error.message || "删除失败");
    }
  };

  const handleSubmit = async () => {
    if (!username) {
      toast.error("请输入用户名");
      return;
    }
    if (!editUser && !password) {
      toast.error("请输入密码");
      return;
    }

    try {
      if (editUser) {
        // 更新
        const updateData: any = {};
        if (password) updateData.password = password;
        if (role) updateData.role = role;
        await updateAdminUser(editUser._id, updateData);
        toast.success("管理员信息已更新");
      } else {
        // 新建
        await addAdminUser({
          username: username,
          password: password,
          role: role || "admin",
        });
        toast.success("管理员创建成功");
      }

      setModalOpen(false);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || "操作失败");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#FF6200]/10 rounded-lg">
            <Users className="w-6 h-6 text-[#FF6200]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 m-0">管理员管理</h2>
            <p className="text-sm text-slate-500 m-0 mt-1">
              管理后台系统的管理员账号，超级管理员不可删除
            </p>
          </div>
        </div>
        {currentRole === "superuser" && (
          <Button
            onClick={handleAdd}
            className="bg-[#FF6200] hover:bg-[#FF6200]/90 text-white shadow-none flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            新增管理员
          </Button>
        )}
      </div>

      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full px-6 pb-6">
            <Table className="w-full table-fixed min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                  <TableHead className="text-slate-500 font-medium whitespace-nowrap w-[200px] pl-4">用户名</TableHead>
                  <TableHead className="text-slate-500 font-medium whitespace-nowrap w-[150px]">角色</TableHead>
                  <TableHead className="text-slate-500 font-medium whitespace-nowrap w-[180px]">创建时间</TableHead>
                  <TableHead className="text-slate-500 font-medium whitespace-nowrap w-[180px]">最后登录</TableHead>
                  <TableHead className="text-slate-500 font-medium whitespace-nowrap text-right pr-4">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      暂无管理员数据
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((record) => (
                    <TableRow key={record._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          <Paragraph 
                            ellipsis={{ tooltip: true }} 
                            copyable={{ text: record.username }} 
                            className="mb-0 font-medium text-slate-700"
                            style={{ margin: 0, maxWidth: 120 }}
                          >
                            {record.username}
                          </Paragraph>
                          {record.role === "superuser" && (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 flex items-center gap-1 px-1.5 py-0">
                              <Shield className="w-3 h-3" />
                              <span className="text-[10px] leading-4">超级管理员</span>
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={record.role === "superuser" ? "text-amber-600 border-amber-200 bg-amber-50" : "text-blue-600 border-blue-200 bg-blue-50"}>
                          {record.role === "superuser" ? "超级管理员" : "普通管理员"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm whitespace-nowrap">
                        {record.created_at ? new Date(record.created_at).toLocaleString('zh-CN') : '-'}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm whitespace-nowrap">
                        {record.last_login_time ? new Date(record.last_login_time).toLocaleString('zh-CN') : '从未登录'}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-slate-500 hover:text-[#FF6200] hover:bg-[#FF6200]/10 px-2 shadow-none"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            编辑
                          </Button>
                          
                          {record.role !== "superuser" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2 shadow-none"
                              onClick={() => setDeleteId(record._id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              删除
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400 px-3 inline-flex items-center h-8">不可删除</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editUser ? "编辑管理员" : "新增管理员"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username" className="after:content-['*'] after:ml-0.5 after:text-red-500">用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!!editUser}
                placeholder="请输入用户名"
                className="bg-slate-50 border-transparent hover:border-slate-200 focus:border-[#FF6200] focus:ring-[#FF6200]/20 shadow-none"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className={!editUser ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ""}>
                {editUser ? "新密码 (留空则不修改)" : "密码"}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editUser ? "留空则不修改密码" : "请输入密码"}
                className="bg-slate-50 border-transparent hover:border-slate-200 focus:border-[#FF6200] focus:ring-[#FF6200]/20 shadow-none"
              />
            </div>
            <div className="grid gap-2">
              <Label>角色</Label>
              <Select value={role} onValueChange={setRole} disabled={editUser?.role === "superuser"}>
                <SelectTrigger className="bg-slate-50 border-transparent hover:border-slate-200 focus:border-[#FF6200] focus:ring-[#FF6200]/20 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">普通管理员</SelectItem>
                  <SelectItem value="superuser">超级管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="shadow-none border-slate-200 text-slate-600 hover:bg-slate-50">
              取消
            </Button>
            <Button onClick={handleSubmit} className="bg-[#FF6200] hover:bg-[#FF6200]/90 text-white shadow-none">
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900">确认删除该管理员？</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-slate-500 text-sm">
            删除后该账号将无法再登录后台系统，此操作不可恢复。
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="shadow-none border-slate-200 text-slate-600 hover:bg-slate-50">
              取消
            </Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} className="shadow-none">
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
