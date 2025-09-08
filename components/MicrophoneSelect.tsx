"use client";
import { useAudioDevices } from "@speechmatics/browser-audio-input-react";
import { useFlow } from "@speechmatics/flow-client-react";

export function MicrophoneSelect({ disabled }: { disabled?: boolean }) {
  const devices = useAudioDevices();

  switch (devices.permissionState) {
    case "prompt":
      return (
        <select
          onClick={devices.promptPermissions}
          onKeyDown={devices.promptPermissions}
        />
      );
    case "prompting":
      return <select aria-busy="true" />;
    case "granted": {
      return (
        <select name="deviceId" disabled={disabled}>
          {devices.deviceList.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      );
    }
    case "denied":
      return <select disabled />;
    default:
      devices satisfies never;
      return null;
  }
}
