import { Mina, PublicKey, fetchAccount } from "snarkyjs";
import { type Add } from "@mina-next-template/contracts";
import { z } from "zod";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

interface WorkerState {
  Add: undefined | typeof Add;
  zkapp: undefined | Add;
  transaction: undefined | Transaction;
}

const state: WorkerState = {
  Add: undefined,
  zkapp: undefined,
  transaction: undefined,
};

const publicKeyArgSchema = z.object({ publicKey58: z.string() });

const functions = {
  setActiveInstanceToBerkeley: (_args: unknown): void => {
    const Berkeley = Mina.Network(
      "https://proxy.berkeley.minaexplorer.com/graphql"
    );
    Mina.setActiveInstance(Berkeley);
  },
  loadContract: async (_args: unknown) => {
    const { Add } = await import("@mina-next-template/contracts");
    state.Add = Add;
  },
  compileContract: async (_args: unknown) => {
    if (!state.Add) return;
    await state.Add.compile();
  },
  fetchAccount: (args: unknown) => {
    const parsed = publicKeyArgSchema.parse(args);
    const publicKey = PublicKey.fromBase58(parsed.publicKey58);
    return fetchAccount({ publicKey });
  },
  initZkappInstance: (args: unknown) => {
    if (!state.Add) return;
    const parsed = publicKeyArgSchema.parse(args);
    const publicKey = PublicKey.fromBase58(parsed.publicKey58);
    state.zkapp = new state.Add(publicKey);
  },
  getNum: async (_args: unknown) => {
    if (!state.zkapp) return;
    const currentNum = await state.zkapp.num.fetch();
    if (!currentNum) return;
    return currentNum.toString();
  },
  createUpdateTransaction: async (_args: unknown) => {
    const transaction = await Mina.transaction(() => {
      if (!state.zkapp) return;
      state.zkapp.update();
    });
    state.transaction = transaction;
  },
  proveUpdateTransaction: async (_args: unknown) => {
    if (!state.transaction) return;
    await state.transaction.prove();
  },
  getTransactionJSON: (_args: unknown) => {
    if (!state.transaction) return;
    return state.transaction.toJSON();
  },
};

export type WorkerFunctions = keyof typeof functions;

export interface ZkappWorkerRequest {
  id: number;
  fn: WorkerFunctions;
  args: unknown;
}

export interface ZkappWorkerReponse {
  id: number;
  data: unknown;
}

if (typeof window !== "undefined") {
  addEventListener(
    "message",
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (event: MessageEvent<ZkappWorkerRequest>) => {
      try {
        const returnData = await functions[event.data.fn](event.data.args);

        const message: ZkappWorkerReponse = {
          id: event.data.id,
          data: returnData,
        };
        postMessage(message);
      } catch (error) {
        console.warn("Worker Error:", error);
      }
    }
  );

  console.info("Added worker service listener.");
}
