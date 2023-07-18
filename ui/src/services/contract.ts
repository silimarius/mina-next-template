import { useEffect } from "react";
import { PublicKey } from "snarkyjs";

import { zkappWorkerClient } from "@/pages/zkappWorkerClient";
import { useContractStore } from "@/store/contract";
import { wait } from "@/utils";

export const useInitMina = () => {
  const hasBeenSetup = useContractStore((state) => state.hasBeenSetup);

  const setHasWallet = useContractStore((state) => state.setHasWallet);
  const setupState = useContractStore((state) => state.setupState);

  useEffect(() => {
    const init = async () => {
      if (!zkappWorkerClient || hasBeenSetup) return;

      await wait(4000);

      console.info("setting to testnet");
      await zkappWorkerClient.setActiveInstanceToBerkeley();

      console.info("getting mina");

      if (!window.mina) {
        console.info("mina not present");
        setHasWallet(false);
        return;
      }
      console.info("mina present");

      const publicKeyBase58: string = (await window.mina.requestAccounts())[0];
      const publicKey = PublicKey.fromBase58(publicKeyBase58);

      console.info("using key", publicKey.toBase58());

      console.info("checking if account exists...");
      const res = await zkappWorkerClient.fetchAccount({
        publicKey: publicKey,
      });
      const accountExists = res.error === undefined;

      await zkappWorkerClient.loadContract();

      console.info("compiling zkApp");
      await zkappWorkerClient.compileContract();
      console.info("zkApp compiled");

      const zkappPublicKey = PublicKey.fromBase58(
        "B62qkrit4M81pkWcs3Limog9Mn2tB4aQk2xLC9jmG82kKnFuXY7bM6a"
      );

      await zkappWorkerClient.initZkappInstance(zkappPublicKey);

      console.info("getting zkApp state...");
      await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey });
      const currentNum = await zkappWorkerClient.getNum();
      if (!currentNum) {
        console.warn("current num undefined");
        return;
      }
      console.info("current state:", currentNum);

      setupState({
        publicKey,
        zkappPublicKey,
        accountExists,
        num: currentNum,
      });
    };

    void init();
  }, [hasBeenSetup, setHasWallet, setupState]);
};

export const useInitAccount = () => {
  const hasBeenSetup = useContractStore((state) => state.hasBeenSetup);
  const accountExists = useContractStore((state) => state.accountExists);
  const publicKey = useContractStore((state) => state.publicKey);

  const setAccountExists = useContractStore((state) => state.setAccountExists);

  useEffect(() => {
    const initAccount = async () => {
      if (!zkappWorkerClient || !hasBeenSetup || accountExists || !publicKey)
        return;

      let attemptFetch = true;
      while (attemptFetch) {
        console.info("checking if account exists...");

        const res = await zkappWorkerClient.fetchAccount({
          publicKey,
        });

        if (!res.error) {
          attemptFetch = false;
        } else {
          await wait(5000);
        }
      }

      setAccountExists(true);
    };

    void initAccount();
  }, [accountExists, hasBeenSetup, publicKey, setAccountExists]);
};