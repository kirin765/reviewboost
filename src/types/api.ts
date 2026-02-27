export type ApiMeta = {
  requestId?: string;
  route?: string;
  correlationId?: string;
};

export type ApiResponseEnvelope<TPayload> = {
  payload?: TPayload;
  meta?: ApiMeta;
};

export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    help?: string[];
    details?: string;
  };
  meta?: ApiMeta;
};

export type ApiRequestResult<TPayload> = ApiResponseEnvelope<TPayload> | ApiErrorEnvelope;

export type PaginatedResponse<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
};
