<template>
<q-page class="flex flex-center">
    <div v-if="loggedUser !== null" class="height-100" style="width: 700px;">
        <div class="text-h4 q-mb-xl">Hi, {{ loggedUser.user_name }}</div>
        <div class="text-h5 q-mb-lg">Send message to:</div>
        <q-markup-table style="width: 100%;">
            <tbody>
                <tr v-for="f in getFriends" :key="f.user_id" class="cursor-pointer" @click="openChatbox(f)">
                    <td>{{ f.user_name }}</td>
                </tr>
            </tbody>
        </q-markup-table>
    </div>
</q-page>

<q-dialog v-model="showUserLogin" persistent>
    <q-card>
        <q-card-section>
            <div class="text-h6">Login</div>
        </q-card-section>

        <q-separator />

        <q-card-section style="max-height: 50vh; width: 500px;" class="scroll">
            <q-option-group
                v-model="selectedUser"
                :options="userOptions"
                color="primary"
            />
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
            <q-btn flat label="Login" color="primary" @click="login()" />
        </q-card-actions>
    </q-card>
</q-dialog>

<q-dialog v-model="showChatbox" persistent>
    <q-card>
        <q-card-section class="row items-center">
            <div class="text-h6">{{ getPeerName }}</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section style="max-height: 50vh; width: 500px;" class="scroll" ref="scroller">
            <div v-for="(m, idx) in messages" :key="idx" class="q-mb-md flex" :class="getMsgClass(m.sender)">
                <q-card flat :bordered="currentUser(m.sender) ? false : true" :class="currentUser(m.sender) ? 'bg-grey-3' : ''">
                    <q-card-section>
                        {{ m.msg_details.msg }}
                    </q-card-section>
                </q-card>
            </div>
        </q-card-section>
        <q-card-section>
            <div v-if="isTyping" class="q-mb-md">
                <q-spinner-dots color="primary" size="2.5em" /> <span class="q-ml-sm text-grey-6">{{ getPeerName }} typing ...</span>
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
</q-dialog>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { _getUsers, _getConversation, _sendMessage, _getMessages } from '/src/queries/message'
import { scroll } from 'quasar'

const WS_URL = 'ws://localhost:5000'

const showUserLogin = ref(false)
const users = ref([])
const userOptions = ref([])
const selectedUser = ref(null)
const loggedUser = ref(null)

const status = ref('disconnected')
let ws = null

const showChatbox = ref(false)
const msg = ref('')
const selectedPeer = ref(null)
const convo = ref(null)

const messages = ref([])

const scroller = ref(null)

let inputTO = null
let showTypingTO = null
let lastTypingSentAt = 0

const isTyping = ref(false)

const test2 = ref(0)

const login = () => {
    if (selectedUser.value === null) {
        alert('Please select a user!')

        return
    }

    loggedUser.value = users.value.find((i) => {
        return i.user_id === selectedUser.value
    })

    connectWS()

    showUserLogin.value = false
}

function connectWS() {
    status.value = 'connecting'

    ws = new WebSocket(WS_URL)

    ws.addEventListener('open', () => {
        status.value = 'connected'
        
        // "Login" to WS with your username
        ws.send(JSON.stringify({ type: 'auth', user: loggedUser.value.user_id }))
    })

    ws.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data)

            if (data.type === 'dm') {
                const m = data.payload

                if (m.conv_id === convo.value.id) {
                    const _msg = {
                        msg_id: m.msg_id,
                        conv_id: m.conv_id,
                        msg_details: m.msg,
                        msg_time: m.msg_time,
                        sender: m.sender,
                    }

                    messages.value.push(_msg)

                    scrollToBottom()
                }
            }

            if (data.type === 'typing') {
                const m = data.payload

                if (m.conv_id === convo.value.id) {
                    isTyping.value = m.status

                    //Preventing typing status to be always on
                    if (m.status) {
                        clearTimeout(showTypingTO)

                        showTypingTO = setTimeout(() => {
                            isTyping.value = false
                        }, 2000)
                    }
                }
            }
        } catch {
        // ignore
        }
    })

    ws.addEventListener('close', () => {
        status.value = 'disconnected'

        setTimeout(connectWS, 800)
    })

    ws.addEventListener('error', () => ws.close())
}

const openChatbox = async (peer) => {
    selectedPeer.value = peer

    const result = await _getConversation(loggedUser.value.user_id, selectedPeer.value.user_id)

    convo.value = result.data.convo

    const result2 = await _getMessages(convo.value.id)

    const oldMsgs = result2.data.messages

    oldMsgs.sort((a, b) => a.msg_id - b.msg_id)

    messages.value = oldMsgs

    showChatbox.value = true

    scrollToBottom()
}

const send = async () => {
    if (msg.value.trim() === '') return

    const msg_details = {
        msg: msg.value
    }
    
    await _sendMessage(convo.value, loggedUser.value.user_id, msg_details)

    //console.log(result)

    //Reset
    msg.value = ''
}

const getMsgClass = (sender) => {
    return (sender === loggedUser.value.user_id) ? 'justify-end you' : 'justify-start peer'
}

const currentUser = (sender) => {
    return sender === loggedUser.value.user_id
}

const scrollToBottom = () => {
    nextTick(() => {
        const el = scroller.value.$el
        const target = el.scrollHeight

        scroll.setVerticalScrollPosition(el, target, 50)
    })
}

const handleKeydown = (event) => {
  if (event.key !== "Enter") {
    onInputTyping()
  } else {
    send()
  }
}

const onInputTyping = () => {
    const now = Date.now();

    //Throttle
    if (now - lastTypingSentAt > 500) {
        sendTypingStatus(true)
        lastTypingSentAt = now
    }

    // If user stops typing for 900ms, send "false"
    clearTimeout(inputTO)

    //Send false status after 900ms
    inputTO = setTimeout(() => {
        sendTypingStatus(false);
    }, 900)
}

const sendTypingStatus = (status) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    if (selectedPeer.value === null) return

    ws.send(
        JSON.stringify({
            type: 'typing',
            peer: selectedPeer.value.user_id,
            status,
            conv_id: convo.value.id
        })
    )
}

//--------------
//COMPUTED
//--------------

const getFriends = computed(() => {
    if (loggedUser.value === null) return users.value
    
    return users.value.filter((i) => {
        return i.user_id !== loggedUser.value.user_id
    })    
})

const getPeerName = computed(() => {
    return selectedPeer.value ? selectedPeer.value.user_name : ''
})

onMounted(async () => {
    showUserLogin.value = true

    const result = await _getUsers()

    users.value = result.data.users

    userOptions.value = result.data.users.map((o) => {
        return {
            value: o.user_id,
            label: o.user_name,
        }
    })
})
</script>
  
<style scoped>
.you {
    margin-left: 50px;
}

.peer {
    margin-right: 50px;
}
</style>