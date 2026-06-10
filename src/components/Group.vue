<template>
  <div class="py-10">
    <h2 v-if="title" class="text-2xl font-light py-2 px-4 flex items-center gap-2">
      <span
        v-if="editMode && groupIndex != null"
        class="group-drag-handle cursor-grab select-none text-fg-dimmed hover:text-fg text-base"
        title="Drag group"
      >
        ⠿
      </span>
      <input
        v-if="editMode && groupIndex != null"
        v-model="groupTitleDraft"
        class="bg-transparent border-b border-fg/30 focus:outline-none focus:border-fg font-light"
        @keyup.enter="commitGroupTitle"
        @blur="commitGroupTitle"
      >
      <template v-else>
        {{ title }}
      </template>
      <button
        v-if="editMode && groupIndex != null"
        class="text-sm text-fg-dimmed hover:text-red-500 transition-colors"
        title="Delete group"
        @click="onDeleteGroup"
      >
        ✕
      </button>
    </h2>

    <draggable
      v-if="editMode"
      tag="div"
      :class="gridClasses"
      :list="items"
      :group="{ name: 'services' }"
      item-key="id"
      handle=".service-drag-handle"
      :animation="150"
      ghost-class="opacity-40"
      :data-group-index="groupIndex ?? 0"
      @end="onServiceDragEnd"
    >
      <template #item="{ element, index }">
        <div class="relative">
          <span
            class="service-drag-handle absolute top-2 left-2 z-10 cursor-grab select-none text-fg-dimmed hover:text-fg"
            title="Drag to reorder"
          >
            ⠿
          </span>
          <Item v-bind="element" :group-index="groupIndex" :index="index" />
          <button
            class="absolute top-2 right-2 w-6 h-6 rounded-full bg-fg/10 text-fg-dimmed text-sm hover:bg-red-500 hover:text-white transition-colors"
            title="Delete service"
            @click="deleteService(groupIndex ?? null, index)"
          >
            ✕
          </button>
        </div>
      </template>
      <template #footer>
        <button
          class="flex items-center justify-center min-h-24 rounded-2xl border-2 border-dashed border-fg/15 text-fg-dimmed hover:border-fg/30 hover:text-fg transition-all"
          @click="addService(groupIndex ?? null)"
        >
          + Add service
        </button>
      </template>
    </draggable>

    <div v-else :class="gridClasses">
      <Item
        v-for="item in items"
        :key="item.id"
        v-bind="item"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import type { Layout, Service } from '~/types'

export interface Props {
  title?: string
  items: Service[]
  grid: Layout['grid']
  groupIndex?: number
}

const props = defineProps<Props>()

const { editMode, addService, deleteService, deleteGroup, renameGroup, moveService } = useAdmin()

function onServiceDragEnd(event: { from: HTMLElement, to: HTMLElement, oldIndex: number, newIndex: number }) {
  const fromGroup = Number(event.from.dataset.groupIndex)
  const toGroup = Number(event.to.dataset.groupIndex)

  if (fromGroup === toGroup && event.oldIndex === event.newIndex) {
    return
  }

  // vuedraggable already moved the item in the bound lists; just persist.
  moveService(fromGroup, event.oldIndex, toGroup, event.newIndex)
}

const groupTitleDraft = ref(props.title ?? '')
watch(() => props.title, (value) => {
  groupTitleDraft.value = value ?? ''
})

function onDeleteGroup() {
  if (props.groupIndex == null) {
    return
  }

  // eslint-disable-next-line no-alert
  if (confirm(`Delete group "${props.title}" and its ${props.items.length} services?`)) {
    deleteGroup(props.groupIndex)
  }
}

async function commitGroupTitle() {
  const value = groupTitleDraft.value.trim()

  if (props.groupIndex == null || !value || value === (props.title ?? '')) {
    return
  }

  try {
    await renameGroup(props.groupIndex, value)
  } catch (e: any) {
    groupTitleDraft.value = props.title ?? ''
    // eslint-disable-next-line no-alert
    alert(e?.data?.statusMessage || e?.statusMessage || 'Rename failed')
  }
}

const gridClasses = computed(() => [
  'grid',
  'grid-cols-1',
  `sm:grid-cols-${props.grid.small}`,
  `md:grid-cols-${props.grid.medium}`,
  `lg:grid-cols-${props.grid.large}`,
  `xl:grid-cols-${props.grid.xlarge}`,
  'gap-1',
  'lg:gap-2',
  'lg:gap-y-4',
])
</script>
