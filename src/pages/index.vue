<template>
  <Group
    v-for="(group, key) in $services"
    :key="key"
    v-bind="{ ...group, grid: $settings.layout.grid }"
    :group-index="key"
  />
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
const { $services, $settings } = useNuxtApp()
const { editMode, addGroup } = useAdmin()

if ($settings.error) {
  throw createError({
    message: $settings.error,
  })
}
</script>
