<template>
  <el-card shadow="never">
    <div class="toolbar">
      <el-form inline>
        <el-form-item label="阶段">
          <el-select v-model="filters.phase" clearable placeholder="全部" style="width: 110px" @change="reload">
            <el-option label="进行中" value="active" />
            <el-option label="未开始" value="upcoming" />
            <el-option label="已结束" value="ended" />
          </el-select>
        </el-form-item>
        <el-form-item label="课程">
          <div style="width: 240px">
            <ProductSelect v-model="filters.productId" paid-only @update:model-value="reload" />
          </div>
        </el-form-item>
      </el-form>
      <el-button type="primary" icon="Plus" @click="open()">新建价格策略</el-button>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="课程" min-width="200">
        <template #default="{ row }">{{ row.product.title }}</template>
      </el-table-column>
      <el-table-column label="类型" width="90">
        <template #default="{ row }">{{ RuleTypeLabel[row.type as RuleType] }}</template>
      </el-table-column>
      <el-table-column label="价格" width="170">
        <template #default="{ row }">
          <span class="origin">¥{{ yuan(row.product.priceCent) }}</span>
          <b class="price">¥{{ yuan(row.priceCent) }}</b>
          <span class="off">{{ discountRate(row as PriceRule) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="时间" min-width="260">
        <template #default="{ row }">{{ fmtShort(row.startAt) }} ~ {{ fmtShort(row.endAt) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="phaseOf(row as PriceRule).type">{{ phaseOf(row as PriceRule).label }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="primary" @click="open(row as PriceRule)">编辑</el-button>
          <el-button link type="danger" @click="remove(row as PriceRule)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-model:current-page="page" class="pager" layout="total, prev, pager, next" :total="total" :page-size="pageSize" @current-change="load" />
  </el-card>

  <el-dialog v-model="dialog" :title="editing ? '编辑价格策略' : '新建价格策略'" width="540px">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="课程" prop="productId">
        <ProductSelect ref="pickerRef" v-model="form.productId" paid-only :initial="initialProducts" :disabled="!!editing" />
      </el-form-item>
      <el-form-item label="类型">
        <el-radio-group v-model="form.type">
          <el-radio v-for="(label, value) in RuleTypeLabel" :key="value" :value="value">{{ label }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="活动价" prop="priceCent">
        <MoneyInput v-model="form.priceCent" />
        <span v-if="originCent" class="hint">原价 ¥{{ yuan(originCent) }}</span>
      </el-form-item>
      <el-form-item label="活动时间" prop="range">
        <el-date-picker v-model="range" type="datetimerange" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DDTHH:mm:ssZ" />
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="form.enabled" />
      </el-form-item>
      <el-alert type="info" :closable="false" show-icon title="活动期间课程按活动价售卖，详情页显示标签和倒计时；同一课程的活动时间不能重叠。" />
    </el-form>
    <template #footer>
      <el-button @click="dialog = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { marketingApi, phaseOf, RuleTypeLabel, type PriceRule, type PriceRuleForm, type RuleType } from '@/api/marketing';
import MoneyInput from '@/components/MoneyInput.vue';
import ProductSelect from '@/components/ProductSelect.vue';
import { usePaged } from '@/composables/usePaged';
import { fmtShort, yuan } from '@/utils/format';

const { filters, list, total, page, pageSize, loading, load, reload } = usePaged(marketingApi.priceRules, {
  phase: undefined as string | undefined,
  productId: undefined as string | undefined,
});

function discountRate(r: PriceRule) {
  return `${((r.priceCent / r.product.priceCent) * 10).toFixed(1).replace(/\.0$/, '')} 折`;
}

// ───────── 表单 ─────────
const dialog = ref(false);
const saving = ref(false);
const editing = ref<PriceRule>();
const formRef = ref<FormInstance>();
const pickerRef = ref<InstanceType<typeof ProductSelect>>();
type FormState = Omit<PriceRuleForm, 'priceCent'> & { priceCent: number | null };
const form = reactive<FormState>({ productId: '', type: 'EARLY_BIRD', priceCent: null, startAt: '', endAt: '', enabled: true });
const initialProducts = computed(() => (editing.value ? [editing.value.product] : []));
/** 当前所选课程的原价（用于提示与校验） */
const originCent = computed(() => {
  if (editing.value) return editing.value.product.priceCent;
  return pickerRef.value?.options.find((o) => o.id === form.productId)?.priceCent ?? null;
});
const range = computed({
  get: (): [string, string] | null => (form.startAt && form.endAt ? [form.startAt, form.endAt] : null),
  set: (v: [string, string] | null) => {
    form.startAt = v?.[0] ?? '';
    form.endAt = v?.[1] ?? '';
  },
});
const rules: FormRules = {
  productId: [{ required: true, message: '请选择课程' }],
  priceCent: [
    {
      validator: (_r, v: number | null, cb) =>
        !v ? cb(new Error('请输入活动价')) : originCent.value && v >= originCent.value ? cb(new Error('活动价必须低于原价')) : cb(),
    },
  ],
  range: [{ validator: (_r, _v, cb) => (form.startAt && form.endAt ? cb() : cb(new Error('请选择活动时间'))) }],
};

function open(row?: PriceRule) {
  editing.value = row;
  Object.assign(
    form,
    row
      ? { productId: row.productId, type: row.type, priceCent: row.priceCent, startAt: row.startAt, endAt: row.endAt, enabled: row.enabled }
      : { productId: '', type: 'EARLY_BIRD', priceCent: null, startAt: '', endAt: '', enabled: true },
  );
  dialog.value = true;
  formRef.value?.clearValidate();
}

async function save() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  saving.value = true;
  try {
    const data = { ...form, priceCent: form.priceCent! };
    if (editing.value) await marketingApi.updatePriceRule(editing.value.id, data);
    else await marketingApi.createPriceRule(data);
    ElMessage.success('已保存');
    dialog.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function remove(row: PriceRule) {
  await ElMessageBox.confirm(`确定删除「${row.product.title}」的${RuleTypeLabel[row.type]}？`, '删除价格策略', { type: 'warning' });
  await marketingApi.deletePriceRule(row.id);
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
.origin {
  color: var(--el-text-color-secondary);
  text-decoration: line-through;
  margin-right: 8px;
}
.price {
  color: #d4380d;
}
.off {
  margin-left: 6px;
  font-size: 12px;
  color: #d4380d;
}
.hint {
  margin-left: 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
