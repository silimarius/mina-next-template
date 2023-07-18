import { useEffect } from "react";

import { zkappWorkerClient } from "@/pages/zkappWorkerClient";
import { useContractStore } from "@/store/contract";

export const useInitAccount = () => {
  const hasBeenSetup = useContractStore((state) => state.hasBeenSetup);
  const accountExists = useContractStore((state) => state.accountExists);
  const publicKey = useContractStore((state) => state.publicKey);

  const setAccountExists = useContractStore((state) => state.setAccountExists);

  useEffect(() => {
    const initAccount = async () => {
      if (!zkappWorkerClient || !hasBeenSetup || accountExists || !publicKey)
        return;

      for (;;) {
        console.log("checking if account exists...");
        const res = await zkappWorkerClient.fetchAccount({
          publicKey,
        });
        const accountExists = res.error == null;
        if (accountExists) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      setAccountExists(true);
    };

    void initAccount();
  }, [accountExists, hasBeenSetup, publicKey, setAccountExists]);
};
