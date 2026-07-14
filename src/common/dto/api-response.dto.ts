export type ApiError = {
  code: string;
  message: string;
  details?: string[];
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  error: null;
};

export type ApiErrorResponse = {
  success: false;
  data: null;
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PageResult<T> = {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
};
