<template>
  <div v-loading="loading">
    <el-card shadow="never" class="header">
      <div class="head">
        <div class="head-left">
          <el-button link icon="ArrowLeft" @click="router.push({ name: 'content-products' })">返回列表</el-button>
          <span class="title">{{ isNew ? `新建${ProductTypeLabel[type]}` : form.title }}</span>
          <el-tag size="small">{{ ProductTypeLabel[type] }}</el-tag>
          <el-tag v-if="detail" :type="PublishStatusTag[detail.status]" size="small">{{ PublishStatusLabel[detail.status] }}</el-tag>
          <span v-if="detail?._count.entitlements" class="muted">{{ detail._count.entitlements }} 名学员</span>
        </div>
        <div v-if="detail">
          <el-button v-if="detail.status === 'ONLINE'" type="warning" plain @click="setStatus('OFFLINE')">下架</el-button>
          <el-button v-else type="success" @click="setStatus('ONLINE')">上架</el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-tabs v-model="tab">
        <el-tab-pane label="基本信息" name="basic">
          <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="form">
            <el-form-item label="标题" prop="title">
              <el-input v-model="form.title" maxlength="128" show-word-limit />
            </el-form-item>
            <el-form-item label="副标题">
              <el-input v-model="form.subtitle" maxlength="255" placeholder="一句话卖点，显示在列表卡片上" />
            </el-form-item>
            <el-form-item label="封面" prop="cover">
              <div class="cover-field">
                <el-input v-model="form.cover" placeholder="https:// 图片链接（建议 750×500）" clearable />
                <el-image v-if="form.cover" :src="form.cover" fit="cover" class="cover-preview" />
                <div class="muted">图片上传待接入腾讯云 COS，当前请先粘贴图片链接</div>
              </div>
            </el-form-item>
            <el-form-item label="分类">
              <el-cascader
                v-model="form.categoryId"
                :options="categories"
                :props="{ value: 'id', label: 'name', checkStrictly: true, emitPath: false }"
                clearable
                placeholder="不分类"
              />
            </el-form-item>
            <el-form-item label="可见身份" prop="visibleTo">
              <VisibleToCheckbox v-model="form.visibleTo" />
            </el-form-item>

            <template v-if="type === 'OFFLINE'">
              <el-form-item label="价格">
                <span class="muted">线下课按场次收取定金和尾款，请在「场次」中设置</span>
              </el-form-item>
            </template>
            <template v-else>
              <el-form-item label="收费方式">
                <el-radio-group v-model="form.pricingMode">
                  <el-radio value="PAID">付费</el-radio>
                  <el-radio value="FREE">免费（认证用户可直接学习）</el-radio>
                </el-radio-group>
              </el-form-item>
              <template v-if="form.pricingMode === 'PAID'">
                <el-form-item label="售价" prop="priceCent">
                  <MoneyInput v-model="form.priceCent" />
                </el-form-item>
                <el-form-item label="划线价">
                  <MoneyInput v-model="form.originCent" placeholder="可选" />
                  <span class="muted hint">需高于售价，早鸟 / 限时价在「营销」中配置</span>
                </el-form-item>
              </template>
            </template>

            <el-form-item label="排序">
              <el-input-number v-model="form.sort" :min="0" :max="9999" />
              <span class="muted hint">数字越小越靠前</span>
            </el-form-item>
            <el-form-item label="详情介绍">
              <RichEditor v-model="form.detailHtml" :height="420" placeholder="课程介绍、讲师、适合人群…" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="save">{{ isNew ? '创建并继续' : '保存' }}</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane v-if="type === 'COURSE'" label="课程目录" name="curriculum" :disabled="isNew">
          <CurriculumEditor v-if="detail" :product-id="detail.id" :chapters="detail.chapters" @changed="load" />
        </el-tab-pane>
        <el-tab-pane v-if="type === 'COLUMN' || type === 'SERIES'" label="包含课程" name="items" :disabled="isNew">
          <ItemsEditor v-if="detail" :product-id="detail.id" :items="detail.children" @changed="load" />
        </el-tab-pane>
        <el-tab-pane v-if="type === 'OFFLINE'" label="场次" name="sessions" :disabled="isNew">
          <SessionsEditor v-if="detail" :product-id="detail.id" :sessions="detail.sessions" @changed="load" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ProductTypeLabel, type ProductType } from '@luoji/shared';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import {
  contentApi,
  PublishStatusLabel,
  PublishStatusTag,
  type CategoryNode,
  type ProductDetail,
  type ProductForm,
  type PublishStatus,
} from '@/api/content';
import MoneyInput from '@/components/MoneyInput.vue';
import RichEditor from '@/components/RichEditor.vue';
import VisibleToCheckbox from '@/components/VisibleToCheckbox.vue';
import CurriculumEditor from './CurriculumEditor.vue';
import ItemsEditor from './ItemsEditor.vue';
import SessionsEditor from './SessionsEditor.vue';

const route = useRoute();
const router = useRouter();

const id = computed(() => route.params.id as string | undefined);
const isNew = computed(() => !id.value);
/** 新建时的类型；新建后跳转到编辑页、详情加载完成前沿用它 */
const createType = (route.query.type as ProductType) || 'COURSE';
const type = computed<ProductType>(() => detail.value?.type ?? createType);

const loading = ref(false);
const saving = ref(false);
const tab = ref('basic');
const detail = ref<ProductDetail>();
const categories = ref<CategoryNode[]>([]);

const formRef = ref<FormInstance>();
const empty = (): ProductForm => ({
  title: '',
  subtitle: null,
  cover: null,
  detailHtml: null,
  pricingMode: 'PAID',
  priceCent: 0,
  originCent: null,
  visibleTo: ['DOCTOR', 'PRACTITIONER'],
  categoryId: null,
  sort: 0,
});
const form = reactive<ProductForm>(empty());
/** 用于离开页面时判断是否有未保存的修改 */
let snapshot = JSON.stringify(form);

const rules: FormRules = {
  title: [{ required: true, message: '请输入标题' }],
  visibleTo: [{ type: 'array', required: true, min: 1, message: '至少选择一种身份' }],
  cover: [{ pattern: /^https?:\/\/\S+$/, message: '请输入以 http(s):// 开头的图片链接' }],
  priceCent: [
    {
      validator: (_r, v: number, cb) => (form.pricingMode === 'PAID' && type.value !== 'OFFLINE' && !(v > 0) ? cb(new Error('请输入售价')) : cb()),
    },
  ],
};

async function load() {
  if (!id.value) return;
  loading.value = true;
  try {
    detail.value = await contentApi.product(id.value);
    const d = detail.value;
    Object.assign(form, {
      title: d.title,
      subtitle: d.subtitle,
      cover: d.cover,
      detailHtml: d.detailHtml,
      pricingMode: d.pricingMode,
      priceCent: d.priceCent,
      originCent: d.originCent,
      visibleTo: d.visibleTo,
      categoryId: d.categoryId,
      sort: d.sort,
    });
    snapshot = JSON.stringify(form);
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  saving.value = true;
  try {
    const data = { ...form, priceCent: form.priceCent ?? 0 };
    if (isNew.value) {
      // 跳转后 query.type 消失、详情尚未加载，需在跳转前确定下一个标签页
      const t = type.value;
      const created = await contentApi.createProduct({ ...data, type: t });
      snapshot = JSON.stringify(form);
      ElMessage.success('已创建，继续完善内容');
      await router.replace({ name: 'content-product-edit', params: { id: created.id } });
      tab.value = t === 'COURSE' ? 'curriculum' : t === 'OFFLINE' ? 'sessions' : 'items';
    } else {
      await contentApi.updateProduct(id.value!, data);
      ElMessage.success('已保存');
      await load();
    }
  } finally {
    saving.value = false;
  }
}

async function setStatus(status: PublishStatus) {
  if (!detail.value) return;
  if (JSON.stringify(form) !== snapshot) {
    ElMessage.warning('基本信息有未保存的修改，请先保存');
    return;
  }
  if (status === 'OFFLINE') {
    await ElMessageBox.confirm('下架后学员将无法看到该课程，已购学员也无法继续学习。确定下架？', '下架课程', { type: 'warning' });
  }
  await contentApi.setStatus(detail.value.id, status);
  ElMessage.success(status === 'ONLINE' ? '已上架' : '已下架');
  load();
}

onBeforeRouteLeave(async (to) => {
  if (to.name === 'content-product-edit' || JSON.stringify(form) === snapshot) return true;
  return ElMessageBox.confirm('基本信息有未保存的修改，确定离开？', '提示', { type: 'warning' }).then(
    () => true,
    () => false,
  );
});

// 新建后 replace 到编辑页时组件会被复用，需要重新加载
watch(id, (v) => v && load());

onMounted(async () => {
  load();
  categories.value = await contentApi.categories();
});
</script>

<style scoped>
.header {
  margin-bottom: 16px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.head-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.title {
  font-size: 18px;
  font-weight: 600;
}
.form {
  max-width: 920px;
}
.cover-field {
  width: 100%;
}
.cover-preview {
  width: 180px;
  height: 120px;
  margin-top: 8px;
  border-radius: 4px;
  display: block;
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.hint {
  margin-left: 12px;
}
</style>
