import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <Card>
        <h1 className="text-center">404</h1>
        <p className="text-center text-hint">Страница не найдена</p>
        <Button fullWidth className="mt-3" onClick={() => navigate('/')}>
          На главную
        </Button>
      </Card>
    </div>
  );
}
