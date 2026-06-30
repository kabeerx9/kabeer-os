import prisma from "@app-starter/db";
import type { User } from "@app-starter/db/types";
import type { MeResponse } from "@app-starter/contracts/me";
import type { UserJSON } from "@clerk/fastify";

export type UserProfileInput = {
  clerkId: string;
  email?: string | null;
  name?: string | null;
  imageUrl?: string | null;
};

export function mapClerkApiUser(user: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  emailAddresses: Array<{ id: string; emailAddress: string }>;
  primaryEmailAddressId: string | null;
}): UserProfileInput {
  const primaryEmail =
    user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress;

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;

  return {
    clerkId: user.id,
    email: primaryEmail ?? null,
    name,
    imageUrl: user.imageUrl ?? null,
  };
}

export function mapClerkUser(user: UserJSON): UserProfileInput {
  const primaryEmail =
    user.email_addresses.find((entry) => entry.id === user.primary_email_address_id)?.email_address ??
    user.email_addresses[0]?.email_address;

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || null;

  return {
    clerkId: user.id,
    email: primaryEmail ?? null,
    name,
    imageUrl: user.image_url ?? null,
  };
}

export async function upsertUserFromClerk(profile: UserProfileInput): Promise<User> {
  return prisma.user.upsert({
    where: { clerkId: profile.clerkId },
    create: {
      clerkId: profile.clerkId,
      email: profile.email,
      name: profile.name,
      imageUrl: profile.imageUrl,
    },
    update: {
      email: profile.email,
      name: profile.name,
      imageUrl: profile.imageUrl,
    },
  });
}

export async function getOrCreateUserByClerkId(
  clerkId: string,
  syncFromClerk: () => Promise<UserProfileInput>,
): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) {
    return existing;
  }

  return upsertUserFromClerk(await syncFromClerk());
}

export async function deleteUserByClerkId(clerkId: string): Promise<void> {
  await prisma.user.deleteMany({ where: { clerkId } });
}

export async function updateAccountFromClerk(
  clerkId: string,
  input: { firstName?: string | null; lastName?: string | null },
  updateClerkUser: (
    userId: string,
    updateInput: { firstName?: string | null; lastName?: string | null },
  ) => Promise<Parameters<typeof mapClerkApiUser>[0]>,
): Promise<MeResponse> {
  const clerkUser = await updateClerkUser(clerkId, input);
  const user = await upsertUserFromClerk(mapClerkApiUser(clerkUser));
  return serializeUser(user);
}

export function serializeUser(user: User): MeResponse {
  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
