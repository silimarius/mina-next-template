import { useEffect } from "react";

import { zkappWorkerClient } from "@/pages/zkappWorkerClient";
import { useContractStore } from "@/store/contract";
import { wait } from "@/utils";

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
