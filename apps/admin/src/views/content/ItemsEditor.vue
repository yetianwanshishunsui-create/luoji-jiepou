<template>
  <div>
    <div class="toolbar">
      <el-select
        v-model="picking"
        filterable
        remote
        :remote-method="search"
        :loading="searching"
        placeholder="搜索单课标题，添加到列表"
        style="width: 360px"
        @change="add"
        @focus="search('')"
      >
        <el-option v-for="o in options" :key="o.id" :label="o.title" :value="o.id" :disabled="list.some((i) => i.id === o.id)">
          <span>{{ o.title }}</span>
          <el-tag size="small" :type="PublishStatusTag[o.status]" class="opt-tag">{{ PublishStatusLabel[o.status] }}</el-tag>
        </el-option>
      </el-select>
      <el-button type="primary" :loading="saving" :disabled="!dirty" @click="save">保存</el-button>
      <span v-if="dirty" class="muted">有未保存的修改</span>
    </div>

    <el-alert v-if="offlineCount" type="warning" :closable="false" show-icon class="alert" :title="`有 ${offlineCount} 门课程未上架，专栏上架前需先上架这些课程`" />

    <el-table :data="list" empty-text="还没有课程，从上方搜索添加">
      <el-table-column type="index" label="#" width="50" />
      <el-table-column prop="title" label="课程" min-width="240" />
      <el-table-column label="单独售价" width="110">
        <template #default="{ row }">¥{{ yuan(row.priceCent) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="PublishStatusTag[row.status as PublishStatus]">{{ PublishStatusLabel[row.status as PublishStatus] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ $index }">
          <el-button link icon="Top" :disabled="$index === 0" @click="move($index, -1)" />
          <el-button link icon="Bottom" :disabled="$index === list.length - 1" @click="move($index, 1)" />
          <el-button link type="danger" @click="list.splice($index, 1)">移除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="muted footer">组合总价 ¥{{ yuan(list.reduce((n, i) => n + i.priceCent, 0)) }}（供定价参考）；已购专栏的学员可学习列表中的全部课程</div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';
import { contentApi, PublishStatusLabel, PublishStatusTag, type ProductDetail, type ProductRow, type PublishStatus } from '@/api/content';
import { yuan } from '@/utils/format';

type Item = ProductDetail['children'][number]['childProduct'];

const props = defineProps<{ productId: string; items: ProductDetail['children'] }>();
const emit = defineEmits<{ changed: [] }>();

const list = ref<Item[]>([]);
const original = ref('');
watch(
  () => props.items,
  (items) => {
    list.value = items.map((i) => ({ ...i.childProduct }));
    original.value = list.value.map((i) => i.id).join();
  },
  { immediate: true },
);
const dirty = computed(() => list.value.map((i) => i.id).join() !== original.value);
const offlineCount = computed(() => list.value.filter((i) => i.status !== 'ONLINE').length);

const picking = ref<string>();
const options = ref<ProductRow[]>([]);
const searching = ref(false);

async function search(keyword: string) {
  searching.value = true;
  try {
    options.value = (await contentApi.products({ page: 1, pageSize: 30, type: 'COURSE', keyword: keyword || undefined })).list;
  } finally {
    searching.value = false;
  }
}

function add(id: string) {
  const o = options.value.find((x) => x.id === id);
  if (o) list.value.push({ id: o.id, title: o.title, type: o.type, status: o.status, priceCent: o.priceCent });
  picking.value = undefined;
}

function move(i: number, d: number) {
  const next = [...list.value];
  [next[i], next[i + d]] = [next[i + d], next[i]];
  list.value = next;
}

const saving = ref(false);
async function save() {
  saving.value = true;
  try {
    await contentApi.setItems(props.productId, list.value.map((i) => i.id));
    ElMessage.success('已保存');
    emit('changed');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.opt-tag {
  margin-left: 8px;
}
.alert {
  margin-bottom: 12px;
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.footer {
  margin-top: 12px;
}
</style>
