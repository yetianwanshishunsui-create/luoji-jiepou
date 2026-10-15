<template>
  <el-card shadow="never">
    <div class="toolbar">
      <span class="muted">首页顶部轮播，按排序值从小到大展示；可按身份分别投放，并设置上下线时间</span>
      <el-button type="primary" icon="Plus" @click="open()">新建 Banner</el-button>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="图片" width="200">
        <template #default="{ row }">
          <el-image :src="row.image" fit="cover" class="thumb" :preview-src-list="[row.image]" preview-teleported />
        </template>
      </el-table-column>
      <el-table-column label="标题" min-width="160">
        <template #default="{ row }">
          <div>{{ row.title }}</div>
          <div class="muted">{{ linkLabel(row.link) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="投放身份" width="100">
        <template #default="{ row }">{{ row.identityType ? IdentityTypeLabel[row.identityType as IdentityType] : '全部' }}</template>
      </el-table-column>
      <el-table-column label="投放时间" width="210">
        <template #default="{ row }">
          <span v-if="!row.onlineAt && !row.offlineAt" class="muted">长期</span>
          <span v-else>{{ row.onlineAt ? fmtMd(row.onlineAt) : '立即' }} ~ {{ row.offlineAt ? fmtMd(row.offlineAt) : '长期' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="70" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="stateOf(row as Banner).type">{{ stateOf(row as Banner).label }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="primary" @click="open(row as Banner)">编辑</el-button>
          <el-button link type="danger" @click="remove(row as Banner)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="dialog" :title="editing ? '编辑 Banner' : '新建 Banner'" width="600px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" maxlength="64" placeholder="后台识别用，也作为图片说明" />
      </el-form-item>
      <el-form-item label="图片" prop="image">
        <el-input v-model="form.image" placeholder="https:// 图片链接（建议 750×300）" />
        <el-image v-if="form.image" :src="form.image" fit="cover" class="preview" />
        <div class="muted">图片上传待接入腾讯云 COS，当前请粘贴图片链接</div>
      </el-form-item>
      <el-form-item label="跳转">
        <LinkPicker v-model="form.link" :initial="linkInitial" />
      </el-form-item>
      <el-form-item label="投放身份">
        <el-radio-group v-model="identity">
          <el-radio value="ALL">全部</el-radio>
          <el-radio v-for="(label, value) in IdentityTypeLabel" :key="value" :value="value">{{ label }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="投放时间">
        <el-date-picker v-model="form.onlineAt" type="datetime" placeholder="立即" value-format="YYYY-MM-DDTHH:mm:ssZ" />
        <span class="sep">至</span>
        <el-date-picker v-model="form.offlineAt" type="datetime" placeholder="长期" value-format="YYYY-MM-DDTHH:mm:ssZ" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sort" :min="0" :max="9999" />
        <span class="muted hint">数字越小越靠前</span>
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
</template>

<script setup lang="ts">
import { IdentityTypeLabel, LINKABLE_PAGES, type IdentityType } from '@luoji/shared';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { contentApi } from '@/api/content';
import { siteApi, type Banner, type BannerForm } from '@/api/site';
import LinkPicker from '@/components/LinkPicker.vue';
import { fmtMd } from '@/utils/format';

const list = ref<Banner[]>([]);
const loading = ref(false);
/** 课程 id → 标题，用于展示“课程详情：xxx” */
const productTitles = ref(new Map<string, string>());

async function load() {
  loading.value = true;
  try {
    list.value = await siteApi.banners();
    const ids = list.value.map((b) => /[?&]id=([^&]+)/.exec(b.link ?? '')?.[1]).filter((x): x is string => !!x);
    if (ids.length) {
      const res = await contentApi.products({ page: 1, pageSize: 100 });
      productTitles.value = new Map(res.list.map((p) => [p.id, p.title]));
    }
  } finally {
    loading.value = false;
  }
}

function linkLabel(link: string | null) {
  if (!link) return '不跳转';
  const [path] = link.split('?');
  const page = LINKABLE_PAGES.find((p) => p.path === path);
  const id = /[?&]id=([^&]+)/.exec(link)?.[1];
  return `→ ${page?.label ?? path}${id ? `：${productTitles.value.get(id) ?? id}` : ''}`;
}

function stateOf(b: Banner) {
  const now = Date.now();
  if (!b.enabled) return { label: '已停用', type: 'info' as const };
  if (b.onlineAt && new Date(b.onlineAt).getTime() > now) return { label: '待上线', type: 'warning' as const };
  if (b.offlineAt && new Date(b.offlineAt).getTime() <= now) return { label: '已下线', type: 'info' as const };
  return { label: '展示中', type: 'success' as const };
}

// ───────── 表单 ─────────
const dialog = ref(false);
const saving = ref(false);
const editing = ref<Banner>();
const formRef = ref<FormInstance>();
const blank = (): BannerForm => ({
  position: 'HOME_TOP',
  title: '',
  image: '',
  link: null,
  identityType: null,
  sort: 0,
  onlineAt: null,
  offlineAt: null,
  enabled: true,
});
const form = reactive<BannerForm>(blank());
const identity = computed({
  get: () => form.identityType ?? 'ALL',
  set: (v: string) => (form.identityType = v === 'ALL' ? null : (v as IdentityType)),
});
const linkInitial = computed(() => {
  const id = /[?&]id=([^&]+)/.exec(form.link ?? '')?.[1];
  return id ? [{ id, title: productTitles.value.get(id) ?? id }] : [];
});
const rules: FormRules = {
  title: [{ required: true, whitespace: true, message: '请填写标题' }],
  image: [
    { required: true, message: '请填写图片链接' },
    { pattern: /^https?:\/\/\S+$/, message: '请输入以 http(s):// 开头的图片链接' },
  ],
};

function open(row?: Banner) {
  editing.value = row;
  Object.assign(form, row ? { ...row } : blank());
  dialog.value = true;
  formRef.value?.clearValidate();
}

async function save() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  if (form.link && LINKABLE_PAGES.some((p) => p.path === form.link && 'param' in p)) {
    ElMessage.warning('请选择要跳转的课程');
    return;
  }
  saving.value = true;
  try {
    const data: BannerForm = {
      position: form.position,
      title: form.title,
      image: form.image,
      link: form.link,
      identityType: form.identityType,
      sort: form.sort,
      onlineAt: form.onlineAt || null,
      offlineAt: form.offlineAt || null,
      enabled: form.enabled,
    };
    if (editing.value) await siteApi.updateBanner(editing.value.id, data);
    else await siteApi.createBanner(data);
    ElMessage.success('已保存');
    dialog.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function remove(row: Banner) {
  await ElMessageBox.confirm(`确定删除「${row.title}」？`, '删除 Banner', { type: 'warning' });
  await siteApi.deleteBanner(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.thumb {
  width: 170px;
  height: 68px;
  border-radius: 4px;
}
.preview {
  width: 100%;
  height: 160px;
  margin-top: 8px;
  border-radius: 4px;
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.sep {
  margin: 0 8px;
  color: var(--el-text-color-secondary);
}
.hint {
  margin-left: 12px;
}
</style>
