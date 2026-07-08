import type { Address } from "viem";

export const MAX_CAPSULE_TITLE_LENGTH = 50;
export const MAX_CAPSULE_MESSAGE_LENGTH = 280;

export const memoryCapsuleAbi = [
  {
    type: "function",
    name: "createCapsule",
    stateMutability: "nonpayable",
    inputs: [
      { name: "title", type: "string" },
      { name: "message", type: "string" },
      { name: "unlockDelaySeconds", type: "uint256" },
    ],
    outputs: [{ name: "capsuleId", type: "uint256" }],
  },
  {
    type: "function",
    name: "openCapsule",
    stateMutability: "nonpayable",
    inputs: [{ name: "capsuleId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getCapsule",
    stateMutability: "view",
    inputs: [{ name: "capsuleId", type: "uint256" }],
    outputs: [
      { name: "creator", type: "address" },
      { name: "unlocksAt", type: "uint256" },
      { name: "opened", type: "bool" },
      { name: "title", type: "string" },
      { name: "message", type: "string" },
    ],
  },
] as const;

export type CapsuleData = {
  creator: Address;
  unlocksAt: bigint;
  opened: boolean;
  title: string;
  message: string;
};

export const memoryCapsuleContractAddress = process.env
  .NEXT_PUBLIC_MEMORY_CAPSULE_CONTRACT_ADDRESS as Address | undefined;
