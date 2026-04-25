import Link from "next/link";
import { ShoppingBasket } from "lucide-react";

export function TopNav() {
  return (
    <header className="border-b bg-white">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4"
      >
        <Link href="/" className="flex items-center gap-2 font-bold text-boots-navy">
          <span className="rounded bg-boots-navy px-2 py-0.5 text-sm text-white">Boots</span>
          <span className="hidden text-sm text-muted-foreground md:inline">Ireland</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/mission"
            className="hidden text-sm font-medium text-boots-navy hover:underline md:inline"
          >
            Travel mission
          </Link>
          <button
            type="button"
            aria-label="Basket"
            className="rounded-full p-2 text-boots-navy hover:bg-boots-sky"
          >
            <ShoppingBasket className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </nav>
    </header>
  );
}
