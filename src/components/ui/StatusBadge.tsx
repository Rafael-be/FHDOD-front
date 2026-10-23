export function StatusBadge({ status }: { status: "active" | "inactive" | "pending" }) {
  const labels = { active: "Ativo", inactive: "Inativo", pending: "Pendente" };
  return <span className={`badge fhdod-badge fhdod-badge--${status}`}>{labels[status]}</span>;
}
