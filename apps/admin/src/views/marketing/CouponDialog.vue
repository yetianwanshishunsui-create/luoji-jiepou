<template>
  <el-dialog :model-value="modelValue" :title="couponId ? '编辑优惠券' : '新建优惠券'" width="620px" @update:model-value="emit('update:modelValue', $event)" @open="init">
    <el-alert v-if="locked" type="warning" :closable="false" show-icon class="lock-tip" :title="`已发放 ${issuedCount} 张，金额、门槛、适用范围和开始时间不可修改`" />
    <el-form ref="formRef" v-loading="loading" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" maxlength="64" placeholder="如：新人立减 20" />
      </el-form-item>
      <el-form-item label="使用说明">
        <el-input v-model="form.description" maxlength="255" placeholder="展示在券面上，可选" />
      </el-form-item>
      <el-form-item label="类型">
        <el-radio-group v-model="form.type" :disabled="locked">
          <el-radio value="DIRECT">立减券</el-radio>
          <el-radio value="FULL_REDUCTION">满减券</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="form.type === 'FULL_REDUCTION'" label="使用门槛" prop="thresholdCent">
        <span class="prefix">满</span>
        <MoneyInput v-model="form.thresholdCent" :disabled="locked" />
      </el-form-item>
      <el-form-item label="优惠金额" prop="discountCent">
        <span class="prefix">减</span>
        <MoneyInput v-model="form.discountCent" :disabled="locked" />
      </el-form-item>
      <el-form-item label="适用范围">
        <el-radio-group v-model="form.scope" :disabled="locked" @change="form.scopeIds = []">
          <el-radio v-for="(label, value) in CouponScopeLabel" :key="value" :value="value">{{ label }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="form.scope === 'CATEGORY'" label="选择分类" prop="scopeIds">
        <el-cascader
          v-model="form.scopeIds"
          :options="categories"
          :props="{ value: 'id', label: 'name', checkStrictly: true, emitPath: false, multiple: true }"
          :disabled="locked"
          clearable
          style="width: 100%"
          placeholder="选择一级分类会包含其下所有二级分类"
        />
      </el-form-item>
      <el-form-item v-if="form.scope === 'PRODUCT'" label="选择课程" prop="scopeIds">
        <ProductSelect v-model="form.scopeIds" multiple paid-only :initial="scopeItems" :disabled="locked" />
      </el-form-item>
      <el-form-item label="有效期" prop="range">
        <el-date-picker
          v-model="range"
          type="datetimerange"
          start-placeholder="开始"
          end-placeholder="结束"
          value-format="YYYY-MM-DDTHH:mm:ssZ"
          :disabled="locked"
        />
        <div v-if="locked" class="extend">
          <span class="muted">延长结束时间：</span>
          <el-date-picker v-model="form.validTo" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" size="small" />
        </div>
      </el-form-item>
      <el-form-item label="发放总量">
        <el-input-number v-model="form.totalCount" :min="0" :max="1000000" />
        <span class="muted hint">0 表示不限</span>
      </el-form-item>
      <el-form-item label="领取方式">
        <el-switch v-model="form.claimable" active-text="用户可在领券中心领取" inactive-text="仅后台定向发放" />
      </el-form-item>
      <el-form-item v-if="form.claimable" label="每人限领">
        <el-input-number v-model="form.perUserLimit" :min="1" :max="100" />
        <span class="muted hint">张</span>
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="form.enabled" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { computed, reactive, ref } from 'vue';
import { contentApi, type CategoryNode } from '@/api/content';
import { CouponScopeLabel, marketingApi, type CouponForm } from '@/api/marketing';
import MoneyInput from '@/components/MoneyInput.vue';
import ProductSelect from '@/components/ProductSelect.vue';

const props = defineProps<{ modelValue: boolean; couponId?: string }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>();

const loading = ref(false);
const saving = ref(false);
const formRef = ref<FormInstance>();
const categories = ref<CategoryNode[]>([]);
const scopeItems = ref<{ id: string; title: string }[]>([]);
const issuedCount = ref(0);
const locked = computed(() => issuedCount.value > 0);

type FormState = Omit<CouponForm, 'thresholdCent' | 'discountCent'> & { thresholdCent: number | null; discountCent: number | null };
const blank = (): FormState => {
  const from = new Date();
  const to = new Date(Date.now() + 30 * 86400_000);
  return {
    name: '',
    description: null,
    type: 'DIRECT',
    thresholdCent: null,
    discountCent: null,
    scope: 'ALL',
    scopeIds: [],
    totalCount: 0,
    perUserLimit: 1,
    claimable: true,
    validFrom: from.toISOString(),
    validTo: to.toISOString(),
    enabled: true,
  };
};
const form = reactive<FormState>(blank());
const range = computed({
  get: (): [string, string] => [form.validFrom, form.validTo],
  set: (v: [string, string] | null) => {
    form.validFrom = v?.[0] ?? '';
    form.validTo = v?.[1] ?? '';
  },
});

const rules: FormRules = {
  name: [{ required: true, whitespace: true, message: '请填写名称' }],
  discountCent: [{ validator: (_r, v, cb) => (v > 0 ? cb() : cb(new Error('请输入优惠金额'))) }],
  thresholdCent: [
    {
      validator: (_r, v: number | null, cb) =>
        !v ? cb(new Error('请输入使用门槛')) : form.discountCent && v <= form.discountCent ? cb(new Error('门槛必须高于优惠金额')) : cb(),
    },
  ],
  scopeIds: [{ type: 'array', min: 1, message: '至少选择一项' }],
  range: [{ validator: (_r, _v, cb) => (form.validFrom && form.validTo ? cb() : cb(new Error('请选择有效期'))) }],
};

async function init() {
  formRef.value?.clearValidate();
  Object.assign(form, blank());
  issuedCount.value = 0;
  scopeItems.value = [];
  loading.value = true;
  try {
    categories.value = await contentApi.categories();
    if (props.couponId) {
      const c = await marketingApi.coupon(props.couponId);
      issuedCount.value = c.issuedCount;
      scopeItems.value = c.scopeItems;
      Object.assign(form, {
        name: c.name,
        description: c.description,
        type: c.type,
        thresholdCent: c.thresholdCent || null,
        discountCent: c.discountCent,
        scope: c.scope,
        scopeIds: c.scopeIds ?? [],
        totalCount: c.totalCount,
        perUserLimit: c.perUserLimit,
        claimable: c.claimable,
        validFrom: c.validFrom,
        validTo: c.validTo,
        enabled: c.enabled,
      });
    }
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  saving.value = true;
  try {
    const data: CouponForm = {
      ...form,
      thresholdCent: form.type === 'DIRECT' ? 0 : (form.thresholdCent ?? 0),
      discountCent: form.discountCent ?? 0,
      // 一级分类多选的级联值可能嵌套成数组，统一拍平
      scopeIds: (form.scopeIds as unknown[]).flat() as string[],
    };
    if (props.couponId) await marketingApi.updateCoupon(props.couponId, data);
    else await marketingApi.createCoupon(data);
    ElMessage.success('已保存');
    emit('update:modelValue', false);
    emit('saved');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.lock-tip {
  margin-bottom: 16px;
}
.prefix {
  margin-right: 8px;
  color: var(--el-text-color-secondary);
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.hint {
  margin-left: 12px;
}
.extend {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
