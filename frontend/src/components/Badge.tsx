interface BadgeProps {
  status: string;
}

export default function Badge({ status }: BadgeProps) {
  const statusLabels: Record<string, string> = {
    pending: 'Ожидает',
    confirmed: 'Подтверждено',
    arrived: 'Пришёл',
    cancelled: 'Отменено',
    completed: 'Завершено',
    no_show: 'Не явился',
  };

  return (
    <span className={`badge badge-${status}`}>
      {statusLabels[status] || status}
    </span>
  );
}
