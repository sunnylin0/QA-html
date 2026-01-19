import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/QA-html/', // 請將 "你的REPO名稱" 改為你的 GitHub Repository 名稱
})
