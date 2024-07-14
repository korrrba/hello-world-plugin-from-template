import { Context } from "../types";
import { addCommentToIssue } from "../utils/issue";

export async function userHelloWorld(context: Context): Promise<{ output: string | null }> {
  const { payload } = context;
  const { comment } = payload as Context<"issue_comment.created">["payload"];
  const directive = comment.body.split(" ")[0].replace("/", "");

  if (directive === "hello") {
    await addCommentToIssue(context, "Hello world plugin from template!\n");
  }
  return { output: null };
}
