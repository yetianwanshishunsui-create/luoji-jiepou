<template>
  <el-card shadow="never">
    <div class="toolbar">
      <span class="muted">有操作记录的账号只能停用、不能删除；停用、改角色、重置密码后，该账号的登录态立即失效</span>
      <el-button type="primary" icon="Plus" @click="openForm()">新建管理员</el-button>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="姓名" min-width="140">
        <template #default="{ row }">
          {{ row.name }}
          <el-tag v-if="row.id === auth.admin?.id" size="small" type="info">我</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="username" label="用户名" min-width="140" />
      <el-table-column label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'SUPER_ADMIN' ? 'danger' : 'primary'" size="small">{{ AdminRoleLabel[row.role as AdminRole] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="可访问" min-width="220">
        <template #default="{ row }">
          <span class="muted">{{ RoleScope[row.role as AdminRole] }}</span>
        </template>
      </el-table-column>
      <el-table-column label="最近登录" width="150">
        <template #default="{ row }">{{ fmtShort(row.lastLoginAt) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.disabled ? 'info' : 'success'">{{ row.disabled ? '已停用' : '正常' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button link type="primary" @click="openForm(row as AdminAccount)">编辑</el-button>
          <template v-if="row.id !== auth.admin?.id">
            <el-button link type="primary" @click="resetPassword(row as AdminAccount)">重置密码</el-button>
            <el-button link :type="row.disabled ? 'success' : 'warning'" @click="toggle(row as AdminAccount)">
              {{ row.disabled ? '启用' : '停用' }}
            </el-button>
          </template>
          <el-button v-else link type="primary" @click="pwdDialog = true">修改密码</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="formDialog" :title="editing ? '编辑管理员' : '新建管理员'" width="480px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" :disabled="!!editing" maxlength="32" placeholder="登录用，创建后不可修改" />
      </el-form-item>
      <el-form-item label="姓名" prop="name">
        <el-input v-model="form.name" maxlength="32" />
      </el-form-item>
      <el-form-item label="角色">
        <el-radio-group v-model="form.role" :disabled="editing?.id === auth.admin?.id">
          <el-radio v-for="(label, value) in AdminRoleLabel" :key="value" :value="value">{{ label }}</el-radio>
        </el-radio-group>
        <div class="muted scope">{{ RoleScope[form.role] }}</div>
      </el-form-item>
      <el-form-item v-if="!editing" label="初始密码" prop="password">
        <el-input v-model="form.password" type="password" show-password autocomplete="new-password" placeholder="8 位以上，包含字母和数字" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="formDialog = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>

  <ChangePasswordDialog v-model="pwdDialog" />
</template>

<script setup lang="ts">
import { AdminRoleLabel, type AdminRole } from '@luoji/shared';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { passwordProblem, systemApi, type AdminAccount } from '@/api/system';
import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { fmtShort } from '@/utils/format';

const auth = useAuthStore();

/** 与路由 meta.roles 对应的可访问范围说明 */
const RoleScope: Record<AdminRole, string> = {
  SUPER_ADMIN: '全部功能，含系统管理',
  OPERATOR: '内容、用户、订单查看、营销、运营配置、招商线索',
  REVIEWER: '认证审核、用户',
  FINANCE: '订单、退款、导出',
};

const list = ref<AdminAccount[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    list.value = await systemApi.admins();
  } finally {
    loading.value = false;
  }
}

// ───────── 新建 / 编辑 ─────────
const formDialog = ref(false);
const saving = ref(false);
const editing = ref<AdminAccount>();
const formRef = ref<FormInstance>();
const form = reactive({ username: '', name: '', role: 'OPERATOR' as AdminRole, password: '' });
const rules: FormRules = {
  username: [
    { required: true, message: '请填写用户名' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_]{3,31}$/, message: '4~32 位字母、数字或下划线，以字母开头' },
  ],
  name: [{ required: true, whitespace: true, message: '请填写姓名' }],
  password: [
    { required: true, message: '请设置初始密码' },
    { validator: (_r, v: string, cb) => (passwordProblem(v ?? '', form.username) ? cb(new Error(passwordProblem(v ?? '', form.username)!)) : cb()) },
  ],
};

function openForm(row?: AdminAccount) {
  editing.value = row;
  Object.assign(form, row ? { username: row.username, name: row.name, role: row.role, password: '' } : { username: '', name: '', role: 'OPERATOR', password: '' });
  formDialog.value = true;
  formRef.value?.clearValidate();
}

async function save() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  saving.value = true;
  try {
    if (editing.value) {
      const roleChanged = editing.value.role !== form.role;
      await systemApi.updateAdmin(editing.value.id, { name: form.name, role: form.role });
      ElMessage.success(roleChanged ? '已保存，该账号需重新登录后按新角色使用' : '已保存');
    } else {
      await systemApi.createAdmin({ ...form });
      ElMessage.success(`已创建，请将用户名「${form.username}」和初始密码告知对方`);
    }
    formDialog.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

// ───────── 停用 / 重置密码 ─────────
async function toggle(row: AdminAccount) {
  if (!row.disabled) {
    await ElMessageBox.confirm(`停用后「${row.name}」将立即退出登录且无法再登录。确定停用？`, '停用管理员', { type: 'warning' });
  }
  await systemApi.setDisabled(row.id, !row.disabled);
  ElMessage.success(row.disabled ? '已启用' : '已停用');
  load();
}

async function resetPassword(row: AdminAccount) {
  const { value } = await ElMessageBox.prompt(`为「${row.name}」设置新密码，对方当前登录将立即失效`, '重置密码', {
    inputType: 'password',
    inputPlaceholder: '8 位以上，包含字母和数字',
    inputValidator: (v) => passwordProblem(v ?? '', row.username) ?? true,
  });
  await systemApi.resetPassword(row.id, value);
  ElMessage.success('密码已重置，请告知对方新密码');
}

// ───────── 修改自己的密码 ─────────
const pwdDialog = ref(false);

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.scope {
  width: 100%;
}
</style>
