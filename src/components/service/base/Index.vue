<template>
  <ServicePlaceholder v-if="loadingOverlay" />
  <Component :is="(isLink && !editMode) ? 'a' : 'div'" v-else :href="(isLink && !editMode) ? link : undefined" :target="target" class="relative h-full p-4 flex gap-4 hover:bg-fg/5 dark:hover:bg-fg/9 rounded-2xl transition-all">
    <div class="flex-shrink-0 flex">
      <div class="self-center w-16 h-16" :class="{ 'overflow-hidden': !(editMode && index != null) }">
        <slot name="icon" :service="data">
          <AdminIconPicker
            v-if="editMode && index != null"
            :group-index="groupIndex"
            :index="index"
            :icon="icon"
          />
          <ServiceBaseIcon v-else-if="icon" v-bind="icon" />
        </slot>
      </div>
    </div>
    <div>
      <h3 class="text-lg pr-1 font-semibold line-clamp-1 flex gap-2 items-center">
        <slot name="title" :service="data">
          <span
            v-if="editMode && index != null"
            contenteditable="plaintext-only"
            class="outline-none focus:ring-1 focus:ring-fg/20 rounded empty:before:content-['Title'] empty:before:text-fg-dimmed"
            @blur="commitText('title', $event)"
            @keydown.enter.prevent="($event.target as HTMLElement).blur()"
          >{{ title }}</span>
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
          <span
            v-if="editMode && index != null"
            contenteditable="plaintext-only"
            class="outline-none focus:ring-1 focus:ring-fg/20 rounded empty:before:content-['Description'] empty:before:text-fg-dimmed"
            @blur="commitText('description', $event)"
            @keydown.enter.prevent="($event.target as HTMLElement).blur()"
          >{{ description }}</span>
          <template v-else>
            {{ description }}
          </template>
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
    <div v-if="editMode && index != null" class="absolute top-2 right-2 z-20 flex items-center gap-1">
      <AdminCardSettings
        :group-index="groupIndex"
        :index="index"
        :link="link"
        :status="status"
        :tags="tags"
        :secret-keys="secretKeys"
      />
      <button
        class="w-6 h-6 rounded-full bg-fg/10 text-fg-dimmed hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
        title="Delete service"
        @click="deleteService(groupIndex ?? null, index)"
      >
        <Icon name="mdi:trash-can-outline" class="w-3.5 h-3.5" />
      </button>
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
const { editMode, saveField, deleteService } = useAdmin()
const isLink = computed(() => isUrl(props.link || ''))
const target = computed(() => props.target || $settings.behaviour.target)

type EditableField = 'title' | 'description'

// Edited in place via contenteditable spans, which keep the exact text box (no
// input height difference, so the self-centered icon never shifts). Read the
// value on blur; revert the DOM text on failure.
async function commitText(field: EditableField, event: Event) {
  const el = event.target as HTMLElement
  const value = (el.textContent || '').trim()

  if (props.index == null || value === (props[field] ?? '')) {
    return
  }

  try {
    await saveField({ groupIndex: props.groupIndex ?? null, index: props.index, field, value })
  } catch (e: any) {
    el.textContent = props[field] ?? ''
    // eslint-disable-next-line no-alert
    alert(e?.data?.statusMessage || e?.statusMessage || 'Save failed')
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
