import { createId as createCuid2 } from "@paralleldrive/cuid2";

export function createId(): string {
  return createCuid2();
}
