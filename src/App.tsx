import { useState } from "react";
import { AppShell } from "./components/AppShell";
import { LibraryView } from "./components/LibraryView";

type OpenDesign = {
  project: string;
  fileName: string;
};

export default function App() {
  const [openDesign, setOpenDesign] = useState<OpenDesign | null>(null);

  return (
    <AppShell>
      {openDesign ? (
        <main className="editor-preview">
          <button type="button" onClick={() => setOpenDesign(null)}>
            Back
          </button>
          <p>
            {openDesign.project} / {openDesign.fileName}
          </p>
        </main>
      ) : (
        <LibraryView
          onOpenDesign={(project, fileName) => setOpenDesign({ project, fileName })}
        />
      )}
    </AppShell>
  );
}
