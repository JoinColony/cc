import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TxResult {
  encoded: string;
  readable: string;
}

export const createPendingTx = async ({ encoded, readable }: TxResult) => {
  const tx = await prisma.transaction.create({
    data: {
      id: `${Date.now()}-${randomUUID()}`,
      encoded,
      readable,
    },
  });
  return tx.id;
};
