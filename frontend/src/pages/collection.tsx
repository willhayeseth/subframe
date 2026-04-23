import { motion } from "framer-motion";
import { useAppKitAccount } from "@reown/appkit/react";
import { Link } from "wouter";
import { Wallet, ArrowUpRight, ImageIcon } from "lucide-react";
import { ArtCard } from "@/components/art-card";

const MOCK_COLLECTION = [
  {
    id: 1,
    image: null,
    creator: "vitalik.subframe.eth",
    name: "Vitalik Art",
    priceEth: "0.0045",
    change24h: 18.3,
    volumeEth: "1.23",
    boughtAt: "0.0028",
  },
  {
    id: 2,
    image: null,
    creator: "hayes.subframe.eth",
    name: "Hayes Art",
    priceEth: "0.0012",
    change24h: -8.5,
    volumeEth: "0.31",
    boughtAt: "0.0015",
  },
  {
    id: 3,
    image: null,
    creator: "cryptoninja.subframe.eth",
    name: "CryptoNinja Art",
    priceEth: "0.0089",
    change24h: 42.1,
    volumeEth: "3.77",
    boughtAt: "0.0050",
  },
];

export default function Collection() {
  const { address, isConnected } = useAppKitAccount();

  if (!isConnected || !address) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-5 bg-[#0C0C0C]">
        <div className="w-16 h-16 rounded-2xl bg-[#CBFF4D]/10 border border-[#CBFF4D]/20 flex items-center justify-center mb-5">
          <Wallet className="w-8 h-8 text-[#CBFF4D]" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Connect Your Wallet</h1>
        <p className="text-white/40 text-sm text-center max-w-xs mb-8">
          Connect your wallet to see the art tokens you hold.
        </p>
        <Link href="/claim">
          <button className="flex items-center gap-2 px-6 py-3 btn-lime rounded-full text-sm font-black">
            Get Started
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 px-5 py-12 bg-[#0C0C0C]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="text-xs font-mono text-white/30 mb-3 uppercase tracking-widest">My Collection</div>
          <h1 className="text-4xl font-black text-white mb-2">
            Art{" "}
            <span className="text-[#CBFF4D]">Holdings</span>
          </h1>
          <p className="text-white/40 text-sm font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </motion.div>

        {MOCK_COLLECTION.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/40 text-sm mb-2">No art tokens held yet</p>
            <p className="text-white/20 text-xs">
              Browse the registry and buy art from creators
            </p>
            <Link href="/explore">
              <button className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-sm font-semibold transition-all">
                Browse Art
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-10">
              {MOCK_COLLECTION.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <div className="relative">
                    <ArtCard
                      image={item.image}
                      creator={item.creator}
                      name={item.name}
                      priceEth={item.priceEth}
                      change24h={item.change24h}
                      volumeEth={item.volumeEth}
                    />
                    <div className="mt-2 px-1 flex items-center justify-between text-xs">
                      <span className="text-white/25">Bought at {item.boughtAt} ETH</span>
                      <span
                        className={
                          parseFloat(item.priceEth) >= parseFloat(item.boughtAt)
                            ? "text-emerald-400 font-bold"
                            : "text-red-400 font-bold"
                        }
                      >
                        {parseFloat(item.priceEth) >= parseFloat(item.boughtAt) ? "+" : ""}
                        {(
                          ((parseFloat(item.priceEth) - parseFloat(item.boughtAt)) /
                            parseFloat(item.boughtAt)) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-5 rounded-2xl border border-white/[0.07] bg-[#0e0e0e] flex flex-wrap gap-8">
              <div>
                <div className="text-2xl font-black font-mono text-[#CBFF4D]">
                  {MOCK_COLLECTION.length}
                </div>
                <div className="text-xs text-white/30 mt-1 uppercase tracking-wider">Art Held</div>
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-white">
                  {MOCK_COLLECTION.reduce((s, i) => s + parseFloat(i.priceEth), 0).toFixed(4)} ETH
                </div>
                <div className="text-xs text-white/30 mt-1 uppercase tracking-wider">Current Value</div>
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-white">
                  {MOCK_COLLECTION.reduce((s, i) => s + parseFloat(i.boughtAt), 0).toFixed(4)} ETH
                </div>
                <div className="text-xs text-white/30 mt-1 uppercase tracking-wider">Total Cost</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
