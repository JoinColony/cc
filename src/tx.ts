import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export interface TxResult {
  fn: string;
  encoded: string;
  readable: string;
}

export const createPendingTx = async ({ fn, encoded, readable }: TxResult) => {
  const tx = await prisma.transaction.create({
    data: {
      id: randomUUID(),
      encoded,
      readable,
      fn,
    },
  });
  return tx.id;
};
