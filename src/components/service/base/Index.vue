<template>
  <ServicePlaceholder v-if="loadingOverlay" />
  <Component :is="(isLink && !editMode) ? 'a' : 'div'" v-else :href="(isLink && !editMode) ? link : undefined" :target="target" class="relative p-4 flex gap-4 hover:bg-fg/5 dark:hover:bg-fg/9 rounded-2xl transition-all">
    <div class="flex-shrink-0 flex">
      <div class="self-center w-16 h-16 overflow-hidden">
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
          <input
            v-if="editMode && index != null"
            v-model="drafts.title"
            class="w-full bg-transparent border-0 p-0 m-0 focus:outline-none focus:ring-1 focus:ring-fg/20 rounded"
            @keyup.enter="commitField('title')"
            @blur="commitField('title')"
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
          <input
            v-if="editMode && index != null"
            v-model="drafts.description"
            class="w-full bg-transparent border-0 p-0 m-0 focus:outline-none focus:ring-1 focus:ring-fg/20 rounded"
            @keyup.enter="commitField('description')"
            @blur="commitField('description')"
          >
          <template v-else>
            {{ description }}
          </template>
        </slot>
      </p>
      <div v-if="editMode && index != null" class="flex flex-wrap gap-1 mt-1 items-center">
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
          class="text-xs bg-transparent border-b border-fg/20 w-16 focus:outline-none focus:border-fg"
          @keyup.enter="addTag"
        >
      </div>
      <template v-else-if="tags.length">
        <ServiceBaseTag
          v-for="(tag, key) in tags"
          :key="key"
          :tag="tag"
        />
      </template>
    </div>
    <AdminCardSettings
      v-if="editMode && index != null"
      class="absolute bottom-2 right-2"
      :group-index="groupIndex"
      :index="index"
      :link="link"
      :status="status"
      :secret-keys="secretKeys"
    />
  </Component>
</template>

<script setup lang="ts">
import type { Service, ServiceClient, Tag } from '~/types'

const props = defineProps<ServiceClient<Service> & {
  groupIndex?: number | null
  index?: number
}>()

const { $settings } = useNuxtApp()
const { editMode, saveField, setTags } = useAdmin()
const isLink = computed(() => isUrl(props.link || ''))
const target = computed(() => props.target || $settings.behaviour.target)

const tagDraft = ref('')
function tagLabel(tag: string | Tag): string {
  return typeof tag === 'string' ? tag : tag.name
}
function tagNames(): string[] {
  return (props.tags ?? []).map(tagLabel)
}

async function addTag() {
  const name = tagDraft.value.trim()

  tagDraft.value = ''

  if (!name || props.index == null || tagNames().includes(name)) {
    return
  }

  try {
    await setTags(props.groupIndex ?? null, props.index, [...tagNames(), name])
  } catch (e: any) {
    // eslint-disable-next-line no-alert
    alert(e?.data?.statusMessage || e?.statusMessage || 'Save failed')
  }
}

async function removeTag(name: string) {
  if (props.index == null) {
    return
  }

  try {
    await setTags(props.groupIndex ?? null, props.index, tagNames().filter((tag) => tag !== name))
  } catch (e: any) {
    // eslint-disable-next-line no-alert
    alert(e?.data?.statusMessage || e?.statusMessage || 'Save failed')
  }
}

type EditableField = 'title' | 'description' | 'link'

const drafts = reactive({
  title: props.title ?? '',
  description: props.description ?? '',
  link: props.link ?? '',
})
const saving = ref(false)
watch(() => [props.title, props.description, props.link], () => {
  drafts.title = props.title ?? ''
  drafts.description = props.description ?? ''
  drafts.link = props.link ?? ''
})

async function commitField(field: EditableField) {
  const value = drafts[field].trim()

  if (saving.value || props.index == null || value === (props[field] ?? '')) {
    return
  }

  saving.value = true

  try {
    await saveField({
      groupIndex: props.groupIndex ?? null,
      index: props.index,
      field,
      value,
    })
    // The config:update websocket push reloads the app with the new value.
  } catch (e: any) {
    drafts[field] = props[field] ?? ''
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
