import { TrendingUp, TrendingDown, ExternalLink, ImageIcon } from "lucide-react";

export interface ArtCardProps {
  image?: string | null;
  creator?: string;
  name?: string;
  priceEth?: string;
  change24h?: number;
  volumeEth?: string;
  contractAddress?: string;
  onClick?: () => void;
}

export function ArtCard({
  image,
  creator = "unknown.subframe.eth",
  name = "Untitled Art",
  priceEth = "0.0000",
  change24h = 0,
  volumeEth = "0.00",
  contractAddress,
  onClick,
}: ArtCardProps) {
  const isUp = change24h >= 0;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col rounded-2xl border border-white/[0.07] bg-[#0e0e0e] overflow-hidden cursor-pointer hover:border-[#CBFF4D]/25 transition-all duration-200"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CBFF4D]/15 to-transparent" />

      <div className="aspect-square w-full overflow-hidden bg-[#111]">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-white/10" />
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{name}</div>
            <div className="text-xs text-white/35 font-mono truncate mt-0.5">{creator}</div>
          </div>
          {contractAddress && (
            <a
              href={`https://dexscreener.com/base/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 text-white/20 hover:text-[#CBFF4D] transition-colors mt-0.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
          <div>
            <div className="text-base font-black font-mono text-white">{priceEth} ETH</div>
            <div className="text-[10px] text-white/30 mt-0.5">Vol: {volumeEth} ETH</div>
          </div>
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
              isUp
                ? "text-emerald-400 bg-emerald-400/10"
                : "text-red-400 bg-red-400/10"
            }`}
          >
            {isUp ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {isUp ? "+" : ""}
            {change24h.toFixed(1)}%
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="w-full mt-1 py-2.5 rounded-xl bg-[#CBFF4D]/10 border border-[#CBFF4D]/20 text-[#CBFF4D] text-xs font-bold hover:bg-[#CBFF4D]/20 hover:border-[#CBFF4D]/40 transition-all"
        >
          Buy on Uniswap
        </button>
      </div>
    </div>
  );
}
