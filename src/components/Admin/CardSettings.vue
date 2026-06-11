<template>
  <div class="relative">
    <button
      class="w-6 h-6 rounded-full bg-fg/10 text-fg-dimmed text-sm hover:bg-fg/20 hover:text-fg transition-colors flex items-center justify-center"
      title="Settings (link, status, secrets)"
      @click="open = !open"
    >
      ⋯
    </button>
    <div
      v-if="open"
      class="absolute z-40 bottom-full right-0 mb-1 w-60 p-3 rounded-xl bg-bg shadow-lg border border-fg/10 text-sm space-y-2"
    >
      <label class="block">
        <span class="text-xs text-fg-dimmed">Link</span>
        <input
          :value="link"
          placeholder="https://…"
          class="w-full bg-fg/5 rounded px-2 py-1 focus:outline-none"
          @change="saveLink(($event.target as HTMLInputElement).value)"
        >
      </label>

      <div class="space-y-1">
        <span class="text-xs text-fg-dimmed">Tags</span>
        <div class="flex flex-wrap gap-1 items-center">
          <span
            v-for="(tag, key) in tags"
            :key="key"
            class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-fg/10"
          >
            {{ tagLabel(tag) }}
            <button class="hover:text-red-500" @click="removeTag(tagLabel(tag))">✕</button>
          </span>
          <input
            v-model="tagDraft"
            placeholder="+ tag"
            class="text-xs bg-fg/5 rounded px-2 py-1 w-20 focus:outline-none"
            @keyup.enter="addTag"
          >
        </div>
      </div>
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          :checked="status?.enabled"
          @change="patch({ enabled: ($event.target as HTMLInputElement).checked })"
        >
        Status check enabled
      </label>
      <input
        :value="status?.url"
        placeholder="status URL (else uses link)"
        class="w-full bg-fg/5 rounded px-2 py-1 focus:outline-none"
        @change="patch({ url: ($event.target as HTMLInputElement).value })"
      >
      <label class="flex items-center justify-between gap-2">
        Interval (s)
        <input
          type="number"
          :value="status?.interval"
          class="w-20 bg-fg/5 rounded px-2 py-1 focus:outline-none"
          @change="patch({ interval: Number(($event.target as HTMLInputElement).value) })"
        >
      </label>
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          :checked="status?.animation"
          @change="patch({ animation: ($event.target as HTMLInputElement).checked })"
        >
        Animate
      </label>

      <div v-if="secretKeys?.length" class="pt-2 border-t border-fg/10 space-y-1">
        <div class="text-xs text-fg-dimmed">
          Secrets (write-only)
        </div>
        <div v-for="key in secretKeys" :key="key" class="flex items-center gap-1">
          <input
            type="password"
            placeholder="•••• set — type to replace"
            class="flex-1 bg-fg/5 rounded px-2 py-1 focus:outline-none"
            @change="saveSecret(key, ($event.target as HTMLInputElement))"
          >
          <button class="text-xs text-fg-dimmed hover:text-red-500" title="Clear" @click="clearSecret(key)">
            ✕
          </button>
          <span class="text-xs text-fg-dimmed w-14 truncate">{{ key }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Tag } from '~/types'

interface StatusShape {
  enabled?: boolean
  interval?: number
  animation?: boolean
  url?: string
}

const props = defineProps<{
  groupIndex?: number | null
  index?: number
  link?: string
  status?: StatusShape
  tags?: (string | Tag)[]
  secretKeys?: string[]
}>()

const { setStatus, setSecret, saveField, setTags } = useAdmin()
const open = ref(false)
const tagDraft = ref('')

async function saveLink(value: string) {
  if (props.index == null) {
    return
  }

  try {
    await saveField({ groupIndex: props.groupIndex ?? null, index: props.index, field: 'link', value })
  } catch (e: any) {
    // eslint-disable-next-line no-alert
    alert(e?.data?.statusMessage || e?.statusMessage || 'Save failed')
  }
}

function tagLabel(tag: string | Tag): string {
  return typeof tag === 'string' ? tag : tag.name
}

function tagNames(): string[] {
  return (props.tags ?? []).map(tagLabel)
}

async function writeTags(tags: string[]) {
  if (props.index == null) {
    return
  }

  try {
    await setTags(props.groupIndex ?? null, props.index, tags)
  } catch (e: any) {
    // eslint-disable-next-line no-alert
    alert(e?.data?.statusMessage || e?.statusMessage || 'Save failed')
  }
}

function addTag() {
  const name = tagDraft.value.trim()
  tagDraft.value = ''

  if (name && !tagNames().includes(name)) {
    writeTags([...tagNames(), name])
  }
}

function removeTag(name: string) {
  writeTags(tagNames().filter((tag) => tag !== name))
}

async function patch(part: Record<string, unknown>) {
  if (props.index == null) {
    return
  }

  try {
    await setStatus(props.groupIndex ?? null, props.index, part)
  } catch (e: any) {
    // eslint-disable-next-line no-alert
    alert(e?.data?.statusMessage || e?.statusMessage || 'Save failed')
  }
}

async function writeSecret(key: string, value: string) {
  if (props.index == null) {
    return
  }

  try {
    await setSecret(props.groupIndex ?? null, props.index, key, value)
  } catch (e: any) {
    // eslint-disable-next-line no-alert
    alert(e?.data?.statusMessage || e?.statusMessage || 'Save failed')
  }
}

// Empty input = leave unchanged (never sent); typing a value replaces it.
function saveSecret(key: string, input: HTMLInputElement) {
  if (input.value) {
    writeSecret(key, input.value)
    input.value = ''
  }
}

function clearSecret(key: string) {
  writeSecret(key, '')
}
</script>
