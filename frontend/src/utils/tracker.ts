import { sendAnalyticsEvent } from "../api/analytics.api";
import type { UserEventPayload } from "../types/analytics";

const SESSION_STORAGE_KEY = "ximi_session_id";

/**
 * Lấy hoặc khởi tạo session_id định danh phiên làm việc của khách
 */
export const getOrCreateSessionId = (): string => {
  try {
    let sess = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sess) {
      sess = `sess_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
      localStorage.setItem(SESSION_STORAGE_KEY, sess);
    }
    return sess;
  } catch {
    return `sess_fallback_${Date.now()}`;
  }
};

/**
 * Gửi sự kiện tracking hành vi người dùng (Fire-and-forget, không bao giờ làm gián đoạn UI)
 */
export const trackEvent = async (
  eventType: UserEventPayload["event_type"],
  options?: Omit<UserEventPayload, "event_type" | "session_id">
): Promise<void> => {
  try {
    const payload: UserEventPayload = {
      event_type: eventType,
      session_id: getOrCreateSessionId(),
      ...options,
    };
    // Non-blocking fire-and-forget
    sendAnalyticsEvent(payload).catch(() => {
      // Intentionally suppressed in production
    });
  } catch {
    // Suppress local tracking errors
  }
};

