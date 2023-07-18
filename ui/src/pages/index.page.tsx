import { PublicKey } from "snarkyjs";
import { useEffect } from "react";

import { useContractStore } from "@/store/contract";
import { wait, TRANSACTION_FEE } from "@/utils";

import { zkappWorkerClient } from "./zkappWorkerClient";

export default function Home() {
  const hasWallet = useContractStore((state) => state.hasWallet);
  const hasBeenSetup = useContractStore((state) => state.hasBeenSetup);
  const accountExists = useContractStore((state) => state.accountExists);
  const num = useContractStore((state) => state.num);
  const publicKey = useContractStore((state) => state.publicKey);
  const zkappPublicKey = useContractStore((state) => state.zkappPublicKey);
  const creatingTransaction = useContractStore(
    (state) => state.creatingTransaction
  );

  const setupState = useContractStore((state) => state.setupState);
  const setHasWallet = useContractStore((state) => state.setHasWallet);
  const setAccountExists = useContractStore((state) => state.setAccountExists);
  const setCreatingTransaction = useContractStore(
    (state) => state.setCreatingTransaction
  );
  const setNum = useContractStore((state) => state.setNum);

  useEffect(() => {
    void (async () => {
      if (!zkappWorkerClient || hasBeenSetup) return;

      await wait(4000);

      console.log("setting to testnet");
      await zkappWorkerClient.setActiveInstanceToBerkeley();

      console.log("getting mina");

      if (!window.mina) {
        console.log("mina not present");
        setHasWallet(false);
        return;
      }
      console.log("mina present");

      const publicKeyBase58: string = (await window.mina.requestAccounts())[0];
      const publicKey = PublicKey.fromBase58(publicKeyBase58);

      console.log("using key", publicKey.toBase58());

      console.log("checking if account exists...");
      const res = await zkappWorkerClient.fetchAccount({
        publicKey: publicKey,
      });
      const accountExists = res.error === undefined;

      await zkappWorkerClient.loadContract();

      console.log("compiling zkApp");
      await zkappWorkerClient.compileContract();
      console.log("zkApp compiled");

      const zkappPublicKey = PublicKey.fromBase58(
        "B62qkrit4M81pkWcs3Limog9Mn2tB4aQk2xLC9jmG82kKnFuXY7bM6a"
      );

      await zkappWorkerClient.initZkappInstance(zkappPublicKey);

      console.log("getting zkApp state...");
      await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey });
      const currentNum = await zkappWorkerClient.getNum();
      if (!currentNum) {
        console.warn("current num undefined");
        return;
      }
      console.log("current state:", currentNum);

      setupState({
        publicKey,
        zkappPublicKey,
        accountExists,
        num: currentNum,
      });
    })();
  }, [hasBeenSetup, setHasWallet, setupState]);

  useEffect(() => {
    void (async () => {
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
    })();
  }, [accountExists, hasBeenSetup, publicKey, setAccountExists]);

  const onSendTransaction = async () => {
    setCreatingTransaction(true);
    console.log("sending a transaction...");

    if (!zkappWorkerClient || !publicKey || !window.mina) return;

    await zkappWorkerClient.fetchAccount({ publicKey });

    await zkappWorkerClient.createUpdateTransaction();

    console.log("creating proof...");
    await zkappWorkerClient.proveUpdateTransaction();

    console.log("getting Transaction JSON...");
    const transactionJSON = await zkappWorkerClient.getTransactionJSON();
    if (!transactionJSON) return;

    console.log("requesting send transaction...");
    const { hash } = await window.mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: TRANSACTION_FEE,
        memo: "",
      },
    });

    console.log(
      `See transaction at https://berkeley.minaexplorer.com/transaction/${hash}`
    );

    setCreatingTransaction(false);
  };

  const onRefreshCurrentNum = async () => {
    if (!zkappWorkerClient || !zkappPublicKey) return;

    console.log("getting zkApp state...");
    await zkappWorkerClient.fetchAccount({
      publicKey: zkappPublicKey,
    });
    const currentNum = await zkappWorkerClient.getNum();
    console.log("current state:", currentNum?.toString());

    if (!currentNum) return;

    setNum(currentNum);
  };

  let walletContent;
  if (hasWallet !== undefined && !hasWallet) {
    const auroLink = "https://www.aurowallet.com/";
    const auroLinkElem = (
      <a href={auroLink} target="_blank" rel="noreferrer">
        {" "}
        [Link]{" "}
      </a>
    );
    walletContent = (
      <div>
        {" "}
        Could not find a wallet. Install Auro wallet here: {auroLinkElem}
      </div>
    );
  }

  const setupText = hasBeenSetup ? "SnarkyJS Ready" : "Setting up SnarkyJS...";
  const setup = (
    <div>
      {" "}
      {setupText} {walletContent}
    </div>
  );

  let accountDoesNotExist;
  if (hasBeenSetup && !accountExists) {
    const faucetLink = "https://berkeley.minaexplorer.com/faucet";
    accountDoesNotExist = (
      <div>
        Account does not exist. Please visit the faucet to fund this account
        <a href={faucetLink} target="_blank" rel="noreferrer">
          {" "}
          [Link]{" "}
        </a>
      </div>
    );
  }

  let mainContent;
  if (hasBeenSetup && accountExists) {
    mainContent = (
      <div>
        <button
          onClick={() => void onSendTransaction()}
          disabled={creatingTransaction}
        >
          {" "}
          Send Transaction{" "}
        </button>
        <div> Current Number in zkApp: {num?.toString()} </div>
        <button onClick={() => void onRefreshCurrentNum()}>
          {" "}
          Get Latest State{" "}
        </button>
      </div>
    );
  }

  return (
    <div>
      {setup}
      {accountDoesNotExist}
      {mainContent}
    </div>
  );
}
