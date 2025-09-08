# VisualAIser

A Next.js application that demonstrates Speechmatics Flow voice AI with tool calling capabilities. This project allows users to interact with AI agents through voice commands and execute specific actions like opening documents.

## Features

- **Voice AI Integration**: Real-time voice interaction with Speechmatics Flow
- **Tool Calling**: AI agents can execute specific functions based on voice commands
- **Annual Report Access**: Say "open annual report" to automatically open a Google Sheets document
- **Company Policy Access**: Say "open company policy" to automatically open the company policy document
- **Secure Implementation**: No CSP violations, secure link handling
- **Modern UI**: Clean, responsive interface with real-time transcript display

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## Environment Setup

Create a `.env.local` file in the root directory with your Speechmatics API credentials:

```env
API_KEY=your_speechmatics_api_key
CUSTOM_TEMPLATE_ID=your_template_id
CUSTOM_TEMPLATE_NAME=Your Template Name
```

## How to Use

1. **Start a Conversation**: Click the "Start" button and select a persona
2. **Voice Commands**: Speak naturally to interact with the AI agent
3. **Tool Calling**: Say "open annual report" or "open company policy" to automatically open documents
4. **View Transcript**: See the conversation history in real-time

## Tool Calling Implementation

This project demonstrates how to implement tool calling with Speechmatics Flow:

### Tool Definition
```javascript
{
  type: "function",
  function: {
    name: "open_annual_report",
    description: "Use this to open the annual report Google Sheets document.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "The action to perform"
        }
      },
      required: ["action"]
    }
  }
}
```

### Event Handling
- **ToolInvoke**: Listens for tool calls from the AI agent
- **ToolResult**: Sends results back to the server
- **Automatic Link Opening**: Uses `window.open()` to open links in new tabs

### Security Features
- **No CSP Violations**: Secure implementation without `unsafe-eval`
- **User-Initiated Actions**: Links open only when triggered by user speech
- **Secure Attributes**: Proper `rel="noopener noreferrer"` for external links

## Project Structure

- `components/Controls.tsx` - Main control component with tool calling logic
- `components/TranscriptView.tsx` - Real-time transcript display
- `app/actions.ts` - Server actions for JWT generation
- `next.config.ts` - Next.js configuration for audio worklets

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
