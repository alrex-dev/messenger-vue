import { api } from 'boot/axios'

export const _getUsers = async () => {
    const result = await api.get('/users')

    return result
}

export const _getConversation = async (user1, user2) => {
    const result = await api.get(`/convo/${user1}/${user2}`)

    return result
}

export const _getMessages = async (convo) => {
    const result = await api.get(`/messages/${convo}`)

    return result
}

export const _sendMessage = async (convo, sender, msg) => {
    const result = await api.post('/send', {
        convo,
        sender,
        msg
    })

    return result
}