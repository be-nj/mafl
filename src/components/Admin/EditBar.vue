<template>
  <ClientOnly>
    <div class="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      <template v-if="mayEdit">
        <button
          class="px-3 py-2 rounded-xl text-sm font-medium bg-fg/10 hover:bg-fg/15 transition-all"
          @click="editMode = !editMode"
        >
          {{ editMode ? 'Done' : 'Edit' }}
        </button>
        <button
          class="px-3 py-2 rounded-xl text-sm font-medium bg-fg/5 hover:bg-fg/10 transition-all"
          @click="leave"
        >
          Logout
        </button>
      </template>

      <template v-else>
        <button
          v-if="!show"
          class="px-3 py-2 rounded-xl text-sm font-medium bg-fg/5 hover:bg-fg/10 transition-all opacity-60 hover:opacity-100"
          @click="show = true"
        >
          Admin
        </button>
        <form v-else class="flex items-center gap-1" @submit.prevent="submit">
          <input
            v-model="token"
            type="password"
            placeholder="Admin token"
            class="px-3 py-2 rounded-xl text-sm bg-fg/10 focus:outline-none"
            autofocus
          >
          <button
            type="submit"
            class="px-3 py-2 rounded-xl text-sm font-medium bg-fg/10 hover:bg-fg/15 transition-all"
          >
            Unlock
          </button>
        </form>
      </template>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
const { mayEdit, editMode, enter, leave, verify } = useAdmin()

const show = ref(false)
const token = ref('')

async function submit() {
  const ok = await enter(token.value)

  token.value = ''
  show.value = false

  if (!ok) {
    // eslint-disable-next-line no-alert
    alert('Invalid admin token')
  }
}

onMounted(verify)
</script>
