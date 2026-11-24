import {defineConfig} from '@playwright/test'
export default defineConfig({
  testDir:'../e2e',
  use:{baseURL:process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'},
  projects:[{name:'desktop',use:{viewport:{width:1440,height:900}}},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
  workers:1
})
