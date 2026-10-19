<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-form inline class="filters" @submit.prevent="reload">
        <el-form-item label="类型">
          <el-select v-model="filters.type" clearable placeholder="全部" style="width: 110px" @change="reload">
            <el-option v-for="(label, value) in ProductTypeLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部" style="width: 110px" @change="reload">
            <el-option v-for="(label, value) in PublishStatusLabel" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-cascader
            v-model="filters.categoryId"
            :options="categories"
            :props="{ value: 'id', label: 'name', checkStrictly: true, emitPath: false }"
            clearable
            placeholder="全部"
            style="width: 180px"
            @change="reload"
          />
        </el-form-item>
        <el-form-item>
          <el-input v-model="filters.keyword" clearable placeholder="搜索标题" style="width: 180px" @clear="reload" />
        </el-form-item>
        <el-form-item>
          <el-button icon="Search" @click="reload">查询</el-button>
        </el-form-item>
      </el-form>

      <el-dropdown @command="(type: ProductType) => router.push({ name: 'content-product-new', query: { type } })">
        <el-button type="primary" icon="Plus">新建</el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="(label, value) in ProductTypeLabel" :key="value" :command="value">{{ label }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="课程" min-width="280">
        <template #default="{ row }">
          <div class="product">
            <el-image v-if="row.cover" :src="row.cover" fit="cover" class="cover" />
            <div v-else class="cover empty">{{ ProductTypeLabel[row.type as ProductType] }}</div>
            <div>
              <el-link type="primary" underline="never" @click="edit(row.id)">{{ row.title }}</el-link>
              <div class="muted">{{ summary(row as ProductRow) }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }">{{ ProductTypeLabel[row.type as ProductType] }}</template>
      </el-table-column>
      <el-table-column label="分类" width="120">
        <template #default="{ row }">{{ row.category?.name ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="价格" width="100">
        <template #default="{ row }">{{ row.pricingMode === 'FREE' ? '免费' : row.type === 'OFFLINE' ? '按场次' : `¥${yuan(row.priceCent)}` }}</template>
      </el-table-column>
      <el-table-column label="可见" width="120">
        <template #default="{ row }">{{ (row.visibleTo as IdentityType[]).map((v) => IdentityTypeLabel[v]).join(' / ') }}</template>
      </el-table-column>
      <el-table-column label="学员" prop="_count.entitlements" width="70" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="PublishStatusTag[row.status as PublishStatus]" size="small">{{ PublishStatusLabel[row.status as PublishStatus] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="150">
        <template #default="{ row }">{{ fmtShort(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="edit(row.id)">编辑</el-button>
          <el-button v-if="row.status === 'ONLINE'" link type="warning" @click="setStatus(row as ProductRow, 'OFFLINE')">下架</el-button>
          <el-button v-else link type="success" @click="setStatus(row as ProductRow, 'ONLINE')">上架</el-button>
          <el-button v-if="row.status !== 'ONLINE'" link type="danger" @click="remove(row as ProductRow)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      class="pager"
      layout="total, prev, pager, next"
      :total="total"
      @current-change="load"
    />
  </el-card>
</template>

<script setup lang="ts">
import { IdentityTypeLabel, ProductTypeLabel, type IdentityType, type ProductType } from '@luoji/shared';
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { contentApi, PublishStatusLabel, PublishStatusTag, type CategoryNode, type ProductRow, type PublishStatus } from '@/api/content';
import { usePaged } from '@/composables/usePaged';
import { fmtShort, yuan } from '@/utils/format';

const router = useRouter();
const categories = ref<CategoryNode[]>([]);

const { filters, list, total, page, pageSize, loading, load, reload } = usePaged(contentApi.products, {
  type: undefined as ProductType | undefined,
  status: undefined as PublishStatus | undefined,
  categoryId: undefined as string | undefined,
  keyword: undefined as string | undefined,
});

function summary(row: ProductRow) {
  if (row.type === 'COURSE') return `${row._count.chapters} 章`;
  if (row.type === 'OFFLINE') return `${row._count.sessions} 个场次`;
  return `包含 ${row._count.children} 门课程`;
}

const edit = (id: string) => router.push({ name: 'content-product-edit', params: { id } });

async function setStatus(row: ProductRow, status: PublishStatus) {
  if (status === 'OFFLINE') {
    await ElMessageBox.confirm(`下架后学员将无法看到「${row.title}」，已购学员也无法继续学习。确定下架？`, '下架课程', { type: 'warning' });
  }
  await contentApi.setStatus(row.id, status);
  ElMessage.success(status === 'ONLINE' ? '已上架' : '已下架');
  load();
}

async function remove(row: ProductRow) {
  await ElMessageBox.confirm(`删除后不可恢复，目录和学习记录会一并删除。确定删除「${row.title}」？`, '删除课程', {
    type: 'warning',
    confirmButtonText: '删除',
  });
  await contentApi.deleteProduct(row.id);
  ElMessage.success('已删除');
  load();
}

onMounted(async () => {
  load();
  categories.value = await contentApi.categories();
});
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.filters {
  flex: 1;
}
.product {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cover {
  width: 80px;
  height: 52px;
  border-radius: 4px;
  flex-shrink: 0;
}
.cover.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ebf1fd;
  color: #2a5bd7;
  font-size: 12px;
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 2px;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
