<template>
  <div class="relative">
    <button class="relative block w-16 h-16 group" title="Edit icon" @click="open = !open">
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
      class="absolute z-40 mt-1 left-0 w-64 p-3 rounded-xl bg-bg shadow-lg border border-fg/10 text-sm space-y-2"
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

const { setIcon } = useAdmin()
const open = ref(false)
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
</script>
