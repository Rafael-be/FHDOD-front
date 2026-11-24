import logoSource from "../../assets/branding/fhdod-logo.png";

export function FhdodLogo({ className = "", size = "default" }: { className?: string; size?: "default" | "compact" }) {
  return <img className={`fhdod-logo fhdod-logo--${size} ${className}`.trim()} src={logoSource} alt="Fundação Hospitalar Dr. Oswaldo Diesel" />;
}
