import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type {
  CredentialKind, Session, SessionGroup, StoredGroup, CreateGroup, CreateSession, UpdateGroup,
  UpdateSession,
} from '../types'

export const useSessionsStore = defineStore('sessions', () => {
  const sessions = ref<Session[]>([])
  const storedGroups = ref<StoredGroup[]>([])
  const loading = ref(true)
  const loadError = ref<string | null>(null)
  const notice = ref<string | null>(null)

  async function consumeNotice() {
    try {
      notice.value = await invoke<string | null>('take_storage_notice')
    } catch {
      // Notice retrieval must not turn a completed CRUD operation into a false failure.
    }
  }

  async function fetchSessions() {
    loading.value = true
    loadError.value = null
    try {
      const [loadedSessions, loadedGroups] = await Promise.all([
        invoke<Session[]>('get_sessions'),
        invoke<StoredGroup[]>('get_groups'),
      ])
      sessions.value = loadedSessions
      storedGroups.value = loadedGroups
      await consumeNotice()
    } catch (error) {
      loadError.value = String(error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function createSession(data: CreateSession) {
    const session = await invoke<Session>('create_session', { data })
    sessions.value.push(session)
    await fetchGroups()
    await consumeNotice()
    return session
  }

  async function updateSession(data: UpdateSession) {
    const updated = await invoke<Session>('update_session', { data })
    const idx = sessions.value.findIndex(s => s.id === data.id)
    if (idx !== -1) sessions.value[idx] = updated
    await fetchGroups()
    await consumeNotice()
    return updated
  }

  async function deleteSession(id: string) {
    await invoke('delete_session', { id })
    sessions.value = sessions.value.filter(s => s.id !== id)
    await consumeNotice()
  }

  const groupedSessions = computed(() => {
    const groups: Record<string, Session[]> = {}
    for (const s of sessions.value) {
      const key = s.group_name || '未分组'
      if (!groups[key]) groups[key] = []
      groups[key].push(s)
    }
    return groups
  })

  const groups = computed<SessionGroup[]>(() => {
    const result = new Map<string, SessionGroup>()
    for (const group of storedGroups.value) {
      result.set(group.name, {
        name: group.name,
        icon: group.icon || 'folder',
        sessions: groupedSessions.value[group.name] || [],
        editable: true,
      })
    }
    for (const [name, groupSessions] of Object.entries(groupedSessions.value)) {
      if (name === '未分组') {
        result.set(name, {
          name,
          icon: 'folder',
          sessions: groupSessions,
          editable: false,
        })
      } else if (!result.has(name)) {
        result.set(name, {
          name,
          icon: groupSessions.find(session => session.group_icon)?.group_icon || 'folder',
          sessions: groupSessions,
          editable: true,
        })
      }
    }
    return [...result.values()]
  })

  function groupIconForName(name?: string) {
    if (!name) return undefined
    return groups.value.find(group => group.name === name)?.icon || 'folder'
  }

  async function fetchGroups() {
    storedGroups.value = await invoke<StoredGroup[]>('get_groups')
  }

  async function createGroup(data: CreateGroup) {
    const group = await invoke<StoredGroup>('create_group', { data })
    storedGroups.value = [...storedGroups.value, group]
      .sort((a, b) => a.name.localeCompare(b.name))
    await consumeNotice()
    return group
  }

  async function updateGroup(data: UpdateGroup) {
    const updated = await invoke<Session[]>('update_group', { data })
    const byId = new Map(updated.map(session => [session.id, session]))
    sessions.value = sessions.value.map(session => byId.get(session.id) || session)
    await fetchGroups()
    await consumeNotice()
    return updated
  }

  async function deleteGroup(name: string) {
    await invoke('delete_group', { name })
    storedGroups.value = storedGroups.value.filter(group => group.name !== name)
    await consumeNotice()
  }

  function clearNotice() {
    notice.value = null
  }

  function replaceSession(updated: Session) {
    const idx = sessions.value.findIndex(session => session.id === updated.id)
    if (idx !== -1) sessions.value[idx] = updated
  }

  async function setCredential(sessionId: string, kind: CredentialKind, secret: string) {
    const updated = await invoke<Session>('set_session_credential', {
      request: { session_id: sessionId, kind, secret },
    })
    replaceSession(updated)
    return updated
  }

  async function confirmCredentialRebind(sessionId: string, kind: CredentialKind) {
    const updated = await invoke<Session>('confirm_session_credential_rebind', {
      sessionId,
      kind,
    })
    replaceSession(updated)
    return updated
  }

  async function migrateLegacyCredential(sessionId: string) {
    const updated = await invoke<Session>('migrate_legacy_credential', { sessionId })
    replaceSession(updated)
    return updated
  }

  async function deleteCredential(sessionId: string, kind: CredentialKind) {
    const updated = await invoke<Session>('delete_session_credential', {
      sessionId,
      kind,
    })
    replaceSession(updated)
    return updated
  }

  async function deleteLegacyCredential(sessionId: string) {
    await invoke<boolean>('delete_legacy_credential', { sessionId })
    await fetchSessions()
  }

  return {
    sessions,
    storedGroups,
    loading,
    loadError,
    notice,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
    setCredential,
    confirmCredentialRebind,
    migrateLegacyCredential,
    deleteCredential,
    deleteLegacyCredential,
    replaceSession,
    clearNotice,
    groupedSessions,
    groups,
    groupIconForName,
    createGroup,
    updateGroup,
    deleteGroup,
  }
})
