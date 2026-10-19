<template>
  <div v-loading="loading" class="layout">
    <el-card shadow="never" class="editor">
      <div class="toolbar">
        <span class="muted">{{ dirty ? '有未保存的修改' : updatedAt ? `上次保存 ${fmtShort(updatedAt)}` : '当前为默认内容' }}</span>
        <el-button type="primary" :loading="saving" :disabled="!dirty" @click="save">保存并发布</el-button>
      </div>

      <el-form label-position="top">
        <div class="group">顶部</div>
        <el-form-item label="主标题">
          <el-input v-model="form.hero.title" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input v-model="form.hero.subtitle" maxlength="60" show-word-limit />
        </el-form-item>
        <el-form-item label="背景图（可选）">
          <el-input v-model="form.hero.image" placeholder="https:// 图片链接，不填使用品牌渐变色" clearable />
        </el-form-item>

        <div class="group">
          合作权益
          <el-button link type="primary" icon="Plus" :disabled="form.benefits.length >= 8" @click="form.benefits.push({ title: '', desc: '' })">添加</el-button>
        </div>
        <div v-for="(b, i) in form.benefits" :key="`b${i}`" class="row">
          <el-input v-model="b.title" maxlength="20" placeholder="权益标题" class="short" />
          <el-input v-model="b.desc" maxlength="120" placeholder="说明" />
          <RowActions :list="form.benefits" :index="i" />
        </div>

        <div class="group">
          合作案例
          <el-button link type="primary" icon="Plus" :disabled="form.cases.length >= 6" @click="form.cases.push({ title: '', desc: '', image: null })">添加</el-button>
        </div>
        <div v-for="(c, i) in form.cases" :key="`c${i}`" class="case">
          <div class="row">
            <el-input v-model="c.title" maxlength="30" placeholder="案例标题" class="short" />
            <el-input v-model="c.image" placeholder="图片链接（可选）" clearable />
            <RowActions :list="form.cases" :index="i" />
          </div>
          <el-input v-model="c.desc" type="textarea" :rows="2" maxlength="300" placeholder="案例介绍" />
        </div>

        <div class="group">
          常见问题
          <el-button link type="primary" icon="Plus" :disabled="form.faqs.length >= 12" @click="form.faqs.push({ q: '', a: '' })">添加</el-button>
        </div>
        <div v-for="(f, i) in form.faqs" :key="`f${i}`" class="case">
          <div class="row">
            <el-input v-model="f.q" maxlength="60" placeholder="问题" />
            <RowActions :list="form.faqs" :index="i" />
          </div>
          <el-input v-model="f.a" type="textarea" :rows="2" maxlength="500" placeholder="回答" />
        </div>

        <div class="group">留资表单</div>
        <div class="row">
          <el-form-item label="表单标题" class="grow">
            <el-input v-model="form.formTitle" maxlength="20" />
          </el-form-item>
          <el-form-item label="按钮文字" class="grow">
            <el-input v-model="form.submitText" maxlength="8" />
          </el-form-item>
        </div>
        <el-form-item label="提交成功提示">
          <el-input v-model="form.successText" maxlength="60" />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 小程序效果预览 -->
    <div class="phone">
      <div class="phone-title">从业者合作</div>
      <div class="phone-body">
        <div class="hero" :style="form.hero.image ? { backgroundImage: `url(${form.hero.image})` } : {}">
          <div class="hero-title">{{ form.hero.title || '主标题' }}</div>
          <div class="hero-sub">{{ form.hero.subtitle }}</div>
        </div>
        <div v-if="form.benefits.length" class="block">
          <div class="block-title">合作权益</div>
          <div class="benefits">
            <div v-for="(b, i) in form.benefits" :key="i" class="benefit">
              <div class="benefit-title">{{ b.title || '权益标题' }}</div>
              <div class="small">{{ b.desc }}</div>
            </div>
          </div>
        </div>
        <div v-if="form.cases.length" class="block">
          <div class="block-title">合作案例</div>
          <div v-for="(c, i) in form.cases" :key="i" class="case-item">
            <img v-if="c.image" :src="c.image" class="case-img" />
            <div class="benefit-title">{{ c.title || '案例标题' }}</div>
            <div class="small">{{ c.desc }}</div>
          </div>
        </div>
        <div v-if="form.faqs.length" class="block">
          <div class="block-title">常见问题</div>
          <div v-for="(f, i) in form.faqs" :key="i" class="faq">
            <div class="benefit-title">Q：{{ f.q || '问题' }}</div>
            <div class="small">{{ f.a }}</div>
          </div>
        </div>
        <div class="block">
          <div class="block-title">{{ form.formTitle }}</div>
          <div class="fake-input">姓名</div>
          <div class="fake-input">手机号</div>
          <div class="fake-btn">{{ form.submitText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DEFAULT_JOIN_PAGE, type JoinPageConfig } from '@luoji/shared';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ElButton } from 'element-plus';
import { siteApi } from '@/api/site';
import { fmtShort } from '@/utils/format';

/** 列表项的上移 / 下移 / 删除 */
const RowActions = defineComponent({
  props: { list: { type: Array, required: true }, index: { type: Number, required: true } },
  setup(props) {
    const swap = (d: number) => {
      const arr = props.list as unknown[];
      [arr[props.index], arr[props.index + d]] = [arr[props.index + d], arr[props.index]];
    };
    return () =>
      h('div', { class: 'row-actions' }, [
        h(ElButton, { link: true, icon: 'Top', disabled: props.index === 0, onClick: () => swap(-1) }),
        h(ElButton, { link: true, icon: 'Bottom', disabled: props.index === props.list.length - 1, onClick: () => swap(1) }),
        h(ElButton, { link: true, type: 'danger', onClick: () => (props.list as unknown[]).splice(props.index, 1) }, () => '删除'),
      ]);
  },
});

const clone = (v: JoinPageConfig): JoinPageConfig => JSON.parse(JSON.stringify(v));
const form = reactive<JoinPageConfig>(clone(DEFAULT_JOIN_PAGE));
const snapshot = ref('');
const dirty = computed(() => JSON.stringify(form) !== snapshot.value);
const updatedAt = ref<string | null>(null);
const loading = ref(false);
const saving = ref(false);

function apply(res: { value: JoinPageConfig; updatedAt: string | null }) {
  Object.assign(form, clone(res.value));
  updatedAt.value = res.updatedAt;
  snapshot.value = JSON.stringify(form);
}

/** 前端先做一遍完整性检查，给出比后端更具体的定位 */
function problem(): string | null {
  if (!form.hero.title.trim()) return '请填写主标题';
  if (form.benefits.some((b) => !b.title.trim())) return '有合作权益未填写标题';
  if (form.cases.some((c) => !c.title.trim())) return '有合作案例未填写标题';
  if (form.faqs.some((f) => !f.q.trim() || !f.a.trim())) return '有常见问题未填写完整';
  if (!form.formTitle.trim() || !form.submitText.trim() || !form.successText.trim()) return '请填写留资表单的文字';
  const urls = [form.hero.image, ...form.cases.map((c) => c.image)].filter(Boolean) as string[];
  if (urls.some((u) => !/^https?:\/\/\S+$/.test(u))) return '图片需为 http(s) 链接';
  return null;
}

async function save() {
  const p = problem();
  if (p) {
    ElMessage.warning(p);
    return;
  }
  saving.value = true;
  try {
    apply(await siteApi.saveJoinPage({ ...clone(form), hero: { ...form.hero, image: form.hero.image || null } }));
    ElMessage.success('已发布，小程序招商页即时生效');
  } finally {
    saving.value = false;
  }
}

onBeforeRouteLeave(() =>
  dirty.value ? ElMessageBox.confirm('修改尚未保存，确定离开？', '提示', { type: 'warning' }).then(() => true, () => false) : true,
);

onMounted(async () => {
  loading.value = true;
  try {
    apply(await siteApi.joinPage());
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.editor {
  flex: 1;
  min-width: 0;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.group {
  margin: 20px 0 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.short {
  width: 200px;
  flex-shrink: 0;
}
.grow {
  flex: 1;
}
.case {
  margin-bottom: 12px;
}
:deep(.row-actions) {
  display: flex;
  flex-shrink: 0;
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

/* 预览 */
.phone {
  width: 375px;
  flex-shrink: 0;
  position: sticky;
  top: 16px;
  border: 1px solid #e3e8e5;
  border-radius: 24px;
  overflow: hidden;
  background: #f5f7f6;
}
.phone-title {
  text-align: center;
  padding: 12px 0;
  background: #fff;
  font-weight: 600;
}
.phone-body {
  height: 640px;
  overflow-y: auto;
  padding-bottom: 16px;
}
.hero {
  margin: 12px;
  padding: 20px 16px;
  border-radius: 8px;
  color: #fff;
  background: linear-gradient(135deg, #2a5bd7, #1b3f9e) center / cover;
}
.hero-title {
  font-size: 20px;
  font-weight: 600;
}
.hero-sub {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.9;
}
.block {
  margin: 12px;
  padding: 14px;
  background: #fff;
  border-radius: 8px;
}
.block-title {
  font-weight: 600;
  margin-bottom: 10px;
}
.benefits {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.benefit {
  padding: 10px;
  border-radius: 6px;
  background: #ebf1fd;
}
.benefit-title {
  font-weight: 500;
  font-size: 13px;
}
.small {
  margin-top: 4px;
  font-size: 12px;
  color: #7a8580;
  white-space: pre-wrap;
}
.case-item,
.faq {
  padding: 8px 0;
  border-bottom: 1px solid #f0f2f1;
}
.case-img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 6px;
}
.fake-input {
  padding: 8px 10px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: #f5f7f6;
  color: #aab3ae;
  font-size: 13px;
}
.fake-btn {
  padding: 10px;
  border-radius: 999px;
  background: #2a5bd7;
  color: #fff;
  text-align: center;
}
</style>
