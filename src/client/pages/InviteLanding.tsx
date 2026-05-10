import { Navigate, useParams } from 'react-router-dom';

export default function InviteLanding() {
  const { code } = useParams<{ code: string }>();
  return (
    <Navigate
      to={`/register?invite=${encodeURIComponent(code ?? '')}`}
      replace
    />
  );
}
