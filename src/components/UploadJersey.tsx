import { useState } from "react";
import { X, Upload, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge, JerseyType } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface UploadJerseyProps {
  isOpen: boolean;
  onClose: () => void;
}

const jerseyTypes: JerseyType[] = [
  "Home",
  "Away",
  "Third",
  "Fourth",
  "Special Edition",
  "GK Home",
  "GK Away",
  "GK Third",
];

const badges: Badge[] = [
  "Champions League",
  "Premier League",
  "Serie A",
  "La Liga",
  "Bundesliga",
  "FIFA Club WC",
  "Other",
];

const seasons = Array.from({ length: 36 }, (_, i) => {
  const year = 2025 - i;
  return `${year}/${(year + 1).toString().slice(2)}`;
});

export const UploadJersey = ({ isOpen, onClose }: UploadJerseyProps) => {
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [club, setClub] = useState("");
  const [season, setSeason] = useState("");
  const [type, setType] = useState<JerseyType | "">("");
  const [hasPlayer, setHasPlayer] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [playerNumber, setPlayerNumber] = useState("");
  const [selectedBadges, setSelectedBadges] = useState<Badge[]>([]);
  const [condition, setCondition] = useState([8]);
  const [notes, setNotes] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  if (!isOpen) return null;

  const totalSteps = 9;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map((file) => URL.createObjectURL(file));
      setImages((prev) => [...prev, ...newImages].slice(0, 10));
    }
  };

  const toggleBadge = (badge: Badge) => {
    setSelectedBadges((prev) =>
      prev.includes(badge) ? prev.filter((b) => b !== badge) : [...prev, badge]
    );
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = () => {
    toast({
      title: "Jersey Uploaded!",
      description: "Your jersey has been added to your wardrobe.",
    });
    onClose();
    // Reset form
    setStep(1);
    setImages([]);
    setClub("");
    setSeason("");
    setType("");
    setHasPlayer(false);
    setPlayerName("");
    setPlayerNumber("");
    setSelectedBadges([]);
    setCondition([8]);
    setNotes("");
    setIsPublic(true);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return images.length >= 4;
      case 2:
        return club && season;
      case 3:
        return type;
      case 4:
        return !hasPlayer || (playerName && playerNumber);
      default:
        return true;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Upload Jersey</h2>
                <p className="text-sm text-muted-foreground">
                  Step {step} of {totalSteps}
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.round((step / totalSteps) * 100)}%
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Step 1: Images */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Upload Images</h3>
                  <p className="text-sm text-muted-foreground">
                    Add 4-10 photos of your jersey
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-secondary">
                      <img src={img} alt={`Jersey ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImages(images.filter((_, i) => i !== index))}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/90 flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {images.length < 10 && (
                    <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Add Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Club & Season */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Club & Season</h3>
                  <p className="text-sm text-muted-foreground">
                    Select the club and season
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="club">Club</Label>
                    <Input
                      id="club"
                      placeholder="e.g., FC Barcelona"
                      value={club}
                      onChange={(e) => setClub(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="season">Season</Label>
                    <Select value={season} onValueChange={setSeason}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select season" />
                      </SelectTrigger>
                      <SelectContent>
                        {seasons.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Jersey Type */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Jersey Type</h3>
                  <p className="text-sm text-muted-foreground">
                    What type of jersey is this?
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {jerseyTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-colors text-left",
                        type === t
                          ? "border-primary bg-secondary"
                          : "border-border hover:border-muted"
                      )}
                    >
                      <span className="font-medium">{t}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Player Print */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Player Print</h3>
                  <p className="text-sm text-muted-foreground">
                    Does the jersey have a player name and number?
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={hasPlayer} onCheckedChange={setHasPlayer} />
                  <Label>Has player print</Label>
                </div>
                {hasPlayer && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="playerName">Player Name</Label>
                      <Input
                        id="playerName"
                        placeholder="e.g., Messi"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="playerNumber">Number</Label>
                      <Input
                        id="playerNumber"
                        type="number"
                        placeholder="e.g., 10"
                        value={playerNumber}
                        onChange={(e) => setPlayerNumber(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Badges */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Competition Badges</h3>
                  <p className="text-sm text-muted-foreground">
                    Select any badges on the jersey
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {badges.map((badge) => (
                    <button
                      key={badge}
                      onClick={() => toggleBadge(badge)}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-colors text-left relative",
                        selectedBadges.includes(badge)
                          ? "border-primary bg-secondary"
                          : "border-border hover:border-muted"
                      )}
                    >
                      <span className="font-medium text-sm">{badge}</span>
                      {selectedBadges.includes(badge) && (
                        <Check className="w-5 h-5 text-primary absolute top-2 right-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6: Condition */}
            {step === 6 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Condition</h3>
                  <p className="text-sm text-muted-foreground">
                    Rate the condition of your jersey (1-10)
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-primary">{condition[0]}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {condition[0] <= 3 && "Poor - Significant wear"}
                      {condition[0] > 3 && condition[0] <= 6 && "Good - Minor wear"}
                      {condition[0] > 6 && condition[0] <= 8 && "Very Good - Light wear"}
                      {condition[0] > 8 && "Excellent - Like new"}
                    </div>
                  </div>
                  <Slider
                    value={condition}
                    onValueChange={setCondition}
                    min={1}
                    max={10}
                    step={1}
                    className="mt-6"
                  />
                </div>
              </div>
            )}

            {/* Step 7: Notes */}
            {step === 7 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Additional Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    Add any additional information (optional)
                  </p>
                </div>
                <Textarea
                  placeholder="e.g., Signed by player, matchday worn, limited edition..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                />
              </div>
            )}

            {/* Step 8: Visibility */}
            {step === 8 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Visibility</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose who can see this jersey
                  </p>
                </div>
                <div className="space-y-4">
                  <button
                    onClick={() => setIsPublic(true)}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 transition-colors text-left",
                      isPublic ? "border-primary bg-secondary" : "border-border hover:border-muted"
                    )}
                  >
                    <div className="font-semibold">Public</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Everyone can see this jersey in your collection
                    </div>
                  </button>
                  <button
                    onClick={() => setIsPublic(false)}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 transition-colors text-left",
                      !isPublic ? "border-primary bg-secondary" : "border-border hover:border-muted"
                    )}
                  >
                    <div className="font-semibold">Private</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Only you can see this jersey
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 9: Summary */}
            {step === 9 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Summary</h3>
                  <p className="text-sm text-muted-foreground">
                    Review your jersey details
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    {images.slice(0, 4).map((img, i) => (
                      <img key={i} src={img} alt="" className="aspect-square rounded-lg object-cover" />
                    ))}
                  </div>
                  <div className="bg-secondary rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Club:</span>
                      <span className="font-medium">{club}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Season:</span>
                      <span className="font-medium">{season}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{type}</span>
                    </div>
                    {hasPlayer && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Player:</span>
                        <span className="font-medium">
                          {playerName} #{playerNumber}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Condition:</span>
                      <span className="font-medium">{condition[0]}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Visibility:</span>
                      <span className="font-medium">{isPublic ? "Public" : "Private"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border bg-card p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <Button variant="outline" onClick={handleBack} disabled={step === 1}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {step < totalSteps ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinish}>
                <Check className="w-4 h-4 mr-2" />
                Finish Upload
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
