<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" icon="Plus" @click="open()">添加场次</el-button>
      <span class="muted">学员报名时先付定金，尾款在截止时间前支付</span>
    </div>

    <el-table :data="sessions" empty-text="还没有场次">
      <el-table-column prop="title" label="场次" min-width="140" />
      <el-table-column label="时间" min-width="230">
        <template #default="{ row }">{{ fmtTime(row.startAt) }} ~ {{ fmtTime(row.endAt) }}</template>
      </el-table-column>
      <el-table-column prop="address" label="地点" min-width="160" show-overflow-tooltip />
      <el-table-column label="定金 / 尾款" width="140">
        <template #default="{ row }">¥{{ yuan(row.depositCent) }} / ¥{{ yuan(row.balanceCent) }}</template>
      </el-table-column>
      <el-table-column label="有效报名 / 名额" width="120">
        <template #default="{ row }">{{ row._count?.enrollments ?? 0 }} / {{ row.quota }}</template>
      </el-table-column>
      <el-table-column label="尾款截止" width="170">
        <template #default="{ row }">{{ fmtTime(row.balanceDueAt) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="openList(row as OfflineSession)">名单</el-button>
          <el-button link type="primary" @click="open(row as OfflineSession)">编辑</el-button>
          <el-button link type="danger" :disabled="!!row._count?.enrollments" @click="remove(row as OfflineSession)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <EnrollmentDrawer v-model="listDrawer" :session-id="listSessionId" @changed="emit('changed')" />

    <el-dialog v-model="dialog" :title="editing ? '编辑场次' : '添加场次'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="场次名称" prop="title">
          <el-input v-model="form.title" maxlength="128" placeholder="如：北京站 · 12 月" />
        </el-form-item>
        <el-form-item label="上课时间" prop="range">
          <el-date-picker v-model="range" type="datetimerange" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DDTHH:mm:ssZ" />
        </el-form-item>
        <el-form-item label="地点" prop="address">
          <el-input v-model="form.address" maxlength="255" />
        </el-form-item>
        <el-form-item label="名额" prop="quota">
          <el-input-number v-model="form.quota" :min="1" :max="10000" />
        </el-form-item>
        <el-form-item label="定金" prop="depositCent">
          <MoneyInput v-model="form.depositCent" :disabled="locked" />
        </el-form-item>
        <el-form-item label="尾款">
          <MoneyInput v-model="form.balanceCent" :disabled="locked" />
          <div v-if="locked" class="muted">已有学员报名，金额不可修改</div>
        </el-form-item>
        <el-form-item label="尾款截止" prop="balanceDueAt">
          <el-date-picker v-model="form.balanceDueAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { computed, reactive, ref } from 'vue';
import { contentApi, type OfflineSession, type SessionForm } from '@/api/content';
import MoneyInput from '@/components/MoneyInput.vue';
import EnrollmentDrawer from './EnrollmentDrawer.vue';
import { fmtTime, yuan } from '@/utils/format';

const props = defineProps<{ productId: string; sessions: OfflineSession[] }>();
const emit = defineEmits<{ changed: [] }>();

const listDrawer = ref(false);
const listSessionId = ref('');
function openList(row: OfflineSession) {
  listSessionId.value = row.id;
  listDrawer.value = true;
}

const dialog = ref(false);
const saving = ref(false);
const editing = ref<OfflineSession>();
const locked = computed(() => !!editing.value?._count?.enrollments);
const formRef = ref<FormInstance>();

type FormState = Omit<SessionForm, 'depositCent' | 'balanceCent'> & { depositCent: number | null; balanceCent: number | null };

const blank = (): FormState => ({
  title: '',
  startAt: '',
  endAt: '',
  address: '',
  quota: 30,
  depositCent: null,
  balanceCent: null,
  balanceDueAt: '',
  enabled: true,
});
const form = reactive<FormState>(blank());
const range = computed({
  get: (): [string, string] | null => (form.startAt && form.endAt ? [form.startAt, form.endAt] : null),
  set: (v: [string, string] | null) => {
    form.startAt = v?.[0] ?? '';
    form.endAt = v?.[1] ?? '';
  },
});

const rules: FormRules = {
  title: [{ required: true, message: '请输入场次名称' }],
  range: [{ validator: (_r, _v, cb) => (form.startAt && form.endAt ? cb() : cb(new Error('请选择上课时间'))) }],
  address: [{ required: true, message: '请输入地点' }],
  depositCent: [{ validator: (_r, v, cb) => (v > 0 ? cb() : cb(new Error('请输入定金'))) }],
  balanceDueAt: [
    { required: true, message: '请选择尾款截止时间' },
    {
      validator: (_r, v: string, cb) =>
        form.startAt && v && new Date(v) > new Date(form.startAt) ? cb(new Error('不能晚于开课时间')) : cb(),
    },
  ],
};

function open(row?: OfflineSession) {
  editing.value = row;
  Object.assign(form, row ? { ...row } : blank());
  dialog.value = true;
  formRef.value?.clearValidate();
}

async function save() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  saving.value = true;
  try {
    const data: SessionForm = {
      title: form.title,
      startAt: form.startAt,
      endAt: form.endAt,
      address: form.address,
      quota: form.quota,
      depositCent: form.depositCent ?? 0,
      balanceCent: form.balanceCent ?? 0,
      balanceDueAt: form.balanceDueAt,
      enabled: form.enabled,
    };
    if (editing.value) await contentApi.updateSession(editing.value.id, data);
    else await contentApi.createSession(props.productId, data);
    ElMessage.success('已保存');
    dialog.value = false;
    emit('changed');
  } finally {
    saving.value = false;
  }
}

async function remove(row: OfflineSession) {
  await ElMessageBox.confirm(`确定删除场次「${row.title}」？`, '删除场次', { type: 'warning' });
  await contentApi.deleteSession(row.id);
  ElMessage.success('已删除');
  emit('changed');
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
