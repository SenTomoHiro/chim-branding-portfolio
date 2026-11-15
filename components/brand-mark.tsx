import Link from "next/link";
import styles from "./editorial.module.css";

export function BrandMark() {
  return (
    <header className={`feedMasthead ${styles.masthead}`}>
      <Link href="/" className={`brandMark ${styles.mark}`} aria-label="CHIM 首页">
        CHIM<sup>®</sup>
      </Link>
      <span className={styles.label}>Selected work</span>
    </header>
  );
}
