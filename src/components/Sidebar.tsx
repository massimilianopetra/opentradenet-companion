"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

interface NavItem {
  href: string;
  label: string;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/charts", label: "Grafici" },
  { href: "/signals", label: "Segnali", disabled: true },
  { href: "/analysis", label: "Analisi", disabled: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className={styles.sidebar}>
      <Link href="/" className={styles.brand}>
        OpenTradeNet
      </Link>
      <ul className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          if (item.disabled) {
            return (
              <li key={item.href} className={styles.disabled} title="In arrivo">
                {item.label}
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={active ? styles.active : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
