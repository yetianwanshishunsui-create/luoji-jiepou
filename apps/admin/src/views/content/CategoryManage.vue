<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-button type="primary" icon="Plus" @click="openForm()">新建一级分类</el-button>
      <span class="muted">最多两级；小程序只展示启用且对当前身份可见的分类</span>
    </div>

    <el-table v-loading="loading" :data="tree" row-key="id" default-expand-all :tree-props="{ children: 'children' }">
      <el-table-column prop="name" label="名称" min-width="200" />
      <el-table-column label="可见身份" width="180">
        <template #default="{ row }">
          <el-tag v-for="v in row.visibleTo" :key="v" size="small" class="tag">{{ IdentityTypeLabel[v as IdentityType] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="productCount" label="课程数" width="90" />
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'" size="small">{{ row.enabled ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button v-if="!row.parentId" link type="primary" @click="openForm(undefined, row as CategoryNode)">添加子分类</el-button>
          <el-button link type="primary" @click="openForm(row as CategoryNode)">编辑</el-button>
          <el-button link type="danger" @click="remove(row as CategoryNode)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="dialog" :title="editing ? '编辑分类' : '新建分类'" width="480px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="上级分类">
        <el-select v-model="form.parentId" clearable placeholder="无（一级分类）" :disabled="!!editing && hasChildren">
          <el-option v-for="r in roots" :key="r.id" :label="r.name" :value="r.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" maxlength="32" show-word-limit />
      </el-form-item>
      <el-form-item label="可见身份" prop="visibleTo">
        <VisibleToCheckbox v-model="form.visibleTo" />
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
import { IdentityTypeLabel, type IdentityType } from '@luoji/shared';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { contentApi, type CategoryForm, type CategoryNode } from '@/api/content';
import VisibleToCheckbox from '@/components/VisibleToCheckbox.vue';

const tree = ref<CategoryNode[]>([]);
const loading = ref(false);
const roots = computed(() => tree.value.filter((c) => c.id !== editing.value?.id));

const dialog = ref(false);
const saving = ref(false);
const editing = ref<CategoryNode>();
const hasChildren = computed(() => !!editing.value?.children?.length);
const formRef = ref<FormInstance>();
const form = reactive<CategoryForm>({ name: '', parentId: null, sort: 0, enabled: true, visibleTo: ['DOCTOR', 'PRACTITIONER'] });
const rules: FormRules = {
  name: [{ required: true, message: '请输入名称' }],
  visibleTo: [{ type: 'array', required: true, min: 1, message: '至少选择一种身份' }],
};

async function load() {
  loading.value = true;
  try {
    tree.value = await contentApi.categories();
  } finally {
    loading.value = false;
  }
}

function openForm(row?: CategoryNode, parent?: CategoryNode) {
  editing.value = row;
  Object.assign(form, {
    name: row?.name ?? '',
    parentId: row?.parentId ?? parent?.id ?? null,
    sort: row?.sort ?? 0,
    enabled: row?.enabled ?? true,
    visibleTo: [...(row?.visibleTo ?? parent?.visibleTo ?? ['DOCTOR', 'PRACTITIONER'])],
  });
  dialog.value = true;
  formRef.value?.clearValidate();
}

async function save() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  saving.value = true;
  try {
    const data = { ...form, parentId: form.parentId || null };
    if (editing.value) await contentApi.updateCategory(editing.value.id, data);
    else await contentApi.createCategory(data);
    ElMessage.success('已保存');
    dialog.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function remove(row: CategoryNode) {
  await ElMessageBox.confirm(`确定删除分类「${row.name}」？`, '删除分类', { type: 'warning' });
  await contentApi.deleteCategory(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(load);
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
.hint {
  margin-left: 12px;
}
.tag {
  margin-right: 4px;
}
</style>
