import axiosClient from "./axiosClient";
import type {
  AdminAIChatRequest,
  AdminAIChatResponse,
  AnalyticsOverviewResponse,
  GeminiInsightsResponse,
  UserEventPayload,
} from "../types/analytics";

/**
 * Ghi nhận sự kiện hành vi người dùng (Public)
 */
export const sendAnalyticsEvent = async (
  payload: UserEventPayload
): Promise<void> => {
  return await axiosClient.post("/analytics/events", payload);
};

/**
 * Lấy báo cáo tổng hợp hành vi người dùng & phễu chuyển đổi (Admin/Staff)
 */
export const getAnalyticsOverview = async (
  days: number = 30
): Promise<AnalyticsOverviewResponse> => {
  return await axiosClient.get("/admin/analytics/overview", {
    params: { days },
  });
};

/**
 * Yêu cầu Google Gemini AI phân tích dữ liệu và đưa ra khuyến nghị quản trị (Admin/Staff)
 */
export const getGeminiInsights = async (
  days: number = 30
): Promise<GeminiInsightsResponse> => {
  return await axiosClient.post(
    "/admin/analytics/ai-insights",
    {},
    {
      params: { days },
    }
  );
};

/**
 * Hỏi đáp tương tác đa lượt với Gemini Store Copilot (Admin/Staff)
 */
export const chatWithAIAdvisor = async (
  payload: AdminAIChatRequest
): Promise<AdminAIChatResponse> => {
  return await axiosClient.post("/admin/analytics/ai-chat", payload);
};

