<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <div class="app-layout">
        <!-- 顶部统一 Tab 栏 -->
        <div class="top-tab-bar" role="tablist" aria-label="工作区">
          <!-- Vaults 固定 Tab -->
          <button
            type="button"
            class="tab-item tab-select"
            :class="{ active: activeTopTab === 'vaults' }"
            role="tab"
            :aria-selected="activeTopTab === 'vaults'"
            @click="selectTopTab('vaults')"
          >
            <n-icon :component="GridOutline" class="tab-icon" />
            <span class="tab-name">主机</span>
          </button>

          <!-- 终端动态 Tab -->
          <div
            v-for="tab in terminalsStore.tabs"
            :key="tab.id"
            class="tab-item"
            :class="{ active: activeTopTab === tab.id, disconnected: !tab.connected }"
          >
            <button
              type="button"
              class="tab-select"
              role="tab"
              :aria-selected="activeTopTab === tab.id"
              :aria-label="`${terminalTabLabel(tab)}${tab.connected ? '' : '，连接已断开'}`"
              :title="terminalTabLabel(tab)"
              @click="selectTopTab(tab.id)"
            >
              <n-icon
                :component="tab.connected ? TerminalOutline : AlertCircleOutline"
                class="tab-icon"
              />
              <span class="tab-name">{{ terminalTabLabel(tab) }}</span>
            </button>
            <n-button
              quaternary
              circle
              size="tiny"
              class="tab-close"
              :aria-label="`关闭 ${tab.session_name} 终端`"
              @click.stop="requestCloseTab(tab)"
            >
              <template #icon><n-icon :component="CloseOutline" /></template>
            </n-button>
          </div>

          <!-- 弹性空白：将 + 按钮推到右端 -->
          <div class="tab-spacer" />

          <!-- 新建按钮 -->
          <button
            type="button"
            class="tab-new-btn"
            aria-label="新建主机"
            title="新建主机"
            @click="handleNewHost"
          >
            <n-icon :component="AddOutline" />
          </button>
        </div>

        <!-- 内容区 -->
        <div class="content-area">
          <VaultsView ref="vaultsRef" v-show="activeTopTab === 'vaults'" />
          <TerminalPanel
            v-for="tab in terminalsStore.tabs"
            :key="tab.id"
            :terminal-id="tab.id"
            :active="tab.id === activeTopTab"
            :connected="tab.connected"
            v-show="activeTopTab === tab.id"
            @closed="terminalsStore.markDisconnected(tab.id)"
            @reconnect="handleReconnect(tab)"
            @back="selectTopTab('vaults')"
          />
        </div>

        <n-modal v-model:show="showCloseConfirm" preset="dialog" title="断开并关闭终端" type="warning">
          <span>关闭「{{ closingTab?.session_name }}」会立即断开当前 SSH 会话。</span>
          <n-alert v-if="closeError" type="error" :show-icon="false" class="close-error">
            {{ closeError }}
          </n-alert>
          <template #action>
            <n-space justify="end">
              <n-button @click="showCloseConfirm = false">继续使用</n-button>
              <n-button type="error" :loading="closing" @click="confirmCloseTab">断开并关闭</n-button>
            </n-space>
          </template>
        </n-modal>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { NAlert, NConfigProvider, NMessageProvider, NButton, NIcon, NModal, NSpace, darkTheme } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'
import type { TerminalTab } from './types'
import {
  GridOutline,
  TerminalOutline,
  AlertCircleOutline,
  CloseOutline,
  AddOutline,
} from '@vicons/ionicons5'
import VaultsView from './components/VaultsView.vue'
import TerminalPanel from './components/TerminalPanel.vue'
import { useTerminalsStore } from './stores/terminals'

const terminalsStore = useTerminalsStore()
const activeTopTab = ref<string>('vaults')
const vaultsRef = ref<InstanceType<typeof VaultsView> | null>(null)
const showCloseConfirm = ref(false)
const closingTab = ref<TerminalTab | null>(null)
const closing = ref(false)
const closeError = ref('')

// 同步：终端 store 打开新终端时，自动切换到该 Tab
watch(
  () => terminalsStore.activeTabId,
  (newId) => {
    activeTopTab.value = newId ?? 'vaults'
  },
)

function selectTopTab(tabId: string) {
  activeTopTab.value = tabId
  terminalsStore.selectTab(tabId === 'vaults' ? null : tabId)
}

function terminalTabLabel(tab: TerminalTab) {
  const matching = terminalsStore.tabs.filter(item => item.session_name === tab.session_name)
  if (matching.length < 2) return tab.session_name
  return `${tab.session_name} · ${matching.findIndex(item => item.id === tab.id) + 1}`
}

function requestCloseTab(tab: TerminalTab) {
  if (!tab.connected) {
    void closeTab(tab.id)
    return
  }
  closingTab.value = tab
  closeError.value = ''
  showCloseConfirm.value = true
}

async function closeTab(terminalId: string) {
  const wasVisible = activeTopTab.value === terminalId
  await terminalsStore.closeTab(terminalId)
  if (wasVisible || !terminalsStore.tabs.some(tab => tab.id === activeTopTab.value)) {
    activeTopTab.value = terminalsStore.activeTabId ?? 'vaults'
  }
}

async function confirmCloseTab() {
  if (!closingTab.value) return
  closing.value = true
  try {
    await closeTab(closingTab.value.id)
    showCloseConfirm.value = false
    closingTab.value = null
  } catch (error) {
    closeError.value = `无法断开连接，请重试：${error}`
  } finally {
    closing.value = false
  }
}

async function handleNewHost() {
  selectTopTab('vaults')
  await nextTick()
  vaultsRef.value?.openNewHost()
}

async function handleReconnect(tab: TerminalTab) {
  selectTopTab('vaults')
  await nextTick()
  vaultsRef.value?.connectSessionById(tab.session_id)
}

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#6b9cf8',
    primaryColorHover: '#93b4fb',
    primaryColorPressed: '#4a7cf0',
    bodyColor: '#0d1117',
    cardColor: '#161b27',
    modalColor: '#161b27',
    popoverColor: '#161b27',
    borderColor: '#21283a',
    textColor1: '#e2e8f0',
    textColor2: '#c9d5e0',
    textColor3: '#8899aa',
  },
}
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0d1117;
}

@media (max-width: 520px) {
  .n-dialog__close,
  .n-card-header__close {
    width: 44px !important;
    height: 44px !important;
  }
}
</style>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
}

/* 顶部 Tab 栏 */
.top-tab-bar {
  display: flex;
  align-items: center;
  height: 44px;
  flex-shrink: 0;
  background: #090c11;
  border-bottom: 1px solid #21283a;
  overflow-x: auto;
}

.top-tab-bar::-webkit-scrollbar {
  height: 2px;
}

.tab-item {
  display: flex;
  align-items: center;
  height: 100%;
  white-space: nowrap;
  color: #9aa9ba;
  transition: background 0.15s, color 0.15s;
}

.tab-select {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  padding: 0 14px;
  color: inherit;
  font: inherit;
  font-size: 12px;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.tab-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #c9d5e0;
}

.tab-item.active {
  background: #0d1117;
  color: #e2e8f0;
  border-bottom: 2px solid #6b9cf8;
}

.tab-select:focus-visible,
.tab-new-btn:focus-visible {
  outline: 2px solid #93b4fb;
  outline-offset: -3px;
}

.tab-item.disconnected .tab-icon {
  color: #f87171;
}

.tab-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  width: 36px;
  height: 40px;
  opacity: 0.65;
  margin-left: 2px;
}

.tab-item:hover .tab-close,
.tab-close:focus-visible {
  opacity: 1;
}

.tab-spacer {
  flex: 1;
}

.tab-new-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 100%;
  cursor: pointer;
  color: #4a5568;
  font-size: 18px;
  flex-shrink: 0;
  padding: 0;
  background: transparent;
  border: 0;
  transition: color 0.15s, background 0.15s;
}

.tab-new-btn:hover {
  color: #c9d5e0;
  background: rgba(255, 255, 255, 0.04);
}

/* 内容区 */
.content-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.content-area > * {
  position: absolute;
  inset: 0;
}

.close-error {
  margin-top: 12px;
}

@media (max-width: 520px) {
  .tab-close {
    width: 44px;
    height: 44px;
  }
}
</style>
