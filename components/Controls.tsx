"use client";
import {
  usePCMAudioListener,
  usePCMAudioRecorderContext,
} from "@speechmatics/browser-audio-input-react";
import {
  type AgentAudioEvent,
  useFlow,
  useFlowEventListener,
} from "@speechmatics/flow-client-react";
import { usePCMAudioPlayerContext } from "@speechmatics/web-pcm-player-react";
import { type FormEventHandler, useCallback, useState } from "react";
import { getJWT } from "@/app/actions";
import { MicrophoneSelect } from "@/components/MicrophoneSelect";

export function Controls({
  personas,
}: {
  personas: Record<string, { name: string }>;
}) {
  const [toolCallHistory, setToolCallHistory] = useState<Array<{
    id: string;
    name: string;
    timestamp: Date;
    link?: string;
    status: 'success' | 'error';
  }>>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const {
    startConversation,
    endConversation,
    sendAudio,
    sendMessage,
    socketState,
    sessionId,
  } = useFlow();

  const { startRecording, stopRecording, audioContext } =
    usePCMAudioRecorderContext();

  const startSession = useCallback(
    async ({
      personaId,
      recordingSampleRate,
    }: {
      personaId: string;
      recordingSampleRate: number;
    }) => {
      const jwt = await getJWT("flow");

      const conversationConfig = {
        template_id: personaId,
        template_variables: {
          // Tools are configured in the Speechmatics website, not here
        },
        tools: [
          {
            type: "function",
            function: {
              name: "open_annual_report",
              description: "Use this to open the annual report Google Sheets document. Return the link in your response so the user can click on it.",
              parameters: {
                type: "object",
                properties: {
                  action: {
                    type: "string",
                    description: "The action to perform - should be 'open' when user says 'open annual report'"
                  },
                  document: {
                    type: "string",
                    description: "The document to open - should be 'annual report'"
                  }
                },
                required: ["action"]
              }
            }
          }
        ]
      };

      console.log("🚀 Starting conversation with config:", conversationConfig);

      await startConversation(jwt, {
        config: conversationConfig,
        audioFormat: {
          type: "raw",
          encoding: "pcm_f32le",
          sample_rate: recordingSampleRate,
        },
      });
    },
    [startConversation],
  );

  const handleSubmit = useCallback<FormEventHandler>(
    async (e) => {
      e.preventDefault();

      if (!audioContext) {
        throw new Error("Audio context not initialized!");
      }

      if (socketState === "open" && sessionId) {
        stopRecording();
        endConversation();
        return;
      }

      const formData = new FormData(e.target as HTMLFormElement);

      const personaId = formData.get("personaId")?.toString();
      if (!personaId) throw new Error("No persona selected!");

      const deviceId = formData.get("deviceId")?.toString();
      if (!deviceId) throw new Error("No device selected!");

      await startSession({
        personaId,
        recordingSampleRate: audioContext.sampleRate,
      });
      await startRecording({ deviceId });
    },
    [
      startSession,
      startRecording,
      stopRecording,
      endConversation,
      socketState,
      sessionId,
      audioContext,
    ],
  );

  const { playAudio } = usePCMAudioPlayerContext();

  usePCMAudioListener(sendAudio);
  useFlowEventListener(
    "agentAudio",
    useCallback(
      ({ data }: AgentAudioEvent) => {
        if (socketState === "open" && sessionId) {
          playAudio(data);
        }
      },
      [socketState, sessionId, playAudio],
    ),
  );

  // Debug: Listen for all flow events to see what's happening
  useFlowEventListener(
    "message",
    useCallback(
      ({ data }) => {
        console.log("📨 Flow message received:", data);
        
        // Handle ToolInvoke messages here since they come through the message event
        if (data.message === "ToolInvoke") {
          console.log("🔧 ToolInvoke received via message event:", data);
          
          if (data.function.name === "open_annual_report") {
            console.log("Opening annual report with parameters:", data.function.arguments);
            
            // Open the Google Sheets document in a new tab
            const link = "https://docs.google.com/spreadsheets/d/1dyl-WTWUXjN3kp5QhvuNOaH6Xyqc38xh5ZIb9cfHNIY/edit?gid=0#gid=0";
            
            // Open the link in a new tab
            console.log("Annual report link ready:", link);
            window.open(link, '_blank');
            
            // Add to tool call history
            setToolCallHistory(prev => [{
              id: data.id,
              name: data.function.name,
              timestamp: new Date(),
              link: link,
              status: 'success'
            }, ...prev]);
            
            // Also copy to clipboard as a bonus
            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(link).then(() => {
                console.log("Link copied to clipboard");
              }).catch(() => {
                console.log("Could not copy to clipboard");
              });
            }
            
            // Send ToolResult back to the server
            sendMessage({
              message: "ToolResult",
              id: data.id,
              status: "ok",
              content: "Annual report link is now displayed below. Click to open!"
            });
          }
        }
      },
      [sendMessage]
    ),
  );




  // Disable selects when session is active.
  const disableSelects = !!sessionId;

  return (
    <section>
      <h3>Controls</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-4">
          <MicrophoneSelect disabled={disableSelects} />
          <select name="personaId" disabled={disableSelects}>
            {Object.entries(personas).map(([id, persona]) => (
              <option key={id} value={id} label={persona.name} />
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <ActionButton />
          <MuteMicrophoneButton />
        </div>
      </form>
      
      {/* Tool Call History Dropdown */}
      {toolCallHistory.length > 0 && (
        <div className="mt-4 relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-md text-left hover:bg-gray-100 transition-colors"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-800">
                Tool Call History ({toolCallHistory.length})
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
              {toolCallHistory.map((toolCall, index) => (
                <div key={toolCall.id} className="p-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-sm font-medium text-gray-800 capitalize">
                        {toolCall.name.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {toolCall.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      toolCall.status === 'success' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {toolCall.status}
                    </span>
                  </div>
                  
                  {toolCall.link && (
                    <div className="mt-2">
                      <a
                        href={toolCall.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
                        onClick={() => window.open(toolCall.link, '_blank')}
                      >
                        {toolCall.link}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ActionButton() {
  const { socketState, sessionId } = useFlow();

  if (
    socketState === "connecting" ||
    socketState === "closing" ||
    (socketState === "open" && !sessionId)
  ) {
    return (
      <button disabled aria-busy>
        <svg className="mr-3 size-5 animate-spin" viewBox="0 0 24 24">
          <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z" />
        </svg>
      </button>
    );
  }

  const running = socketState === "open" && sessionId;
  return (
    <button type="submit" className={running ? "bg-red-500" : undefined}>
      {running ? "Stop" : "Start"}
    </button>
  );
}

function MuteMicrophoneButton() {
  const { isRecording, mute, unmute, isMuted } = usePCMAudioRecorderContext();
  if (!isRecording) return null;

  return (
    <button type="button" onClick={isMuted ? unmute : mute}>
      {isMuted ? "Unmute microphone" : "Mute microphone"}
    </button>
  );
}
