"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

interface NavItem {
  href: string;
  label: string;
  disabled?: boolean;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/charts", label: "Grafici" },
  { href: "/signals", label: "Segnali", disabled: true },
  {
    href: "/analysis",
    label: "Analisi",
    children: [
      { href: "/analysis/volatility", label: "Volatilità" },
      { href: "/analysis/rsi", label: "RSI" },
    ],
  },
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
          if (item.disabled) {
            return (
              <li key={item.href} className={styles.disabled} title="In arrivo">
                {item.label}
              </li>
            );
          }
          if (item.children) {
            const groupActive = pathname.startsWith(item.href);
            return (
              <li key={item.href} className={styles.group}>
                <Link
                  href={item.children[0].href}
                  className={groupActive ? styles.groupActive : undefined}
                >
                  {item.label}
                </Link>
                <ul className={styles.subnav}>
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className={
                          pathname === child.href ? styles.active : undefined
                        }
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={pathname === item.href ? styles.active : undefined}
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
