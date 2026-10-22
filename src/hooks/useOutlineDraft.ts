import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  OutlineDraftContent,
  StoredOutlineDraft,
} from '../types/outline'
import {
  deleteOutlineDraft,
  loadOutlineDraft,
  saveOutlineDraft,
} from '../utils/outlineDraftStorage'

export type DraftSaveStatus =
  | 'idle'
  | 'pending'
  | 'saving'
  | 'saved'
  | 'error'

export type DraftRecoveryStatus =
  | 'checking'
  | 'none'
  | 'available'
  | 'invalid'
  | 'unavailable'
  | 'restored'
  | 'dismissed'

const SAVE_DEBOUNCE_MS = 700

export function useOutlineDraft() {
  const [draft, setDraft] = useState<OutlineDraftContent | null>(null)
  const [pendingDraft, setPendingDraft] =
    useState<StoredOutlineDraft | null>(null)
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle')
  const [recoveryStatus, setRecoveryStatus] =
    useState<DraftRecoveryStatus>('checking')
  const [storageError, setStorageError] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const saveTimerRef = useRef<number | null>(null)
  const draftRef = useRef(draft)
  const isInitializedRef = useRef(isInitialized)
  const draftDeletedRef = useRef(false)

  useEffect(() => {
    const result = loadOutlineDraft()
    window.queueMicrotask(() => {
      if (result.status === 'valid') {
        setPendingDraft(result.draft)
        setRecoveryStatus('available')
      } else {
        setRecoveryStatus(
          result.status === 'missing' ? 'none' : result.status,
        )
      }
      setIsInitialized(true)
    })
  }, [])

  useEffect(() => {
    draftRef.current = draft
    isInitializedRef.current = isInitialized
  }, [draft, isInitialized])

  useEffect(() => {
    if (!isInitialized || !draft) {
      return
    }

    const timer = window.setTimeout(() => {
      saveTimerRef.current = null
      if (draftDeletedRef.current) {
        return
      }

      setSaveStatus('saving')

      try {
        saveOutlineDraft(draft)
        setStorageError('')
        setRecoveryStatus('none')
        setSaveStatus('saved')
      } catch {
        setStorageError(
          '无法保存本地草稿。浏览器存储可能已满或不可用，请导出 PPTX 备份。',
        )
        setSaveStatus('error')
      }
    }, SAVE_DEBOUNCE_MS)
    saveTimerRef.current = timer

    return () => {
      window.clearTimeout(timer)
      if (saveTimerRef.current === timer) {
        saveTimerRef.current = null
      }
    }
  }, [draft, isInitialized])

  useEffect(() => {
    function saveBeforePageHide() {
      const latestDraft = draftRef.current
      if (
        !isInitializedRef.current ||
        !latestDraft ||
        draftDeletedRef.current
      ) {
        return
      }

      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }

      try {
        saveOutlineDraft(latestDraft)
      } catch {
        setSaveStatus('error')
        setStorageError(
          '无法保存本地草稿。浏览器存储可能已满或不可用，请导出 PPTX 备份。',
        )
      }
    }

    window.addEventListener('pagehide', saveBeforePageHide)
    return () => window.removeEventListener('pagehide', saveBeforePageHide)
  }, [])

  const replaceDraft = useCallback(
    (sourcePdfName: string | null, slides: OutlineDraftContent['slides']) => {
      draftDeletedRef.current = false
      setPendingDraft(null)
      setRecoveryStatus('none')
      setStorageError('')
      setSaveStatus('pending')
      setDraft({ sourcePdfName, slides })
    },
    [],
  )

  const updateDraft = useCallback(
    (update: (currentDraft: OutlineDraftContent) => OutlineDraftContent) => {
      if (draft) {
        setSaveStatus('pending')
      }
      setDraft((currentDraft) =>
        currentDraft ? update(currentDraft) : currentDraft,
      )
    },
    [draft],
  )

  const restorePendingDraft = useCallback(() => {
    if (!pendingDraft) {
      return
    }

    const restoredDraft: OutlineDraftContent = {
      sourcePdfName: pendingDraft.sourcePdfName,
      slides: pendingDraft.slides,
    }
    draftDeletedRef.current = false
    setDraft(restoredDraft)
    setPendingDraft(null)
    setRecoveryStatus('restored')
    setStorageError('')
    setSaveStatus('pending')
  }, [pendingDraft])

  const dismissPendingDraft = useCallback(() => {
    setPendingDraft(null)
    setRecoveryStatus('dismissed')
  }, [])

  const deleteDraft = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    try {
      deleteOutlineDraft()
      draftDeletedRef.current = true
      draftRef.current = null
      setDraft(null)
      setPendingDraft(null)
      setSaveStatus('idle')
      setRecoveryStatus('none')
      setStorageError('')
    } catch {
      setStorageError('无法删除本地草稿，请检查浏览器存储权限后重试。')
      setSaveStatus('error')
      throw new Error('删除本地草稿失败。')
    }
  }, [])

  return {
    draft,
    pendingDraft,
    saveStatus,
    recoveryStatus,
    storageError,
    replaceDraft,
    updateDraft,
    restorePendingDraft,
    dismissPendingDraft,
    deleteDraft,
  }
}
