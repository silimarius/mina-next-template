import { useContractStore } from "@/store/contract";
import { TRANSACTION_FEE } from "@/utils";
import { useInitAccount, useInitMina } from "@/services/contract";

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

  const setCreatingTransaction = useContractStore(
    (state) => state.setCreatingTransaction
  );
  const setNum = useContractStore((state) => state.setNum);

  useInitMina();
  useInitAccount();

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
