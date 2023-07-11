import Head from "next/head";
import { useEffect, useState } from "react";

import { type Add } from "../../../contracts/src/Add.js";
import { type Field, type PublicKey, type Types, fetchAccount } from "snarkyjs";

type ProgressStage =
  | "walletInit"
  | "accountFetch"
  | "appInit"
  | "getNum"
  | "completed";

export default function Home() {
  const [progress, setProgress] = useState<ProgressStage>("walletInit");
  const [creatingTransaction, setCreatingTransaction] = useState(false);

  const [currentNum, setCurrentNum] = useState<Field>();
  const [publicKey, setPublicKey] = useState<PublicKey>();
  const [account, setAccount] = useState<Types.Account>();
  const [zkAppPublicKey, setZkAppPublicKey] = useState<PublicKey>();
  const [zkApp, setZkApp] = useState<Add>();

  console.log("=================================");
  console.log("🚀 ~ Home ~ progress:", progress);
  console.log("🚀 ~ Home ~ currentNum:", currentNum?.toBigInt());
  console.log("🚀 ~ Home ~ publicKey:", publicKey);
  console.log("🚀 ~ Home ~ account:", account);
  console.log("🚀 ~ Home ~ zkAppPublicKey:", zkAppPublicKey);
  console.log("🚀 ~ Home ~ zkApp:", zkApp);

  useEffect(() => {
    void (async () => {
      let lastProgress: ProgressStage = "walletInit";
      try {
        if (!window) throw new Error("Not on client.");

        const { Mina, PublicKey } = await import("snarkyjs");
        const { Add } = await import("../../../contracts/build/src/");

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        const mina = (window as any).mina;

        if (!mina) throw new Error("Mina instance not present.");
        lastProgress = "accountFetch";

        const Berkeley = Mina.Network(
          "https://proxy.berkeley.minaexplorer.com/graphql"
        );
        Mina.setActiveInstance(Berkeley);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const publicKeyBase58: string = (await mina.requestAccounts())[0];
        const publicKey = PublicKey.fromBase58(publicKeyBase58);
        setPublicKey(publicKey);
        const accountRes = await fetchAccount({ publicKey });

        if (accountRes.error) throw new Error(accountRes.error.statusText);
        setAccount(accountRes.account);
        lastProgress = "appInit";

        const zkAppAddress =
          "B62qkrit4M81pkWcs3Limog9Mn2tB4aQk2xLC9jmG82kKnFuXY7bM6a";

        const zkAppPk = PublicKey.fromBase58(zkAppAddress);

        const res = await fetchAccount({ publicKey: zkAppPk });
        console.log("🚀 ~ void ~ res:", res);

        const newZkApp = new Add(zkAppPk);
        await Add.compile();
        setZkAppPublicKey(zkAppPk);
        setZkApp(newZkApp);
        lastProgress = "getNum";

        // const a = await fetchAccount({ publicKey: zkAppPk });
        const newNum = newZkApp.num.get();
        setCurrentNum(newNum);
        lastProgress = "completed";
      } catch (error) {
        console.warn(error);
      }
      setProgress(lastProgress);
    })();
  }, []);

  const handleAdd = () => {
    if (!zkApp) return;
    // TODO: implement
    console.log("adding");
  };

  const content = () => {
    switch (progress) {
      case "walletInit":
        return <p>Setting up...</p>;
      case "accountFetch":
        return (
          <div>
            Account does not exist. Please visit the faucet to fund this account
            <a
              href="https://berkeley.minaexplorer.com/faucet"
              target="_blank"
              rel="noreferrer"
            >
              {" "}
              [Link]{" "}
            </a>
          </div>
        );
      case "appInit":
        return <p>App init failed.</p>;
      case "getNum":
        return <p>Failed retrieving number.</p>;
      case "completed":
        <button onClick={handleAdd}>Add</button>;
    }
  };

  return (
    <>
      <Head>
        <title>Mina zkApp UI</title>
        <meta name="description" content="built with SnarkyJS" />
        <link rel="icon" href="/assets/favicon.ico" />
      </Head>
      {content()}
    </>
  );
}
