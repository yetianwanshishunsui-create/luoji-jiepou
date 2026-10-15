<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-form inline>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部" style="width: 120px" @change="reload">
            <el-option v-for="(label, value) in PublishStatusLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
      </el-form>
      <el-button type="primary" icon="Plus" @click="open()">新建</el-button>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="日期" width="120">
        <template #default="{ row }">{{ fmtDate(row.publishDate) }}</template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="220" />
      <el-table-column prop="audioKey" label="音频路径" min-width="200" show-overflow-tooltip />
      <el-table-column label="时长" width="80">
        <template #default="{ row }">{{ fmtDuration(row.duration) }}</template>
      </el-table-column>
      <el-table-column label="可见" width="120">
        <template #default="{ row }">{{ (row.visibleTo as IdentityType[]).map((v) => IdentityTypeLabel[v]).join(' / ') }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="PublishStatusTag[row.status as PublishStatus]">{{ PublishStatusLabel[row.status as PublishStatus] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="primary" @click="open(row as DailyAudio)">编辑</el-button>
          <el-button link type="danger" @click="remove(row as DailyAudio)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="page" class="pager" layout="total, prev, pager, next" :total="total" :page-size="pageSize" @current-change="load" />
  </el-card>

  <el-dialog v-model="dialog" :title="editing ? '编辑音频' : '新建音频'" width="520px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="日期" prop="publishDate">
        <el-date-picker v-model="form.publishDate" type="date" value-format="YYYY-MM-DD" />
      </el-form-item>
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" maxlength="128" />
      </el-form-item>
      <el-form-item label="音频路径" prop="audioKey">
        <el-input v-model="form.audioKey" placeholder="COS 对象路径，如 audio/2026-10-15.mp3" />
      </el-form-item>
      <el-form-item label="时长">
        <DurationInput v-model="form.duration" />
      </el-form-item>
      <el-form-item label="可见身份" prop="visibleTo">
        <VisibleToCheckbox v-model="form.visibleTo" />
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="form.status">
          <el-radio v-for="(label, value) in PublishStatusLabel" :key="value" :value="value">{{ label }}</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialog = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { IdentityTypeLabel, type IdentityType } from '@luoji/shared';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { contentApi, PublishStatusLabel, PublishStatusTag, type DailyAudio, type DailyAudioForm, type PublishStatus } from '@/api/content';
import DurationInput from '@/components/DurationInput.vue';
import VisibleToCheckbox from '@/components/VisibleToCheckbox.vue';
import { usePaged } from '@/composables/usePaged';
import { fmtDate, fmtDuration } from '@/utils/format';

const { filters, list, total, page, pageSize, loading, load, reload } = usePaged(contentApi.dailyAudios, {
  status: undefined as PublishStatus | undefined,
});

const dialog = ref(false);
const saving = ref(false);
const editing = ref<DailyAudio>();
const formRef = ref<FormInstance>();
const blank = (): DailyAudioForm => ({
  publishDate: new Date().toISOString().slice(0, 10),
  title: '',
  audioKey: '',
  duration: 60,
  visibleTo: ['DOCTOR', 'PRACTITIONER'],
  status: 'DRAFT',
});
const form = reactive<DailyAudioForm>(blank());
const rules: FormRules = {
  publishDate: [{ required: true, message: '请选择日期' }],
  title: [{ required: true, message: '请输入标题' }],
  audioKey: [{ required: true, message: '请输入音频路径' }],
  visibleTo: [{ type: 'array', required: true, min: 1, message: '至少选择一种身份' }],
};

function open(row?: DailyAudio) {
  editing.value = row;
  Object.assign(form, row ? { ...row, publishDate: fmtDate(row.publishDate) } : blank());
  dialog.value = true;
  formRef.value?.clearValidate();
}

async function save() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  saving.value = true;
  try {
    const data = { publishDate: form.publishDate, title: form.title, audioKey: form.audioKey, duration: form.duration, visibleTo: form.visibleTo, status: form.status };
    if (editing.value) await contentApi.updateDailyAudio(editing.value.id, data);
    else await contentApi.createDailyAudio(data);
    ElMessage.success('已保存');
    dialog.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function remove(row: DailyAudio) {
  await ElMessageBox.confirm(`确定删除「${row.title}」？`, '删除音频', { type: 'warning' });
  await contentApi.deleteDailyAudio(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
