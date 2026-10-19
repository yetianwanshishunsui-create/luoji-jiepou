<template>
  <el-container class="layout">
    <el-aside width="208px" class="aside">
      <div class="brand">逻辑解剖</div>
      <el-menu :default-active="activeMenu" :default-openeds="openeds" router>
        <template v-for="m in menus" :key="m.name as string">
          <el-sub-menu v-if="m.children?.length" :index="m.name as string">
            <template #title>
              <el-icon><component :is="m.meta?.icon" /></el-icon>
              <span>{{ m.meta?.title }}</span>
            </template>
            <el-menu-item
              v-for="c in m.children.filter((c) => !c.meta?.hidden)"
              :key="c.name as string"
              :index="c.name as string"
              :route="{ name: c.name }"
            >
              {{ c.meta?.title }}
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="m.name as string" :route="{ name: m.name }">
            <el-icon><component :is="m.meta?.icon" /></el-icon>
            <span>{{ m.meta?.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <span class="title">{{ route.meta.title }}</span>
        <el-dropdown @command="onCommand">
          <span class="user">
            {{ auth.admin?.name }}（{{ auth.admin ? AdminRoleLabel[auth.admin.role] : '' }}）
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="password">修改密码</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
  <ChangePasswordDialog v-model="pwdDialog" />
</template>

<script setup lang="ts">
import { AdminRoleLabel } from '@luoji/shared';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { canAccess, menuRoutes } from '@/router';
import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const menus = computed(() => menuRoutes.filter((r) => canAccess(auth.admin?.role, r.meta?.roles)));
const activeMenu = computed(() => (route.meta.activeMenu ?? route.name) as string);
/** 有子菜单的分组默认展开 */
const openeds = menuRoutes.filter((r) => r.children?.length).map((r) => r.name as string);

const pwdDialog = ref(false);

function onCommand(cmd: string) {
  if (cmd === 'password') pwdDialog.value = true;
  if (cmd === 'logout') {
    auth.logout();
    router.replace({ name: 'login' });
  }
}
</script>

<style scoped>
.layout {
  height: 100%;
}
.aside {
  background: #fff;
  border-right: 1px solid #e8ece9;
}
.brand {
  height: 56px;
  line-height: 56px;
  padding-left: 20px;
  font-size: 18px;
  font-weight: 600;
  color: #2a5bd7;
}
.el-menu {
  border-right: none;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e8ece9;
}
.title {
  font-size: 16px;
  font-weight: 500;
}
.user {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
