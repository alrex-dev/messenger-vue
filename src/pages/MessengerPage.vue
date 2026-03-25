<template>
    <q-page>
        <div style="height: calc(100vh - 50px)">
            <q-splitter v-model="splitterModel" style="height: 100%">
                <template v-slot:before>
                    <div class="q-pa-md full-height">
                        <friends-column
                            :logged-user="loggedUser"
                            v-model:is-ready="isReady"
                            @get-convo="getConvo"
                            ref="friendsColumn"
                        />
                    </div>
                </template>

                <template v-slot:after>
                    <div class="q-pa-md full-height">
                        <MessagesColumn
                            v-model:convo="convo"
                            :selected-peer="selectedPeer"
                            :logged-user="loggedUser"
                            :is-typing="isTyping"
                            @send-typing-status="sendTypingStatus"
                            ref="messagesColumn"
                        />
                    </div>
                </template>
            </q-splitter>
        </div>
    </q-page>

    <!--User Entry-->
    <q-dialog v-model="showUserForm" persistent>
        <q-card>
            <q-card-section>
                <div class="text-h6">Create New User</div>
            </q-card-section>

            <q-separator />

            <q-card-section style="max-height: 50vh" class="scroll chatbox-inner">
                <q-input
                    outlined
                    v-model="userName"
                    label="Enter user name"
                    @keydown.enter="createUser()"
                />
            </q-card-section>

            <q-separator />

            <q-card-actions align="right">
                <q-btn flat label="Cancel" color="primary" v-close-popup />
                <q-btn flat label="Create" color="primary" @click="createUser()" />
            </q-card-actions>

            <q-inner-loading :showing="addingUser" color="primary" />
        </q-card>
    </q-dialog>

    <!--Login Screen-->
    <q-dialog v-model="showUserLogin" persistent>
        <q-card>
            <q-card-section>
                <div class="text-h6">Login</div>
            </q-card-section>

            <q-separator />

            <q-card-section style="max-height: 50vh" class="scroll chatbox-inner">
                <q-select
                    outlined
                    v-model="selectedUser"
                    :options="userOptions"
                    label="Select User or create one"
                    @update:model-value="onSelectUser"
                >
                    <template v-slot:option="scope">
                        <q-item v-bind="scope.itemProps">
                            <q-item-section>
                                <q-item-label :class="{ 'text-primary': scope.opt.value === -1 }">{{
                                    scope.opt.label
                                }}</q-item-label>
                            </q-item-section>
                        </q-item>
                    </template>
                </q-select>
            </q-card-section>

            <q-separator />

            <q-card-actions align="right">
                <q-btn flat label="Login" color="primary" @click="login()" />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import {
    _getUsers,
    _getConversation,
    _sendMessage,
    _getMessages,
    _createUser,
    _login,
    _getGuestToken,
    _checkGuestToken
} from '/src/queries/message'
import { scroll } from 'quasar'
import { useAppStore } from '/src/stores/app'

import FriendsColumn from './sections/FriendsColumn.vue'
import MessagesColumn from './sections/MessagesColumn.vue'

const WS_URL = process.env.WS_URL

//console.log(process.env.WS_URL);

const appStore = useAppStore()

const splitterModel = ref(30)
const isReady = ref(false)

const showUserLogin = ref(false)
const userOptions = ref([])
const selectedUser = ref(null)
const loggedUser = ref(null)

const status = ref('disconnected')
let ws = null

const selectedPeer = ref(null)
const convo = ref(null)

const isTyping = ref(false)

const showUserForm = ref(false)
const userName = ref('')

const addingUser = ref(false)

const nameRegex = /^[\p{L}][\p{L}\s'-]{1,49}$/u

const friendsColumn = ref(null)
const messagesColumn = ref(null)

const onSelectUser = (val) => {
    if (val.value === -1) {
        showUserForm.value = true
        selectedUser.value = null
        userName.value = ''
    }
}

const createUser = async () => {
    const user_name = userName.value.trim()

    if (user_name === '') {
        alert('User name cannot be empty!')

        return
    }

    if (!nameRegex.test(user_name)) {
        alert(
            'Invalid user name! User name should be 2-50 characters long and can only contain letters, spaces, apostrophes, and hyphens.'
        )

        return
    }

    addingUser.value = true

    try {
        const result = await _createUser(user_name)

        if (result.data.status === 'error') {
            alert(result.data.error_msg || 'Error creating user. Please try again.')

            return
        }

        //update list
        const updatedUsers = await _getUsers()

        prepareUserOptions(updatedUsers.data.users)

        selectedUser.value = { value: result.data.user_id, label: user_name }

        showUserForm.value = false

        login()
    } catch (error) {
        alert('Error creating user. Please try again.')
    } finally {
        addingUser.value = false
    }
}

const login = async () => {
    if (selectedUser.value === null) {
        alert('Please select a user!')

        return
    }

    const result = await _login(selectedUser.value.value, selectedUser.value.label)

    if (result.data.status === 'error') {
        alert(result.data.error_msg || 'Error logging in. Please try again.')

        return
    } else {
        appStore.setToken(result.data.token)
    }

    //loggedUser.value = users.value.find((i) => {
    //  return i.user_id === selectedUser.value.value;
    //});

    loggedUser.value = {
        user_id: selectedUser.value.value,
        user_name: selectedUser.value.label
    }

    connectWS()

    showUserLogin.value = false
}

function connectWS() {
    status.value = 'connecting'

    const token = appStore.getToken()

    //Need to pass token to backend websocket
    ws = new WebSocket(WS_URL + `?token=${token}`)

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
                        sender: m.sender
                    }

                    messagesColumn.value.displayMessage(_msg)
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

const getConvo = async (data) => {
    selectedPeer.value = data.peer

    nextTick(async () => {
        await messagesColumn.value.retrieveConvo()
    })
}

const sendTypingStatus = (params) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    if (selectedPeer.value === null) return

    const _msg = {
        type: 'typing',
        peer: selectedPeer.value.user_id,
        status: params.status,
        conv_id: convo.value.id
    }

    ws.send(JSON.stringify(_msg))
}

const prepareUserOptions = (_users) => {
    userOptions.value = _users.map((o) => {
        return {
            value: o.user_id,
            label: o.user_name
        }
    })

    userOptions.value.push({
        value: -1,
        label: 'Create New User'
    })
}

//--------------
//COMPUTED
//--------------

onMounted(async () => {
    showUserLogin.value = true

    const guestToken = appStore.getGuestToken()

    if (!guestToken) {
        const result = await _getGuestToken()

        appStore.setGuestToken(result.data.token)
    } else {
        const result = await _checkGuestToken(guestToken)

        if (result.data.status === 'success') {
            appStore.setGuestToken(result.data.token)
        }
    }

    const result2 = await _getUsers()

    prepareUserOptions(result2.data.users)

    isReady.value = true
})
</script>

<style scoped>
.chatbox-inner {
    width: 350px;
}

.listing-cont {
    width: 350px;
}

@media (min-width: 768px) {
    .chatbox-inner {
        width: 500px;
    }

    .listing-cont {
        width: 700px;
    }
}
</style>
