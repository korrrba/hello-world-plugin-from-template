import { Context } from "../types";
import { addCommentToIssue } from "../utils/issue";

export async function userHelloWorld(context: Context): Promise<{ output: string | null }> {
  const { payload, logger, config } = context;
  const { issue, comment, sender, repository } = payload as Context<"issue_comment.created">["payload"];
  const directive = comment.body.split(" ")[0].replace("/", "");
  const { disabledCommands } = config;
  const isCommandDisabled = disabledCommands.some((command: string) => command === directive);

  if (isCommandDisabled) {
    await addCommentToIssue(context, "```diff\n! The /start command is disabled for this repository.\n```");
    throw logger.error(`The '/${directive}' command is disabled for this repository.`);
  }

  if (directive === "hello") {
    await addCommentToIssue(context, "```Hello world plugin from template!\n```");
  };
  return { output: null };
}
