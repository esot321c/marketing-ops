import { CopyText } from "./CopyText";

export function CopyPrompt({ prompt }: { prompt: string }) {
  return <CopyText text={prompt} label="Paste this into the chat" />;
}
