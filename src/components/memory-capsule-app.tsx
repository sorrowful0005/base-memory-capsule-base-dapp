"use client";

import {
  Archive,
  CalendarClock,
  Loader2,
  LockKeyhole,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Address } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { base } from "wagmi/chains";
import {
  MAX_CAPSULE_MESSAGE_LENGTH,
  MAX_CAPSULE_TITLE_LENGTH,
  memoryCapsuleAbi,
  memoryCapsuleContractAddress,
} from "@/lib/memory-capsule";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function shortAddress(address?: Address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function unlockLabel(unlocksAt?: bigint) {
  if (!unlocksAt) return "--";
  const target = Number(unlocksAt) * 1000;
  return new Date(target).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function timeRemaining(unlocksAt?: bigint) {
  if (!unlocksAt) return "--";
  const seconds = Number(unlocksAt) - Math.floor(new Date().getTime() / 1000);
  if (seconds <= 0) return "Ready to open";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m left`;
}

export function MemoryCapsuleApp() {
  const [capsuleIdInput, setCapsuleIdInput] = useState("1");
  const [title, setTitle] = useState("Note to future me");
  const [message, setMessage] = useState(
    "I hope I still remember why this season mattered and what I was building through it.",
  );
  const [unlockDays, setUnlockDays] = useState("30");
  const [status, setStatus] = useState(
    "Seal one message today and reopen it later with a clear onchain timestamp.",
  );
  const [walletStatus, setWalletStatus] = useState("");

  const { address, chainId, connector, isConnected } = useAccount();
  const { connectors, connectAsync, isPending: connecting } = useConnect();
  const { disconnectAsync, isPending: disconnecting } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const {
    data: hash,
    writeContract,
    isPending: writing,
    error: writeError,
  } = useWriteContract();

  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash });

  const availableConnectors = useMemo(
    () =>
      connectors
        .filter((item) => item.type !== "mock")
        .sort((a, b) => {
          const score = (item: (typeof connectors)[number]) => {
            if (item.id === "baseAccount" || item.name === "Base Account") {
              return 0;
            }
            if (item.type === "injected") return 1;
            return 2;
          };

          return score(a) - score(b);
        }),
    [connectors],
  );

  async function connectWallet() {
    const errors: string[] = [];
    setWalletStatus("Opening wallet...");

    for (const item of availableConnectors) {
      try {
        await connectAsync({ connector: item, chainId: base.id });
        setWalletStatus("");
        return;
      } catch (error) {
        errors.push(
          error instanceof Error
            ? `${item.name}: ${error.message}`
            : `${item.name}: connection failed`,
        );
      }
    }

    setWalletStatus(
      errors[0] ??
        "No wallet connector is available. Open this app inside Base App or install a wallet.",
    );
  }

  async function disconnectWallet() {
    try {
      if (connector) {
        await disconnectAsync({ connector });
      } else {
        await disconnectAsync();
      }
      setWalletStatus("Wallet disconnected. Tap Connect to reconnect.");
    } catch (error) {
      setWalletStatus(
        error instanceof Error ? error.message : "Could not disconnect wallet.",
      );
    }
  }
  const parsedCapsuleId = BigInt(Math.max(1, Number(capsuleIdInput || "1")));

  const capsuleQuery = useReadContract({
    abi: memoryCapsuleAbi,
    address: memoryCapsuleContractAddress,
    functionName: "getCapsule",
    args: [parsedCapsuleId],
    query: {
      enabled: Boolean(memoryCapsuleContractAddress),
      refetchInterval: 12000,
    },
  });

  const capsuleTuple = capsuleQuery.data as
    | readonly [Address, bigint, boolean, string, string]
    | undefined;

  const capsule = useMemo(
    () =>
      capsuleTuple
        ? {
            creator: capsuleTuple[0],
            unlocksAt: capsuleTuple[1],
            opened: capsuleTuple[2],
            title: capsuleTuple[3],
            message: capsuleTuple[4],
          }
        : undefined,
    [capsuleTuple],
  );

  const nowSeconds = Math.floor(new Date().getTime() / 1000);
  const isUnlockable = capsule ? Number(capsule.unlocksAt) <= nowSeconds : false;

  const canCreate =
    Boolean(memoryCapsuleContractAddress) &&
    isConnected &&
    chainId === base.id &&
    title.trim().length > 0 &&
    title.trim().length <= MAX_CAPSULE_TITLE_LENGTH &&
    message.trim().length > 0 &&
    message.trim().length <= MAX_CAPSULE_MESSAGE_LENGTH &&
    Number(unlockDays) >= 1;

  const canOpen =
    Boolean(memoryCapsuleContractAddress) &&
    isConnected &&
    chainId === base.id &&
    Boolean(capsule?.creator && capsule.creator !== ZERO_ADDRESS) &&
    isUnlockable &&
    !capsule?.opened;

  const statusText = confirmed
    ? "Transaction confirmed on Base."
    : writeError
      ? writeError.message
      : status;

  function createCapsule() {
    if (!memoryCapsuleContractAddress) return;

    const unlockDelaySeconds = BigInt(Math.floor(Number(unlockDays) * 86400));
    setStatus("Confirm the capsule seal transaction in your wallet.");
    writeContract({
      address: memoryCapsuleContractAddress,
      abi: memoryCapsuleAbi,
      functionName: "createCapsule",
      args: [title.trim(), message.trim(), unlockDelaySeconds],
      chainId: base.id,
    });
  }

  function openCapsule() {
    if (!memoryCapsuleContractAddress) return;

    setStatus("Confirm the capsule opening transaction in your wallet.");
    writeContract({
      address: memoryCapsuleContractAddress,
      abi: memoryCapsuleAbi,
      functionName: "openCapsule",
      args: [parsedCapsuleId],
      chainId: base.id,
    });
  }

  return (
    <main className="min-h-screen bg-[#f4efe9] text-[#2e231d]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-[#2e231d]/15 pb-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-[#2e231d] bg-[#d6c1a1] shadow-[0_12px_32px_rgba(88,61,32,0.12)]">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#876544]">
                Base Memory Capsule
              </p>
              <h1 className="text-xl font-black sm:text-2xl">
                Seal one note. Reopen it later.
              </h1>
            </div>
          </div>

          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#2e231d]/15 bg-white px-3 py-2 text-sm font-semibold">
                {shortAddress(address)}
              </span>
              <button
                className="rounded-full border border-[#2e231d] bg-[#2e231d] px-4 py-2 text-sm font-semibold text-white"
                onClick={disconnectWallet}
              >{disconnecting ? "Disconnecting" : "Disconnect"}</button>
            </div>
          ) : (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-[#2e231d] bg-[#2e231d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={availableConnectors.length === 0 || connecting}
              onClick={connectWallet}
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              Connect
            </button>
          )}
        {walletStatus ? (
            <p className="w-full text-right text-xs font-semibold opacity-75">
              {walletStatus}
            </p>
          ) : null}
        </header>

        <div className="grid flex-1 gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-[34px] border border-[#2e231d] bg-[linear-gradient(180deg,#fffdf9_0%,#e7ddd0_100%)] p-5 shadow-[0_22px_60px_rgba(68,44,22,0.10)]">
            <div className="max-w-3xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#2e231d] bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Onchain archive
              </p>
              <h2 className="text-4xl font-black leading-tight sm:text-6xl">
                A sealed note board for messages meant to wait.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#6c5a4e] sm:text-lg">
                Write one message, lock it behind a future date, and reopen the
                capsule later with the original timestamp visible onchain.
              </p>
            </div>

            <div className="mt-8 rounded-[34px] border border-[#2e231d] bg-[#2e231d] p-5 text-white">
              <div className="flex items-start justify-between gap-4 border-b border-white/15 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e4d3bf]">
                    Sealed capsule
                  </p>
                  <h3 className="mt-2 text-3xl font-black">
                    {capsule?.title || "Note to future me"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#f3e7da]">
                    {capsule?.opened
                      ? capsule.message
                      : "This message stays sealed until its unlock date arrives."}
                  </p>
                </div>
                <div className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold">
                  {capsule?.opened ? "Opened" : "Sealed"}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e4d3bf]">
                    Unlock date
                  </p>
                  <p className="mt-3 text-lg font-black">
                    {unlockLabel(capsule?.unlocksAt)}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e4d3bf]">
                    Time left
                  </p>
                  <p className="mt-3 text-lg font-black">
                    {timeRemaining(capsule?.unlocksAt)}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e4d3bf]">
                    Creator
                  </p>
                  <p className="mt-3 text-lg font-black">
                    {capsule?.creator && capsule.creator !== ZERO_ADDRESS
                      ? shortAddress(capsule.creator)
                      : "--"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-[#2e231d] bg-white/80 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#876544]">
                  Step 1
                </p>
                <p className="mt-2 text-lg font-semibold">Write note</p>
              </div>
              <div className="rounded-[24px] border border-[#2e231d] bg-white/80 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#876544]">
                  Step 2
                </p>
                <p className="mt-2 text-lg font-semibold">Seal with date</p>
              </div>
              <div className="rounded-[24px] border border-[#2e231d] bg-white/80 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#876544]">
                  Step 3
                </p>
                <p className="mt-2 text-lg font-semibold">Open later</p>
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded-[34px] border border-[#2e231d] bg-white p-5 shadow-[0_22px_60px_rgba(68,44,22,0.10)]">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ece2d4]">
                  <ScrollText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-black">Seal capsule</h3>
                  <p className="text-sm text-[#6c5a4e]">
                    Store one message for a future date.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#876544]">
                    Capsule title
                  </span>
                  <input
                    className="rounded-2xl border border-[#2e231d]/15 bg-[#fcfaf6] px-4 py-3 outline-none"
                    maxLength={MAX_CAPSULE_TITLE_LENGTH}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#876544]">
                    Message
                  </span>
                  <textarea
                    className="min-h-32 rounded-2xl border border-[#2e231d]/15 bg-[#fcfaf6] px-4 py-3 outline-none"
                    maxLength={MAX_CAPSULE_MESSAGE_LENGTH}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#876544]">
                    Unlock in days
                  </span>
                  <input
                    className="rounded-2xl border border-[#2e231d]/15 bg-[#fcfaf6] px-4 py-3 outline-none"
                    value={unlockDays}
                    onChange={(event) => setUnlockDays(event.target.value)}
                  />
                </label>
              </div>

              {chainId !== base.id && isConnected ? (
                <button
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2e231d] px-4 py-3 font-semibold text-white disabled:opacity-60"
                  disabled={switching}
                  onClick={() => switchChain({ chainId: base.id })}
                >
                  {switching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  Switch to Base
                </button>
              ) : (
                <button
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2e231d] px-4 py-3 font-semibold text-white disabled:opacity-50"
                  disabled={!canCreate || writing || confirming}
                  onClick={createCapsule}
                >
                  {writing || confirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LockKeyhole className="h-4 w-4" />
                  )}
                  Seal on Base
                </button>
              )}
            </section>

            <section className="rounded-[34px] border border-[#2e231d] bg-white p-5 shadow-[0_22px_60px_rgba(68,44,22,0.10)]">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ece2d4]">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-black">Open capsule</h3>
                  <p className="text-sm text-[#6c5a4e]">
                    Load one capsule and open it after its date.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#876544]">
                    Capsule ID
                  </span>
                  <input
                    className="rounded-2xl border border-[#2e231d]/15 bg-[#fcfaf6] px-4 py-3 outline-none"
                    value={capsuleIdInput}
                    onChange={(event) => setCapsuleIdInput(event.target.value)}
                  />
                </label>
              </div>

              <button
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d6c1a1] px-4 py-3 font-semibold text-[#2e231d] disabled:opacity-50"
                disabled={!canOpen || writing || confirming}
                onClick={openCapsule}
              >
                {writing || confirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Open capsule
              </button>
            </section>

            <section className="rounded-[34px] border border-[#2e231d] bg-[#2e231d] p-5 text-white shadow-[0_22px_60px_rgba(68,44,22,0.10)]">
              <h3 className="text-2xl font-black">Archive feed</h3>
              <p className="mt-4 min-h-16 text-sm leading-6 text-[#f3e7da]">
                {statusText}
              </p>

              {!memoryCapsuleContractAddress ? (
                <p className="rounded-[18px] border border-white/15 bg-white/10 p-3 text-xs leading-6 text-[#f3e7da]">
                  Add `NEXT_PUBLIC_MEMORY_CAPSULE_CONTRACT_ADDRESS` after
                  deploying the memory capsule contract, then redeploy Vercel.
                </p>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
