import Link from "next/link";

import Wordmark from "@/components/Wordmark";

export default function HeaderBrandKit() {
  return (
    <Link className="flex items-center relative" href="/">
      <Wordmark />
    </Link>
  );
}
