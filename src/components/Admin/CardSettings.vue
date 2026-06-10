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
}>()

const { setStatus } = useAdmin()
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
</script>
