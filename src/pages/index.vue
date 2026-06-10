<template>
  <draggable
    v-if="editMode"
    tag="div"
    :list="$services"
    item-key="title"
    handle=".group-drag-handle"
    :animation="150"
    @end="onGroupDragEnd"
  >
    <template #item="{ element, index }">
      <Group v-bind="{ ...element, grid: $settings.layout.grid }" :group-index="index" />
    </template>
  </draggable>
  <template v-else>
    <Group
      v-for="(group, key) in $services"
      :key="key"
      v-bind="{ ...group, grid: $settings.layout.grid }"
      :group-index="key"
    />
  </template>
  <button
    v-if="editMode"
    class="my-6 w-full py-3 rounded-2xl border-2 border-dashed border-fg/15 text-fg-dimmed hover:border-fg/30 hover:text-fg transition-all"
    @click="addGroup"
  >
    + Add group
  </button>
  <Update v-if="$settings.checkUpdates" />
  <AdminEditBar />
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'

const { $services, $settings } = useNuxtApp()
const { editMode, addGroup, moveGroup } = useAdmin()

function onGroupDragEnd(event: { oldIndex: number, newIndex: number }) {
  if (event.oldIndex === event.newIndex) {
    return
  }

  // vuedraggable already reordered $services; just persist.
  moveGroup(event.oldIndex, event.newIndex)
}

if ($settings.error) {
  throw createError({
    message: $settings.error,
  })
}
</script>
