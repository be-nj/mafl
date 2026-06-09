<template>
  <ServicePlaceholder v-if="loadingOverlay" />
  <Component :is="(isLink && !editMode) ? 'a' : 'div'" v-else :href="(isLink && !editMode) ? link : undefined" :target="target" class="p-4 flex gap-4 hover:bg-fg/5 dark:hover:bg-fg/9 rounded-2xl transition-all">
    <div class="flex-shrink-0 flex">
      <div class="self-center w-16 h-16 overflow-hidden">
        <slot name="icon" :service="data">
          <ServiceBaseIcon v-if="icon" v-bind="icon" />
        </slot>
      </div>
    </div>
    <div>
      <h3 class="text-lg pr-1 font-semibold line-clamp-1 flex gap-2 items-center">
        <slot name="title" :service="data">
          <input
            v-if="editMode && index != null"
            v-model="titleDraft"
            class="bg-transparent border-b border-fg/30 focus:outline-none focus:border-fg w-full"
            @keyup.enter="commitTitle"
            @blur="commitTitle"
          >
          <template v-else>
            {{ title }}
          </template>
        </slot>
        <slot v-if="status && status.enabled" name="status" :data="data">
          <ServiceBaseStatus :ping="{ ...data?.ping, animation: status?.animation }" />
        </slot>
      </h3>

      <p class="text-sm text-fg-dimmed line-clamp-1">
        <slot name="description" :service="data">
          {{ description }}
        </slot>
      </p>
      <template v-if="tags.length">
        <ServiceBaseTag
          v-for="(tag, key) in tags"
          :key="key"
          :tag="tag"
        />
      </template>
    </div>
  </Component>
</template>

<script setup lang="ts">
import type { Service, ServiceClient } from '~/types'

const props = defineProps<ServiceClient<Service> & {
  groupIndex?: number | null
  index?: number
}>()

const { $settings } = useNuxtApp()
const { editMode, saveField } = useAdmin()
const isLink = computed(() => isUrl(props.link || ''))
const target = computed(() => props.target || $settings.behaviour.target)

const titleDraft = ref(props.title ?? '')
const saving = ref(false)
watch(() => props.title, (value) => {
  titleDraft.value = value ?? ''
})

async function commitTitle() {
  const value = titleDraft.value.trim()

  if (saving.value || props.index == null || value === (props.title ?? '')) {
    return
  }

  saving.value = true

  try {
    await saveField({
      groupIndex: props.groupIndex ?? null,
      index: props.index,
      field: 'title',
      value,
    })
    // The config:update websocket push reloads the app with the new value.
  } catch (e: any) {
    titleDraft.value = props.title ?? ''
    // eslint-disable-next-line no-alert
    alert(e?.data?.statusMessage || e?.statusMessage || 'Save failed')
  } finally {
    saving.value = false
  }
}

const immediate = computed(() => props.status?.enabled || !!props.type || false)
const { data, pauseUpdate } = useServiceData<Service>(props, {
  immediate: immediate.value,
})

const loadingOverlay = computed(() => {
  if (props.type && !data.value) {
    return true
  }

  return false
})

defineExpose({ data })

onBeforeUnmount(pauseUpdate)
</script>
