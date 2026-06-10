<template>
  <div class="relative inline-block">
    <button
      class="text-xs text-fg-dimmed hover:text-fg transition-colors"
      title="Status settings"
      @click="open = !open"
    >
      ⋯ status
    </button>
    <div
      v-if="open"
      class="absolute z-40 mt-1 left-0 w-60 p-3 rounded-xl bg-bg shadow-lg border border-fg/10 text-sm space-y-2"
    >
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
interface StatusShape {
  enabled?: boolean
  interval?: number
  animation?: boolean
  url?: string
}

const props = defineProps<{
  groupIndex?: number | null
  index?: number
  status?: StatusShape
  secretKeys?: string[]
}>()

const { setStatus, setSecret } = useAdmin()
const open = ref(false)

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
