<template>
  <article
    class="host-card"
    :class="{ disabled }"
    :aria-busy="disabled"
    title="使用连接按钮；也可双击卡片快速连接"
    @dblclick="requestConnect"
    @contextmenu.prevent="showContextMenu"
  >
    <div class="card-icon">
      <div class="icon-bubble">
        <n-icon :component="resolveSessionIcon(session.icon)" :size="22" color="#6b9cf8" />
      </div>
    </div>
    <div class="card-info">
      <div class="card-name" :title="session.name">{{ session.name }}</div>
      <div class="card-host" :title="`${session.username}@${session.host}:${session.port}`">
        {{ session.username }}@{{ session.host }}:{{ session.port }}
      </div>
      <div v-if="credentialLabel" class="credential-status" :class="session.credential_state">
        {{ credentialLabel }}
      </div>
    </div>

    <div class="card-actions" @dblclick.stop>
      <n-button size="small" type="primary" :disabled="disabled" @click="requestConnect">
        <template #icon><n-icon :component="TerminalOutline" /></template>
        连接
      </n-button>
      <n-button
        size="small"
        quaternary
        circle
        :disabled="disabled"
        :aria-label="`管理主机 ${session.name}`"
        @click="showActionMenu"
      >
        <template #icon><n-icon :component="EllipsisHorizontalOutline" /></template>
      </n-button>
    </div>

    <n-dropdown
      trigger="manual"
      :x="ctxX"
      :y="ctxY"
      :options="ctxOptions"
      :show="ctxVisible"
      @select="handleSelect"
      @clickoutside="ctxVisible = false"
    />
  </article>
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { NButton, NDropdown, NIcon, type DropdownOption } from 'naive-ui'
import {
  CreateOutline,
  EllipsisHorizontalOutline,
  KeyOutline,
  TerminalOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import type { Session } from '../types'
import { resolveSessionIcon } from '../utils/sessionIcons'

const props = defineProps<{
  session: Session
  disabled?: boolean
}>()
const emit = defineEmits<{
  connect: [session: Session]
  edit: [session: Session]
  delete: [session: Session]
  forgetCredential: [session: Session]
  deleteLegacyCredential: [session: Session]
}>()

const credentialLabel = computed(() => {
  if (props.session.credential_state === 'stored') return '凭据已保存'
  if (props.session.credential_state === 'legacy_plaintext') return '旧密码待处理'
  if (props.session.credential_state === 'needs_rebind') return '凭据需确认'
  return ''
})

const ctxVisible = ref(false)
const ctxX = ref(0)
const ctxY = ref(0)

const ctxOptions = computed<DropdownOption[]>(() => {
  const credentialAction: DropdownOption[] = []
  if (props.session.credential_state === 'legacy_plaintext') {
    credentialAction.push({
      label: '删除旧密码',
      key: 'delete-legacy',
      icon: () => h(NIcon, null, { default: () => h(KeyOutline) }),
    })
  } else if (
    props.session.credential_state === 'stored'
    || props.session.credential_state === 'needs_rebind'
  ) {
    credentialAction.push({
      label: '忘记已保存凭据',
      key: 'forget-credential',
      icon: () => h(NIcon, null, { default: () => h(KeyOutline) }),
    })
  }

  return [
    {
      label: '连接',
      key: 'connect',
      icon: () => h(NIcon, null, { default: () => h(TerminalOutline) }),
    },
    {
      label: '编辑',
      key: 'edit',
      icon: () => h(NIcon, null, { default: () => h(CreateOutline) }),
    },
    ...credentialAction,
    { type: 'divider', key: 'd' },
    {
      label: '删除主机',
      key: 'delete',
      icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
    },
  ]
})

function showContextMenu(e: MouseEvent) {
  if (props.disabled) return
  ctxX.value = e.clientX
  ctxY.value = e.clientY
  ctxVisible.value = true
}

function showActionMenu(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  ctxX.value = rect.right
  ctxY.value = rect.bottom + 4
  ctxVisible.value = true
}

function requestConnect() {
  if (!props.disabled) emit('connect', props.session)
}

function handleSelect(key: string) {
  ctxVisible.value = false
  if (props.disabled) return
  if (key === 'connect') emit('connect', props.session)
  else if (key === 'edit') emit('edit', props.session)
  else if (key === 'delete') emit('delete', props.session)
  else if (key === 'forget-credential') emit('forgetCredential', props.session)
  else if (key === 'delete-legacy') emit('deleteLegacyCredential', props.session)
}
</script>

<style scoped>
.host-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 20px 14px 14px;
  background: #161b27;
  border: 1px solid #21283a;
  border-radius: 12px;
  cursor: default;
  user-select: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
  transition: background 0.15s, border-color 0.2s, transform 0.15s, box-shadow 0.2s;
}

.host-card:hover {
  background: #1c2333;
  border-color: rgba(107, 156, 248, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.38);
}

.host-card.disabled {
  cursor: wait;
  opacity: 0.62;
  transform: none;
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-bubble {
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  background: rgba(107, 156, 248, 0.12);
  border: 1px solid rgba(107, 156, 248, 0.2);
  border-radius: 50%;
  transition: background 0.2s, border-color 0.2s;
}

.host-card:hover .icon-bubble {
  background: rgba(107, 156, 248, 0.2);
  border-color: rgba(107, 156, 248, 0.35);
}

.card-info {
  width: 100%;
  min-width: 0;
  text-align: center;
}

.card-name {
  overflow: hidden;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-host {
  overflow: hidden;
  margin-top: 3px;
  color: #9aa9ba;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.credential-status {
  margin-top: 8px;
  color: #9eb4cd;
  font-size: 12px;
}

.credential-status::before {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-inline-end: 6px;
  vertical-align: 1px;
  background: #6b9cf8;
  border-radius: 50%;
  content: '';
}

.credential-status.legacy_plaintext,
.credential-status.needs_rebind {
  color: #f0c987;
}

.credential-status.legacy_plaintext::before,
.credential-status.needs_rebind::before {
  background: #e9ad50;
}

.card-actions {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

@media (max-width: 520px) {
  .card-actions :deep(.n-button) {
    min-height: 44px;
  }
}
</style>
