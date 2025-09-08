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
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isIframeOpen, setIsIframeOpen] = useState(false);
  const {
    startConversation,
    endConversation,
    sendAudio,
    sendMessage,
    socketState,
    sessionId,
  } = useFlow() as any;

  const { startRecording, stopRecording, audioContext, isRecording } =
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
                description: "Use this to open the annual report Google Sheets document in a controllable iframe.",
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
            },
            {
              type: "function",
              function: {
                name: "open_company_policy",
                description: "Use this to open the company policy Google Doc document in a controllable iframe.",
                parameters: {
                  type: "object",
                  properties: {
                    action: {
                      type: "string",
                      description: "The action to perform - should be 'open' when user says 'open company policy'"
                    },
                    document: {
                      type: "string",
                      description: "The document to open - should be 'company policy'"
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
      ({ data }: { data: any }) => {
        console.log("📨 Flow message received:", data);
        
        // Handle ToolInvoke messages here since they come through the message event
        if (data.message === "ToolInvoke") {
          console.log("🔧 ToolInvoke received via message event:", data);
          
          if (data.function.name === "open_annual_report") {
            console.log("Opening annual report with parameters:", data.function.arguments);
            
            // Open the Google Sheets document in iframe
            const link = "https://docs.google.com/spreadsheets/d/1dyl-WTWUXjN3kp5QhvuNOaH6Xyqc38xh5ZIb9cfHNIY/edit?gid=0#gid=0";
            
            // Set iframe URL and open iframe
            setIframeUrl(link);
            setIsIframeOpen(true);
            
            // Add to tool call history
            setToolCallHistory(prev => [{
              id: data.id,
              name: data.function.name,
              timestamp: new Date(),
              link: link,
              status: 'success'
            }, ...prev]);
            
            // Send ToolResult back to the server
            sendMessage({
              message: "ToolResult",
              id: data.id,
              status: "ok",
              content: "Annual report opened in controllable iframe."
            });
          }
          
          
          if (data.function.name === "open_company_policy") {
            console.log("Opening company policy with parameters:", data.function.arguments);
            
            // Open the company policy Google Doc in iframe
            const link = "https://docs.google.com/document/d/1GOpjra_9LRFVl8mkZVk0OqhGxr5fLChp3OFpXAEiMjA/edit?tab=t.0#heading=h.hgwnk2xqls48";
            
            // Set iframe URL and open iframe
            setIframeUrl(link);
            setIsIframeOpen(true);
            
            // Add to tool call history
            setToolCallHistory(prev => [{
              id: data.id,
              name: data.function.name,
              timestamp: new Date(),
              link: link,
              status: 'success'
            }, ...prev]);
            
            // Send ToolResult back to the server
            sendMessage({
              message: "ToolResult",
              id: data.id,
              status: "ok",
              content: "Company policy opened in controllable iframe."
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
    <>
      {/* Controllable Iframe */}
      {isIframeOpen && iframeUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-6xl max-h-5xl flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">
                {iframeUrl?.includes('spreadsheets') ? 'Annual Report' : 'Company Policy'} - Voice Controlled
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsIframeOpen(false)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  Minimize
                </button>
                <button
                  onClick={() => {
                    setIsIframeOpen(false);
                    setIframeUrl(null);
                  }}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                id="controllable-iframe"
                src={iframeUrl}
                className="w-full h-full border-0"
                title={iframeUrl?.includes('spreadsheets') ? 'Annual Report' : 'Company Policy'}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
            <div className="p-2 bg-gray-50 border-t text-xs text-gray-600">
              💡 Document opened in controllable iframe
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      <div className="fixed top-4 right-4 z-50">
      {/* Debug Panel Toggle Button */}
      <button
        onClick={() => setIsDebugPanelOpen(!isDebugPanelOpen)}
        className="mb-2 p-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors shadow-lg"
        title="Toggle Debug Panel"
      >
        <svg
          className={`w-5 h-5 transition-transform ${isDebugPanelOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Debug Panel */}
      {isDebugPanelOpen && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Debug Panel</h3>
          
          {/* Controls Section */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Voice Controls</h4>
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <div className="grid grid-cols-1 gap-2">
                <MicrophoneSelect disabled={disableSelects} />
                <select name="personaId" disabled={disableSelects} className="p-2 border border-gray-300 rounded text-sm">
                  {Object.entries(personas).map(([id, persona]) => (
                    <option key={id} value={id} label={persona.name} />
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <ActionButton />
                <MuteMicrophoneButton isRecording={isRecording} />
              </div>
            </form>
          </div>
          
          {/* Tool Call History Section */}
          {toolCallHistory.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Tool Call History</h4>
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-left hover:bg-gray-100 transition-colors text-sm"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-gray-800">
                      History ({toolCallHistory.length})
                    </span>
                    <svg
                      className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 max-h-40 overflow-y-auto">
                    {toolCallHistory.map((toolCall, index) => (
                      <div key={toolCall.id} className="p-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h5 className="text-xs font-medium text-gray-800 capitalize">
                              {toolCall.name.replace(/_/g, ' ')}
                            </h5>
                            <p className="text-xs text-gray-500">
                              {toolCall.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                          <span className={`px-1 py-0.5 text-xs rounded ${
                            toolCall.status === 'success' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {toolCall.status}
                          </span>
                        </div>
                        
                        {toolCall.link && (
                          <div className="mt-1">
                            <a
                              href={toolCall.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-xs break-all"
                              onClick={() => window.open(toolCall.link, '_blank')}
                            >
                              {toolCall.link.length > 50 ? `${toolCall.link.substring(0, 50)}...` : toolCall.link}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Section */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>🔌 Socket:</span>
                <span className={socketState === 'open' ? 'text-green-600' : 'text-red-600'}>
                  {socketState ?? "(uninitialized)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>💬 Session:</span>
                <span className={sessionId ? 'text-green-600' : 'text-gray-500'}>
                  {sessionId ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>🎤 Microphone:</span>
                <span className={isRecording ? 'text-green-600' : 'text-gray-500'}>
                  {isRecording ? "Recording" : "Not Recording"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
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

function MuteMicrophoneButton({ isRecording }: { isRecording: boolean }) {
  const { mute, unmute, isMuted } = usePCMAudioRecorderContext();
  if (!isRecording) return null;

  return (
    <button type="button" onClick={isMuted ? unmute : mute}>
      {isMuted ? "Unmute microphone" : "Mute microphone"}
    </button>
  );
}
