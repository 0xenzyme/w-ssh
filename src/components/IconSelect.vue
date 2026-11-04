<template>
  <div class="icon-picker" role="radiogroup" aria-label="选择图标">
    <button
      v-for="(option, index) in sessionIconOptions"
      :key="option.value"
      type="button"
      role="radio"
      class="icon-choice"
      :class="{ selected: modelValue === option.value }"
      :aria-label="option.label"
      :aria-checked="modelValue === option.value"
      @click="emit('update:modelValue', option.value)"
      @keydown.left.prevent="selectRelative($event, index, -1)"
      @keydown.right.prevent="selectRelative($event, index, 1)"
      @keydown.up.prevent="selectRelative($event, index, -1)"
      @keydown.down.prevent="selectRelative($event, index, 1)"
    >
      <n-icon :component="resolveSessionIcon(option.value)" :size="18" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import { resolveSessionIcon, sessionIconOptions } from '../utils/sessionIcons'

defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [string]
}>()

function selectRelative(event: KeyboardEvent, index: number, direction: number) {
  const nextIndex = (index + direction + sessionIconOptions.length) % sessionIconOptions.length
  emit('update:modelValue', sessionIconOptions[nextIndex].value)
  const buttons = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll('button')
  ;(buttons?.item(nextIndex) as HTMLButtonElement | undefined)?.focus()
}
</script>

<style scoped>
.icon-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
  gap: 6px;
  width: 100%;
}

.icon-choice {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  min-width: 34px;
  padding: 0;
  color: #8899aa;
  background: #202636;
  border: 1px solid transparent;
  border-radius: 7px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}

.icon-choice:hover {
  color: #c9d5e0;
  background: #283044;
}

.icon-choice.selected {
  color: #93b4fb;
  background: rgba(107, 156, 248, 0.14);
  border-color: rgba(107, 156, 248, 0.55);
}

.icon-choice:focus-visible {
  outline: 2px solid #93b4fb;
  outline-offset: 2px;
}

@media (max-width: 520px) {
  .icon-choice {
    height: 44px;
    min-width: 44px;
  }
}
</style>
