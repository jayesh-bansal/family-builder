import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// These components/hooks auto-prefix the locale to all paths.
// Use Link from here instead of next/link, and useRouter instead of next/navigation.
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
