import { useContractStore } from "@/store/contract";
import {
  useCallUpdate,
  useFetchNum,
  useInitAccount,
  useInitMina,
} from "@/services/contract";

export default function Home() {
  const hasWallet = useContractStore((state) => state.hasWallet);
  const hasBeenSetup = useContractStore((state) => state.hasBeenSetup);
  const accountExists = useContractStore((state) => state.accountExists);
  const num = useContractStore((state) => state.num);
  const creatingTransaction = useContractStore(
    (state) => state.creatingTransaction
  );

  const callUpdate = useCallUpdate();
  const fetchNum = useFetchNum();

  useInitMina();
  useInitAccount();

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
          onClick={() => void callUpdate()}
          disabled={creatingTransaction}
        >
          {" "}
          Send Transaction{" "}
        </button>
        <div> Current Number in zkApp: {num?.toString()} </div>
        <button onClick={() => void fetchNum()}> Get Latest State </button>
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
