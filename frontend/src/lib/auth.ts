export const authStorage = {
  getToken: () => typeof window !== "undefined" ? localStorage.getItem("token") : null,
  setToken: (token: string) => typeof window !== "undefined" ? localStorage.setItem("token", token) : null,
  clearToken: () => typeof window !== "undefined" ? localStorage.removeItem("token") : null,
};
