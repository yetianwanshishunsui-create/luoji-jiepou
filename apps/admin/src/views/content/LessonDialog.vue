<template>
  <el-dialog :model-value="modelValue" :title="lesson ? '编辑课时' : '添加课时'" width="760px" destroy-on-close @update:model-value="emit('update:modelValue', $event)" @open="reset">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
      <el-form-item label="类型">
        <el-radio-group v-model="form.type">
          <el-radio-button v-for="(label, value) in LessonTypeLabel" :key="value" :value="value">{{ label }}</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" maxlength="128" show-word-limit />
      </el-form-item>

      <template v-if="form.type === 'VIDEO'">
        <el-form-item label="视频 FileId" prop="vodFileId">
          <el-input v-model="form.vodFileId" placeholder="腾讯云点播控制台中的 FileId" />
          <div class="muted">视频上传与转码接入前（WP05），请在云点播控制台上传后填写 FileId</div>
        </el-form-item>
      </template>
      <template v-if="form.type === 'AUDIO'">
        <el-form-item label="音频路径" prop="audioKey">
          <el-input v-model="form.audioKey" placeholder="COS 对象路径，如 audio/xxx.mp3" />
        </el-form-item>
      </template>
      <el-form-item v-if="form.type !== 'ARTICLE'" label="时长">
        <DurationInput v-model="form.duration" />
      </el-form-item>
      <el-form-item v-else label="内容" prop="contentHtml">
        <RichEditor v-model="form.contentHtml" :height="300" />
      </el-form-item>

      <el-form-item label="试看">
        <el-switch v-model="form.isTrial" active-text="未购用户可学习" />
      </el-form-item>
      <el-form-item v-if="form.isTrial && form.type !== 'ARTICLE'" label="试看时长" prop="trialSeconds">
        <DurationInput v-model="form.trialSeconds" />
        <div class="muted">填 0 表示整节免费</div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus';
import { reactive, ref } from 'vue';
import { LessonTypeLabel, type Lesson, type LessonForm } from '@/api/content';
import DurationInput from '@/components/DurationInput.vue';
import RichEditor from '@/components/RichEditor.vue';

const props = defineProps<{ modelValue: boolean; lesson?: Lesson; saving: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; submit: [LessonForm] }>();

const formRef = ref<FormInstance>();
const blank = (): LessonForm => ({
  type: 'VIDEO',
  title: '',
  vodFileId: null,
  audioKey: null,
  contentHtml: null,
  duration: 0,
  isTrial: false,
  trialSeconds: 0,
});
const form = reactive<LessonForm>(blank());

const rules: FormRules = {
  title: [{ required: true, message: '请输入标题' }],
  audioKey: [{ validator: (_r, v, cb) => (form.type === 'AUDIO' && !v ? cb(new Error('请输入音频路径')) : cb()) }],
  contentHtml: [{ validator: (_r, v, cb) => (form.type === 'ARTICLE' && !v ? cb(new Error('请输入图文内容')) : cb()) }],
  trialSeconds: [
    {
      validator: (_r, v: number, cb) =>
        form.duration > 0 && v > form.duration ? cb(new Error('试看时长不能超过课时时长')) : cb(),
    },
  ],
};

function reset() {
  const l = props.lesson;
  Object.assign(form, l ? { type: l.type, title: l.title, vodFileId: l.vodFileId, audioKey: l.audioKey, contentHtml: l.contentHtml, duration: l.duration, isTrial: l.isTrial, trialSeconds: l.trialSeconds } : blank());
  formRef.value?.clearValidate();
}

async function submit() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  emit('submit', { ...form });
}
</script>

<style scoped>
.muted {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  width: 100%;
}
</style>
