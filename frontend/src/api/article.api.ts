import axiosClient from "./axiosClient";
import type {
  Article,
  ArticleCreatePayload,
  ArticleFilterParams,
  ArticleListResponse,
  ArticleUpdatePayload,
} from "../types/article";

export const getArticles = async (
  params?: ArticleFilterParams
): Promise<ArticleListResponse> => {
  return (await axiosClient.get("/articles", {
    params,
  })) as unknown as ArticleListResponse;
};

export const getArticleDetail = async (
  idOrSlug: string | number
): Promise<Article> => {
  return (await axiosClient.get(
    `/articles/${idOrSlug}`
  )) as unknown as Article;
};

export const createArticle = async (
  payload: ArticleCreatePayload
): Promise<Article> => {
  return (await axiosClient.post(
    "/articles",
    payload
  )) as unknown as Article;
};

export const updateArticle = async (
  articleId: number,
  payload: ArticleUpdatePayload
): Promise<Article> => {
  return (await axiosClient.put(
    `/articles/${articleId}`,
    payload
  )) as unknown as Article;
};

export const deleteArticle = async (
  articleId: number
): Promise<{ message: string }> => {
  return (await axiosClient.delete(
    `/articles/${articleId}`
  )) as unknown as { message: string };
};

