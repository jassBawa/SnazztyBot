import { Raydium, DEV_API_URLS } from "@raydium-io/raydium-sdk-v2";
import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import dotenv from "dotenv";

dotenv.config();

export const keyPairFromString = (keyStr: string): Keypair => {
  try {
    const cleaned = keyStr.trim();

    if (cleaned.startsWith("[")) {
      const secretKey = Uint8Array.from(JSON.parse(cleaned));
      if (secretKey.length !== 64) {
        throw new Error(
          `Invalid secret key length: ${secretKey.length}. Expected 64 bytes.`
        );
      }
      return Keypair.fromSecretKey(secretKey);
    }

    const secret = bs58.decode(cleaned);
    if (secret.length !== 64) {
      throw new Error(
        `Invalid secret key length: ${secret.length}. Expected 64 bytes.`
      );
    }
    return Keypair.fromSecretKey(secret);
  } catch (error) {
    console.log("Error while decoding the keypair: ", error);
    throw new Error("Failed to decode the keypair");
  }
};

export const cluster = "devnet";
export const owner = keyPairFromString(process.env.RELAYER_PRIVATE_KEY!);
export const connection = new Connection(clusterApiUrl(cluster));

let raydium: Raydium | undefined;

export const initSdk = async (params?: {
  loadToken?: boolean;
  owner?: Keypair;
}) => {
  const sdkOwner = params?.owner || owner;

  if (raydium && params?.owner) {
    raydium = undefined;
  }

  if (raydium) return raydium;

  if (connection.rpcEndpoint === clusterApiUrl("mainnet-beta"))
    console.warn(
      "using free rpc node might cause unexpected error, strongly suggest uses paid rpc node"
    );

  try {
    raydium = await Raydium.load({
      owner: sdkOwner,
      connection,
      cluster,
      disableFeatureCheck: true,
      disableLoadToken: !params?.loadToken,
      blockhashCommitment: "finalized",
      ...(cluster === "devnet"
        ? {
            urlConfigs: {
              ...DEV_API_URLS,
              BASE_HOST: "https://api-v3-devnet.raydium.io",
              OWNER_BASE_HOST: "https://owner-v1-devnet.raydium.io",
              SWAP_HOST: "https://transaction-v1-devnet.raydium.io",
              CPMM_LOCK:
                "https://dynamic-ipfs-devnet.raydium.io/lock/cpmm/position",
            },
          }
        : {}),
    });

    return raydium;
  } catch (e) {
    raydium = undefined;
    console.error("Failed to initialize Raydium SDK:", e);
    throw e;
  }
};
