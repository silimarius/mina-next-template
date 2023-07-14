import { type Field, type PublicKey } from "snarkyjs";
import { create } from "zustand";

export interface ContractState {
  hasWallet?: boolean;
  hasBeenSetup: boolean;
  accountExists: boolean;
  num?: Field;
  publicKey?: PublicKey;
  zkappPublicKey?: PublicKey;
  creatingTransaction: boolean;

  setupState: (params: {
    publicKey?: PublicKey;
    zkappPublicKey?: PublicKey;
    accountExists: boolean;
    num?: Field;
  }) => void;
  setHasWallet: (hasWallet: boolean) => void;
  setAccountExists: (accountExists: boolean) => void;
  setCreatingTransaction: (creatingTransaction: boolean) => void;
  setNum: (num: Field) => void;
}

export const useContractStore = create<ContractState>((set) => ({
  hasWallet: undefined,
  hasBeenSetup: false,
  accountExists: false,
  num: undefined,
  publicKey: undefined,
  zkappPublicKey: undefined,
  creatingTransaction: false,

  setupState: (params) =>
    set(() => ({ hasBeenSetup: true, hasWallet: true, ...params })),
  setHasWallet: (hasWallet) => set(() => ({ hasWallet })),
  setAccountExists: (accountExists) => set(() => ({ accountExists })),
  setCreatingTransaction: (creatingTransaction) =>
    set(() => ({ creatingTransaction })),
  setNum: (num) => set(() => ({ num })),
}));
