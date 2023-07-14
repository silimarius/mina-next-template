import "@/styles/globals.css";
import { type AppProps } from "next/app";

import "./reactCOIServiceWorker";

interface MinaWallet {
  requestAccounts: () => Promise<string[]>;
  sendTransaction: (options: {
    transaction: string;
    feePayer: {
      fee: number;
      memo: string;
    };
  }) => Promise<{ hash: string }>;
}

declare global {
  interface Window {
    mina?: MinaWallet;
  }
}

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
