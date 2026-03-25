<template>
    <div v-if="loggedUser !== null" class="height-100">
        <div class="text-h4 q-mb-xl">Hi, {{ loggedUser.user_name }}</div>
        <div class="text-h5 q-mb-lg">Your friends:</div>
        <q-markup-table style="width: 100%">
            <tbody>
                <tr
                    v-for="f in getFriends"
                    :key="f.user_id"
                    class="cursor-pointer"
                    :class="{
                        'bg-primary text-white text-bold': f.user_id === selectedPeer?.user_id
                    }"
                    @click="getConvo(f)"
                >
                    <td>{{ f.user_name }}</td>
                </tr>
            </tbody>
        </q-markup-table>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { _getUsers } from '/src/queries/message'

const props = defineProps({
    loggedUser: {
        type: Object
    }
})

const emit = defineEmits(['getConvo'])

const isReady = defineModel('isReady')

const users = ref([])
//const status = ref('')
const selectedPeer = ref(null)

const getConvo = async (peer) => {
    selectedPeer.value = peer

    emit('getConvo', { peer })
}

//--------------
//COMPUTED
//--------------

const getFriends = computed(() => {
    if (props.loggedUser === null) return users.value

    return users.value.filter((i) => {
        return i.user_id !== props.loggedUser.user_id
    })
})

watch(
    () => isReady.value,
    async (newVal) => {
        if (newVal) {
            const result = await _getUsers()

            users.value = result.data.users
        }
    }
)
</script>
