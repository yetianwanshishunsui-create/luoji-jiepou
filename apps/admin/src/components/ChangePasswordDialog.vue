<template>
  <el-dialog :model-value="modelValue" title="修改密码" width="420px" @update:model-value="emit('update:modelValue', $event)" @open="reset">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="原密码" prop="oldPassword">
        <el-input v-model="form.oldPassword" type="password" show-password autocomplete="current-password" />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input v-model="form.newPassword" type="password" show-password autocomplete="new-password" placeholder="8 位以上，包含字母和数字" />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirm">
        <el-input v-model="form.confirm" type="password" show-password autocomplete="new-password" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">确认修改</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { passwordProblem, systemApi } from '@/api/system';
import { useAuthStore } from '@/stores/auth';

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [boolean] }>();

const auth = useAuthStore();
const router = useRouter();
const formRef = ref<FormInstance>();
const saving = ref(false);
const form = reactive({ oldPassword: '', newPassword: '', confirm: '' });
const rules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码' }],
  newPassword: [
    { required: true, message: '请输入新密码' },
    { validator: (_r, v: string, cb) => (passwordProblem(v ?? '') ? cb(new Error(passwordProblem(v ?? '')!)) : cb()) },
  ],
  confirm: [{ validator: (_r, v: string, cb) => (v === form.newPassword ? cb() : cb(new Error('两次输入不一致'))) }],
};

function reset() {
  Object.assign(form, { oldPassword: '', newPassword: '', confirm: '' });
  formRef.value?.clearValidate();
}

async function submit() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  saving.value = true;
  try {
    await systemApi.changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword });
    emit('update:modelValue', false);
    ElMessage.success('密码已修改，请使用新密码重新登录');
    auth.logout();
    router.replace({ name: 'login' });
  } finally {
    saving.value = false;
  }
}
</script>
