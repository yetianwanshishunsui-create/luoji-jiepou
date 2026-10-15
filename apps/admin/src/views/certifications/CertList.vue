<template>
  <el-card shadow="never">
    <el-form inline>
      <el-form-item label="状态">
        <el-select v-model="filters.status" clearable placeholder="全部" style="width: 140px" @change="reload">
          <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="用户" min-width="160">
        <template #default="{ row }">{{ row.user.nickname || '未设置昵称' }}<br /><small>{{ row.user.phoneMasked || '—' }}</small></template>
      </el-table-column>
      <el-table-column label="身份" width="100">
        <template #default="{ row }">{{ IdentityTypeLabel[row.identityType as IdentityType] }}</template>
      </el-table-column>
      <el-table-column prop="organization" label="机构" min-width="160" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTag[row.status as CertStatus]">{{ CertStatusLabel[row.status as CertStatus] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="审核人" width="100">
        <template #default="{ row }">{{ row.reviewer?.name ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="open(row.id)">{{ row.status === 'PENDING' ? '审核' : '查看' }}</el-button>
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

  <el-drawer v-model="drawer" title="认证详情" size="480px">
    <template v-if="detail">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="姓名">{{ detail.realName }}</el-descriptions-item>
        <el-descriptions-item label="身份">{{ IdentityTypeLabel[detail.identityType] }}</el-descriptions-item>
        <el-descriptions-item label="证件号">{{ detail.licenseNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="机构">{{ detail.organization || '—' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ CertStatusLabel[detail.status] }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.rejectReason" label="驳回原因">{{ detail.rejectReason }}</el-descriptions-item>
      </el-descriptions>

      <div class="files">
        <el-image v-for="url in detail.fileUrls" :key="url" :src="url" :preview-src-list="detail.fileUrls" fit="cover" class="file" />
        <el-alert v-if="!detail.fileUrls.length" type="info" :closable="false" title="证件图片预览待接入 COS 签名 URL（WP03）" />
      </div>

      <template v-if="detail.status === 'PENDING'">
        <el-input v-model="rejectReason" type="textarea" :rows="3" maxlength="255" placeholder="驳回时必填：告诉用户需要补充什么" />
        <div class="actions">
          <el-button type="danger" plain :loading="submitting" @click="review('REJECT')">驳回</el-button>
          <el-button type="primary" :loading="submitting" @click="review('APPROVE')">通过</el-button>
        </div>
      </template>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { CertStatus, CertStatusLabel, IdentityTypeLabel, type IdentityType } from '@luoji/shared';
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api, type CertDetail } from '@/api';
import { usePaged } from '@/composables/usePaged';

const route = useRoute();
const statusOptions = Object.values(CertStatus)
  .filter((s) => s !== 'UNSUBMITTED')
  .map((value) => ({ value, label: CertStatusLabel[value] }));
const statusTag: Record<CertStatus, 'info' | 'warning' | 'success' | 'danger'> = {
  UNSUBMITTED: 'info',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  REVOKED: 'info',
};

const { filters, list, total, page, pageSize, loading, load, reload } = usePaged(api.certifications, {
  status: (route.query.status as CertStatus | undefined) ?? undefined,
});

const drawer = ref(false);
const detail = ref<CertDetail>();
const rejectReason = ref('');
const submitting = ref(false);

async function open(id: string) {
  detail.value = undefined;
  rejectReason.value = '';
  drawer.value = true;
  detail.value = await api.certification(id);
}

async function review(action: 'APPROVE' | 'REJECT') {
  if (!detail.value) return;
  if (action === 'REJECT' && !rejectReason.value.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  submitting.value = true;
  try {
    await api.reviewCertification(detail.value.id, {
      action,
      rejectReason: action === 'REJECT' ? rejectReason.value.trim() : undefined,
    });
    ElMessage.success(action === 'APPROVE' ? '已通过' : '已驳回');
    drawer.value = false;
    load();
  } finally {
    submitting.value = false;
  }
}

const fmt = (s: string) => new Date(s).toLocaleString('zh-CN', { hour12: false });

onMounted(load);
</script>

<style scoped>
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
.files {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}
.file {
  width: 120px;
  height: 90px;
  border-radius: 4px;
}
.actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
