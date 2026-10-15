import * as ElementPlusIcons from '@element-plus/icons-vue';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import { isAxiosError } from 'axios';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';

const app = createApp(App);
// 接口错误已由 http 拦截器统一提示，这里不再重复报错；其他异常照常输出
app.config.errorHandler = (err) => {
  if (isAxiosError(err)) return;
  console.error(err);
};
for (const [name, comp] of Object.entries(ElementPlusIcons)) app.component(name, comp);
app.use(createPinia()).use(router).use(ElementPlus, { locale: zhCn }).mount('#app');
