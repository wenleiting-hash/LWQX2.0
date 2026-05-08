import { useState, useEffect, useRef } from "react";
import { Upload as UploadIcon, QrCode, MessageSquare, Store, Save, Info, Briefcase, Search, Loader2 } from "lucide-react";
import { getOperationsConfig, updateOperationsConfig } from "../../services/api/index";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

interface ConfigData {
  qrCode: string;
  shareText: string;
  videoShopUrl: string;
  wechatId: string;
}

export default function OperationConfig() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<ConfigData>({
    qrCode: "",
    shareText: "邀请你一起用小栗鼠购物，领券省钱，还能赚佣金！点击链接立即加入 👉",
    videoShopUrl: "https://channels.weixin.qq.com/shop/xxxxx",
    wechatId: "LaoWenHQ",
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setFetching(true);
        const res = await getOperationsConfig();
        const data = res.data || res;
        if (data && Object.keys(data).length > 0 && !data.status) {
          setFormData(prev => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.error("获取运营配置失败", error);
        toast.error("获取运营配置失败");
      } finally {
        setFetching(false);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (field: keyof ConfigData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.wechatId || !formData.shareText || !formData.videoShopUrl) {
      toast.error("请完善必填信息");
      return;
    }
    
    try {
      setLoading(true);
      await updateOperationsConfig(formData);
      toast.success("运营配置保存成功！");
    } catch (error: any) {
      toast.error("保存运营配置失败");
      console.error("保存运营配置失败", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        toast.loading("正在处理二维码...", { id: "upload-toast" });
        const { compressImage } = await import("../../utils/imageCompressor");
        const compressedBase64 = await compressImage(file, 400, 400, 0.8);
        handleChange("qrCode", compressedBase64);
        toast.success("二维码已暂存本地，请点击底部「保存配置」上传", { id: "upload-toast" });
      } catch (error) {
        console.error("二维码处理失败", error);
        toast.error("二维码处理失败，请重试", { id: "upload-toast" });
      }
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6200]" />
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2 bg-[#FF6200]/10 rounded-lg">
          <Briefcase className="w-6 h-6 text-[#FF6200]" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900 m-0">运营配置</h2>
          <p className="text-sm text-slate-500 m-0 mt-1">
            管理小程序端分享文案、社群二维码及视频号店地址
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* 私域社群二维码 */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#FF6200]" />
              加入老温私域社群
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label>社群二维码</Label>
              <div className="text-sm text-slate-500 mb-2">推荐尺寸：400x400px，支持 JPG、PNG 格式，大小不超过 2MB</div>
              <div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <UploadIcon className="w-4 h-4" />
                  点击上传二维码
                </Button>
              </div>
              {formData.qrCode && (
                <div className="mt-4">
                  <div className="text-sm text-slate-600 mb-2">二维码预览：</div>
                  <img 
                    src={formData.qrCode} 
                    alt="社群二维码" 
                    className="w-48 h-48 rounded-lg border border-slate-200 object-cover"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">客服微信号</Label>
              <Input 
                value={formData.wechatId} 
                onChange={(e) => handleChange("wechatId", e.target.value)}
                placeholder="请输入微信号，方便用户复制添加"
                className="max-w-md bg-slate-50 border-transparent hover:border-slate-200 focus:border-[#FF6200] focus:ring-[#FF6200]/20 shadow-none"
              />
            </div>
          </CardContent>
        </Card>


        {/* 邀请好友分享文案 */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#FF6200]" />
              邀请好友一起省钱
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">分享文案</Label>
            <div className="text-sm text-slate-500 mb-2">用户点击「邀请好友」时，会使用此文案进行分享（200字以内）</div>
            <Textarea 
              value={formData.shareText} 
              onChange={(e) => handleChange("shareText", e.target.value)}
              rows={4}
              maxLength={200}
              placeholder="请输入分享文案..."
              className="bg-slate-50 border-transparent hover:border-slate-200 focus:border-[#FF6200] focus:ring-[#FF6200]/20 shadow-none resize-none"
            />
            <div className="text-xs text-slate-400 text-right mt-1">
              {formData.shareText.length}/200
            </div>
          </CardContent>
        </Card>

        {/* 视频号店地址 */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Store className="w-5 h-5 text-[#FF6200]" />
              视频号店
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">视频号店地址</Label>
            <div className="text-sm text-slate-500 mb-2">请输入完整的视频号店铺链接地址</div>
            <div className="relative max-w-md">
              <Store className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                value={formData.videoShopUrl} 
                onChange={(e) => handleChange("videoShopUrl", e.target.value)}
                placeholder="https://channels.weixin.qq.com/shop/xxxxx"
                className="pl-9 bg-slate-50 border-transparent hover:border-slate-200 focus:border-[#FF6200] focus:ring-[#FF6200]/20 shadow-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 保存按钮 */}
      <div className="mt-6 p-4 bg-white rounded-xl border border-slate-100 flex justify-end gap-3 shadow-sm">
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => {
            // Re-fetch to reset
            setFetching(true);
            getOperationsConfig().then(res => {
              const data = res.data || res;
              if (data && Object.keys(data).length > 0 && !data.status) {
                setFormData(prev => ({ ...prev, ...data }));
              }
            }).finally(() => setFetching(false));
          }}
          disabled={loading || fetching}
          className="shadow-none border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          重置
        </Button>
        <Button 
          size="lg"
          onClick={handleSave}
          disabled={loading || fetching}
          className="bg-[#FF6200] hover:bg-[#FF6200]/90 text-white shadow-none flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存配置
        </Button>
      </div>
    </div>
  );
}
