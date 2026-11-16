import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * The signed-in org user. Sessions aren't enforced yet, so (like existing
 * pages) fall back to the first ADMIN user. Swap the fallback for a redirect
 * once auth is wired up.
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) return user;
    }
  } catch {
    // No session context (e.g. auth env vars not configured) — use fallback.
  }
  return prisma.user.findFirstOrThrow({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });
}
