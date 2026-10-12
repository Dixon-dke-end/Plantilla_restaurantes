"use client";

import { getRepositories, type Repositories } from "./repositories";

/** Containers depend on ports only; this hands them the browser composition root. */
export function useRepositories(): Repositories {
  return getRepositories();
}
