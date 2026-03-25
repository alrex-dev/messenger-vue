import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    // Add your state properties here
    sessionToken: "",
    guestToken: "",
    user: null,
  }),

  getters: {
    // Add your getters here
    //doubleCounter: (state) => state.counter * 2,
  },

  actions: {
    // Add your actions here
    getToken() {
      const _localStorage =
        localStorage.getItem("messengerSessionToken") === null
          ? ""
          : localStorage.getItem("messengerSessionToken");

      return this.sessionToken === "" ? _localStorage : this.sessionToken;
    },

    setToken(token) {
      this.sessionToken = token;

      // Optionally, you can also set the token in localStorage or cookies for persistence
      localStorage.setItem("messengerSessionToken", token);
    },

    getGuestToken() {
      const _localStorage =
        localStorage.getItem("messengerGuestToken") === null
          ? ""
          : localStorage.getItem("messengerGuestToken");

      return this.guestToken === "" ? _localStorage : this.guestToken;
    },

    setGuestToken(token) {
      this.guestToken = token;

      // Optionally, you can also set the token in localStorage or cookies for persistence
      localStorage.setItem("messengerGuestToken", token);
    },
  },
});
