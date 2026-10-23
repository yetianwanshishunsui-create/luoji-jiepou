<template>
  <el-card shadow="never">
    <el-alert
      v-if="pending"
      class="tip"
      type="warning"
      :closable="false"
      :title="`有 ${pending} 条评价待审核：微信内容安全检测建议人工复核，确认无问题后点「展示」`"
    />
    <el-form inline>
      <el-form-item label="状态">
        <el-select v-model="filters.status" clearable placeholder="全部" style="width: 120px" @change="reload">
          <el-option v-for="(label, value) in ReviewStatusLabel" :key="value" :label="label" :value="value" />
        </el-select>
      </el-form-item>
      <el-form-item label="评分">
        <el-select v-model="filters.rating" clearable placeholder="全部" style="width: 110px" @change="reload">
          <el-option v-for="n in [5, 4, 3, 2, 1]" :key="n" :label="`${n} 星`" :value="n" />
        </el-select>
      </el-form-item>
      <el-form-item label="课程">
        <el-input v-model="filters.keyword" clearable placeholder="课程名称" style="width: 200px" @change="reload" />
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="课程" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.product.title }}</template>
      </el-table-column>
      <el-table-column label="学员" width="130">
        <template #default="{ row }">
          <div>{{ row.user.nickname || '未设置昵称' }}</div>
          <div class="muted">{{ row.user.identityType ? IdentityTypeLabel[row.user.identityType as IdentityType] : '' }}{{ row.anonymous ? ' · 匿名' : '' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="评分" width="130">
        <template #default="{ row }"><el-rate :model-value="row.rating" disabled size="small" /></template>
      </el-table-column>
      <el-table-column label="内容" min-width="260">
        <template #default="{ row }">
          <div class="content">{{ row.content }}</div>
          <div v-if="row.reply" class="reply">官方回复：{{ row.reply }}</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTag[row.status as ReviewStatus]" size="small">{{ ReviewStatusLabel[row.status as ReviewStatus] }}</el-tag>
          <el-tag v-if="row.featured" type="warning" size="small" class="featured">精选</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="110">
        <template #default="{ row }">{{ fmt(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="210" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status !== 'VISIBLE'" link type="primary" @click="save(row as ReviewRow, { status: 'VISIBLE' })">展示</el-button>
          <el-button v-if="row.status !== 'HIDDEN'" link type="danger" @click="save(row as ReviewRow, { status: 'HIDDEN' })">隐藏</el-button>
          <el-button link type="primary" @click="save(row as ReviewRow, { featured: !row.featured })">{{ row.featured ? '取消精选' : '精选' }}</el-button>
          <el-button link type="primary" @click="openReply(row as ReviewRow)">{{ row.reply ? '改回复' : '回复' }}</el-button>
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

    <el-dialog v-model="replying" title="官方回复" width="480px">
      <div class="muted quote">{{ current?.content }}</div>
      <el-input v-model="replyText" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="回复会显示在该评价下方，留空并保存即删除回复" />
      <template #footer>
        <el-button @click="replying = false">取消</el-button>
        <el-button type="primary" @click="saveReply">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { IdentityTypeLabel, ReviewStatusLabel, type IdentityType, type ReviewStatus } from '@luoji/shared';
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import { reviewApi, type ReviewQuery, type ReviewRow } from '@/api/review';
import { usePaged } from '@/composables/usePaged';

const statusTag: Record<ReviewStatus, 'warning' | 'success' | 'info'> = { PENDING: 'warning', VISIBLE: 'success', HIDDEN: 'info' };
const pending = ref(0);

const { filters, list, total, page, pageSize, loading, load, reload } = usePaged(
  async (params: ReviewQuery) => {
    const res = await reviewApi.list(params);
    pending.value = res.pending;
    return res;
  },
  { status: undefined as ReviewStatus | undefined, rating: undefined as number | undefined, keyword: '' },
);

const fmt = (s: string) => {
  const d = new Date(s);
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

async function save(row: ReviewRow, patch: { status?: ReviewStatus; featured?: boolean; reply?: string }) {
  const updated = await reviewApi.update(row.id, patch);
  Object.assign(row, { status: updated.status, featured: updated.featured, reply: updated.reply });
  ElMessage.success('已保存');
  if (patch.status) load();
}

const replying = ref(false);
const replyText = ref('');
const current = ref<ReviewRow>();
function openReply(row: ReviewRow) {
  current.value = row;
  replyText.value = row.reply ?? '';
  replying.value = true;
}
async function saveReply() {
  if (!current.value) return;
  await save(current.value, { reply: replyText.value.trim() });
  replying.value = false;
}

onMounted(load);
</script>

<style scoped>
.tip {
  margin-bottom: 16px;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
.muted {
  color: #6b7385;
  font-size: 12px;
}
.content {
  white-space: pre-wrap;
  line-height: 1.6;
}
.reply {
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f4f6fa;
  color: #3a4256;
  font-size: 12px;
}
.featured {
  margin-left: 4px;
}
.quote {
  margin-bottom: 12px;
  line-height: 1.6;
}
</style>
