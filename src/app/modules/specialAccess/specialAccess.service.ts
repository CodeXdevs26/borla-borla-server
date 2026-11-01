import prisma from 'app/shared/prisma';
import AppError from 'app/error/AppError';
import httpStatus from 'http-status';
import HashPassword from 'app/shared/hashPassword';
import {
  ICreateSpecialAccessUserPayload,
  IGetSpecialAccessUsersQuery,
  SPECIAL_ACCESS_TYPES,
  TSpecialAccessType,
} from './specialAccess.interface';

const isSpecialAccessType = (
  value: string | null | undefined,
): value is TSpecialAccessType =>
  !!value && SPECIAL_ACCESS_TYPES.includes(value as TSpecialAccessType);

const resolveAccountType = (
  accountType?: string | null,
  customerId?: string | null,
): TSpecialAccessType | null => {
  if (isSpecialAccessType(accountType)) return accountType;
  if (isSpecialAccessType(customerId)) return customerId;
  return null;
};

const createSpecialAccessUser = async (
  payload: ICreateSpecialAccessUserPayload,
) => {
  const normalizedEmail = payload.email.trim().toLowerCase();

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalizedEmail },
        ...(payload.phoneNumber ? [{ phoneNumber: payload.phoneNumber }] : []),
      ],
    },
    include: {
      verification: true,
    },
  });

  if (existingUser && !existingUser.isDeleted) {
    throw new AppError(httpStatus.CONFLICT, 'User already exists');
  }

  const hashedPassword = await HashPassword(payload.password);

  const userData = {
    name: payload.name,
    email: normalizedEmail,
    password: hashedPassword,
    phoneNumber: payload.phoneNumber || null,
    role: 'sub_admin' as const,
    accountType: payload.accountType,
    customerId: null,
    riderVerified: true,
    isDeleted: false,
    status: 'active' as const,
  };

  const result = existingUser
    ? await (prisma.user as any).update({
        where: { id: existingUser.id },
        data: {
          ...userData,
          verification: {
            upsert: {
              update: {
                status: true,
                otp: 0,
                expiredAt: null,
              },
              create: {
                status: true,
                otp: 0,
                expiredAt: null,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
          accountType: true,
          customerId: true,
          status: true,
          createdAt: true,
        },
      })
    : await (prisma.user as any).create({
        data: {
          ...userData,
          verification: {
            create: {
              status: true,
              otp: 0,
              expiredAt: null,
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
          accountType: true,
          customerId: true,
          status: true,
          createdAt: true,
        },
      });

  const accountType = resolveAccountType(result.accountType, result.customerId);

  return {
    id: result.id,
    name: result.name,
    email: result.email,
    phoneNumber: result.phoneNumber,
    role: result.role,
    status: result.status,
    createdAt: result.createdAt,
    accountType,
  };
};

const getSpecialAccessUsers = async (query: IGetSpecialAccessUsersQuery) => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;
  const skip = (page - 1) * limit;

  const accountTypeFilter = query.accountType
    ? [{ accountType: query.accountType }, { customerId: query.accountType }]
    : [
        {
          accountType: {
            in: [...SPECIAL_ACCESS_TYPES],
          },
        },
        {
          customerId: {
            in: [...SPECIAL_ACCESS_TYPES],
          },
        },
      ];

  const whereClause: any = {
    isDeleted: false,
    role: 'sub_admin',
    AND: [
      { OR: accountTypeFilter },
      ...(query.searchTerm
        ? [
            {
              OR: [
                { name: { contains: query.searchTerm, mode: 'insensitive' } },
                {
                  email: { contains: query.searchTerm, mode: 'insensitive' },
                },
              ],
            },
          ]
        : []),
    ],
  };

  const [users, total] = await Promise.all([
    (prisma.user as any).findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        accountType: true,
        customerId: true,
        status: true,
        createdAt: true,
      },
    }),
    (prisma.user as any).count({ where: whereClause }),
  ]);

  return {
    users: users
      .map((user: any) => {
        const accountType = resolveAccountType(
          user.accountType,
          user.customerId,
        );
        if (!accountType) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          status: user.status,
          createdAt: user.createdAt,
          accountType,
        };
      })
      .filter(Boolean),
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const deleteSpecialAccessUser = async (id: string) => {
  const user = await (prisma.user as any).findFirst({
    where: {
      id,
      isDeleted: false,
      role: 'sub_admin',
      OR: [
        {
          accountType: {
            in: [...SPECIAL_ACCESS_TYPES],
          },
        },
        {
          customerId: {
            in: [...SPECIAL_ACCESS_TYPES],
          },
        },
      ],
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'Special access user not found');
  }

  const result = await (prisma.user as any).update({
    where: { id },
    data: {
      isDeleted: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      accountType: true,
      customerId: true,
      isDeleted: true,
    },
  });

  const accountType = resolveAccountType(result.accountType, result.customerId);

  return {
    id: result.id,
    name: result.name,
    email: result.email,
    accountType,
    isDeleted: result.isDeleted,
  };
};

export const specialAccessService = {
  createSpecialAccessUser,
  getSpecialAccessUsers,
  deleteSpecialAccessUser,
};
