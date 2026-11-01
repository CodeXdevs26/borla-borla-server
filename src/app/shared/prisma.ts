import { Prisma, PrismaClient } from '../../generated/prisma';

const loggingExtension = Prisma.defineExtension({
  name: 'logging',
  query: {
    $allOperations: async ({ model, operation, args, query }) => {
      console.log(`[Prisma] Model: ${model}, Action: ${operation}`);
      try {
        const result = await query(args);
        return result;
      } catch (error) {
        console.error(`[Prisma] Error in ${model}.${operation}:`, error);
        throw error;
      }
    },
  },
});

const prisma = new PrismaClient({
  transactionOptions: { maxWait: 10000, timeout: 10000 },
}).$extends(loggingExtension);

// const prisma = new PrismaClient({
//   transactionOptions: { maxWait: 10000, timeout: 10000 },
// });

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// prisma.$use(async (params: any, next: any) => {
//   console.log(`[Prisma] Model: ${params.model}, Action: ${params.action}`);
//   try {
//     const result = await next(params);
//     return result;
//   } catch (error) {
//     console.error(`[Prisma] Error in ${params.model}.${params.action}:`, error);
//     throw error;
//   }
// });

export default prisma;
