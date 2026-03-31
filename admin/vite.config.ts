import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // 读取 .env 中的环境变量参数
  const env = loadEnv(mode, process.cwd(), '')
  const targetHost = env.VITE_API_BASE_URL || 'https://cloud1-9ggm1mvv7a25a4cb-1411081545.ap-shanghai.app.tcloudbase.com'

  return {
    base: '/', // 绝对路径，确保资源永远从根目录加载
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
    server: {
      port: 3000,
      strictPort: true, // 端口被占用时直接报错，不自动切换
      host: true, // 允许外部通过 IP 访问
      proxy: {
        // 配置本地开发环境代理，完美绕过浏览器的跨域(CORS)限制
        '/api_proxy': {
          target: targetHost, // 将请求转发到真实的腾讯云环境域名
          changeOrigin: true, // 开启跨域
          rewrite: (path) => path.replace(/^\/api_proxy/, '') // 去除 '/api_proxy' 前缀
        }
      }
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
