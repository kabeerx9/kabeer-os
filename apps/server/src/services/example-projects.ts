import prisma from "@app-starter/db";
import type { ExampleProject as DbExampleProject } from "@app-starter/db/types";
import type {
  CreateExampleProjectInput,
  ExampleProject,
  UpdateExampleProjectInput,
} from "@app-starter/contracts/example-projects";
import { exampleProjectSchema } from "@app-starter/contracts/example-projects";

import {
  getOrCreateUserByClerkId,
  type UserProfileInput,
} from "@/services/user";

export type ExampleProjectsService = {
  listByClerkId: (clerkId: string) => Promise<ExampleProject[]>;
  createByClerkId: (
    clerkId: string,
    input: CreateExampleProjectInput,
    syncFromClerk: () => Promise<UserProfileInput>,
  ) => Promise<ExampleProject>;
  updateByClerkId: (
    clerkId: string,
    id: string,
    input: UpdateExampleProjectInput,
  ) => Promise<ExampleProject | null>;
  deleteByClerkId: (clerkId: string, id: string) => Promise<boolean>;
};

function serializeExampleProject(project: DbExampleProject): ExampleProject {
  return exampleProjectSchema.parse({
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  });
}

export async function listExampleProjectsByClerkId(clerkId: string): Promise<ExampleProject[]> {
  const projects = await prisma.exampleProject.findMany({
    where: { owner: { clerkId } },
    orderBy: { updatedAt: "desc" },
  });

  return projects.map(serializeExampleProject);
}

export async function createExampleProjectByClerkId(
  clerkId: string,
  input: CreateExampleProjectInput,
  syncFromClerk: () => Promise<UserProfileInput>,
): Promise<ExampleProject> {
  const owner = await getOrCreateUserByClerkId(clerkId, syncFromClerk);

  const project = await prisma.exampleProject.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      ownerId: owner.id,
    },
  });

  return serializeExampleProject(project);
}

export async function updateExampleProjectByClerkId(
  clerkId: string,
  id: string,
  input: UpdateExampleProjectInput,
): Promise<ExampleProject | null> {
  const existing = await prisma.exampleProject.findFirst({
    where: { id, owner: { clerkId } },
  });

  if (!existing) {
    return null;
  }

  const project = await prisma.exampleProject.update({
    where: { id: existing.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
  });

  return serializeExampleProject(project);
}

export async function deleteExampleProjectByClerkId(
  clerkId: string,
  id: string,
): Promise<boolean> {
  const result = await prisma.exampleProject.deleteMany({
    where: { id, owner: { clerkId } },
  });

  return result.count > 0;
}

export const defaultExampleProjectsService: ExampleProjectsService = {
  listByClerkId: listExampleProjectsByClerkId,
  createByClerkId: createExampleProjectByClerkId,
  updateByClerkId: updateExampleProjectByClerkId,
  deleteByClerkId: deleteExampleProjectByClerkId,
};
