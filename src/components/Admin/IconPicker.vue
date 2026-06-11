<template>
  <div ref="root" class="relative">
    <button class="relative block w-16 h-16 group" title="Edit icon" @click="toggle">
      <ServiceBaseIcon v-if="hasIcon" v-bind="icon" />
      <div
        v-else
        class="w-full h-full rounded-2xl border-2 border-dashed border-fg/20 flex items-center justify-center text-fg-dimmed text-xs"
      >
        icon
      </div>
      <span class="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 text-white text-xs flex items-center justify-center transition-opacity">
        edit
      </span>
    </button>
    <div
      v-if="open"
      class="absolute z-40 mt-1 left-0 w-64 p-3 rounded-xl bg-background shadow-lg border border-fg/10 text-sm space-y-2"
    >
      <div class="flex items-center gap-2">
        <div class="w-10 h-10 flex-shrink-0">
          <ServiceBaseIcon v-if="previewProps" v-bind="previewProps" />
        </div>
        <span class="text-xs text-fg-dimmed">live preview</span>
      </div>
      <input
        v-model="nameDraft"
        placeholder="Iconify name (e.g. simple-icons:plex)"
        class="w-full bg-fg/5 rounded px-2 py-1 focus:outline-none"
        @keyup.enter="commitName"
        @blur="commitName"
      >
      <input
        v-model="urlDraft"
        placeholder="Image URL or /icons/file.png"
        class="w-full bg-fg/5 rounded px-2 py-1 focus:outline-none"
        @keyup.enter="commitUrl"
        @blur="commitUrl"
      >
      <label class="block text-center text-xs py-1.5 rounded bg-fg/10 hover:bg-fg/15 cursor-pointer transition-colors">
        {{ uploading ? 'Uploading…' : 'Upload image' }}
        <input type="file" accept="image/*" class="hidden" :disabled="uploading" @change="onUpload">
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
interface IconShape {
  name?: string
  url?: string
  wrap?: boolean
  background?: string
  color?: string
}

const props = defineProps<{
  groupIndex?: number | null
  index?: number
  icon?: IconShape
}>()

const { setIcon, uploadIcon, openPopover } = useAdmin()
const uploading = ref(false)
const root = ref<HTMLElement>()
const popoverId = computed(() => `icon:${props.groupIndex}:${props.index}`)
const open = computed(() => openPopover.value === popoverId.value)

function toggle() {
  openPopover.value = open.value ? null : popoverId.value
}

onClickOutside(root, () => {
  if (open.value) {
    openPopover.value = null
  }
})
const nameDraft = ref(props.icon?.name ?? '')
const urlDraft = ref(props.icon?.url ?? '')

const hasIcon = computed(() => Boolean(props.icon?.name || props.icon?.url))

// name and url are mutually exclusive (ServiceBaseIcon renders one or the other)
const previewProps = computed<IconShape | null>(() => {
  if (nameDraft.value) {
    return { ...props.icon, name: nameDraft.value, url: undefined }
  }

  if (urlDraft.value) {
    return { ...props.icon, url: urlDraft.value, name: undefined }
  }

  return null
})

async function save(part: Record<string, unknown>) {
  if (props.index == null) {
    return
  }

  try {
    await setIcon(props.groupIndex ?? null, props.index, part)
  } catch (e: any) {
    // eslint-disable-next-line no-alert
    alert(e?.data?.statusMessage || e?.statusMessage || 'Save failed')
  }
}

function commitName() {
  if (nameDraft.value.trim()) {
    urlDraft.value = ''
  }

  save({ name: nameDraft.value.trim(), url: '' })
}

function commitUrl() {
  if (urlDraft.value.trim()) {
    nameDraft.value = ''
  }

  save({ url: urlDraft.value.trim(), name: '' })
}

async function onUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]

  if (!file || props.index == null) {
    return
  }

  uploading.value = true

  try {
    const url = await uploadIcon(file)
    nameDraft.value = ''
    urlDraft.value = url
    await setIcon(props.groupIndex ?? null, props.index, { url, name: '' })
  } catch (e: any) {
    // eslint-disable-next-line no-alert
    alert(e?.data?.statusMessage || e?.statusMessage || 'Upload failed')
  } finally {
    uploading.value = false
  }
}
</script>
