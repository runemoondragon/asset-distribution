import * as Bitcoin from "bitcoinjs-lib";
import ecc from "@bitcoinerlab/secp256k1";
import {
  MAINNET,
  MAINNET_REDEEM_ADDRESS,
  SEED,
  STANDARD_RUNE_UTXO_VALUE,
  TESTNET,
  TESTNET_REDEEM_ADDRESS,
  networkType,
} from "../../config/config";
import { IUtxo } from "../../utils/types";
import { RuneId, Runestone, none } from "runelib";
import initializeWallet from "../wallet/initializeWallet";
import { SeedWallet } from "../wallet/SeedWallet";
import app from "../..";

Bitcoin.initEccLib(ecc);

// initialize redeem Rune UTXO to calculate transaction fee
const redeemRuneUTXO: IUtxo = {
  txid: "b3ad5a011e91739fb1cb19e336a7bbe31438a96c6ba6eb14e8c9cebc46feef3c",
  vout: 3,
  value: 100000,
};

// Calculate virtual byte of redeem airdrop runestone psbt
export const getRunestoneSize = (
  outputSize: number,
  networkType: string
): number => {
  // Initialize seed Wallet
  const wallet: SeedWallet = initializeWallet(
    networkType,
    SEED,
    app.locals.walletIndex
  );

  //Create psbt instance
  const psbt = new Bitcoin.Psbt({
    network:
      networkType == TESTNET
        ? Bitcoin.networks.testnet
        : Bitcoin.networks.bitcoin,
  });

  // Create redeem Runestone
  const edicts: any = [];
  for (let i = 0; i < outputSize; i++) {
    edicts.push({
      id: new RuneId(2586233, 1009),
      amount: 2000,
      output: i + 1,
    });
  }
  const mintstone = new Runestone(edicts, none(), none(), none());

  // Add input Rune UTXO
  psbt.addInput({
    hash: redeemRuneUTXO.txid,
    index: redeemRuneUTXO.vout,
    witnessUtxo: {
      value: redeemRuneUTXO.value,
      script: wallet.output,
    },
    tapInternalKey: Buffer.from(wallet.publicKey, "hex").subarray(1, 33),
  });

  // Add output runestone
  psbt.addOutput({
    script: mintstone.encipher(),
    value: 0,
  });

  // Add output rune utxo
  for (let i = 0; i < outputSize; i++) {
    if (networkType == TESTNET) {
      psbt.addOutput({
        address:
          TESTNET_REDEEM_ADDRESS, // rune receive address
        value: STANDARD_RUNE_UTXO_VALUE,
      });
    } else {
      psbt.addOutput({
        address:
          MAINNET_REDEEM_ADDRESS, // rune receive address
        value: STANDARD_RUNE_UTXO_VALUE,
      });
    }
  }
  // Sign psbt using admin wallet
  const signedPsbt: Bitcoin.Psbt = wallet.signPsbt(psbt, wallet.ecPair);

  // return Virtual Size of Runestone Transaction
  return signedPsbt.extractTransaction(true).virtualSize();
};
