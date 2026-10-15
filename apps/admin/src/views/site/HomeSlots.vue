<template>
  <el-card v-loading="loading" shadow="never">
    <div class="toolbar">
      <el-radio-group v-model="identity" @change="switchIdentity">
        <el-radio-button v-for="(label, value) in IdentityTypeLabel" :key="value" :value="value">{{ label }}首页</el-radio-button>
      </el-radio-group>
      <div class="actions">
        <span v-if="dirty" class="muted">有未保存的修改</span>
        <span v-else-if="updatedAt" class="muted">上次保存 {{ fmtShort(updatedAt) }}</span>
        <el-button icon="Plus" @click="addSection">添加栏目</el-button>
        <el-button type="primary" :loading="saving" :disabled="!dirty" @click="save">保存</el-button>
      </div>
    </div>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="tip"
      title="小程序首页按以下栏目顺序展示；未上架或对该身份不可见的课程会自动跳过。未配置任何栏目时，首页显示最新上架的 10 门课程。"
    />

    <el-empty v-if="!sections.length" description="还没有栏目，首页将显示最新课程" />

    <el-card v-for="(sec, si) in sections" :key="si" shadow="never" class="section">
      <template #header>
        <div class="section-head">
          <el-input v-model="sec.title" maxlength="20" placeholder="栏目标题，如：本周主推" style="width: 260px" />
          <div>
            <el-button link icon="Top" :disabled="si === 0" @click="move(sections, si, -1)" />
            <el-button link icon="Bottom" :disabled="si === sections.length - 1" @click="move(sections, si, 1)" />
            <el-button link type="danger" @click="sections.splice(si, 1)">删除栏目</el-button>
          </div>
        </div>
      </template>

      <div v-for="(p, pi) in sec.products" :key="p.id" class="product">
        <span class="index">{{ pi + 1 }}</span>
        <span class="title">{{ p.title }}</span>
        <el-tag v-if="p.type" size="small" type="info">{{ ProductTypeLabel[p.type] }}</el-tag>
        <el-tag v-if="p.warning" size="small" type="warning">{{ p.warning }}，不会展示</el-tag>
        <span class="spacer" />
        <el-button link icon="Top" :disabled="pi === 0" @click="move(sec.products, pi, -1)" />
        <el-button link icon="Bottom" :disabled="pi === sec.products.length - 1" @click="move(sec.products, pi, 1)" />
        <el-button link type="danger" @click="sec.products.splice(pi, 1)">移除</el-button>
      </div>

      <div class="add">
        <ProductSelect
          :model-value="undefined"
          :placeholder="sec.products.length >= 20 ? '每个栏目最多 20 门课程' : '搜索并添加课程'"
          :disabled="sec.products.length >= 20"
          @update:model-value="(id) => addProduct(sec, id as string)"
          ref="pickers"
        />
      </div>
    </el-card>
  </el-card>
</template>

<script setup lang="ts">
import { IdentityTypeLabel, ProductTypeLabel, type IdentityType } from '@luoji/shared';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { siteApi, type HomeSlotsView, type SlotProduct } from '@/api/site';
import ProductSelect from '@/components/ProductSelect.vue';
import { fmtShort } from '@/utils/format';

type Section = { title: string; products: SlotProduct[] };

const identity = ref<IdentityType>('DOCTOR');
const sections = ref<Section[]>([]);
const updatedAt = ref<string | null>(null);
const loading = ref(false);
const saving = ref(false);
const pickers = ref<InstanceType<typeof ProductSelect>[]>([]);

const serialize = () => JSON.stringify(sections.value.map((s) => [s.title, s.products.map((p) => p.id)]));
const snapshot = ref('[]');
const dirty = computed(() => serialize() !== snapshot.value);

function apply(view: HomeSlotsView) {
  sections.value = view.sections.map((s) => ({ title: s.title, products: [...s.products] }));
  updatedAt.value = view.updatedAt;
  snapshot.value = serialize();
}

async function load() {
  loading.value = true;
  try {
    apply(await siteApi.homeSlots(identity.value));
  } finally {
    loading.value = false;
  }
}

async function switchIdentity(next: string | number | boolean | undefined) {
  if (dirty.value) {
    const ok = await ElMessageBox.confirm('当前修改尚未保存，切换后将丢失。确定切换？', '提示', { type: 'warning' }).catch(() => false);
    if (!ok) {
      identity.value = next === 'DOCTOR' ? 'PRACTITIONER' : 'DOCTOR';
      return;
    }
  }
  load();
}

function move<T>(arr: T[], i: number, d: number) {
  [arr[i], arr[i + d]] = [arr[i + d], arr[i]];
}

function addSection() {
  sections.value.push({ title: '', products: [] });
}

function addProduct(sec: Section, id: string) {
  if (!id) return;
  if (sec.products.some((p) => p.id === id)) {
    ElMessage.warning('该课程已在本栏目中');
    return;
  }
  const opt = pickers.value.flatMap((p) => p.options).find((o) => o.id === id);
  if (opt) sec.products.push({ id, title: opt.title, type: opt.type, missing: false, warning: null });
}

async function save() {
  if (sections.value.some((s) => !s.title.trim())) {
    ElMessage.warning('请填写所有栏目的标题');
    return;
  }
  saving.value = true;
  try {
    const view = await siteApi.saveHomeSlots(
      identity.value,
      sections.value.map((s) => ({ title: s.title.trim(), productIds: s.products.map((p) => p.id) })),
    );
    apply(view);
    ElMessage.success('已保存');
  } finally {
    saving.value = false;
  }
}

onBeforeRouteLeave(() =>
  dirty.value ? ElMessageBox.confirm('修改尚未保存，确定离开？', '提示', { type: 'warning' }).then(() => true, () => false) : true,
);

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.tip {
  margin: 16px 0;
}
.section {
  margin-bottom: 12px;
}
.section :deep(.el-card__header) {
  padding: 10px 16px;
  background: #fafbfa;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.product {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f2f1;
}
.index {
  width: 24px;
  color: var(--el-text-color-secondary);
}
.spacer {
  flex: 1;
}
.add {
  margin-top: 12px;
  max-width: 420px;
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
