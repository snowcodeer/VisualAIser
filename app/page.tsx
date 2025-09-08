// highlight-start
import { fetchPersonas } from "@speechmatics/flow-client-react";
import { Controls } from "@/components/Controls";
import { TranscriptView } from "@/components/TranscriptView";
// highlight-end
import { Providers } from "./providers";

export default async function Home() {
  // highlight-start
  const fetchedPersonas = await fetchPersonas();
  
  // Add custom template ID from environment variables
  const customTemplateId = process.env.CUSTOM_TEMPLATE_ID;
  const customTemplateName = process.env.CUSTOM_TEMPLATE_NAME || "My Custom Template";
  
  const personas = {
    ...fetchedPersonas,
    ...(customTemplateId && { [customTemplateId]: { name: customTemplateName } })
  };
  // highlight-end

  return (
    <main>
      <h1>Speechmatics NextJS Flow Example</h1>
      <Providers>
        {/* highlight-start */}
        <div className="h-full min-h-0">
          <Controls personas={personas} />
          <TranscriptView />
        </div>
        {/* highlight-end */}
      </Providers>
    </main>
  );
}
