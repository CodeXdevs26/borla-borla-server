type IOptions = {
  page?: number;
  limit?: number;
  sort?: string;
};

type IOptionResult = {
  page: number;
  limit: number;
  skip: number;
  sort: string;
};

const calculatePagination = (options: IOptions): IOptionResult => {
  const page = Number(options?.page) || 1;
  const limit = Number(options?.limit) || 10;
  const skip = Number((page - 1) * limit);
  const sort = options?.sort || 'createdAt';

  return {
    page,
    limit,
    skip,
    sort,
  };
};

export const paginationHelper = { calculatePagination };
