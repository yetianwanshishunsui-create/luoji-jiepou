<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" icon="Plus" @click="addChapter">添加章节</el-button>
      <span class="muted">共 {{ chapters.length }} 章 {{ lessonCount }} 节；视频课时需填写云点播 FileId 才能上架</span>
    </div>

    <el-empty v-if="!chapters.length" description="还没有章节，先添加一个章节" />

    <el-card v-for="(ch, ci) in chapters" :key="ch.id" shadow="never" class="chapter">
      <template #header>
        <div class="chapter-head">
          <span class="chapter-title">第 {{ ci + 1 }} 章 · {{ ch.title }}</span>
          <div>
            <el-button link icon="Top" :disabled="ci === 0" @click="moveChapter(ci, -1)" />
            <el-button link icon="Bottom" :disabled="ci === chapters.length - 1" @click="moveChapter(ci, 1)" />
            <el-button link type="primary" @click="renameChapter(ch)">重命名</el-button>
            <el-button link type="primary" @click="openLesson(ch.id)">添加课时</el-button>
            <el-button link type="danger" @click="removeChapter(ch)">删除章节</el-button>
          </div>
        </div>
      </template>

      <el-table :data="ch.lessons" size="small" :show-header="ch.lessons.length > 0" empty-text="暂无课时">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column label="类型" width="70">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ LessonTypeLabel[row.type as LessonType] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column label="时长" width="90">
          <template #default="{ row }">{{ row.type === 'ARTICLE' ? '—' : fmtDuration(row.duration) }}</template>
        </el-table-column>
        <el-table-column label="试看" width="110">
          <template #default="{ row }">
            <span v-if="!row.isTrial" class="muted">—</span>
            <el-tag v-else size="small" type="success">{{ row.trialSeconds ? `试看 ${fmtDuration(row.trialSeconds)}` : '整节免费' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="媒体" min-width="140">
          <template #default="{ row }">
            <template v-if="row.type === 'VIDEO'">
              <span v-if="row.vodFileId">{{ row.vodFileId }}</span>
              <el-text v-else type="danger" size="small">未关联视频</el-text>
            </template>
            <span v-else-if="row.type === 'AUDIO'">{{ row.audioKey || '—' }}</span>
            <span v-else class="muted">图文</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row, $index }">
            <el-button link icon="Top" :disabled="$index === 0" @click="moveLesson(ch, $index, -1)" />
            <el-button link icon="Bottom" :disabled="$index === ch.lessons.length - 1" @click="moveLesson(ch, $index, 1)" />
            <el-button link type="primary" @click="openLesson(ch.id, row as Lesson)">编辑</el-button>
            <el-button link type="danger" @click="removeLesson(row as Lesson)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <LessonDialog v-model="lessonDialog" :lesson="editingLesson" :saving="saving" @submit="saveLesson" />
  </div>
</template>

<script setup lang="ts">
import type { LessonType } from '@luoji/shared';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, ref } from 'vue';
import { contentApi, LessonTypeLabel, type Chapter, type Lesson, type LessonForm } from '@/api/content';
import { fmtDuration } from '@/utils/format';
import LessonDialog from './LessonDialog.vue';

const props = defineProps<{ productId: string; chapters: Chapter[] }>();
const emit = defineEmits<{ changed: [] }>();

const lessonCount = computed(() => props.chapters.reduce((n, c) => n + c.lessons.length, 0));

async function addChapter() {
  const { value } = await ElMessageBox.prompt('章节名称', '添加章节', {
    inputValidator: (v) => (!!v?.trim() && v.length <= 128) || '请输入 1~128 个字',
  });
  await contentApi.createChapter(props.productId, value.trim());
  emit('changed');
}

async function renameChapter(ch: Chapter) {
  const { value } = await ElMessageBox.prompt('章节名称', '重命名', {
    inputValue: ch.title,
    inputValidator: (v) => (!!v?.trim() && v.length <= 128) || '请输入 1~128 个字',
  });
  await contentApi.updateChapter(ch.id, value.trim());
  emit('changed');
}

async function removeChapter(ch: Chapter) {
  await ElMessageBox.confirm(`确定删除章节「${ch.title}」？`, '删除章节', { type: 'warning' });
  await contentApi.deleteChapter(ch.id);
  ElMessage.success('已删除');
  emit('changed');
}

function swap<T>(arr: T[], i: number, d: number): T[] {
  const next = [...arr];
  [next[i], next[i + d]] = [next[i + d], next[i]];
  return next;
}

async function moveChapter(i: number, d: number) {
  await contentApi.sortChapters(props.productId, swap(props.chapters, i, d).map((c) => c.id));
  emit('changed');
}

async function moveLesson(ch: Chapter, i: number, d: number) {
  await contentApi.sortLessons(ch.id, swap(ch.lessons, i, d).map((l) => l.id));
  emit('changed');
}

// ───────── 课时弹窗 ─────────
const lessonDialog = ref(false);
const saving = ref(false);
const editingLesson = ref<Lesson>();
let targetChapterId = '';

function openLesson(chapterId: string, lesson?: Lesson) {
  targetChapterId = chapterId;
  editingLesson.value = lesson;
  lessonDialog.value = true;
}

async function saveLesson(data: LessonForm) {
  saving.value = true;
  try {
    if (editingLesson.value) await contentApi.updateLesson(editingLesson.value.id, data);
    else await contentApi.createLesson(targetChapterId, data);
    ElMessage.success('已保存');
    lessonDialog.value = false;
    emit('changed');
  } finally {
    saving.value = false;
  }
}

async function removeLesson(lesson: Lesson) {
  await ElMessageBox.confirm(`删除后学员在该课时的学习记录也会删除。确定删除「${lesson.title}」？`, '删除课时', { type: 'warning' });
  await contentApi.deleteLesson(lesson.id);
  ElMessage.success('已删除');
  emit('changed');
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.chapter {
  margin-bottom: 12px;
}
.chapter :deep(.el-card__header) {
  padding: 10px 16px;
  background: #fafbfa;
}
.chapter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.chapter-title {
  font-weight: 600;
}
.muted {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
