<template>
  <div class="vaults-view">
    <!-- 左侧导航 -->
    <nav class="nav-panel" aria-label="主机分组">
      <div class="nav-section-title">主机分组</div>
      <n-button
        text
        size="tiny"
        class="new-group-button"
        aria-label="新建分组"
        @click="openGroupCreator"
      >
        <template #icon><n-icon :component="AddOutline" /></template>
        <span class="new-group-label">新建分组</span>
      </n-button>

      <button
        type="button"
        class="nav-item"
        :class="{ active: activeNav === 'all' }"
        :aria-pressed="activeNav === 'all'"
        @click="activeNav = 'all'"
      >
        <n-icon :component="GlobeOutline" class="nav-icon" />
        <span>全部主机</span>
      </button>

      <div
        v-for="group in groupNavItems"
        :key="group.name"
        class="nav-item-row"
        :class="{ active: activeNav === group.name }"
      >
        <button
          type="button"
          class="nav-item"
          :aria-pressed="activeNav === group.name"
          @click="activeNav = group.name"
        >
          <n-icon :component="resolveSessionIcon(group.icon, 'folder')" class="nav-icon" />
          <span class="nav-label">{{ group.name }}</span>
        </button>
        <n-button
          v-if="group.editable"
          quaternary
          circle
          size="tiny"
          class="group-edit-button"
          :aria-label="`编辑分组 ${group.name}`"
          @click.stop="openGroupEditor(group.name, group.icon)"
        >
          <template #icon><n-icon :component="CreateOutline" /></template>
        </n-button>
      </div>
    </nav>

    <!-- 右侧内容 -->
    <div class="content-panel">
      <!-- 顶部操作栏 -->
      <div class="content-header">
        <n-input
          v-model:value="search"
          size="small"
          placeholder="搜索主机..."
          clearable
          class="search-input"
        >
          <template #prefix><n-icon :component="SearchOutline" /></template>
        </n-input>
        <n-tooltip v-if="activeGroup" trigger="hover">
          <template #trigger>
            <n-button
              size="small"
              quaternary
              circle
              :aria-label="`编辑分组 ${activeGroup.name}`"
              @click="openGroupEditor(activeGroup.name, activeGroup.icon)"
            >
              <template #icon><n-icon :component="CreateOutline" /></template>
            </n-button>
          </template>
          编辑当前分组
        </n-tooltip>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button
              size="small"
              quaternary
              circle
              aria-label="主机信任"
              @click="showTrustSettings = true"
            >
              <template #icon><n-icon :component="ShieldCheckmarkOutline" /></template>
            </n-button>
          </template>
          主机信任
        </n-tooltip>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button
              size="small"
              quaternary
              circle
              aria-label="存储设置"
              @click="showStorageSettings = true"
            >
              <template #icon><n-icon :component="SettingsOutline" /></template>
            </n-button>
          </template>
          存储设置
        </n-tooltip>
        <n-button size="small" type="primary" @click="handleNewHost">
          <template #icon><n-icon :component="AddOutline" /></template>
          新建主机
        </n-button>
      </div>

      <!-- 卡片区域 -->
      <div class="cards-scroll">
        <div v-if="sessionsStore.loading" class="state-panel" role="status">
          <n-spin size="small" />
          <span>正在读取主机和分组…</span>
        </div>
        <div
          v-else-if="sessionsStore.loadError && sessionsStore.sessions.length === 0"
          class="state-panel state-error"
          role="alert"
        >
          <n-alert type="error" :show-icon="false">
            无法读取主机数据。现有数据没有被修改。
          </n-alert>
          <div class="state-actions">
            <n-button type="primary" @click="retryLoad">重新读取</n-button>
            <n-button @click="showStorageSettings = true">检查存储设置</n-button>
          </div>
          <p class="state-detail">{{ sessionsStore.loadError }}</p>
        </div>
        <template v-else>
          <n-alert
            v-if="sessionsStore.loadError"
            type="warning"
            :show-icon="false"
            class="stale-data-alert"
          >
            刷新失败，当前显示的是上次成功读取的数据。
            <n-button text type="primary" @click="retryLoad">重试</n-button>
          </n-alert>
        <!-- 全部模式：按 Group 分组展示 -->
        <template v-if="activeNav === 'all'">
          <template v-for="(items, group) in filteredGroupedSessions" :key="group">
            <div class="group-title">
              <n-icon :component="resolveSessionIcon(sessionsStore.groupIconForName(String(group)), 'folder')" />
              <span>{{ group }}</span>
            </div>
            <div class="cards-grid">
              <HostCard
                v-for="session in items"
                :key="session.id"
                :session="session"
                :disabled="connectionFlowBusy"
                @connect="handleConnect"
                @edit="handleEdit"
                @delete="handleDeleteRequest"
                @forget-credential="requestForgetCredential"
                @delete-legacy-credential="requestDeleteLegacyCredential"
              />
            </div>
          </template>
          <div v-if="Object.keys(filteredGroupedSessions).length === 0" class="empty-hint empty-group-hint">
            <template v-if="search.trim()">
              <span>没有匹配“{{ search.trim() }}”的主机</span>
              <n-button size="small" @click="search = ''">清除搜索</n-button>
            </template>
            <template v-else>
              <span>还没有主机</span>
              <n-button size="small" type="primary" @click="handleNewHost">添加第一台主机</n-button>
            </template>
          </div>
        </template>

        <!-- 单组模式：只显示该 Group 卡片 -->
        <template v-else>
          <div v-if="currentGroupSessions.length > 0" class="cards-grid">
            <HostCard
              v-for="session in currentGroupSessions"
              :key="session.id"
              :session="session"
              :disabled="connectionFlowBusy"
              @connect="handleConnect"
              @edit="handleEdit"
              @delete="handleDeleteRequest"
              @forget-credential="requestForgetCredential"
              @delete-legacy-credential="requestDeleteLegacyCredential"
            />
          </div>
          <div v-else class="empty-hint empty-group-hint">
            <template v-if="search.trim()">
              <span>当前分组中没有匹配“{{ search.trim() }}”的主机</span>
              <n-button size="small" @click="search = ''">清除搜索</n-button>
            </template>
            <template v-else>
              <span>该分组还没有主机</span>
              <n-button size="small" type="primary" @click="handleNewHost">添加主机</n-button>
            </template>
          </div>
        </template>
        </template>
      </div>
    </div>

    <!-- 新建/编辑表单 -->
    <SessionForm
      v-model="showForm"
      :session="editingSession"
      :default-group="activeNav !== 'all' && activeNav !== '未分组' ? activeNav : undefined"
      @saved="onSaved"
    />

    <n-modal
      v-model:show="showGroupEditor"
      preset="dialog"
      :title="editingGroupName ? '编辑分组' : '新建分组'"
      :show-icon="false"
    >
      <div class="group-editor">
        <label for="group-name">分组名称</label>
        <n-input
          id="group-name"
          v-model:value="groupDraft.name"
          maxlength="100"
          show-count
          placeholder="输入分组名称"
          @keyup.enter="saveGroup"
        />
        <label>分组图标</label>
        <IconSelect v-model="groupDraft.icon" />
        <p v-if="editingGroupName">修改会同步应用到该分组内的全部主机。</p>
        <p v-else>分组创建后可以先留空，稍后再添加主机。</p>
      </div>
      <template #action>
        <div class="group-actions">
          <n-button
            v-if="editingGroupName"
            type="error"
            secondary
            :disabled="editingGroupHasSessions"
            @click="requestDeleteGroup"
          >
            删除空分组
          </n-button>
          <n-space justify="end">
          <n-button @click="showGroupEditor = false">取消</n-button>
          <n-button
            type="primary"
            :loading="savingGroup"
            :disabled="!groupDraft.name.trim()"
            @click="saveGroup"
          >
            {{ editingGroupName ? '保存分组' : '创建分组' }}
          </n-button>
          </n-space>
        </div>
      </template>
    </n-modal>

    <StorageSettings v-model="showStorageSettings" @changed="handleStorageChanged" />
    <TrustSettings v-model="showTrustSettings" />

    <!-- 删除确认 -->
    <n-modal v-model:show="showDeleteConfirm" preset="dialog" title="确认删除" type="warning">
      <span>删除主机「{{ deletingSession?.name }}」及其已保存凭据？此操作不可撤销。</span>
      <template #action>
        <n-space justify="end">
          <n-button @click="showDeleteConfirm = false">取消</n-button>
          <n-button type="error" :loading="deleting" @click="confirmDelete">删除</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showDeleteGroupConfirm" preset="dialog" title="删除空分组" type="warning">
      <span>删除分组「{{ editingGroupName }}」？主机数据不会受影响。</span>
      <template #action>
        <n-space justify="end">
          <n-button @click="showDeleteGroupConfirm = false">取消</n-button>
          <n-button type="error" :loading="deletingGroup" @click="confirmDeleteGroup">删除分组</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showCredentialDeleteConfirm"
      preset="dialog"
      :title="credentialDeleteMode === 'legacy' ? '删除旧密码' : '忘记已保存凭据'"
      type="warning"
    >
      <span v-if="credentialDeleteMode === 'legacy'">
        删除「{{ credentialActionSession?.name }}」隔离的旧版 SQLite 密码？会话资料不会被删除，此操作不可恢复。
      </span>
      <span v-else>
        从系统凭据库中移除「{{ credentialActionSession?.name }}」的凭据？下次连接时需要重新输入。
      </span>
      <template #action>
        <n-space justify="end">
          <n-button @click="showCredentialDeleteConfirm = false">取消</n-button>
          <n-button type="error" :loading="deletingCredential" @click="confirmCredentialDelete">
            {{ credentialDeleteMode === 'legacy' ? '删除旧密码' : '忘记凭据' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showCredentialPrompt"
      preset="dialog"
      :title="`连接到 ${pendingSession?.name || ''}`"
      :show-icon="false"
      @after-leave="resetCredentialPrompt"
    >
      <n-input
        v-model:value="connectSecret"
        type="password"
        show-password-on="click"
        :placeholder="pendingSession?.auth_method === 'private_key' ? '私钥口令（未加密私钥可留空）' : '输入连接密码'"
        autofocus
        @keyup.enter="connectWithCredential"
      />
      <p class="credential-help">输入内容默认仅用于本次连接，不会自动保存。</p>
      <n-checkbox v-if="connectSecret" v-model:checked="saveConnectCredential" class="save-credential">
        同时保存到系统凭据库
      </n-checkbox>
      <template #action>
        <n-space justify="end">
          <n-button :disabled="connecting" @click="showCredentialPrompt = false">取消</n-button>
          <n-button
            type="primary"
            :loading="connecting"
            :disabled="pendingSession?.auth_method === 'password' && !connectSecret"
            @click="connectWithCredential"
          >
            连接
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showTrustPrompt"
      preset="dialog"
      :title="trustResult?.state === 'changed' ? '主机密钥已变化' : '确认主机指纹'"
      :type="trustResult?.state === 'changed' ? 'error' : 'info'"
      :show-icon="false"
      @after-leave="resetTrustPrompt"
    >
      <n-alert :type="trustResult?.state === 'changed' ? 'error' : 'info'" :show-icon="false">
        {{ trustResult?.state === 'changed'
          ? '已阻止连接。请通过其他可信渠道核对新指纹后再替换。'
          : '这是首次连接，请核对主机提供的 SHA-256 指纹。' }}
      </n-alert>
      <div class="fingerprint-block">
        <span>{{ trustResult?.endpoint }} · {{ trustResult?.algorithm }}</span>
        <code>{{ trustResult?.fingerprint }}</code>
        <template v-if="trustResult?.previous_fingerprints.length">
          <span>原指纹</span>
          <code v-for="fingerprint in trustResult.previous_fingerprints" :key="fingerprint">
            {{ fingerprint }}
          </code>
        </template>
      </div>
      <template #action>
        <n-space justify="end">
          <n-button :disabled="trusting" @click="showTrustPrompt = false">取消</n-button>
          <n-button
            :type="trustResult?.state === 'changed' ? 'error' : 'primary'"
            :loading="trusting"
            @click="confirmHostTrust"
          >
            {{ trustResult?.state === 'changed' ? '我已核对，替换指纹' : '信任并继续' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showLegacyPrompt"
      preset="dialog"
      title="迁移旧密码"
      :show-icon="false"
      @after-leave="resetPendingConnection"
    >
      <n-alert type="warning" :show-icon="false">
        此会话仍有旧版 SQLite 密码。应用不会显示或自动使用它。
      </n-alert>
      <template #action>
        <n-space justify="end">
          <n-button @click="useOneTimeInstead">改用本次输入</n-button>
          <n-button type="primary" :loading="connecting" @click="migrateAndConnect">
            安全迁移并连接
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showRebindPrompt"
      preset="dialog"
      title="确认凭据重新绑定"
      :show-icon="false"
      @after-leave="resetPendingConnection"
    >
      <n-alert type="warning" :show-icon="false">
        连接目标已变化。确认后，已保存凭据将用于以下目标：
      </n-alert>
      <div class="rebind-target">
        <code>{{ pendingSession?.username }}@{{ pendingSession?.host }}:{{ pendingSession?.port }}</code>
        <span>{{ pendingSession?.auth_method === 'private_key' ? '私钥认证' : '密码认证' }}</span>
      </div>
      <template #action>
        <n-space justify="end">
          <n-button :disabled="connecting" @click="showRebindPrompt = false">取消</n-button>
          <n-button type="primary" :loading="connecting" @click="rebindAndConnect">确认并连接</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import {
  NAlert, NCheckbox, NIcon, NInput, NButton, NModal, NSpace, NSpin, NTooltip, useMessage,
} from 'naive-ui'
import {
  GlobeOutline,
  SearchOutline,
  AddOutline,
  SettingsOutline,
  ShieldCheckmarkOutline,
  CreateOutline,
} from '@vicons/ionicons5'
import { useSessionsStore } from '../stores/sessions'
import { useTerminalsStore } from '../stores/terminals'
import { useStorageStore } from '../stores/storage'
import SessionForm from './SessionForm.vue'
import StorageSettings from './StorageSettings.vue'
import TrustSettings from './TrustSettings.vue'
import HostCard from './HostCard.vue'
import IconSelect from './IconSelect.vue'
import type { CredentialKind, HostTrustResult, Session } from '../types'
import { resolveSessionIcon } from '../utils/sessionIcons'

const message = useMessage()
const sessionsStore = useSessionsStore()
const terminalsStore = useTerminalsStore()
const storageStore = useStorageStore()

// 导航状态
const activeNav = ref<string>('all')
const search = ref('')

// 左侧 Group 列表
const groupNavItems = computed(() => sessionsStore.groups)
const activeGroup = computed(() => sessionsStore.groups.find(
  group => group.editable && group.name === activeNav.value,
))
const connectionPreflighting = ref(false)
const connectionAttempt = ref(0)
const connectionFlowBusy = computed(() => (
  connectionPreflighting.value
  || connecting.value
  || trusting.value
  || showTrustPrompt.value
  || showCredentialPrompt.value
  || showLegacyPrompt.value
  || showRebindPrompt.value
))

// 全部模式：按 Group 过滤+搜索
const filteredGroupedSessions = computed(() => {
  const q = search.value.toLowerCase()
  const result: Record<string, Session[]> = {}
  for (const [group, items] of Object.entries(sessionsStore.groupedSessions)) {
    const matched = q
      ? items.filter(s =>
          s.name.toLowerCase().includes(q) || s.host.toLowerCase().includes(q))
      : items
    if (matched.length) result[group] = matched
  }
  return result
})

// 单组模式：当前组的会话列表
const currentGroupSessions = computed(() => {
  if (activeNav.value === 'all') return []
  const items = sessionsStore.groupedSessions[activeNav.value] ?? []
  const q = search.value.toLowerCase()
  return q
    ? items.filter(s =>
        s.name.toLowerCase().includes(q) || s.host.toLowerCase().includes(q))
    : items
})

// 连接
async function handleConnect(session: Session) {
  if (connectionFlowBusy.value) {
    message.warning('请先完成或取消当前连接流程')
    return
  }
  const attempt = ++connectionAttempt.value
  pendingSession.value = session
  connectionPreflighting.value = true
  try {
    const result = await invoke<HostTrustResult>('ssh_trust_preflight', { sessionId: session.id })
    if (attempt !== connectionAttempt.value || pendingSession.value?.id !== session.id) return
    if (result.state === 'trusted') {
      await continueAfterTrust(session)
      return
    }
    trustResult.value = result
    showTrustPrompt.value = true
  } catch (e) {
    if (attempt === connectionAttempt.value) {
      pendingSession.value = null
      message.error(`无法检查主机密钥。请确认地址和网络后重试：${e}`)
    }
  } finally {
    if (attempt === connectionAttempt.value) connectionPreflighting.value = false
  }
}

const showCredentialPrompt = ref(false)
const pendingSession = ref<Session | null>(null)
const connectSecret = ref('')
const saveConnectCredential = ref(false)
const connecting = ref(false)
const showTrustPrompt = ref(false)
const trustResult = ref<HostTrustResult | null>(null)
const trusting = ref(false)
const showLegacyPrompt = ref(false)
const showRebindPrompt = ref(false)

function credentialKind(session: Session): CredentialKind {
  return session.auth_method === 'private_key' ? 'private_key_passphrase' : 'password'
}

async function continueAfterTrust(session: Session) {
  pendingSession.value = session
  if (session.credential_state === 'stored') {
    await connectNow()
  } else if (session.credential_state === 'legacy_plaintext') {
    showLegacyPrompt.value = true
  } else if (session.credential_state === 'needs_rebind') {
    showRebindPrompt.value = true
  } else {
    connectSecret.value = ''
    saveConnectCredential.value = false
    showCredentialPrompt.value = true
  }
}

async function confirmHostTrust() {
  if (!trustResult.value?.challenge_id || !pendingSession.value) return
  trusting.value = true
  try {
    const command = trustResult.value.state === 'changed'
      ? 'replace_host_trust'
      : 'accept_host_trust'
    await invoke(command, { challengeId: trustResult.value.challenge_id })
    showTrustPrompt.value = false
    await continueAfterTrust(pendingSession.value)
  } catch (error) {
    message.error(`主机信任未更新: ${error}`)
  } finally {
    trusting.value = false
  }
}

async function connectNow(secret?: string) {
  if (!pendingSession.value) return
  const session = pendingSession.value
  connecting.value = true
  try {
    await terminalsStore.openTerminal(
      session.id,
      session.name,
      120,
      40,
      secret ? { kind: credentialKind(session), secret } : undefined,
    )
    showCredentialPrompt.value = false
    showLegacyPrompt.value = false
    showRebindPrompt.value = false
    pendingSession.value = null
  } catch (e) {
    message.error(`连接失败: ${e}`)
  } finally {
    connecting.value = false
  }
}

async function connectWithCredential() {
  if (!pendingSession.value) return
  const secret = connectSecret.value
  if (secret && saveConnectCredential.value) {
    try {
      pendingSession.value = await sessionsStore.setCredential(
        pendingSession.value.id,
        credentialKind(pendingSession.value),
        secret,
      )
      await connectNow()
      return
    } catch (error) {
      message.warning(`系统凭据库不可用，本次将不保存：${error}`)
    }
  }
  await connectNow(secret || undefined)
}

function resetCredentialPrompt() {
  connectSecret.value = ''
  saveConnectCredential.value = false
  if (!showLegacyPrompt.value && !showRebindPrompt.value) pendingSession.value = null
}

function resetTrustPrompt() {
  trustResult.value = null
  if (!showCredentialPrompt.value && !showLegacyPrompt.value && !showRebindPrompt.value) {
    pendingSession.value = null
  }
}

function resetPendingConnection() {
  if (!showTrustPrompt.value && !showCredentialPrompt.value
    && !showLegacyPrompt.value && !showRebindPrompt.value && !connecting.value) {
    pendingSession.value = null
  }
}

async function migrateAndConnect() {
  if (!pendingSession.value) return
  connecting.value = true
  try {
    pendingSession.value = await sessionsStore.migrateLegacyCredential(pendingSession.value.id)
    showLegacyPrompt.value = false
    connecting.value = false
    await connectNow()
  } catch (error) {
    connecting.value = false
    message.error(`旧密码迁移失败，原数据保持不变: ${error}`)
  }
}

function useOneTimeInstead() {
  showLegacyPrompt.value = false
  connectSecret.value = ''
  saveConnectCredential.value = false
  showCredentialPrompt.value = true
}

async function rebindAndConnect() {
  if (!pendingSession.value) return
  connecting.value = true
  try {
    pendingSession.value = await sessionsStore.confirmCredentialRebind(
      pendingSession.value.id,
      credentialKind(pendingSession.value),
    )
    showRebindPrompt.value = false
    connecting.value = false
    await connectNow()
  } catch (error) {
    connecting.value = false
    message.error(`凭据重新绑定失败: ${error}`)
  }
}

// 新建/编辑
const showForm = ref(false)
const editingSession = ref<Session | undefined>()

function handleNewHost() {
  editingSession.value = undefined
  showForm.value = true
}

function connectSessionById(sessionId: string) {
  const session = sessionsStore.sessions.find(item => item.id === sessionId)
  if (!session) {
    message.error('找不到原主机，请刷新主机列表后重试')
    return
  }
  void handleConnect(session)
}

function handleEdit(session: Session) {
  editingSession.value = session
  showForm.value = true
}

function onSaved() {
  editingSession.value = undefined
}

const showGroupEditor = ref(false)
const savingGroup = ref(false)
const editingGroupName = ref('')
const groupDraft = ref({ name: '', icon: 'folder' })
const showDeleteGroupConfirm = ref(false)
const deletingGroup = ref(false)
const editingGroupHasSessions = computed(() => Boolean(
  sessionsStore.groups.find(group => group.name === editingGroupName.value)?.sessions.length,
))

function openGroupCreator() {
  editingGroupName.value = ''
  groupDraft.value = { name: '', icon: 'folder' }
  showGroupEditor.value = true
}

function openGroupEditor(name: string, icon: string) {
  editingGroupName.value = name
  groupDraft.value = { name, icon }
  showGroupEditor.value = true
}

async function saveGroup() {
  const name = groupDraft.value.name.trim()
  if (!name) return
  savingGroup.value = true
  try {
    const previous = editingGroupName.value
    if (previous) {
      await sessionsStore.updateGroup({
        current_name: previous,
        name,
        icon: groupDraft.value.icon,
      })
      if (activeNav.value === previous) activeNav.value = name
    } else {
      await sessionsStore.createGroup({ name, icon: groupDraft.value.icon })
      activeNav.value = name
    }
    showGroupEditor.value = false
    editingGroupName.value = ''
    message.success(previous ? '分组已更新' : '分组已创建')
  } catch (error) {
    message.error(`${editingGroupName.value ? '分组更新' : '分组创建'}失败: ${error}`)
  } finally {
    savingGroup.value = false
  }
}

function requestDeleteGroup() {
  if (!editingGroupName.value || editingGroupHasSessions.value) return
  showDeleteGroupConfirm.value = true
}

async function confirmDeleteGroup() {
  if (!editingGroupName.value) return
  deletingGroup.value = true
  try {
    await sessionsStore.deleteGroup(editingGroupName.value)
    message.success('空分组已删除')
    showDeleteGroupConfirm.value = false
    showGroupEditor.value = false
    activeNav.value = 'all'
    editingGroupName.value = ''
  } catch (error) {
    message.error(`无法删除分组：${error}`)
  } finally {
    deletingGroup.value = false
  }
}

const showStorageSettings = ref(false)
const showTrustSettings = ref(false)

async function handleStorageChanged() {
  try {
    await sessionsStore.fetchSessions()
  } catch (error) {
    message.error(`无法读取会话: ${error}`)
  }
}

async function retryLoad() {
  try {
    await storageStore.fetchStatus()
    await sessionsStore.fetchSessions()
  } catch {
    // The persistent state above keeps recovery actions visible.
  }
}

// 删除
const showDeleteConfirm = ref(false)
const deletingSession = ref<Session | null>(null)
const deleting = ref(false)

function handleDeleteRequest(session: Session) {
  deletingSession.value = session
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deletingSession.value) return
  deleting.value = true
  try {
    await sessionsStore.deleteSession(deletingSession.value.id)
    message.success('已删除')
    showDeleteConfirm.value = false
  } catch (e) {
    message.error(String(e))
  } finally {
    deleting.value = false
  }
}

const showCredentialDeleteConfirm = ref(false)
const credentialActionSession = ref<Session | null>(null)
const credentialDeleteMode = ref<'stored' | 'legacy'>('stored')
const deletingCredential = ref(false)

function requestForgetCredential(session: Session) {
  credentialActionSession.value = session
  credentialDeleteMode.value = 'stored'
  showCredentialDeleteConfirm.value = true
}

function requestDeleteLegacyCredential(session: Session) {
  credentialActionSession.value = session
  credentialDeleteMode.value = 'legacy'
  showCredentialDeleteConfirm.value = true
}

async function confirmCredentialDelete() {
  if (!credentialActionSession.value) return
  deletingCredential.value = true
  try {
    if (credentialDeleteMode.value === 'legacy') {
      await sessionsStore.deleteLegacyCredential(credentialActionSession.value.id)
      message.success('旧密码已删除，会话资料保持不变')
    } else {
      await sessionsStore.deleteCredential(
        credentialActionSession.value.id,
        credentialKind(credentialActionSession.value),
      )
      message.success('已从系统凭据库中移除凭据')
    }
    showCredentialDeleteConfirm.value = false
    credentialActionSession.value = null
  } catch (error) {
    message.error(`无法删除凭据：${error}`)
  } finally {
    deletingCredential.value = false
  }
}

watch(
  () => sessionsStore.notice,
  notice => {
    if (!notice) return
    message.warning(notice, { duration: 8000 })
    sessionsStore.clearNotice()
  },
)

onMounted(async () => {
  try {
    await storageStore.fetchStatus()
  } catch (error) {
    message.error(`无法读取存储状态: ${error}`)
  }
  try {
    await sessionsStore.fetchSessions()
  } catch {
    // The persistent load state keeps the error and recovery actions visible.
  }
})

defineExpose({
  openNewHost: handleNewHost,
  connectSessionById,
})
</script>

<style scoped>
.vaults-view {
  display: flex;
  width: 100%;
  height: 100%;
  background: #0d1117;
  color: #e2e8f0;
  overflow: hidden;
}

/* 左侧导航 */
.nav-panel {
  width: 168px;
  flex-shrink: 0;
  background: #090c11;
  border-right: 1px solid #21283a;
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  overflow-y: auto;
  user-select: none;
}

.nav-section-title {
  font-size: 12px;
  font-weight: 600;
  color: #8fa0b3;
  letter-spacing: 0.8px;
  padding: 4px 12px 8px;
}

.nav-item {
  display: flex;
  width: calc(100% - 12px);
  align-items: center;
  gap: 9px;
  padding: 8px 10px 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #8899aa;
  border-radius: 6px;
  margin: 1px 6px;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: start;
  background: transparent;
  border: 0;
  font-family: inherit;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #c9d5e0;
}

.nav-item.active,
.nav-item[aria-pressed="true"] {
  background: rgba(107, 156, 248, 0.10);
  color: #6b9cf8;
  box-shadow: inset 3px 0 0 0 #6b9cf8;
}

.nav-item:focus-visible {
  outline: 2px solid #93b4fb;
  outline-offset: -2px;
}

.nav-item-row {
  position: relative;
  display: flex;
  align-items: center;
}

.nav-item-row .nav-item {
  padding-inline-end: 36px;
}

.new-group-button {
  align-self: flex-start;
  margin: 0 12px 8px;
  color: #6b9cf8;
  font-size: 12px;
}

.new-group-button:hover {
  color: #8eb4ff;
}

.nav-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  width: calc(100% - 12px);
  background: transparent;
  border: 0;
  text-align: start;
}

.group-edit-button {
  position: absolute;
  right: 10px;
  flex-shrink: 0;
  opacity: 0;
}

.nav-item-row:hover .group-edit-button,
.nav-item-row:focus-within .group-edit-button,
.nav-item-row.active .group-edit-button {
  opacity: 1;
}

.nav-icon {
  flex-shrink: 0;
  font-size: 15px;
}

/* 右侧内容 */
.content-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.content-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border-bottom: 1px solid #21283a;
  background: #0d1117;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
}

.cards-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #0d1117;
}

.state-panel {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #aab7c7;
  font-size: 13px;
}

.state-error {
  flex-direction: column;
}

.state-actions {
  display: flex;
  gap: 8px;
}

.state-detail {
  width: min(640px, 100%);
  color: #8fa0b3;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  text-align: center;
}

.stale-data-alert {
  margin-bottom: 16px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #8fa0b3;
  letter-spacing: 0.8px;
  margin-bottom: 12px;
  margin-top: 4px;
}

.group-title:not(:first-child) {
  margin-top: 20px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(156px, 1fr));
  gap: 14px;
}

.empty-hint {
  text-align: center;
  color: #9aa9ba;
  font-size: 13px;
  padding: 48px 16px;
}

.empty-group-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.group-editor {
  display: grid;
  gap: 10px;
}

.group-editor label {
  color: #c9d5e0;
  font-size: 13px;
  font-weight: 600;
}

.group-editor label:not(:first-child) {
  margin-top: 6px;
}

.group-editor p {
  color: #8899aa;
  font-size: 12px;
  line-height: 1.5;
}

.group-actions {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.credential-help {
  margin-top: 10px;
  color: #aab7c7;
  font-size: 12px;
  line-height: 1.5;
}

.save-credential {
  margin-top: 14px;
}

.fingerprint-block {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.fingerprint-block span {
  color: #8899aa;
  font-size: 12px;
}

.fingerprint-block code {
  color: #e2e8f0;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.rebind-target {
  display: grid;
  gap: 6px;
  margin-top: 14px;
  padding: 12px;
  background: #111722;
  border-radius: 8px;
}

.rebind-target code {
  overflow-wrap: anywhere;
  color: #e2e8f0;
}

.rebind-target span {
  color: #aab7c7;
  font-size: 12px;
}

@media (max-width: 520px) {
  .nav-panel {
    width: 52px;
  }

  .nav-section-title,
  .nav-item span,
  .group-edit-button,
  .new-group-label {
    display: none;
  }

  .new-group-button {
    align-self: center;
    width: 44px;
    min-height: 44px;
    margin-inline: 0;
  }

  .nav-item {
    justify-content: center;
    padding: 8px;
    min-height: 44px;
  }

  .nav-item-row .nav-item {
    padding-inline-end: 8px;
  }

  .content-header {
    padding-inline: 12px;
  }

  .search-input {
    min-width: 0;
  }

  .search-input :deep(.n-input) {
    min-height: 44px;
  }

  .cards-scroll {
    padding: 16px 12px;
  }

  .content-header :deep(.n-button) {
    min-width: 44px;
    min-height: 44px;
  }

  .state-actions :deep(.n-button),
  .empty-hint :deep(.n-button) {
    min-height: 44px;
  }

  .group-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
