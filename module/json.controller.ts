import type { Request } from "../mod.ts";

export default (request: Request) => {
  request.json({ message: "hello" });
};