import { io, Socket } from "socket.io-client";

const normalizeUrl = (value: string): string => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `https://${value}`;
};

const serverUrl = normalizeUrl(
  import.meta.env.VITE_SERVER_URL || "http://localhost:4000",
);
let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
    });
  }
  return socket;
};
