<template>
  <div class="rich-editor">
    <Toolbar :editor="editorRef" :default-config="toolbarConfig" mode="simple" class="toolbar" />
    <Editor
      :model-value="modelValue ?? ''"
      :default-config="editorConfig"
      mode="simple"
      :style="{ height: `${height}px` }"
      @on-created="(e: IDomEditor) => (editorRef = e)"
      @on-change="onChange"
    />
  </div>
</template>

<script setup lang="ts">
import '@wangeditor/editor/dist/css/style.css';
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import { onBeforeUnmount, shallowRef } from 'vue';

/**
 * 富文本编辑器（wangEditor）。服务端入库前会再做白名单清洗。
 * 图片暂只支持插入网络图片链接，COS 上传接入后（WP03/WP05）开启本地上传。
 */
const props = withDefaults(defineProps<{ modelValue: string | null; height?: number; placeholder?: string }>(), {
  height: 360,
  placeholder: '请输入内容…',
});
const emit = defineEmits<{ 'update:modelValue': [string | null] }>();

const editorRef = shallowRef<IDomEditor>();

const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: ['uploadImage', 'group-video', 'insertVideo', 'uploadVideo', 'fullScreen', 'codeBlock', 'todo', 'emotion'],
};
const editorConfig: Partial<IEditorConfig> = { placeholder: props.placeholder };

function onChange(editor: IDomEditor) {
  emit('update:modelValue', editor.isEmpty() ? null : editor.getHtml());
}

onBeforeUnmount(() => editorRef.value?.destroy());
</script>

<style scoped>
.rich-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  width: 100%;
  overflow: hidden;
}
.toolbar {
  border-bottom: 1px solid var(--el-border-color);
}
</style>
