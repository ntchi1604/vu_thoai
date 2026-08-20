import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TWO_HAND_SEQUENCE_CONFIG } from '../config/twoHandSequenceConfig.js'
import { supabase } from '../lib/supabase.js'

export function useTwoHandSequenceLibrary() {
  const [templates, setTemplates] = useState([])
  const templatesRef = useRef([])

  useEffect(() => {
    let cancelled = false

    async function loadLibrary() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Không thể tải thư viện ký hiệu hai tay.', error)
        return
      }

      if (cancelled) return
      const validTemplates = (data ?? [])
        .filter(isValidTemplate)
        .map((template) => ({ ...template, handCount: getTemplateHandCount(template) }))
      templatesRef.current = validTemplates
      setTemplates(validTemplates)
    }

    loadLibrary().catch((error) => console.error('Không thể tải thư viện ký hiệu hai tay.', error))

    return () => {
      cancelled = true
    }
  }, [])

  const labels = useMemo(() => {
    const grouped = new Map()
    templates.forEach((template) => {
      const handCount = getTemplateHandCount(template)
      const key = `${template.label}:${handCount}`
      const entry = grouped.get(key) ?? {
        count: 0,
        handCount,
        label: template.label,
        phrase: template.phrase,
      }
      entry.count += 1
      if (template.phrase) entry.phrase = template.phrase
      grouped.set(key, entry)
    })
    return [...grouped.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [templates])

  const addTemplate = useCallback(({ frames, handCount, label, phrase }) => {
    const normalizedLabel = normalizeLabel(label)
    if (!normalizedLabel || !Array.isArray(frames) || frames.length === 0) return false

    const template = {
      createdAt: new Date().toISOString(),
      frames: frames.map((frame) => frame.map((value) => Number(value.toFixed(4)))),
      handCount: handCount === 1 ? 1 : 2,
      id: crypto.randomUUID(),
      label: normalizedLabel,
      phrase: String(phrase || normalizedLabel).trim(),
    }

    const current = templatesRef.current
    const labelTemplates = current.filter(
      (item) => item.label === normalizedLabel && getTemplateHandCount(item) === template.handCount,
    )
    const oldest = labelTemplates.length >= TWO_HAND_SEQUENCE_CONFIG.maxTemplatesPerLabel
      ? labelTemplates[0]
      : null
    const withoutOldest = oldest ? current.filter((item) => item.id !== oldest.id) : current
    const next = [...withoutOldest, template]
    templatesRef.current = next
    setTemplates(next)

    persistTemplate(template, oldest?.id).catch((error) => {
      console.error('Không thể lưu mẫu ký hiệu hai tay.', error)
    })
    return true
  }, [])

  const removeLabel = useCallback((label, handCount) => {
    const next = templatesRef.current.filter(
      (template) => template.label !== label || getTemplateHandCount(template) !== handCount,
    )
    templatesRef.current = next
    setTemplates(next)
    deleteTemplatesByLabel(label, handCount).catch((error) => {
      console.error('Không thể xóa nhãn ký hiệu hai tay.', error)
    })
  }, [])

  const clearAll = useCallback(() => {
    templatesRef.current = []
    setTemplates([])
    clearTemplateStore().catch((error) => {
      console.error('Không thể xóa thư viện ký hiệu hai tay.', error)
    })
  }, [])

  return { addTemplate, clearAll, labels, removeLabel, templates }
}

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function persistTemplate(template, oldestId) {
  const user = await getUser()
  if (!user) return

  if (oldestId) {
    await supabase.from('templates').delete().eq('id', oldestId)
  }

  const { error } = await supabase.from('templates').insert({
    created_at: template.createdAt,
    frames: template.frames,
    hand_count: template.handCount,
    id: template.id,
    label: template.label,
    phrase: template.phrase,
    user_id: user.id,
  })
  if (error) throw error
}

async function deleteTemplatesByLabel(label, handCount) {
  const user = await getUser()
  if (!user) return

  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('label', label)
    .eq('hand_count', handCount)
  if (error) throw error
}

async function clearTemplateStore() {
  const user = await getUser()
  if (!user) return

  const { error } = await supabase.from('templates').delete().eq('user_id', user.id)
  if (error) throw error
}

function normalizeLabel(label) {
  return String(label || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function isValidTemplate(template) {
  return Boolean(
    template?.id &&
    template?.label &&
    Array.isArray(template.frames) &&
    template.frames.length > 0 &&
    template.frames.every((frame) => Array.isArray(frame) && frame.length === 130),
  )
}

function getTemplateHandCount(template) {
  const raw = template?.handCount ?? template?.hand_count
  return raw === 1 ? 1 : 2
}
