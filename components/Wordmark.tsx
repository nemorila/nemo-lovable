import { cn } from "@/utils/cn";

export default function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-label-large font-semibold text-accent-black whitespace-nowrap",
        className,
      )}
    >
      Enkelsida AI
    </span>
  );
}
