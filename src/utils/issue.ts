import { Context } from "../types/context";
import { GitHubIssue, GitHubPayload, HandlerReturnValuesNoVoid, IssueType } from "../types/payload";
import { LogReturn } from "../adapters/supabase/helpers/logs";

export function isParentIssue(body: string) {
  const parentPattern = /-\s+\[( |x)\]\s+#\d+/;
  return body.match(parentPattern);
}

export async function getAssignedIssues(context: Context, username: string): Promise<GitHubIssue[]> {
  const payload = context.payload;

  try {
    return (await context.octokit.paginate(
      context.octokit.issues.listForRepo,
      {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        state: IssueType.OPEN,
        per_page: 1000,
      },
      ({ data: issues }) => issues.filter((issue) => !issue.pull_request && issue.assignee && issue.assignee.login === username)
    )) as GitHubIssue[];
  } catch (err: unknown) {
    context.logger.fatal("Fetching assigned issues failed!", err);
    return [];
  }
}

export async function addCommentToIssue(context: Context, message: HandlerReturnValuesNoVoid) {
  let comment = message as string;
  if (message instanceof LogReturn) {
    comment = message.logMessage.diff;
    console.trace("one of the places that metadata is being serialized as an html comment. this one is unexpected and serves as a fallback");
    const metadataSerialized = JSON.stringify(message.metadata);
    const metadataSerializedAsComment = `<!-- ${metadataSerialized} -->`;
    comment = comment.concat(metadataSerializedAsComment);
  }

  const { payload } = context;

  const issueNumber = payload.issue.number;
  try {
    await context.octokit.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issueNumber,
      body: comment,
    });
  } catch (e: unknown) {
    context.logger.fatal("Adding a comment failed!", e);
  }
}

//// Pull Requests \\\\

export async function addAssignees(context: Context, issueNo: number, assignees: string[]) {
  const payload = context.payload as GitHubPayload;

  try {
    await context.octokit.rest.issues.addAssignees({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issueNo,
      assignees,
    });
  } catch (e: unknown) {
    throw context.logger.fatal("Adding the assignee failed", { assignee: assignees, issueNo }, e);
  }
}

export async function getAllPullRequests(context: Context, state: "open" | "closed" | "all" = "open") {
  const payload = context.payload as GitHubPayload;

  try {
    return await context.octokit.paginate(context.octokit.rest.pulls.list, {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      state,
      per_page: 100,
    });
  } catch (err: unknown) {
    context.logger.fatal("Fetching all pull requests failed!", err);
    return [];
  }
}

export async function getAllPullRequestReviews(context: Context, pullNumber: number, format: "raw" | "html" | "text" | "full" = "raw") {
  const payload = context.payload;

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  try {
    return await context.octokit.paginate(context.octokit.rest.pulls.listReviews, {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      mediaType: {
        format,
      },
    });
  } catch (err: unknown) {
    console.error("Fetching all pull request reviews failed!", err);
    return [];
  }
}
