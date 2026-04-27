import axiosInstance from '../axios';
import { API_ENDPOINTS } from '../endpoints';

export interface ChatSession {
  uuid: string;
  name: string;
  updated_at: string;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const chatService = {
  getChats: async (): Promise<ChatSession[]> => {
    const response = await axiosInstance.get(API_ENDPOINTS.CHAT.HISTORY);
    return response.data;
  },

  getChatMessages: async (uuid: string): Promise<{ chat_uuid: string; name: string; messages: ChatMessage[] }> => {
    const response = await axiosInstance.get(API_ENDPOINTS.CHAT.HISTORY_DETAIL(uuid));
    return response.data;
  },
};

export const streamChatWS = (
  question: string,
  chatUuid: string | null,
  onToken: (chunk: string) => void,
  onDone: (chatUuid: string) => void,
  onError: (msg: string) => void,
): Promise<void> => {
  return new Promise((resolve) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      onError('No authentication token found. Please log in again.');
      resolve();
      return;
    }

    // Derive WebSocket URL from VITE_API_URL:
    //   http://localhost:4000  →  ws://localhost:4000/ws/chat/  (Vite proxy → Django :8000)
    //   https://api.example.com  →  wss://api.example.com/ws/chat/
    // @ts-ignore
    const apiUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl =
      apiUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:') +
      `/ws/chat/?token=${encodeURIComponent(token)}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      onError('Could not open WebSocket connection.');
      resolve();
      return;
    }

    ws.onopen = () => {
      ws.send(JSON.stringify({ question, chat_uuid: chatUuid }));
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          content?: string;
          chat_uuid?: string;
        };
        if (msg.type === 'token' && msg.content !== undefined) {
          onToken(msg.content);
        } else if (msg.type === 'done' && msg.chat_uuid !== undefined) {
          onDone(msg.chat_uuid);
        } else if (msg.type === 'error' && msg.content !== undefined) {
          onError(msg.content);
        }
      } catch {
        // skip malformed frames
      }
    };

    // Server closes after sending 'done'; resolve here so sendMessage() can return.
    ws.onclose = () => resolve();

    ws.onerror = () => {
      onError('WebSocket connection error. Make sure the server is running with Daphne/ASGI.');
    };
  });
};
