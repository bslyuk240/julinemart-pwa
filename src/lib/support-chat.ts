// Lets any button open the support chat (SupportChatWidget listens for this),
// e.g. the phone homepage's top-bar button, where the floating button is hidden.
export const OPEN_SUPPORT_CHAT_EVENT = 'jm:open-support-chat';

export function openSupportChat() {
  window.dispatchEvent(new Event(OPEN_SUPPORT_CHAT_EVENT));
}
