<template>
  <div v-loading="loading" class="grid">
    <el-card shadow="never">
      <template #header>
        <div class="toolbar">
          <span>关于我们 <span class="muted">（小程序「我的 → 关于逻辑解剖」、首页品牌入口）</span></span>
          <el-button type="primary" :loading="saving === 'about'" :disabled="!aboutDirty" @click="saveAbout">保存并发布</el-button>
        </div>
      </template>
      <el-form label-position="top">
        <div class="group">品牌</div>
        <div class="row">
          <el-input v-model="about.brand.name" maxlength="30" placeholder="品牌名" />
          <el-input v-model="about.brand.slogan" maxlength="30" placeholder="Slogan" />
        </div>
        <div class="group">引文</div>
        <el-input v-model="about.quote.text" type="textarea" :rows="3" maxlength="300" show-word-limit />
        <el-input v-model="about.quote.source" maxlength="30" placeholder="出处，如《文子·道原》" class="mt" />

        <div class="group">公司介绍</div>
        <el-input v-model="about.company.title" maxlength="30" placeholder="标题" />
        <div v-for="(_p, i) in about.company.paragraphs" :key="`p${i}`" class="row mt">
          <el-input v-model="about.company.paragraphs[i]" type="textarea" :rows="3" maxlength="600" show-word-limit />
          <el-button link type="danger" @click="about.company.paragraphs.splice(i, 1)">删除</el-button>
        </div>
        <el-button link type="primary" :disabled="about.company.paragraphs.length >= 8" @click="about.company.paragraphs.push('')">添加段落</el-button>

        <div class="group">创始人</div>
        <div class="row">
          <el-input v-model="about.founder.name" maxlength="16" placeholder="姓名" />
          <el-input v-model="about.founder.title" maxlength="30" placeholder="头衔，如逻辑解剖理念创始人" />
        </div>
        <el-input v-model="about.founder.photo" class="mt" placeholder="照片链接（https://，建议竖版 3:4）" clearable />
        <el-select
          v-model="about.founder.tags"
          class="mt"
          multiple
          filterable
          allow-create
          default-first-option
          :reserve-keyword="false"
          :multiple-limit="8"
          placeholder="身份标签，输入后回车"
          style="width: 100%"
        />
        <el-input v-model="about.founder.bio" class="mt" type="textarea" :rows="3" maxlength="1000" show-word-limit placeholder="个人简介（可选）" />

        <div class="group">数据</div>
        <div v-for="(st, i) in about.stats" :key="`s${i}`" class="row mt">
          <el-input v-model="st.value" maxlength="20" placeholder="400+" class="short" />
          <el-input v-model="st.label" maxlength="20" placeholder="线上解剖课分享" />
          <el-button link type="danger" @click="about.stats.splice(i, 1)">删除</el-button>
        </div>
        <el-button link type="primary" :disabled="about.stats.length >= 6" @click="about.stats.push({ value: '', label: '' })">添加数据</el-button>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="toolbar">
          <span>课程顾问 <span class="muted">（课程详情页引导添加微信）</span></span>
          <el-button type="primary" :loading="saving === 'consult'" :disabled="!consultDirty" @click="saveConsult">保存并发布</el-button>
        </div>
      </template>
      <el-form label-width="96px">
        <el-form-item label="显示">
          <el-switch v-model="consult.enabled" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="consult.title" maxlength="20" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="consult.desc" maxlength="40" />
        </el-form-item>
        <el-form-item label="微信号">
          <el-input v-model="consult.wechatId" maxlength="40" placeholder="学员可一键复制" />
        </el-form-item>
        <el-form-item label="二维码">
          <el-input v-model="consult.qrImage" placeholder="https:// 企业微信 / 个人微信二维码图片" clearable />
          <el-image v-if="consult.qrImage" :src="consult.qrImage" fit="contain" class="qr" />
          <div class="muted">小程序内长按二维码即可识别添加；图片上传待接入腾讯云 COS，当前先粘贴链接</div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { DEFAULT_ABOUT_PAGE, DEFAULT_CONSULT, type AboutPageConfig, type ConsultConfig } from '@luoji/shared';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { siteApi } from '@/api/site';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const about = reactive<AboutPageConfig>(clone(DEFAULT_ABOUT_PAGE));
const consult = reactive<ConsultConfig>(clone(DEFAULT_CONSULT));
const aboutSnap = ref('');
const consultSnap = ref('');
const aboutDirty = computed(() => JSON.stringify(about) !== aboutSnap.value);
const consultDirty = computed(() => JSON.stringify(consult) !== consultSnap.value);
const loading = ref(false);
const saving = ref<'about' | 'consult' | null>(null);

async function load() {
  loading.value = true;
  try {
    const [a, c] = await Promise.all([siteApi.aboutPage(), siteApi.consult()]);
    Object.assign(about, clone(a.value));
    Object.assign(consult, clone(c.value));
    aboutSnap.value = JSON.stringify(about);
    consultSnap.value = JSON.stringify(consult);
  } finally {
    loading.value = false;
  }
}

async function saveAbout() {
  saving.value = 'about';
  try {
    const res = await siteApi.saveAboutPage(about);
    Object.assign(about, clone(res.value));
    aboutSnap.value = JSON.stringify(about);
    ElMessage.success('已发布');
  } finally {
    saving.value = null;
  }
}

async function saveConsult() {
  saving.value = 'consult';
  try {
    const res = await siteApi.saveConsult(consult);
    Object.assign(consult, clone(res.value));
    consultSnap.value = JSON.stringify(consult);
    ElMessage.success('已发布');
  } finally {
    saving.value = null;
  }
}

onMounted(load);
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 16px;
  align-items: start;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.group {
  margin: 18px 0 8px;
  font-weight: 600;
}
.row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.short {
  width: 140px;
  flex-shrink: 0;
}
.mt {
  margin-top: 8px;
}
.muted {
  color: #6b7385;
  font-size: 12px;
}
.qr {
  width: 140px;
  height: 140px;
  margin-top: 8px;
}
</style>
