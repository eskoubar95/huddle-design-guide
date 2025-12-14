import type { AIVisionResults } from "@/hooks/use-jersey-vision-ai";

interface AIVisionResultsProps {
  results: AIVisionResults | null;
  isAnalyzing: boolean;
}

export function AIVisionResultsDisplay({ results, isAnalyzing }: AIVisionResultsProps) {
  if (isAnalyzing) {
    return (
      <div className="p-4 border rounded-lg bg-card">
        <p className="text-sm text-muted-foreground">🔍 Analyzing images with AI Vision...</p>
      </div>
    );
  }

  if (!results) return null;

  return (
    <div className="p-4 border rounded-lg bg-card space-y-2">
      <p className="text-sm font-medium">✨ AI Detection Results:</p>
      <div className="text-sm text-muted-foreground space-y-1">
        {results.club && <p>Club: {results.club}</p>}
        {results.season && <p>Season: {results.season}</p>}
        {results.jerseyType && <p>Type: {results.jerseyType}</p>}
        {results.playerName && <p>Player: {results.playerName}</p>}
        {results.playerNumber && <p>Number: {results.playerNumber}</p>}
        {results.confidence && (
          <p className="text-xs">Confidence: {Math.round(results.confidence)}%</p>
        )}
      </div>
    </div>
  );
}

