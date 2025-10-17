// PestAlerts feature removed. Redirecting to dashboard to preserve route safety.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PestAlerts() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/dashboard');
  }, []);
  return null;
}
