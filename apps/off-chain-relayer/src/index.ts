import * as anchor from "@coral-xyz/anchor";
// import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet.js";
import { Wallet } from "@coral-xyz/anchor";
import { createSyncNativeInstruction } from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl
} from "@solana/web3.js";
import dotenv from "dotenv";
import { owner } from "./config";
import { createPoolHandler } from "./handlers/createPoolHandler";
import idl from "./idl/program.json";

dotenv.config();

const RPC_URL = process.env.RPC_URL || clusterApiUrl("devnet");
const PROGRAM_ID = process.env.PROGRAM_ID;
const EVENT_NAME = "createPoolRequestEvent";

if (!PROGRAM_ID) {
  console.error("Invalid Program Id!");
  process.exit(1);
}

const connection = new Connection(RPC_URL, "confirmed");
const wallet = new Wallet(owner);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
const programPubkey = new PublicKey(PROGRAM_ID);
const program = new anchor.Program(idl, provider);

const main = async () => {
  try {
    console.log("Listening for events from program:", programPubkey.toBase58());

    const listenerId = program.addEventListener(
      EVENT_NAME,
      async (eventData, slot, signature) => {
        console.log(`✅ ${EVENT_NAME} Event Detected in slot ${slot}`);
        console.log("Signature:", signature);

        const parsed = eventData as any;

        const deserializedEvent = {
          bondingCurve: parsed.bondingCurve.toBase58(),
          tokenMint: parsed.tokenMint.toBase58(),
          wsolMint: parsed.wsolMint.toString(),
          wsolAta: parsed.wsolAta.toBase58(),
          // tokenAta: parsed.tokenAta.toBase58(),
          tokenAmount: parsed.tokenAmount.toString(),
          wsolAmount: parsed.wsolAmount.toString(),
          timestamp: parsed.timestamp.toString(),
          creator: parsed.creator.toBase58(),
        };

        console.log("Deserialized Event Data:", deserializedEvent);

        if (
          parsed.tokenMint &&
          parsed.wsolMint &&
          parsed.tokenAmount &&
          parsed.wsolAmount &&
          parsed.creator &&
          parsed.bondingCurve         ) {
          const {
            tokenMint,
            wsolMint,
            tokenAmount,
            wsolAta,
            creator,
            // tokenAta,
          } = deserializedEvent;

          const syncNativeIx = createSyncNativeInstruction(
            new PublicKey(wsolAta)
          );

          const tx = new Transaction().add(syncNativeIx);
          await provider.sendAndConfirm(tx);

          const wsolAtaAccount = await connection.getTokenAccountBalance(
            new PublicKey(wsolAta)
          );
          const actualWsolAmount = wsolAtaAccount.value.amount;
          console.log("Actual wSOL amount:", actualWsolAmount);

          if (!actualWsolAmount) {
            throw new Error("Wsol is not defined!!! FUCK OFF!");
          }

          try {
            await createPoolHandler({
              mintA: tokenMint,
              mintB: wsolMint,
              mintAAmount: BigInt(tokenAmount),
              mintBAmount: BigInt(actualWsolAmount),
              creator: creator,
              // tokenAta,
              wsolAta,
            });
          } catch (error) {
            console.error("createPoolHandler failed:", error);
          }
        } else {
          console.error("Invalid event payload structure:", parsed);
        }
      }
    );

    process.on("SIGINT", async () => {
      console.log("Listener removed. Exiting...");
      process.exit(0);
    });
  } catch (error) {
    console.error("ERROR!!: ", error);
  }
};

main();
