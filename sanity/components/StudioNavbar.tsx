import type { NavbarProps } from "sanity";
import styles from "./StudioNavbar.module.css";

export default function StudioNavbar(props: NavbarProps) {
  return (
    <div className={styles.navbar}>
      <a className={styles.backLink} href="/admin">Back to Admin</a>
      <div className={styles.defaultNavbar}>{props.renderDefault(props)}</div>
    </div>
  );
}
