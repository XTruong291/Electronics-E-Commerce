import axiosClient from "./axiosClient";
import type {
  Category,
  CategoryCreatePayload,
  CategoryUpdatePayload,
  CommonMessageResponse,
  Product,
  ProductCreatePayload,
  ProductFilterParams,
  ProductListResponse,
  ProductUpdatePayload,
  UploadImageResponse,
} from "../types/catalog";

// ================= CATEGORIES API =================

export const getCategories = async (
  include_inactive: boolean = false
): Promise<Category[]> => {
  return (await axiosClient.get("/categories", {
    params: { include_inactive },
  })) as unknown as Category[];
};

export const getCategory = async (
  idOrSlug: string | number
): Promise<Category> => {
  return (await axiosClient.get(
    `/categories/${idOrSlug}`
  )) as unknown as Category;
};

export const createCategory = async (
  payload: CategoryCreatePayload
): Promise<Category> => {
  return (await axiosClient.post(
    "/categories",
    payload
  )) as unknown as Category;
};

export const updateCategory = async (
  id: number,
  payload: CategoryUpdatePayload
): Promise<Category> => {
  return (await axiosClient.put(
    `/categories/${id}`,
    payload
  )) as unknown as Category;
};

export const deleteCategory = async (
  id: number
): Promise<CommonMessageResponse> => {
  return (await axiosClient.delete(
    `/categories/${id}`
  )) as unknown as CommonMessageResponse;
};

// ================= PRODUCTS API =================

export const getProducts = async (
  params?: ProductFilterParams
): Promise<ProductListResponse> => {
  return (await axiosClient.get("/products", {
    params,
  })) as unknown as ProductListResponse;
};

export const getProduct = async (
  idOrSlug: string | number
): Promise<Product> => {
  return (await axiosClient.get(
    `/products/${idOrSlug}`
  )) as unknown as Product;
};

export const createProduct = async (
  payload: ProductCreatePayload
): Promise<Product> => {
  return (await axiosClient.post(
    "/products",
    payload
  )) as unknown as Product;
};

export const updateProduct = async (
  id: number,
  payload: ProductUpdatePayload
): Promise<Product> => {
  return (await axiosClient.put(
    `/products/${id}`,
    payload
  )) as unknown as Product;
};

export const deleteProduct = async (
  id: number
): Promise<CommonMessageResponse> => {
  return (await axiosClient.delete(
    `/products/${id}`
  )) as unknown as CommonMessageResponse;
};

// ================= UPLOAD MEDIA API =================

export const uploadProductImage = async (
  file: File
): Promise<UploadImageResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  return (await axiosClient.post("/upload/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })) as unknown as UploadImageResponse;
};

