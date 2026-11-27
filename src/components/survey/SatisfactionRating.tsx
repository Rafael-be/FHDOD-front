import { Button } from "../ui/Button";
import face1 from "../../assets/survey/satisfaction-1.png";
import face2 from "../../assets/survey/satisfaction-2.png";
import face3 from "../../assets/survey/satisfaction-3.png";
import face4 from "../../assets/survey/satisfaction-4.png";
import face5 from "../../assets/survey/satisfaction-5.png";

const faceByScore: Record<number, string> = { 1: face1, 2: face2, 3: face3, 4: face4, 5: face5 };
const meaningByScore: Record<number, string> = { 1: "Muito insatisfeito", 2: "Insatisfeito", 3: "Neutro", 4: "Satisfeito", 5: "Muito satisfeito" };

interface SatisfactionRatingProps {
  options: number[];
  selected: number | "skip" | null;
  disabled?: boolean;
  onSelect: (score: number) => void;
}

export function SatisfactionRating({ options, selected, disabled = false, onSelect }: SatisfactionRatingProps) {
  const scores = [...options].sort((a, b) => b - a).filter((score) => faceByScore[score]);
  return <div className="fhdod-satisfaction-rating" role="group" aria-label="Escala de satisfação de 1 a 5">
    {scores.map((score) => <Button key={score} type="button" className="fhdod-satisfaction-rating__option" variant={selected === score ? "primary" : "secondary"} aria-label={`Nota ${score} — ${meaningByScore[score]}`} aria-pressed={selected === score} disabled={disabled} onClick={() => onSelect(score)}>
      <img className="fhdod-satisfaction-rating__face" src={faceByScore[score]} alt="" aria-hidden="true" />
      <span className="fhdod-satisfaction-rating__score">{score}</span>
    </Button>)}
  </div>;
}
