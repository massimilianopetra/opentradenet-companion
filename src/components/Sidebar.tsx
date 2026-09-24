"use client";

import Link from "next/link";
import { useState } from "react";
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
      { href: "/analysis/macd", label: "MACD" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  // Explicit open/closed per group; unset means "open while inside it".
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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
            const expanded = openGroups[item.href] ?? groupActive;
            return (
              <li key={item.href} className={styles.group}>
                <button
                  type="button"
                  className={`${styles.groupToggle} ${groupActive ? styles.groupActive : ""}`}
                  aria-expanded={expanded}
                  onClick={() =>
                    setOpenGroups((prev) => ({
                      ...prev,
                      [item.href]: !expanded,
                    }))
                  }
                >
                  {item.label}
                  <svg
                    className={`${styles.chevron} ${expanded ? styles.chevronOpen : ""}`}
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 4l4 4-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {expanded && (
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
                )}
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
