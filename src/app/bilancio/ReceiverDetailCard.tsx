import type { BilancioReceiverStats } from "@/lib/types";
import { money, receiverGradient } from "./shared";

function AmountCell({
  value,
  colorHex,
  size = "17",
}: {
  value: number;
  colorHex: string;
  size?: "17" | "18";
}) {
  const sizeClass = size === "18" ? "text-[18px]" : "text-[17px]";
  if (value === 0) {
    return <span className={`${sizeClass} font-black text-white/25`}>{money(0)}</span>;
  }
  return (
    <span className={`${sizeClass} font-black`} style={{ color: colorHex }}>
      {money(value)}
    </span>
  );
}

export default function ReceiverDetailCard({ receiver }: { receiver: BilancioReceiverStats }) {
  return (
    <article
      className="rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.25)]"
      style={{ background: receiverGradient(receiver.ricevente) }}
    >
      <h3 className="mb-4 text-[28px] font-extrabold text-white">{receiver.ricevente}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-[640px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/20">
              <th className="px-[8px] py-[10px] text-left text-[13px] font-bold text-white/90">
                App
              </th>
              <th className="px-[8px] py-[10px] text-center text-[13px] font-bold text-white/90">
                ✅ Arrivato $
              </th>
              <th className="px-[8px] py-[10px] text-center text-[13px] font-bold text-white/90">
                ⏳ Arrivo $
              </th>
              <th className="px-[8px] py-[10px] text-center text-[13px] font-bold text-white/90">
                📋 Da fare $
              </th>
              <th className="px-[8px] py-[10px] text-center text-[13px] font-bold text-white/90">
                ❌ Fail $
              </th>
              <th className="px-[8px] py-[10px] text-center text-[13px] font-bold text-white/90">
                🎁 Amzn $
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/10 bg-black/20">
              <td className="px-[8px] py-[10px] text-[18px] font-black text-white">TOTALE</td>
              <td className="px-[8px] py-[10px] text-center">
                <AmountCell value={receiver.total.arrivato} colorHex="#86efac" size="18" />
              </td>
              <td className="px-[8px] py-[10px] text-center">
                <AmountCell value={receiver.total.arrivo} colorHex="#fde68a" size="18" />
              </td>
              <td className="px-[8px] py-[10px] text-center">
                <AmountCell value={receiver.total.daFare} colorHex="#c4b5fd" size="18" />
              </td>
              <td className="px-[8px] py-[10px] text-center">
                <AmountCell value={receiver.total.fail} colorHex="#fca5a5" size="18" />
              </td>
              <td className="px-[8px] py-[10px] text-center">
                <AmountCell value={receiver.total.amazon} colorHex="#fed7aa" size="18" />
              </td>
            </tr>
            {receiver.platforms.map((platform, index) => (
              <tr
                key={platform.app}
                className={`border-b border-white/10 ${index % 2 === 0 ? "bg-white/5" : "bg-transparent"}`}
              >
                <td className="px-[8px] py-[10px] text-[14px] font-bold text-white">
                  {platform.app}
                </td>
                <td className="px-[8px] py-[10px] text-center">
                  <AmountCell value={platform.arrivato} colorHex="#86efac" />
                </td>
                <td className="px-[8px] py-[10px] text-center">
                  <AmountCell value={platform.arrivo} colorHex="#fde68a" />
                </td>
                <td className="px-[8px] py-[10px] text-center">
                  <AmountCell value={platform.daFare} colorHex="#c4b5fd" />
                </td>
                <td className="px-[8px] py-[10px] text-center">
                  <AmountCell value={platform.fail} colorHex="#fca5a5" />
                </td>
                <td className="px-[8px] py-[10px] text-center">
                  <AmountCell value={platform.amazon} colorHex="#fed7aa" />
                </td>
              </tr>
            ))}
            <tr className="bg-black/15">
              <td className="px-[8px] py-[10px] text-[14px] font-bold text-white">
                {receiver.amazonRow.app}
              </td>
              <td className="px-[8px] py-[10px] text-center">
                <AmountCell value={receiver.amazonRow.arrivato} colorHex="#86efac" />
              </td>
              <td className="px-[8px] py-[10px] text-center">
                <AmountCell value={receiver.amazonRow.arrivo} colorHex="#fde68a" />
              </td>
              <td className="px-[8px] py-[10px] text-center">
                <AmountCell value={receiver.amazonRow.daFare} colorHex="#c4b5fd" />
              </td>
              <td className="px-[8px] py-[10px] text-center">
                <AmountCell value={receiver.amazonRow.fail} colorHex="#fca5a5" />
              </td>
              <td className="px-[8px] py-[10px] text-center">
                <AmountCell value={receiver.amazonRow.amazon} colorHex="#fed7aa" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}
