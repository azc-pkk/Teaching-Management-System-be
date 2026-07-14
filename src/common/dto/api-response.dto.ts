export type ApiError = {
  code: string;
  message: string;
<<<<<<< HEAD
  details?: string[];
=======
  details?: unknown;
>>>>>>> 0de8e26c4ebbd09cb7820d60e5fd8d4df61fe2f3
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
