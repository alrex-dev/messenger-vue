import { api } from "boot/axios";
import { useAppStore } from "src/stores/app";

const appStore = useAppStore();

export const _getUsers = async () => {
  const token = appStore.getGuestToken();
  const result = await api.get("/users", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return result;
};

export const _getConversation = async (user1, user2) => {
  const token = appStore.getToken();
  const result = await api.get(`/convo/${user1}/${user2}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return result;
};

export const _getMessages = async (convo) => {
  const token = appStore.getToken();
  const result = await api.get(`/messages/${convo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return result;
};

export const _sendMessage = async (convo, sender, msg) => {
  const token = appStore.getToken();
  const result = await api.post(
    "/send",
    {
      convo,
      sender,
      msg,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return result;
};

export const _createUser = async (user_name) => {
  const token = appStore.getGuestToken();
  const result = await api.post(
    "/create_user",
    {
      user_name,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return result;
};

export const _login = async (user_id, user_name) => {
  const result = await api.post("/login", {
    user_id,
    user_name,
  });

  return result;
};

export const _getGuestToken = async () => {
  const result = await api.get("/guest_token");

  return result;
};

export const _checkGuestToken = async (token) => {
  const result = await api.post("/check_guest_token", {
    token,
  });

  return result;
};
