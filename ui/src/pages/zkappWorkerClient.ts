import { type fetchAccount, type PublicKey, Field } from "snarkyjs";

import {
  type ZkappWorkerRequest,
  type ZkappWorkerReponse,
  type WorkerFunctions,
} from "./zkappWorker";
import { z } from "zod";

export default class ZkappWorkerClient {
  worker: Worker;

  promises: {
    [id: number]: {
      resolve: (res: unknown) => void;
      reject: (err: unknown) => void;
    };
  };

  nextId: number;

  constructor() {
    this.worker = new Worker(new URL("./zkappWorker.ts", import.meta.url));
    this.promises = {};
    this.nextId = 0;

    this.worker.onmessage = (event: MessageEvent<ZkappWorkerReponse>) => {
      this.promises[event.data.id].resolve(event.data.data);
      delete this.promises[event.data.id];
    };
  }

  private call(fn: WorkerFunctions, args: unknown) {
    return new Promise((resolve, reject) => {
      this.promises[this.nextId] = { resolve, reject };

      const message: ZkappWorkerRequest = {
        id: this.nextId,
        fn,
        args,
      };

      this.worker.postMessage(message);

      this.nextId++;
    });
  }

  setActiveInstanceToBerkeley() {
    return this.call("setActiveInstanceToBerkeley", {});
  }

  loadContract() {
    return this.call("loadContract", {});
  }

  compileContract() {
    return this.call("compileContract", {});
  }

  fetchAccount({
    publicKey,
  }: {
    publicKey: PublicKey;
  }): ReturnType<typeof fetchAccount> {
    const result = this.call("fetchAccount", {
      publicKey58: publicKey.toBase58(),
    });
    return result as ReturnType<typeof fetchAccount>;
  }

  initZkappInstance(publicKey: PublicKey) {
    return this.call("initZkappInstance", {
      publicKey58: publicKey.toBase58(),
    });
  }

  createUpdateTransaction() {
    return this.call("createUpdateTransaction", {});
  }

  proveUpdateTransaction() {
    return this.call("proveUpdateTransaction", {});
  }

  async getNum(): Promise<Field | undefined> {
    const result = await this.call("getNum", {});
    if (!result) return;
    const strRes = z.string().parse(result);
    // return Field.fromJSON(JSON.parse(strRes));
    return Field(strRes);
  }

  async getTransactionJSON(): Promise<string | undefined> {
    const result = await this.call("getTransactionJSON", {});
    if (!result) return;
    return z.string().parse(result);
  }
}
