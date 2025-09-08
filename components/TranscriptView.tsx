"use client";
import { useFlowEventListener } from "@speechmatics/flow-client-react";
import {
  transcriptGroupKey,
  useFlowTranscript,
  wordsToText,
} from "@speechmatics/use-flow-transcript";
import { useEffect, useRef } from "react";

export function TranscriptView() {
  const transcriptGroups = useFlowTranscript();

  useFlowEventListener("message", ({ data }) => {
    if (data.message === "Error") {
      throw new Error("Error message from server", { cause: data.error });
    }
  });

  useFlowEventListener("socketError", (e) => {
    throw new Error("Socket error", { cause: e });
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current) {
      const element = scrollRef.current;
      element.scrollTop = element.scrollHeight;
    }
  });

  return (
    <section className="h-full min-h-0">
      <h3>Transcript</h3>
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto min-h-0 flex flex-col gap-2"
        style={{
          scrollBehavior: "smooth",
        }}
      >
        {transcriptGroups.map((group) => (
          <div
            className={`flex flex-row ${group.type === "agent" ? "justify-start" : "justify-end"}`}
            key={transcriptGroupKey(group)}
          >
            <div
              className={`h-full flex flex-col gap-1 p-2 w-3/4 rounded-md ${group.type === "agent" ? "bg-amber-50" : "bg-blue-50"}`}
            >
              <h6>
                {group.type === "agent"
                  ? "Agent"
                  : group.speaker.replace("S", "Speaker ")}
              </h6>
              <p className="flex-1">
                {group.type === "agent"
                  ? group.data.map((response) => response.text).join(" ")
                  : wordsToText(group.data)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
