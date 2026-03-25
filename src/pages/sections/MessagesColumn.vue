<template>
    <div style="height: 100%">
        <q-card v-if="selectedPeer !== null" class="full-height column justify-center">
            <q-card-section class="row items-center chat-title">
                <div class="text-h6">{{ getPeerName }}</div>
            </q-card-section>

            <q-card-section class="scroll chatbox-inner chat-content" ref="scroller">
                <div
                    v-for="(m, idx) in messages"
                    :key="idx"
                    class="q-mb-md flex"
                    :class="getMsgClass(m.sender)"
                >
                    <q-card
                        flat
                        :bordered="currentUser(m.sender) ? false : true"
                        :class="currentUser(m.sender) ? 'bg-grey-3' : ''"
                    >
                        <q-card-section>
                            {{ m.msg_details.msg }}
                        </q-card-section>
                    </q-card>
                </div>
            </q-card-section>
            <q-card-section class="chat-controls" style="margin-top: auto">
                <div v-if="isTyping" class="q-mb-md">
                    <q-spinner-dots color="primary" size="2.5em" />
                    <span class="q-ml-sm text-grey-6">{{ getPeerName }} typing ...</span>
                </div>
                <div class="text-right flex items-center">
                    <q-input
                        outlined
                        v-model="msg"
                        label="Type message..."
                        class="q-mr-md"
                        style="width: calc(100% - 86px)"
                        @keydown="handleKeydown"
                    />
                    <q-btn label="Send" color="primary" @click="send" />
                </div>
            </q-card-section>
        </q-card>

        <div v-else>
            <div class="flex flex-center q-pa-xl">
                <div class="text-h6">Select a friend to start a conversation</div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { _getConversation, _sendMessage, _getMessages } from '/src/queries/message'
import { scroll } from 'quasar'

const props = defineProps({
    selectedPeer: {
        type: Object
    },
    loggedUser: {
        type: Object
    },
    isTyping: {
        type: Boolean
    }
})

const emit = defineEmits(['sendTypingStatus'])

const convo = defineModel('convo')

const msg = ref('')
const messages = ref([])

let inputTO = null
let showTypingTO = null
let lastTypingSentAt = 0

const scroller = ref(null)

const retrieveConvo = async () => {
    if (props.selectedPeer === null) return

    try {
        const result = await _getConversation(props.loggedUser.user_id, props.selectedPeer.user_id)

        convo.value = result.data.convo

        const result2 = await _getMessages(result.data.convo.id)

        const oldMsgs = result2.data.messages

        oldMsgs.sort((a, b) => a.msg_id - b.msg_id)

        messages.value = oldMsgs
    } catch (error) {
        console.log(error)
        alert('Error fetching conversation. Please refresh the page.')

        return
    }

    scrollToBottom()
}

const scrollToBottom = () => {
    nextTick(() => {
        const el = scroller.value.$el
        const target = el.scrollHeight

        scroll.setVerticalScrollPosition(el, target, 50)
    })
}

const handleKeydown = (event) => {
    if (event.key !== 'Enter') {
        onInputTyping()
    } else {
        send()
    }
}

const onInputTyping = () => {
    const now = Date.now()

    //Throttle
    if (now - lastTypingSentAt > 500) {
        sendTypingStatus(true)
        lastTypingSentAt = now
    }

    // If user stops typing for 900ms, send "false"
    clearTimeout(inputTO)

    //Send false status after 900ms
    inputTO = setTimeout(() => {
        sendTypingStatus(false)
    }, 900)
}

const sendTypingStatus = (_status) => {
    emit('sendTypingStatus', { status: _status })
}

const send = async () => {
    if (msg.value.trim() === '') return

    const msg_details = {
        msg: msg.value
    }

    try {
        const result = await _sendMessage(props.convo, props.loggedUser.user_id, msg_details)

        if (result.data.status === 'error') {
            alert(result.data.error_msg)
        }

        //console.log(result)

        //Reset
        msg.value = ''
    } catch (error) {
        alert('Error sending message. Please refresh the page.')
    }
}

const displayMessage = (message) => {
    messages.value.push(message)

    scrollToBottom()
}

const getMsgClass = (sender) => {
    return sender === props.loggedUser.user_id ? 'justify-end you' : 'justify-start peer'
}

const currentUser = (sender) => {
    return sender === props.loggedUser.user_id
}

//COMPUTED
const getPeerName = computed(() => {
    return props.selectedPeer ? props.selectedPeer.user_name : ''
})

defineExpose({
    retrieveConvo,
    displayMessage
})
</script>

<style lang="scss" scoped>
.you {
    margin-left: 50px;
}

.peer {
    margin-right: 50px;
}

.q-card {
    .chat-title {
        border-bottom: 1px solid #ddd;
    }

    .chat-content {
        flex: 1;
    }

    //.chat-controls {
    //}
}
</style>
