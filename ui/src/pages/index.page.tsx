import { type Field, PublicKey } from "snarkyjs";
import { useEffect, useState } from "react";

import ZkappWorkerClient from "./zkappWorkerClient";

interface AppState {
  zkappWorkerClient?: ZkappWorkerClient;
  hasWallet?: boolean;
  hasBeenSetup: boolean;
  accountExists: boolean;
  currentNum?: Field;
  publicKey?: PublicKey;
  zkappPublicKey?: PublicKey;
  creatingTransaction: boolean;
}

const transactionFee = 0.1;

const wait = (ms = 2000) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Home() {
  const [state, setState] = useState<AppState>({
    hasBeenSetup: false,
    accountExists: false,
    creatingTransaction: false,
  });

  // -------------------------------------------------------
  // Do Setup

  const isClient = typeof window !== "undefined";

  useEffect(() => {
    void (async () => {
      if (!isClient) return;
      if (state.hasBeenSetup) return;

      const zkappWorkerClient = new ZkappWorkerClient();

      await wait(4000);

      console.log("setting to testnet");
      await zkappWorkerClient.setActiveInstanceToBerkeley();

      console.log("getting mina");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const mina = (window as any).mina;

      if (!mina) {
        console.log("mina not present");
        setState({ ...state, hasWallet: false });
        return;
      }
      console.log("mina present");

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const publicKeyBase58: string = (await mina.requestAccounts())[0];
      const publicKey = PublicKey.fromBase58(publicKeyBase58);

      console.log("using key", publicKey.toBase58());

      console.log("checking if account exists...");
      const res = await zkappWorkerClient.fetchAccount({
        publicKey: publicKey,
      });
      const accountExists = res.error == null;

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

      setState({
        ...state,
        zkappWorkerClient,
        hasWallet: true,
        hasBeenSetup: true,
        publicKey,
        zkappPublicKey,
        accountExists,
        currentNum,
      });
    })();
  }, [isClient, state]);

  useEffect(() => {
    void (async () => {
      if (!isClient) return;
      if (
        state.hasBeenSetup &&
        !state.accountExists &&
        state.zkappWorkerClient &&
        state.publicKey
      ) {
        for (;;) {
          console.log("checking if account exists...");
          const res = await state.zkappWorkerClient.fetchAccount({
            publicKey: state.publicKey,
          });
          const accountExists = res.error == null;
          if (accountExists) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        setState({ ...state, accountExists: true });
      }
    })();
  }, [isClient, state]);

  const onSendTransaction = async () => {
    setState({ ...state, creatingTransaction: true });
    console.log("sending a transaction...");

    if (!state.zkappWorkerClient || !state.publicKey) return;

    await state.zkappWorkerClient.fetchAccount({
      publicKey: state.publicKey,
    });

    await state.zkappWorkerClient.createUpdateTransaction();

    console.log("creating proof...");
    await state.zkappWorkerClient.proveUpdateTransaction();

    console.log("getting Transaction JSON...");
    const transactionJSON = await state.zkappWorkerClient.getTransactionJSON();

    console.log("requesting send transaction...");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: transactionFee,
        memo: "",
      },
    });

    console.log(
      "See transaction at https://berkeley.minaexplorer.com/transaction/" +
        String(hash)
    );

    setState({ ...state, creatingTransaction: false });
  };

  // -------------------------------------------------------
  // Refresh the current state

  const onRefreshCurrentNum = async () => {
    if (!state.zkappWorkerClient || !state.zkappPublicKey) return;
    console.log("getting zkApp state...");
    await state.zkappWorkerClient.fetchAccount({
      publicKey: state.zkappPublicKey,
    });
    const currentNum = await state.zkappWorkerClient.getNum();
    console.log("current state:", currentNum?.toString());

    setState({ ...state, currentNum });
  };

  // -------------------------------------------------------
  // Create UI elements

  let hasWallet;
  if (state.hasWallet != null && !state.hasWallet) {
    const auroLink = "https://www.aurowallet.com/";
    const auroLinkElem = (
      <a href={auroLink} target="_blank" rel="noreferrer">
        {" "}
        [Link]{" "}
      </a>
    );
    hasWallet = (
      <div>
        {" "}
        Could not find a wallet. Install Auro wallet here: {auroLinkElem}
      </div>
    );
  }

  const setupText = state.hasBeenSetup
    ? "SnarkyJS Ready"
    : "Setting up SnarkyJS...";
  const setup = (
    <div>
      {" "}
      {setupText} {hasWallet}
    </div>
  );

  let accountDoesNotExist;
  if (state.hasBeenSetup && !state.accountExists) {
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
  if (state.hasBeenSetup && state.accountExists) {
    mainContent = (
      <div>
        <button
          onClick={() => void onSendTransaction()}
          disabled={state.creatingTransaction}
        >
          {" "}
          Send Transaction{" "}
        </button>
        <div> Current Number in zkApp: {state.currentNum?.toString()} </div>
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

  // return <Component {...pageProps} />
}

// import Head from "next/head";
// import { useEffect, useState } from "react";
// import { type Field, PublicKey, type Types } from "snarkyjs";

// import ZkappWorkerClient from "./zkappWorkerClient";

// type ProgressStage =
//   | "walletInit"
//   | "accountFetch"
//   | "appInit"
//   | "getNum"
//   | "completed";

// export default function Home() {
//   const [progress, setProgress] = useState<ProgressStage>("walletInit");
//   const [creatingTransaction, setCreatingTransaction] = useState(false);

//   const [currentNum, setCurrentNum] = useState<Field>();
//   const [publicKey, setPublicKey] = useState<PublicKey>();
//   const [account, setAccount] = useState<Types.Account>();
//   const [zkAppPublicKey, setZkAppPublicKey] = useState<PublicKey>();

//   console.log("=================================");
//   console.log("🚀 ~ Home ~ progress:", progress);
//   console.log("🚀 ~ Home ~ currentNum:", currentNum?.toBigInt());
//   console.log("🚀 ~ Home ~ publicKey:", publicKey);
//   console.log("🚀 ~ Home ~ account:", account);
//   console.log("🚀 ~ Home ~ zkAppPublicKey:", zkAppPublicKey);

//   useEffect(() => {
//     void (async () => {
//       let lastProgress: ProgressStage = "walletInit";
//       try {
//         if (!window) throw new Error("Not on client.");
//         const workerClient = new ZkappWorkerClient();

//         // const { Mina, PublicKey } = await import("snarkyjs");
//         // const { Add } = await import("../../../contracts/build/src/");

//         // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
//         const mina = (window as any).mina;

//         if (!mina) throw new Error("Mina instance not present.");
//         lastProgress = "accountFetch";

//         await workerClient.setActiveInstanceToBerkeley();

//         // const Berkeley = Mina.Network(
//         //   "https://proxy.berkeley.minaexplorer.com/graphql"
//         // );
//         // Mina.setActiveInstance(Berkeley);

//         // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
//         const publicKeyBase58: string = (await mina.requestAccounts())[0];
//         const publicKey = PublicKey.fromBase58(publicKeyBase58);
//         setPublicKey(publicKey);
//         const accountRes = await workerClient.fetchAccount({ publicKey });

//         // const accountRes = await fetchAccount({ publicKey });

//         if (accountRes.error) throw new Error(accountRes.error.statusText);
//         setAccount(accountRes.account);
//         lastProgress = "appInit";

//         const zkAppAddress =
//           "B62qkrit4M81pkWcs3Limog9Mn2tB4aQk2xLC9jmG82kKnFuXY7bM6a";

//         const zkAppPk = PublicKey.fromBase58(zkAppAddress);
//         setZkAppPublicKey(zkAppPk);

//         const appAccount = workerClient.fetchAccount({ publicKey: zkAppPk });
//         console.log("🚀 ~ void ~ appAccount:", appAccount);
//         // const res = await fetchAccount({ publicKey: zkAppPk });

//         // const newZkApp = new Add(zkAppPk);
//         // await Add.compile();
//         // setZkApp(newZkApp);

//         await workerClient.loadContract();
//         await workerClient.compileContract();
//         await workerClient.initZkappInstance(zkAppPk);

//         lastProgress = "getNum";

//         // const a = await fetchAccount({ publicKey: zkAppPk });
//         // const newNum = await newZkApp.num.fetch();
//         const newNum = await workerClient.getNum();
//         setCurrentNum(newNum);
//         lastProgress = "completed";
//       } catch (error) {
//         console.warn(error);
//       }
//       setProgress(lastProgress);
//     })();
//   }, []);

//   const handleAdd = () => {
//     // TODO: implement
//     console.log("adding");
//   };

//   const content = () => {
//     switch (progress) {
//       case "walletInit":
//         return <p>Setting up...</p>;
//       case "accountFetch":
//         return (
//           <div>
//             Account does not exist. Please visit the faucet to fund this account
//             <a
//               href="https://berkeley.minaexplorer.com/faucet"
//               target="_blank"
//               rel="noreferrer"
//             >
//               {" "}
//               [Link]{" "}
//             </a>
//           </div>
//         );
//       case "appInit":
//         return <p>App init failed.</p>;
//       case "getNum":
//         return <p>Failed retrieving number.</p>;
//       case "completed":
//         <button onClick={handleAdd}>Add</button>;
//     }
//   };

//   return (
//     <>
//       <Head>
//         <title>Mina zkApp UI</title>
//         <meta name="description" content="built with SnarkyJS" />
//         <link rel="icon" href="/assets/favicon.ico" />
//       </Head>
//       {content()}
//     </>
//   );
// }
